---
title: "详解 Docker 镜像"
date: 2022-08-30T09:45:57+08:00
draft: false
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "container"
  - "docker"
---

Docker 包含三个基本概念，分别是镜像（Image）、容器（Container）和仓库（Repository）。镜像是 Docker 运行容器的前提，仓库是存放镜像的场所，可见镜像是 Docker 的核心。

Docker 镜像可以看作是一个特殊的文件系统，除了提供容器运行时所需的程序、库、资源、配置等文件外，还包含了一些为运行时准备的一些配置参数（如匿名卷、环境变量、用户等）。镜像不包含任何动态数据，其内容在构建之后也不会被改变。

要想更深入的了解 Docker 镜像，理解镜像的实现机制是非常必要的，而这其中最重要的概念就是镜像层（Layers)（如下图）。镜像层依赖于一系列的底层技术，比如文件系统（filesystems）、写时复制（copy-on-write）、联合挂载（union mounts）等。

![layers](https://pic1.zhimg.com/80/v2-d5c06c456761b5a27090e3328b1f6882_1440w.jpg?source=1940ef5c)

本文将深入分析 docker 镜像的 Manifest 文件、镜像层的底层技术和 Docker 的存储驱动。

## 1. 镜像、层（Layer）和 Manifest

下面是 Docker 官方文档对于镜像和分层概念的定义：

> Docker images are the basis of containers. An Image is an ordered collection of root filesystem changes and the corresponding execution parameters for use within a container runtime. An image typically contains a union of layered filesystems stacked on top of each other. An image does not have state and it never changes.

> In an image, a layer is modification to the image, represented by an instruction in the Dockerfile. Layers are applied in sequence to the base image to create the final image. When an image is updated or rebuilt, only layers that change need to be updated, and unchanged layers are cached locally. This is part of why Docker images are so fast and lightweight. The sizes of each layer add up to equal the size of the final image.

由上面的定义可知 Docker 镜像是一个多层的文件系统的联合，层是对镜像的修改，每一层按顺序应用于基础镜像上创建最终的镜像。

## 2. Manifest

manifest 是关于一个镜像的信息，如 layers，大小和摘要，manifest 列表是一个镜像层的列表通过指定一到多个镜像名创建。

具体可参考：

- [Image Manifest V 2, Schema 2](https://docs.docker.com/registry/spec/manifest-v2-2/)

## 参考

- [What Is a Docker Image Manifest?](https://www.howtogeek.com/devops/what-is-a-docker-image-manifest/#:~:text=Docker%20manifests%20describe%20the%20layers%20inside%20an%20image.,an%20image%20is%20compatible%20with%20the%20current%20device.)
- [Docker Manifest – A Peek Into Image’s Manifest.json Files](https://dzone.com/articles/docker-manifest-a-peek-into-images-manifestjson-fi)
- [docker images](https://docs.docker.com/engine/reference/commandline/images/)
- [About storage drivers](https://docs.docker.com/storage/storagedriver/)
- [能从入门到精通的 Docker 学习指南](https://mp.weixin.qq.com/s?__biz=MzUzNTY5MzU2MA==&mid=2247492253&idx=1&sn=e691ada6bcce37221f89515ce77cbc8e&chksm=fa83330acdf4ba1c0da3bbcf9992fc7b961678710906e6ab4a5094e527eab7a9cd03f9149af4&mpshare=1&scene=1&srcid=08309KRs09LUXw1tyLS6zzqj&sharer_sharetime=1661825440347&sharer_shareid=ba787659e569653e02110f161a075a4b#rd)
- [深入分析 Docker 镜像原理](https://mp.weixin.qq.com/s?__biz=MzI4MzAwNTQ3NQ==&mid=210121647&idx=1&sn=b838c46192f4cee400572e63b2e754a9&chksm=62e3d4e355945df588d8c6fac9eaeea0494136c76d26a3ffb11617876617408852374037a9cd&mpshare=1&scene=1&srcid=0830t1pfrYDRecSzQNVObKFU&sharer_sharetime=1661825346461&sharer_shareid=ba787659e569653e02110f161a075a4b#rd)
