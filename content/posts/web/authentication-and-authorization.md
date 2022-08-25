---
title: "认证与鉴权"
date: 2022-08-24T12:35:57+08:00
draft: true
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Web"
---

### `WWW-Authenticate` 首部

HTTP WWW-Authenticate 响应首部定义了可用于访问特定资源的 HTTP 身份验证方法（challenges）。这个首部是 HTTP 认证通用框架的一部分，可与多种身份认证方案一起使用。每个「质询」都列出了服务器支持的一个方案以及为该方案类型定义的附加参数。

如果客户端对受保护的资源进行了请求，那么使用了 HTTP 认证的服务器会以 `401 Unauthorized` 进行响应。此响应必须至少包含一个 `WWW-Authenticate` 首部和一个质询，以指示可以使用哪些身份验证方案来访问资源（以及每个特定方案所需的任何其他数据）。

一个 `WWW-Authenticate` 首部中允许有多个质询，一个响应中允许有多个 `WWW-Authenticate` 首部。

在收到 `WWW-Authenticate` 首部后，客户端通常会提示用户输入凭据，然后重新请求资源。这个新请求使用 `Authorization` 向服务器提供凭据，并针对选定的“挑战”身份验证方法进行适当编码。 客户应该选择它理解的最安全的挑战（请注意，在某些情况下，“最安全”的方法是有争议的）。

## 参考

- [Hypertext Transfer Protocol (HTTP/1.1): Authentication](https://datatracker.ietf.org/doc/html/rfc7235)
- [傻傻分不清之 Cookie、Session、Token、JWT](https://juejin.cn/post/6844904034181070861)
- [Authorizing requests](https://learning.postman.com/docs/sending-requests/authorization/#basic-auth)
- [HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)
- [前端开发登录鉴权方案完全梳理](https://tsejx.github.io/blog/authentication/)
