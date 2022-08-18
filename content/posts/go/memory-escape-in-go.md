---
title: "Go 语言中的逃逸分析"
date: 2022-08-16T16:46:20+08:00
draft: false
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Go"
---

内存管理主要包括两个动作：分配与释放，逃逸分析就是服务于内存分配，为了更好理解逃逸分析，我们先谈一下堆栈，对于堆上的内存回收，还需要通过标记
清除阶段，例如 Go 采用的三色标记法，但是，在栈上的内存而言，

## 参考

- [详解逃逸分析](https://mp.weixin.qq.com/s?__biz=MzkyMzIyNjIxMQ==&mid=2247484578&idx=1&sn=4300265a1142f55bfe7cce1740725291&scene=19#wechat_redirect)
- [golang 中函数使用值返回与指针返回的区别，底层原理分析](https://blog.tianfeiyu.com/source-code-reading-notes/go/func_return_value_or_pointer.html)
- [图解 Go 逃逸分析](https://mp.weixin.qq.com/s/80pv2gpnbKMPNLDr3dnSCA)
