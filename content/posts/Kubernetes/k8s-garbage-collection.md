---
title: 'Kuberntes 垃圾回收策略'
date: 2022-08-13T08:46:04+08:00
draft: false
tags:
  - 'Kubernetes'
  - 'Cloud Native'
---

垃圾回收是 Kubernetes 用来清理集群资源的各种机制的统称。

Kubernetes 使用垃圾回收来清理资源，例如未使用的容器和镜像、失败的 Pod、目标资源对象拥有的对象、已完成的作业以及已过期或失败的资源。

被清理的资源主要包括以下这些：

- [终止的 Pod](https://kubernetes.io/zh-cn/docs/concepts/workloads/pods/pod-lifecycle/#pod-garbage-collection)
- [已完成的 Jobs](https://kubernetes.io/zh-cn/docs/concepts/workloads/controllers/ttlafterfinished/)
- [不再存在所有者引用（Owner Reference）的对象](https://kubernetes.io/zh-cn/docs/concepts/architecture/garbage-collection/#owners-dependents)
- [未使用的容器和容器镜像](https://kubernetes.io/zh-cn/docs/concepts/architecture/garbage-collection/#containers-images)
- [动态提供的，StorageClass 回收策略为 Delete 的 PersistentVolumes](https://kubernetes.io/zh-cn/docs/concepts/storage/persistent-volumes/#delete)
- [阻滞或者过期的 CertificateSigningRequest (CSRs)](https://kubernetes.io/zh-cn/docs/reference/access-authn-authz/certificate-signing-requests/#request-signing-process)
- 以下场景删除的节点：

  - 当集群使用[云控制器管理器](https://kubernetes.io/zh-cn/docs/concepts/architecture/cloud-controller/)运行于云端时

  - 当集群使用类似于云控制器管理器的插件运行在本地环境中时

- [节点租约对象](https://kubernetes.io/zh-cn/docs/concepts/architecture/nodes/#heartbeats)

本文先通过分析垃圾回收中涉及到的几个核心概念，如 Owners 和 Dependents、Finalizer、级联删除等，让我们初步认识这些核心概念，然后在通过实践，进一步加深我们对这些核心概念和 Kubernetes 垃圾回收机制的理解。

## Owners 和 Dependents

在 Kubernetes 中，一些对象是另一些对象的所有者（Owners），而这些被所有的对象称为其所有者的依赖对象（Dependents）。例如，一个 ReplicaSet 对象是一组 Pod 的所有者。

### 什么是 Owner References

Dependent 中有一个 `metadata.ownerReferences` 字段，用于引用它的 Owner。有效的 Owner Reference 由与 Dependent 对象位于同一命名空间中的 Owner 对象的名称和 UID 组成。Kubernetes 会自动为依赖于其他对象（如 ReplicaSet、DaemonSet、Deployment、Jobs 和 CronJobs 以及 ReplicationControllers）的对象设置此字段的值，我们还可以通过更改此字段的值来手动配置这些关系。但是，通常是由 Kubernetes 自动管理对象之间的所有关系。

依赖对象还有一个 `ownerReferences.blockOwnerDeletion` 字段，该字段采用布尔值并控制特定依赖对象是否可以阻止垃圾收集器删除其所有者对象。如果是控制器（例如 Deployment 控制器）设置的 `metadata.ownerReferences` 字段的值，Kubernetes 会自动将此字段设置为 `true`。 我们还可以手动设置 `blockOwnerDeletion` 字段的值，以控制哪些依赖项阻止垃圾回收。

Kubernetes 准入控制器根据用户对所有者（owner）的删除权限控制用户访问更改依赖资源的此字段。 此控件可防止未经授权的用户延迟所有者对象的删除。

### Owner References 中的字段

下面我们就来看看一个对象的 `ownerReferences` 字段中究竟包含哪些内容：

```
➜  ~ kubectl explain pods.metadata.ownerReferences
RESOURCE: ownerReferences <[]Object>
FIELDS:
   apiVersion	<string> -required-
   blockOwnerDeletion	<boolean>
   controller	<boolean>
   kind	<string> -required-
   name	<string> -required-
   uid	<string> -required-
```

由上可知 `ownerReferences` 包含以下四个必需字段：

- `apiversion`: 被引用对象的 API version，也就是所有者的 `group/version`

- `kind`: 被引用对象的 Kind

- `name`: 被引用对象的名称

- `uid`: 被引用对象的 UID

和以下两个可选字段：

- `blockOwnerDeletion`: 从字面意义上来看表示阻止 owner 被删除，但是要让其生效是具有前提条件的。如果该字段设置为 `true`，并且如果 owner 拥有 "`foregroundDeletion`" 终止器（终止器的概念将在下面进行分析），那么这个 owner 就不能从 key-value 存储中被删除，直到这个引用被移除了为止。该字段默认为 `false`，要设置此字段，用户需要 owner 的『删除』权限，否则将返回 422 (Unprocessable Entity)
- `controller`: 如果为 `true`，则此引用指向管理控制器

这两个字段的设置应该是让人比较困惑的，我们先来详细讲解 `controller` 字段的使用，在下面讲解完终结器（finalizer）和级联删除后再回过来讲解 `blockOwnerDeletetion` 这个字段的使用。

考虑以下场景。

假如我正在编写一个 Kubernetes 自定义资源 Foo 的控制器，当用户通过 `kubectl apply -f custom-foo-resource.yaml` 在集群上创建一个 Foo 资源的时候，该控制器需要创建一个 Deployment 作为工作负载以完成相应的任务。通常，在 Kubernetes 原生资源对象中，Deployment 资源对象是处在所有权（ownership）层级的顶端，因此 Kubernetes 不会自动为 Deployment 资源对象设置 Owner Refernece 的。而在上面场景中，Foo 资源对象是 Deployment 资源对象的 owner，那么我们应该在 Deployment 资源对象上配置 `ownerReference` 呢？

```yaml
ownerReferences:
  - kind: <kind from custom resource>
    apiVersion: <apiVersion from custom resource>
    uid: <uid from custom resource>
    name: <name from curstom resource name>
    controller: <???>
```

由上对 `ownerReferences` 字段的分析可知通过四个必需的字段 `kind, apiVersion, uid, name` 可以唯一确定一个资源对象，`ownerReferences` 通过这四个字段完成其 owner 的引用，那么 `controller` 字段应该怎么配置，有什么含义呢？

通常来说，设置 `ownerReferences` 有以下两种目的：

- 垃圾回收（Garbage Collection）：基本上所有的 owner 都是考虑用于 GC 的（一个 dependent 可以配置多个 owner refernece)
- 领养（Adoption）：`controller` 字段防止争夺要领养的资源。通常一个 ReplicaSet 资源对象的控制器会创建 pod。但是，如果有一个与标签选择器匹配的 pod，它将被副本集领养。为了防止两个 ReplicaSet 争夺同一个 pod，后者通过将 `controller` 设置为 `true` 来获得唯一的控制器。如果一个资源已经有一个控制器，它将不会被另一个控制器领养。

也就是说，`controller` 字段主要用于领养而不是用于 GC 的，它是 `ownerReference` 的一个属性，用于表示这个被引用的 owner 对象是否也是这个 dependent 对象的控制器。

再来看看 `ownerReferneces` 文档中一段话：

```
List of objects depended by this object. If ALL objects in the list have
been deleted, this object will be garbage collected. If this object is
managed by a controller, then an entry in this list will point to this
controller, with the controller field set to true. There cannot be more
than one managing controller.

OwnerReference contains enough information to let you identify an owning
object. An owning object must be in the same namespace as the dependent, or
be cluster-scoped, so there is no namespace field.
```

这段话的含义是这样的：

此对象所依赖的对象列表。如果列表中的所有对象都已被删除，则该对象将被垃圾回收。如果此对象由控制器管理，则此列表中的一项将指向此控制器，控制器字段设置为 `true`。管理控制器不能超过一个。

OwnerReference 包含足够的信息来让您识别所有者对象。所有者对象必须与依赖对象位于相同的命名空间中，或者是集群范围的，因此没有 `namespace` 字段。

至此，`controller` 的含义和使用方法就非常清晰明了了，`controller` 用于在领养过程中唯一标识一个控制器，与 GC 无关，一个资源对象的 `ownerReferences` 中假设引用了多个 owner，那么最多只能有一项设置了 `controller: true`，表明这一项引用中的 owner 对象也是该对象的控制器。

## Finalizers

## 参考

- [Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Use Cascading Deletion in a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/use-cascading-deletion/)
- [When exactly do I set an ownerReference's controller field to true?](https://stackoverflow.com/questions/51068026/when-exactly-do-i-set-an-ownerreferences-controller-field-to-true)
- [Deletion and Garbage Collection of Kubernetes Objects](https://thenewstack.io/deletion-garbage-collection-kubernetes-objects/)
- [Using Finalizers to Control Deletion](https://kubernetes.io/blog/2021/05/14/using-finalizers-to-control-deletion/)
- [ControllerRef proposal](https://github.com/kubernetes/design-proposals-archive/blob/main/api-machinery/controller-ref.md)
