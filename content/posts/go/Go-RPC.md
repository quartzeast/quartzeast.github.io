---
title: "详解 RPC 机制"
date: 2022-09-05T17:16:43+08:00
draft: false
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Go"
  - "Distributed Computing"
---

在分布式计算中，远程过程调用 (RPC) 是指计算机程序中的一个过程（procedure）或子例程（subroutine）在不同的地址空间（通常在共享网络上的另一台计算机上）执行。但是编程时可以像调用本地例程一样直接调用它们，不用关心远程交互的细节。

RPC 是分布式系统中不同节点间流行的一种通信方式。

## 参考

- [Remote procedure call-wikipedia](https://en.wikipedia.org/wiki/Remote_procedure_call)
- [Remote Procedure Call-IBM](https://www.ibm.com/docs/en/aix/7.1?topic=concepts-remote-procedure-call)
- [Understanding RPC Vs REST For HTTP APIs](https://www.smashingmagazine.com/2016/09/understanding-rest-and-rpc-for-http-apis/)
- [RPC 和 Protobuf](https://chai2010.cn/advanced-go-programming-book/ch4-rpc/index.html)
