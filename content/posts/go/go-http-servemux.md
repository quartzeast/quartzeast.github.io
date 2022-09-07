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

`ServeMux`（也称为路由器）保存着一个映射关系表，该表中的每个条目为一个预定义的 URL 路径到其处理函数的映射，也就是说它负责接收 HTTP 请求并根据请求中的 URL 将请求重定向到正确的处理器。通常，我们的程序有一个 `ServeMux`，其中包含所有路由。

![Servemux](/images/go/ServeMux.png)

上图展示了多路复用器将请求转发至各个处理器（路由和派发）。

## 1. `ServeMux` 的使用方法

### 1.1 `NewServeMux`

`NewServeMux` 函数分配并返回一个新的 `ServeMux`。

```go
mux := http.NewServeMux()
now := time.Now()
// HandleFunc 为给定的模式注册处理函数，即为 /today 添加一个处理器
mux.HandleFunc("/today", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte(now.Format(time.ANSIC)))
})
// 将创建的 multiplexer 传递给 ListenAndServe 函数
log.Fatal(http.ListenAndServe(":3000", mux))
```

在上面的示例中我们创建了一个 HTTP 服务器，并且当请求 `/today` URL 模式时，返回当前的日期事件。

以下为 `NewServeMux` 的源码。

```go
// NewServeMux allocates and returns a new ServeMux.
func NewServeMux() *ServeMux { return new(ServeMux) }
```

可知 `NewServeMux` 的工作为通过 `new` 实例化一个 `ServeMux` 并将其返回。

### 1.2 `DefaultServeMux`

`DefaultServeMux` 就是一个 `ServeMux` 而已，当我们给 `ListenAndServe` 函数传递 `nil` 时，就会默认使用它。

```go
// DefaultServeMux is the default ServeMux used by Serve.
var DefaultServeMux = &defaultServeMux

var defaultServeMux ServeMux
```

由上可知 `DefaultServeMux` 是一个包级的全局变量，是对一个 `ServeMux` 的实例 `defaultServeMux` 的指针。

```go
func HelloHandler(w http.ResponseWriter, _ *http.Request) {
	fmt.Fprintf(w, "Hello there!")
}

func main() {
	http.HandleFunc("/", HelloHandler)
	log.Fatal(http.ListenAndServe(":3000", nil))
}
```

`http.Handle` 和 `http.HandleFunc` 全局函数使用 `DefaultServeMux` 多路复用器。

```go
// HandleFunc registers the handler function for the given pattern
// in the DefaultServeMux.
// The documentation for ServeMux explains how patterns are matched.
func HandleFunc(pattern string, handler func(ResponseWriter, *Request)) {
	DefaultServeMux.HandleFunc(pattern, handler)
}
```

`HandleFunc` 在 `DefaultServeMux` 中为指定的模式注册处理器函数，内部调用的是 `ServeMux` 的 `HandleFunc` 函数。在下面我们再来详细分析 `ServeMux` 的 `HandleFunc` 的内部实现机制。

### 1.3 自定义处理器

`func (*ServeMux) Handle` 为给定模式注册处理器。`http.HandlerFunc` 是一个适配器，它可以将具有正确签名的函数转换为 `http.Handler`。

```go
type helloHandler struct{}

func (h *helloHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello there!")
}

func main() {
	mux := http.NewServeMux()
	hello := &helloHandler{}
	mux.Handle("/hello", hello)
	http.ListenAndServe(":3000", mux)
}
```

一个类型要变成一个处理器，必须实现 `ServeHTTP` 方法。

## 2. `ServeMux` 的路由匹配规则

下面是 ServeMux 的官方文档：

> ServeMux is an HTTP request multiplexer. It matches the URL of each incoming request against a list of registered patterns and calls the handler for the pattern that most closely matches the URL.
>
> Patterns name fixed, rooted paths, like "/favicon.ico", or rooted subtrees, like "/images/" (note the trailing slash). Longer patterns take precedence over shorter ones, so that if there are handlers registered for both "/images/" and "/images/thumbnails/", the latter handler will be called for paths beginning "/images/thumbnails/" and the former will receive requests for any other paths in the "/images/" subtree.
>
> Note that since a pattern ending in a slash names a rooted subtree, the pattern "/" matches all paths not matched by other registered patterns, not just the URL with Path == "/"
>
> If a subtree has been registered and a request is received naming the subtree root without its trailing slash, ServeMux redirects that request to the subtree root (adding the trailing slash). This behavior can be overridden with a separate registration for the path without the trailing slash. For example, registering "/images/" causes ServeMux to redirect a request for "/images" to "/images/", unless "/images" has been registered separately.
>
> Patterns may optionally begin with a host name, restricting matches to URLs on that host only. Host-specific patterns take precedence over general patterns, so that a handler might register for the two patterns "/codesearch" and "codesearch.google.com/" without also taking over requests for "http://www.google.com/"
>
> ServeMux also takes care of sanitizing the URL request path and the Host header, stripping the port number and redirecting any request containing . or .. elements or repeated slashes to an equivalent, cleaner URL.

由文档可知，`ServeMux` 是一个 HTTP 请求多路复用器。它将每个传入请求的 URL 与一个已注册模式的列表进行匹配，并调用与 URL 最匹配的模式注册的处理器。

模式的名称是固定的，主要由两种形式：

- 根路径，如 `/favicon.ico`
- 根子树，如 `/images/`

如果被绑定的模式不是以 `/` 结尾，那么它只会与完全相同的 URL 匹配；但如果被绑定的模式以 `/` 结尾，那么当请求的 URL 在找不到可以精确匹配的模式时，会匹配只有前缀部分与以 `/` 结尾的模式，并且优先匹配长模式。

因为以斜杠结尾的模式命名了一棵根子树，因此模式 `/` 匹配所有与其他注册模式不匹配的路径，而不仅仅是 `Path == "/"` 的 URL。

如果注册了一棵根子树，并且当接收到一个以该子树根为名称但不包含 `/` 的请求时，`ServeMux` 会将这个请求重定向到子树根（添加尾部的 `/`）。可以通过单独注册不带斜杠的路径来覆盖此行为。

大致了解了 `ServeMux` 的路由匹配机制，接下来让我们通过几个示例来实践一下：

```go
http.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
    fmt.Fprintln(writer, "/", request.URL.EscapedPath())
})
http.HandleFunc("/hello/", func(writer http.ResponseWriter, request *http.Request) {
    fmt.Fprintln(writer, "/hello/", request.URL.EscapedPath())
})
log.Fatalln(http.ListenAndServe(":8080", nil))
```

```bash
❯ curl localhost:8080
/ /

❯ curl localhost:8080/
/ /

# 长模式 /hello/ 优先于短模式 / 进行匹配
❯ curl localhost:8080/hello/
/hello/ /hello/

❯ curl localhost:8080/hello/world
/hello/ /hello/world

# / 是 /goodbye/world 的最长前缀匹配
❯ curl localhost:8080/goodbye/world
/ /goodbye/world

# 重定向 /hello 到 /hello/
❯ curl -v localhost:8080/hello
*   Trying 127.0.0.1:8080...
* Connected to localhost (127.0.0.1) port 8080 (#0)
> GET /hello HTTP/1.1
> Host: localhost:8080
> User-Agent: curl/7.84.0
> Accept: */*
>
* Mark bundle as not supporting multiuse
< HTTP/1.1 301 Moved Permanently
< Content-Type: text/html; charset=utf-8
< Location: /hello/
< Date: Wed, 07 Sep 2022 07:24:59 GMT
< Content-Length: 42
<
<a href="/hello/">Moved Permanently</a>.

* Connection #0 to host localhost left intact
```

下面再来看看当同名的根路径和根子树的模式同时存在时，`ServeMux` 如何进行匹配。

```go
http.HandleFunc("/hello", func(writer http.ResponseWriter, request *http.Request) {
    fmt.Fprintln(writer, "/hello", request.URL.EscapedPath())
})
http.HandleFunc("/hello/", func(writer http.ResponseWriter, request *http.Request) {
    fmt.Fprintln(writer, "/hello/", request.URL.EscapedPath())
})
```

```bash
# 当存在可以精确匹配的模式后，即使存在同名根子树也不会进行转发
❯ curl localhost:8080/hello
/hello /hello

❯ curl localhost:8080/hello/
/hello/ /hello/

# 找不到可以精确匹配的模式时，则匹配与前缀相同的最长模式，即 /hello/
❯ curl localhost:8080/hello/world
/hello/ /hello/world
```

## 3. `ServeMux` 的工作原理及源码分析

### 3.1 工作原理

`ServeMux` 结构中包含了一个 map，这个 map 将一个给定的模式映射至相应的处理器（为模式注册处理器）。因为 `ServeMux` 结构也实现了 `ServeHTTP` 方法，所以它也是一个处理器。当 `ServeMux` 的 ServeHTTP 方法接收到一个请求的时候，它会在结构的 map 中找出与请求 URL 最为匹配的模式，然后调用该模式注册的处理器的 `ServeHTTP` 方法，如下图所示。

![servemux-inside](/images/go/ServeMux-inside.png)

多路复用器的工作原理：

- 内部的 map 负责将指定模式映射到处理器
- `ServeMux` 结构的 `ServeHTTP` 方法会调用与请求的 URL 匹配的模式的 `ServeHTTP` 方法

### 3.2 源码分析

下面是 `ServeMux` 结构相关的源码：

```go
type ServeMux struct {
	mu    sync.RWMutex
	m     map[string]muxEntry
	es    []muxEntry // slice of entries sorted from longest to shortest.
	hosts bool       // whether any patterns contain hostnames
}

type muxEntry struct {
	h       Handler
	pattern string
}
```

接着我们先来分析 `Handle` 方法和 `HandleFunc` 方法的实现：

```go
// Handle registers the handler for the given pattern.
// If a handler already exists for pattern, Handle panics.
func (mux *ServeMux) Handle(pattern string, handler Handler) {
    // 加锁以并发安全的访问内部的 map
	mux.mu.Lock()
	defer mux.mu.Unlock()

    // 检测 pattern 和 handler 不能为空
	if pattern == "" {
		panic("http: invalid pattern")
	}
	if handler == nil {
		panic("http: nil handler")
	}
    // 如果 pattern 已经存在，直接 panic
	if _, exist := mux.m[pattern]; exist {
		panic("http: multiple registrations for " + pattern)
	}

    // 如果 m 为 nil，则创建
	if mux.m == nil {
		mux.m = make(map[string]muxEntry)
	}
    // 实例化一个 muxEntry，h 为参数中的 handler，pattern 为参数中的 pattern
	e := muxEntry{h: handler, pattern: pattern}
    // 将 pattern 和 e 作为键值对添加到 m 中
	mux.m[pattern] = e
    // 如果 pattern 的最后一个字符为 '/'
	if pattern[len(pattern)-1] == '/' {
        // 将其添加到排序的 es 切片中去
		mux.es = appendSorted(mux.es, e)
	}
    // 如果 pattern 不是以 / 开头，则将 hosts 设置为 true
	if pattern[0] != '/' {
		mux.hosts = true
	}
}

func appendSorted(es []muxEntry, e muxEntry) []muxEntry {
	n := len(es)
	i := sort.Search(n, func(i int) bool {
		return len(es[i].pattern) < len(e.pattern)
	})
	if i == n {
		return append(es, e)
	}
	// we now know that i points at where we want to insert
	es = append(es, muxEntry{}) // try to grow the slice in place, any entry works.
	copy(es[i+1:], es[i:])      // Move shorter entries down
	es[i] = e
	return es
}

// HandleFunc registers the handler function for the given pattern.
func (mux *ServeMux) HandleFunc(pattern string, handler func(ResponseWriter, *Request)) {
	if handler == nil {
		panic("http: nil handler")
	}
	mux.Handle(pattern, HandlerFunc(handler))
}
```

总体来说，`Handle` 和 `HandleFunc` 的源码还是比较简单的，关键的部分在于，如果 pattern 以 "/" 结尾，除了将其添加到 `m` 中以外，还要将其添加到 `es` 中，`es` 为一个排序的从长到短的排序切片，这样就可以方便查找请求 URL 的最长匹配。

下面再来分析最关键的 `ServeHTTP` 方法的源码：

```go
// ServeHTTP dispatches the request to the handler whose
// pattern most closely matches the request URL.
func (mux *ServeMux) ServeHTTP(w ResponseWriter, r *Request) {
	if r.RequestURI == "*" {
		if r.ProtoAtLeast(1, 1) {
			w.Header().Set("Connection", "close")
		}
		w.WriteHeader(StatusBadRequest)
		return
	}
    // 根据请求 r 返回对应的处理器
	h, _ := mux.Handler(r)
    // 调用处理器的 ServeHTTP 方法处理请求
	h.ServeHTTP(w, r)
}

// Handler returns the handler to use for the given request,
// consulting r.Method, r.Host, and r.URL.Path. It always returns
// a non-nil handler. If the path is not in its canonical form, the
// handler will be an internally-generated handler that redirects
// to the canonical path. If the host contains a port, it is ignored
// when matching handlers.
//
// The path and host are used unchanged for CONNECT requests.
//
// Handler also returns the registered pattern that matches the
// request or, in the case of internally-generated redirects,
// the pattern that will match after following the redirect.
//
// If there is no registered handler that applies to the request,
// Handler returns a ``page not found'' handler and an empty pattern.
func (mux *ServeMux) Handler(r *Request) (h Handler, pattern string) {

	// CONNECT requests are not canonicalized.
	if r.Method == "CONNECT" {
		// If r.URL.Path is /tree and its handler is not registered,
		// the /tree -> /tree/ redirect applies to CONNECT requests
		// but the path canonicalization does not.
		if u, ok := mux.redirectToPathSlash(r.URL.Host, r.URL.Path, r.URL); ok {
			return RedirectHandler(u.String(), StatusMovedPermanently), u.Path
		}

		return mux.handler(r.Host, r.URL.Path)
	}

	// All other requests have any port stripped and path cleaned
	// before passing to mux.handler.
	host := stripHostPort(r.Host)
	path := cleanPath(r.URL.Path)

	// If the given path is /tree and its handler is not registered,
	// redirect for /tree/.
	if u, ok := mux.redirectToPathSlash(host, path, r.URL); ok {
		return RedirectHandler(u.String(), StatusMovedPermanently), u.Path
	}

	if path != r.URL.Path {
		_, pattern = mux.handler(host, path)
		u := &url.URL{Path: path, RawQuery: r.URL.RawQuery}
		return RedirectHandler(u.String(), StatusMovedPermanently), pattern
	}

	return mux.handler(host, r.URL.Path)
}

// handler is the main implementation of Handler.
// The path is known to be in canonical form, except for CONNECT methods.
func (mux *ServeMux) handler(host, path string) (h Handler, pattern string) {
    // 加锁
	mux.mu.RLock()
	defer mux.mu.RUnlock()

	// Host-specific pattern takes precedence over generic ones
    // 如果 mux 中存在有 host 注册的模式，则优先进行匹配
	if mux.hosts {
		h, pattern = mux.match(host + path)
	}
    // 如果 h 为 nil，说明上面未匹配成功，进行下一轮匹配
	if h == nil {
		h, pattern = mux.match(path)
	}
    // 如果上一轮匹配还未成功，则返回 Not Found 处理器
	if h == nil {
		h, pattern = NotFoundHandler(), ""
	}
	return
}

// Find a handler on a handler map given a path string.
// Most-specific (longest) pattern wins.
func (mux *ServeMux) match(path string) (h Handler, pattern string) {
	// Check for exact match first.
    // 首先检查精确匹配
	v, ok := mux.m[path]
	if ok {
        // 匹配成功则返回处理器和模式
		return v.h, v.pattern
	}

	// Check for longest valid match.  mux.es contains all patterns
	// that end in / sorted from longest to shortest.
    // 检查最长的合法匹配，mux.es 包含所有的以 / 结尾的模式，并从最长到最短进行排序。
	for _, e := range mux.es {
        // 遍历 mux.es，如果 path 以 e.pattern 为前缀，说明匹配到最长的模式了，返回处理器和模式
		if strings.HasPrefix(path, e.pattern) {
			return e.h, e.pattern
		}
	}
	return nil, ""
}
```

总体来说，`ServeMux` 的匹配算法都比较简单，相信通过上面代码的注释就就可以很快明白其工作原理和实现的机制。

## 参考

- [Golang 中的 ServeMux 路由简介](https://www.bwangel.me/2019/11/30/intro-servemux/)
- [How To Make an HTTP Server in Go](https://www.digitalocean.com/community/tutorials/how-to-make-an-http-server-in-go#inspecting-a-request-s-query-string)
- [An Introduction to Handlers and Servemuxes in Go](https://www.alexedwards.net/blog/an-introduction-to-handlers-and-servemuxes-in-go)
- _Go Web Programing_
