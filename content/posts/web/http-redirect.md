---
title: "HTTP 重定向"
date: 2022-08-29T10:20:00+08:00
draft: false
author: "quartzeast"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Web"
---

URL 重定向，也称为 URL 转发（_forwarding_），是一种当实际的资源，如单个页面、表单或者整个 Web 应用被迁移到新的 URL 下的时候，保持（原有）链接可用的技术。HTTP 协议提供了一种特殊形式的响应 —— HTTP 重定向（HTTP redirects）来执行此类操作。

## 1. 应用场景

- 临时重定向：站点维护或停机时
- 永久重定向：在更改站点 URL 后以保留现有的链接/书签、当上传文件时跳转页面

## 2. 原理

重定向由服务器向客户端发送特殊的重定向响应来进行触发。重定向响应具有以 `3` 开头的状态码，以及包含一个 `Location` 首部，其中有要重定向到的 URL。

当浏览器收到重定向时，它们会立即加载 `Location` 首部中提供的新 URL。除了额外往返（round-trip）对性能的影响之外，用户很少能注意到发生了重定向。

![http-redirection](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections/httpredirect.png)

主要有三类重定向：

- 永久重定向
- 临时重定向
- 特殊重定向

## 3. 重定向状态码和 `Location` 首部

## 3.1 重定向状态码

重定向状态码的范围在 300-399，主要为以下 6 种：

- `301 Moved Permanently`
- `302 Found`
- `303 See Other`
- `304 Not Modified`
- `307 Temporary Redirect`
- `308 Permanent Redirect`

具体可参考 MDN 文档：

- [Redirection Messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages)

### 3.2 `Location` 首部

`Location` 响应首部用于表示需要重定向到的 URL。它仅在提供 `3xx`（redirection）或 `201`（created）状态响应时有意义。

在重定向的情况下，用于获取 `Location` 指定页面的新请求的请求方法取决于两个因素：

- 源请求的方法
- 重定向的类型

主要有以下三种情况：

- `303 (See Other)` 响应总是要求使用 `GET` 方法
- `307 (Temporary Redirect)` 和 `308 (Permanent Redirect)` 不改变原始请求的方法
- `301 (Moved Permannently)` 和 `302 (Found)` 在大多数情况下不改变方法，不过一些比较早的用户代理可能会改变请求方法

状态码为上述之一的所有响应都会带有一个 `Location` 首部。

除了重定向响应之外，状态码为 `201 (Created)` 的消息也会带有 `Location` 首部。它指向的是新创建的资源的地址。

具体可参考 MDN 文档：

- [Location](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Location)

## 参考

- [Redirections in HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections)
- [HTTP redirect codes for SEO explained](https://www.contentkingapp.com/academy/redirects/)
- [The Ultimate Guide to Redirects: Everything You Need to Know about URL Redirection](https://www.semrush.com/blog/redirects/)
- [How to Redirect HTTP to HTTPS](https://www.semrush.com/blog/redirect-http-to-https/)
