---
title: 'Kuberntes 的垃圾回收策略之概念篇'
date: 2022-07-12T08:46:04+08:00
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

Kubernetes 中很多对象通过 Owner Reference 连接彼此。Owner Reference 可以告诉控制平面哪些对象依赖于其他对象。Kubernetes 使用 Owner Reference 为控制平面以及其他 API 客户端在删除某对象时提供一个清理关联资源的机会。在大多数场合，Kubernetes 都是自动管理 Owner Reference。

Ownership 与某些资源所使用的 label 和 selector 不同。例如，考虑一个创建 EndpointSlice 对象的 Service 对象。Service 对象使用标签来允许控制平面确定哪些 EndpointSlice 对象被该 Service 使用。除了标签，每个被 Service 托管的 EndpointSlice 对象还有一个 Owner Reference。 Owner Reference 可以帮助 Kubernetes 中的不同部分避免干预并非由它们控制的对象。

### 什么是 Owner References

Dependent 中有一个 `metadata.ownerReferences` 字段，用于引用它的 Owner。有效的 Owner Reference 由与 Dependent 对象位于同一命名空间中的 Owner 对象的名称和 UID 组成。Kubernetes 会自动为依赖于其他对象（如 ReplicaSet、DaemonSet、Deployment、Jobs 和 CronJobs 以及 ReplicationControllers）的对象设置此字段的值，我们还可以通过更改此字段的值来手动配置这些关系。但是，通常是由 Kubernetes 自动管理对象之间的所有关系。

依赖对象还有一个 `ownerReferences.blockOwnerDeletion` 字段，该字段采用布尔值并控制特定依赖对象是否可以阻止垃圾收集器删除其所有者对象。如果是控制器（例如 Deployment 控制器）设置的 `metadata.ownerReferences` 字段的值，Kubernetes 会自动将此字段设置为 `true`。 我们还可以手动设置 `blockOwnerDeletion` 字段的值，以控制哪些依赖项阻止垃圾回收。

Kubernetes 准入控制器根据用户对所有者（owner）的删除权限控制用户访问更改依赖资源的此字段。 此控件可防止未经授权的用户延迟所有者对象的删除。

说明：
根据设计，kubernetes 不允许跨命名空间指定 owner。命名空间范围的 dependent 可以指定集群范围的或者命名空间范围的 owner。命名空间范围的 owner 必须和其 dependent 处于相同的命名空间。如果命名空间范围的 owner 和 dependent 不在相同的命名空间，那么该 owner reference 就会被认为是缺失的，并且当 dependent 所有 owner 引用都被确认不再存在之后，该 dependent 会被删除。

集群范围的 dependent 只能指定集群范围的 owner 。在 v1.20+ 版本，如果一个集群范围的 dependent 指定了一个命名空间范围类型的 owner ， 那么该 dependent 会被认为拥有一个不可解析的 owner refernece，并且它不能够被垃圾回收。

在 v1.20+ 版本，如果垃圾收集器检测到无效的跨命名空间范围的 owner reference，或者一个集群范围的 dependent 指定了一个命名空间范围类型的 owner， 那么它就会报告一个警告事件。该事件的原因是 `OwnerRefInvalidNamespace` 和 `involvedObject`（其中报告包含的无效的 dependent），我们可以运行 `kubectl get events -A --field-selector=reason=OwnerRefInvalidNamespace` 来获取该类型的事件。

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

Finalizer 是带有命名空间的键，告诉 Kubernetes 等到特定的条件被满足后，再完全删除被标记为删除的资源。Finalizer 提醒控制器清理被删除的对象拥有的资源。

当我们告诉 Kubernetes 删除一个指定了 Finalizer 的对象时，Kubernetes API 通过设置 `.metadata.deletionTimestamp` 来标记要删除的对象，并返回 202 状态码（HTTP "Accepted"）使其进入只读状态。当控制平面或其他组件采取 Finalizer 所定义的动作时，目标对象会保持在终止中（Terminating）的状态。这些动作完成后，控制器会删除目标对象相关的 Finalizer。 当 `metadata.finalizers` 字段为空时，Kubernetes 认为删除已完成并删除对象。

我们可以使用 Finalizer 来控制资源的垃圾收集工作。例如，我们可以定义一个 Finalizer，在删除目标资源前清理相关资源或基础设施。

我们可以通过使用 Finalizers 提醒控制器在删除目标资源前执行特定的清理任务，来控制资源的垃圾收集。

Finalizers 通常不指定要执行的代码。相反，它们通常是特定资源上的键的列表，类似于注解。Kubernetes 自动指定了一些 Finalizers，但我也可以指定我们自己的。

### Finalizers 的工作机制

当我们使用资源清单文件（manifest）创建资源时，我们可以在 `metadata.finalizers` 字段指定 Finalizers。当我们试图删除该资源时，处理删除请求的 API 服务器会注意到 `finalizers` 字段中的值， 并进行以下操作：

- 修改对象，将我们开始执行删除的时间添加到 `metadata.deletionTimestamp` 字段。
- 禁止对象被删除，直到其 `metadata.finalizers` 字段为空。
- 返回 202 状态码（HTTP "Accepted"）。

管理 finalizer 的控制器注意到对象上发生的更新操作，对象的 `metadata.deletionTimestamp` 字段被设置了，意味着已经请求过删除该对象。然后，控制器会试图满足资源的 Finalizers 的条件。每当一个 Finalizer 的条件被满足时，控制器就会从资源的 `finalizers` 字段中删除该键。当 `finalizers` 字段为空时，设置了 `deletionTimestamp` 字段的对象会被自动删除。我们也可以使用 Finalizers 来阻止删除未被管理的资源。

一个常见的 Finalizer 的例子是 `kubernetes.io/pv-protection`， 它用来防止意外删除 PersistentVolume 对象。 当一个 PersistentVolume 对象被 Pod 使用时，Kubernetes 会添加 pv-protection Finalizer。 如果你试图删除 PersistentVolume，它将进入 Terminating 状态， 但是控制器因为该 Finalizer 存在而无法删除该资源。当 Pod 停止使用 PersistentVolume 时， Kubernetes 清除 pv-protection Finalizer，控制器就会删除该卷。

### Owner Refernece, 标签和 Finalizers

与标签类似， Owner Referneces 描述了 Kubernetes 中对象之间的关系，但它们作用不同。 当一个控制器管理类似于 Pod 的对象时，它使用标签来跟踪相关对象组的变化。例如，当 Job 创建一个或多个 Pod 时，Job 控制器会给这些 Pod 应用填上标签，并跟踪集群中的具有相同标签的 Pod 的变化。

Job 控制器还为这些 Pod 添加了 Owner Reference，指向创建 Pod 的 Job。 如果你在这些 Pod 运行的时候删除了 Job， Kubernetes 会使用 Owner Reference 而不是标签）来确定集群中哪些 Pod 需要清理。

当 Kubernetes 识别到要删除的资源上的 Owner Reference，它也会处理 Finalizers。

在某些情况下，Finalizers 会阻止 dependent 对象的删除，这可能导致目标 owner 对象被保留的时间比预期的长，而没有被完全删除。在这些情况下，我们应该检查目标 owner 和 dependent 象上的 Finalizers 和 Owner Reference 来排查原因。

> 说明：在对象卡在删除状态的情况下，要避免手动移除 Finalizers，以允许继续删除操作。Finalizers 通常因为特殊原因被添加到资源上，所以强行删除它们会导致集群出现问题。 只有了解 finalizer 的用途时才能这样做，并且应该通过一些其他方式来完成 （例如，手动清除其余的依赖对象）。

### 所有权和 Finalizers

当我们告诉 Kubernetes 删除一个资源，API 服务器允许管理控制器处理该资源的任何 Finalizer 规则。 Finalizer 防止意外删除你的集群所依赖的、用于正常运作的资源。例如，如果你试图删除一个仍被 Pod 使用的 PersistentVolume，该资源不会被立即删除，因为 PersistentVolume 有 `kubernetes.io/pv-protection` Finalizer。 相反，它将进入 Terminating 状态，直到 Kubernetes 清除这个 Finalizer， 而这种情况只会发生在 PersistentVolume 不再被挂载到 Pod 上时。

当你使用前台或孤儿级联删除时，Kubernetes 也会向属主资源添加 Finalizer。在前台删除中，会添加 foreground Finalizer，这样控制器必须在删除了拥有 `ownerReferences.blockOwnerDeletion=true` 的附属资源后，才能删除属主对象。 如果你指定了孤儿删除策略，Kubernetes 会添加 orphan Finalizer， 这样控制器在删除 owner 对象后，会忽略 dependent 资源。

上面对 Finalizers 的讲解基本都来自官方文档，由于官方文档写的通俗易懂，所以只是对翻译做了润色和修改，使其更易于理解和消化。既然已经了解了 Owner Reference 和 Finalizer 的概念，那么下面就开始进入本文的正题，Kubernetes 的垃圾收集策略。

## 级联删除

Kubernetes 会检查并删除那些不再拥有 Owner Reference 的对象，例如在我们删除了 ReplicaSet 之后留下来的 Pod。当我们删除某个对象时，我们可以控制 Kubernetes 是否去自动删除该对象的 dependent 对象， 这个过程称为级联删除（Cascading Deletion）。级联删除有两种类型，分别如下：

- 前台级联删除
- 后台级联删除

我们也可以使用 Kubernetes Finalizers 来控制垃圾收集机制如何以及何时删除包含 Owner Reference 的资源。

### 前台级联删除

在前台级联删除中，正在被我们删除的 owner 对象首先会进入 deletion in progress 状态。在这种状态下，针对 owner 对象会发生以下事情：

- Kubernetes API 服务器将对象的 `metadata.deletionTimestamp` 字段设置为对象被标记为要删除的时间点。
- Kubernetes API 服务器也会将 `metadata.finalizers` 字段设置为 `foregroundDeletion`。
- 在删除过程完成之前，通过 Kubernetes API 仍然可以看到该对象。

当 owner 对象进入删除过程中状态后，控制器删除其 dependent 对象。控制器在删除完所有 dependent 对象之后，删除 owner 对象。这时，通过 Kubernetes API 就无法再看到该对象。

在前台级联删除过程中，唯一可能阻止 owner 对象被删除的是那些带有 `ownerReference.blockOwnerDeletion=true` 字段的 dependent 对象。

### 后台级联删除

在后台级联删除过程中，Kubernetes 服务器立即删除 owner 对象，控制器在后台清理所有 dependent 对象。默认情况下，Kubernetes 使用后台级联删除方案，除非你手动设置了要使用前台删除，或者选择遗弃（to orphan）依赖对象。

### 孤儿 depdentdent 对象

当 Kubernetes 删除某个属主对象时，被留下来的依赖对象被称作被遗弃的（Orphaned）对象。 默认情况下，Kubernetes 会删除依赖对象。

## 未使用容器和镜像的垃圾收集

kubelet 会每五分钟对未使用的镜像执行一次垃圾收集，每分钟对未使用的容器执行一次垃圾收集。我们应该避免使用外部的垃圾收集工具，因为外部工具可能会破坏 kubelet 的行为，移除应该保留的容器。

要配置对未使用容器和镜像的垃圾收集选项，可以使用一个配置文件，基于 `KubeletConfiguration` 资源类型来调整与垃圾收集相关的 kubelet 行为。

### 容器镜像生命期

Kubernetes 通过其镜像管理器（Image Manager）来管理所有镜像的生命周期， 该管理器是 kubelet 的一部分，工作时与 cadvisor 协同。 kubelet 在作出垃圾收集决定时会考虑如下磁盘用量约束：

- `HighThresholdPercent`
- `LowThresholdPercent`

磁盘用量超出所配置的 `HighThresholdPercent` 值时会触发垃圾收集，垃圾收集器会基于镜像上次被使用的时间来按顺序删除它们，首先删除的是最老的镜像。 kubelet 会持续删除镜像，直到磁盘用量到达 `LowThresholdPercent` 值为止。

### 容器垃圾收集

kubelet 会基于如下变量对所有未使用的容器执行垃圾收集操作，这些变量都是可以定义的：

- `MinAge`：kubelet 可以垃圾回收某个容器时该容器的最小时间。设置为 0 表示禁止使用此规则。
- `MaxPerPodContainer`：每个 Pod 可以包含的已死亡的容器个数上限。设置为小于 0 的值表示禁止使用此规则。
- `MaxContainers`：集群中可以存在的已死亡的容器个数上限。设置为小于 0 的值意味着禁止应用此规则。

除以上变量之外，kubelet 还会垃圾收集除无标识的以及已删除的容器，通常从最老的容器开始。

当保持每个 Pod 的最大数量的容器（`MaxPerPodContainer`）会使得全局的已死亡容器个数超出上限（`MaxContainers`）时，`MaxPerPodContainer` 和 `MaxContainers` 之间可能会出现冲突。在这种情况下，kubelet 会调整 `MaxPerPodContainer` 来解决这一冲突。 最坏的情形是将 `MaxPerPodContainer` 降格为 1，并驱逐最老的容器。此外，当隶属于某已被删除的 Pod 的容器的年龄超过 `MinAge` 时，它们也会被删除。

说明：
kubelet 仅会回收由它所管理的容器。

Kubernetes 的垃圾回收策略中涉及的所有概念都已经分析完毕，接下来关于垃圾收集机制的实践会在实战篇进行演练，通过实战再来回顾这些核心概念，更能够加深我们对这些概念的理解。

## 参考

- [Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Use Cascading Deletion in a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/use-cascading-deletion/)
- [When exactly do I set an ownerReference's controller field to true?](https://stackoverflow.com/questions/51068026/when-exactly-do-i-set-an-ownerreferences-controller-field-to-true)
- [Deletion and Garbage Collection of Kubernetes Objects](https://thenewstack.io/deletion-garbage-collection-kubernetes-objects/)
- [Using Finalizers to Control Deletion](https://kubernetes.io/blog/2021/05/14/using-finalizers-to-control-deletion/)
- [ControllerRef proposal](https://github.com/kubernetes/design-proposals-archive/blob/main/api-machinery/controller-ref.md)
