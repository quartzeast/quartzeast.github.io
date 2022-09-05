---
title: "详解docker网络"
date: 2022-09-01T19:48:22+08:00
draft: true
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "docker"
  - "container"
---

Docker 提供了几种原生的网络，同时允许用户自定义网络。Docker 的网络从覆盖范围上可分为单个 host 上的网络和跨多个 host 的网络。本文中将详细分析容器之间如何进行通信，以及容器如何与外界进行通信。

## 1. Docker 原生网络

Docker 安装时会在 host 上创建三个网络，我们可以使用 `docker networl ls` 命令进行查看。

### 1.1 none 网络

none 网络就是什么都没有的网络。挂载这个网络下的容器除了 lo，没有其他任何网卡。容器创建时，可以通过 `--network=none` 指定使用 none 网络，如下所示：

```
$ docker run -it --network=none busybox
```

这样一个封闭的网络有什么用呢？封闭意味着隔离，对一些安全性要求高并且不需要联网的应用可以使用 none 网络。比如某个容器的唯一用途是生成随机密码，就可以放到 none 网络中避免密码被窃取。

### 1.2 host 网络

连接到 host 网络的容器共享 Docker host 的网络栈，容器的网络配置与 host 完全一致，可以通过 `--network=host` 指定使用 host 网络，如下所示：

```
➜  ~ docker run -it --network=host busybox
```

在容器中可以看到 host 的所有网卡，并且连 hostname 都是 host 的。直接使用 host 网络最大的好处是性能，如果容器对网络传输效率有较高要求，则可以选择 host 网络。当然不便之处就是牺牲一些灵活性，比如要考虑端口冲突问题，host 上使用的端口就不能再使用了。

host 的另一个用途是让容器可以直接配置 host 网络，比如某些跨 host 的网络解决方案，其本身也是以容器方式运行的，这些方案需要对网络进行配置，比如管理 iptables。

### 1.3 bridge 网络

Docker 安装时会创建一个命名为 docker0 的 Linux bridge，如果不指定 `--network`，创建的容器默认都会挂到 docker0 上去。

bridge 网络是通过一对 veth pair 实现的，veth pair 是一种成对出现的特殊网络设备，可以把它们想象成又一根虚拟网线连接起来的一对网卡。网卡的一头在容器中，另一头挂载网桥 docker0 上。其效果就相当于讲容器内的网卡也挂在了 docker0 上。

### 1.4 user-defined 网络

除了 none、host、bridge 这三个自动创建的网络，用户也可以根据业务需要创建 user-defined 网络。

Docker 提供三种 user-defined 网络驱动：bridge，overlay 和 macvlan。overlay 和 macvlan 用于创建跨主机的网络。

可以通过 bridge 驱动创建类似前面默认的 bridge 网络：

```
$ docker network create --driver bridge my_net
```

上述命名会创建一个新的网桥。可以使用 `docker network inspect` 查看 my_net 的配置信息。

同时我们还可以指定 IP 网段，如下所示：

```
docker network create --driver bridge --subnet 172.22.16.0/24 --gateway 172.22.16.1 my_net2
```
