---
title: "详细分析 Go 中的 HTTP ServeMux"
date: 2022-09-07T09:40:01+08:00
draft: false
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Go"
  - "Web"
---

`ServeMux` 是一个 HTTP 请求多路复用器（HTTP Request multiplexer）。具体来说，它主要有以下两个功能:

1. 路由功能，将请求的 URL 与一组已经注册的路由模式（pattern）进行匹配，选择一个匹配程度最接近的模式，调用该模式注册的处理器函数。
2. 清理请求 URL 与 `Host` 请求头，清除端口号，并对包含 `..` 和重复 `/` 的 URL 进行处理。

`ServeMux`（也称为路由器）保存着一个映射关系表，该表中的每个条目为一个预定义的 URL 路径到其处理函数的映射，也就是说它接收 HTTP 请求并根据请求中的 URL 将其重定向到正确的处理程序。通常，我们的程序有一个 `ServeMux`，其中包含所有路由。

![Servemux](/images/ServeMux.png)

## 参考

- [Golang 中的 ServeMux 路由简介](https://www.bwangel.me/2019/11/30/intro-servemux/)
- [How To Make an HTTP Server in Go](https://www.digitalocean.com/community/tutorials/how-to-make-an-http-server-in-go#inspecting-a-request-s-query-string)
- [An Introduction to Handlers and Servemuxes in Go](https://www.alexedwards.net/blog/an-introduction-to-handlers-and-servemuxes-in-go)
- _Go Web Programing_
