---
title: "认证与鉴权"
date: 2022-08-24T12:35:57+08:00
draft: false
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Web"
---

认证和鉴权一直是 Web 开发中的一个难点，本文将概括和分析 HTTP 的通用认证框架和常见的认证鉴权方式。

## 什么是认证与鉴权

### 认证（Authentication）

认证就是验证当前用户的身份，验证当前用户是否真的为他所声明的身份。

互联网中的认证：

- 用户名密码登录
- 邮箱发送登录链接
- 手机号接收验证码
- 只要你能收到邮箱/验证码，就默认你是账号的主人

### 授权（Authorization）

授权指的是用户授予第三方应用访问该用户某些资源的权限，或者是用户请求服务器授权自己访问某些资源的权限。

实现授权的方式有：cookie、session、token、OAuth。

### 凭证（Credentials）

实现认证和授权的前提是需要一种媒介（证书） 来标记访问者的身份。

## HTTP 认证框架

HTTP 为访问控制和身份认证提供了一个通用的框架。这里的框架指的是一个通用的流程或解决方案。

### HTTP 认证首部和响应状态码

HTTP 通用认证框架中涉及到四个首部：

- [`WWW-Authenticate`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate)
- [`Authorization`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)
- [`Proxy-Authorization`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Proxy-Authorization)
- [`Proxy-Authenticate`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Proxy-Authenticate)

和三个响应状态码：

- [`401`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401), [`403`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403), [`407`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/407)

### 质询响应机制

HTTP 认证是基于质询-响应机制的，具体的机制可以参考下面两个文档：

- [Challenge-response authentication](https://developer.mozilla.org/en-US/docs/Glossary/challenge)
- [Challenge–response authentication](https://en.wikipedia.org/wiki/Challenge%E2%80%93response_authentication)

### 通用的 HTTP 身份认证框架

RFC 7235 定义了 HTTP 认证框架，服务器可以使用该框架来质询客户端请求，客户端可以使用该框架来提供认证信息。

质询响应的工作流程如下所示：

1. 服务器以 401 (Unauthorized) 响应状态响应客户端，并提供一个包含至少一个质询的 `WWW-Authenticate` 响应首部，以提供如何进行授权的信息。
2. 然后，想要向服务器验证自己的客户端可以通过在 `Authorization` 首部中包含凭证来完成此操作。
3. 通常，客户端会向用户显示密码输入框，然后再发出包含正确 `Authorization` header 的请求。

![A sequence diagram illustrating HTTP messages between a client and a server lifeline.](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication/http-auth-sequence-diagram.png)

### 认证方案

通用 HTTP 身份认证框架是许多身份验证方案的基础。

IANA 维护着一系列[身份验证方案](https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml)，但主机服务提供了其他方案，例如 Amazon AWS。

一些通用的认证方案如下所示：

- Basic
- Digest
- Bearer
- HOBA

具体可查看 MDN 文档：[Authentication schemes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#authentication_schemes)

## 常见的认证方案

### BASIC 认证方案

基本认证可查看 MDN 的文档：[BASIC Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme)

下面是使用 Go 实现的基本认证服务器：

```go
package main

import (
	"log"
	"net/http"
)

type User struct {
	name string
	pass string
}

// 校验失败
func AuthFailed(w http.ResponseWriter, errMsg string) {
	w.Header().Set("WWW-Authenticate", `Basic realm="My REALM"`)
	w.WriteHeader(401)
	w.Write([]byte(errMsg))
}

type HandlerFunc func(http.ResponseWriter, *http.Request)

// BASIC　auth 中间件
func basicAuthMiddleware(h HandlerFunc) HandlerFunc {
	// 返回一个通过封装的　handleFunc
	return func(w http.ResponseWriter, r *http.Request) {
		// Basic Auth 校验
		user, pass, ok := r.BasicAuth()
		if !ok {
			AuthFailed(w, "401 Unauthorized!")
			return
		}

		users := make(map[string]string)
		users["iris"] = "1234"
		users["morty"] = "4321"
		syspass, ok := users[user]
		if !ok || pass != syspass {
			AuthFailed(w, "401 Unauthorized Password error!")
			return
		}
		// 真正要处理的业务
		h(w, r)
	}
}

func HelloHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello"))
}

func main() {
	http.HandleFunc("/auth", basicAuthMiddleware(HelloHandler))
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## 参考

- [Hypertext Transfer Protocol (HTTP/1.1): Authentication](https://datatracker.ietf.org/doc/html/rfc7235)
- [ HTTP Authentication: Basic and Digest Access Authentication](https://datatracker.ietf.org/doc/html/rfc2617)
- [HTTP API 认证授权术](https://coolshell.cn/articles/19395.html)
- [傻傻分不清之 Cookie、Session、Token、JWT](https://juejin.cn/post/6844904034181070861)
- [网络数字身份认证技术](https://coolshell.cn/articles/21708.html)
- [Authorizing requests](https://learning.postman.com/docs/sending-requests/authorization/)
- [前端开发登录鉴权方案完全梳理](https://tsejx.github.io/blog/authentication/)
- [Basic access authentication](https://en.wikipedia.org/wiki/Basic_access_authentication)
- [Basic auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/#basic-auth-for-rest-apis)
- [如何在 Golang 中正确使用基本身份认证（HTTP Basic Authentication）](https://mhxw.life/note/2021/07/15/basic-authentication-in-go/)
