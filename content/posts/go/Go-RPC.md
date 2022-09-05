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

RPC（Remote Procedure Call Protocol）——远程过程调用协议，它是一种通过网络从远程计算机程序上请求服务，而不需要了解底层网络技术的协议。该协议允许运行于一台计算机的程序调用另一台计算机的子程序，而程序员无需额外地为这个交互作用编程。RPC 协议假定某些传输协议的存在，如 TCP 或 UDP，为通信程序之间携带信息数据。在 OSI 网络通信模型中，RPC 跨越了传输层和应用层。RPC 使得开发包括网络分布式多程序在内的应用程序更加容易。

## 参考

- [Remote procedure call-wikipedia](https://en.wikipedia.org/wiki/Remote_procedure_call)
- [Remote Procedure Call-IBM](https://www.ibm.com/docs/en/aix/7.1?topic=concepts-remote-procedure-call)
- [Understanding RPC Vs REST For HTTP APIs](https://www.smashingmagazine.com/2016/09/understanding-rest-and-rpc-for-http-apis/)
- [RPC 和 Protobuf](https://chai2010.cn/advanced-go-programming-book/ch4-rpc/index.html)
- [既然有 HTTP 协议，为什么还要有 RPC](https://mp.weixin.qq.com/s/0QWxFylodn7T6nvcS6HsDg)
