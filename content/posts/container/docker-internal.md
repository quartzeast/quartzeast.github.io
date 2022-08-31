---
title: "Docker核心技术与内部实现"
date: 2022-08-18T10:26:12+08:00
draft: false
author: "石头"
description: "docker internal."
tags:
  - "container"
  - "docker"
---

## 参考

- [Docker 核心技术与实现原理](https://draveness.me/docker/)
- [DOCKER 基础技术：LINUX NAMESPACE（上）](https://coolshell.cn/articles/17010.html)
- [DOCKER 基础技术：LINUX NAMESPACE（下）](https://coolshell.cn/articles/17029.html)
- [OCKER 基础技术：LINUX CGROUP](https://coolshell.cn/articles/17049.html)
- [DOCKER 基础技术：AUFS](https://coolshell.cn/articles/17061.html)
- [DOCKER 基础技术：DEVICEMAPPER](https://coolshell.cn/articles/17200.html)
- [Docker 容器技术剖析](https://mp.weixin.qq.com/s?__biz=MzAxNTcyNzAyOQ==&mid=2650972941&idx=2&sn=3b88763b9d08dc022c1a12d8f3e74a97&chksm=8009a3d7b77e2ac18d0214b24105c1646b51663b48f361d16f378ccac5543c1bcfbf33f52328&mpshare=1&scene=1&srcid=08302aB2KMpSfc9RJYMERVUY&sharer_sharetime=1661825487341&sharer_shareid=ba787659e569653e02110f161a075a4b#rd)
