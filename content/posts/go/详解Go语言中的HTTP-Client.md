---
title: "详解 Go 语言中的 HTTP Client"
date: 2022-09-05T11:20:17+08:00
draft: false
author: "Hugo Authors"
description: "详细分析 http 包中的 Client"
tags:
  - "Go"
  - "Web"
---

`net/http` 标准库中的 `Tranport` 和 `RoundTripper` 是 Go 语言中发送 HTTP 请求的基石，本文将从源码的角度来分析 `Client` 是如何组成的？以及通过实例来演示如何对其进行有效的控制。

## 什么是 RoundTripper？

下面是 `RoundTripper` 的源代码。

```go
type RoundTripper interface {
	RoundTrip(*Request) (*Response, error)
}
```

`RoundTripper` 是一个接口，代表着执行一个 HTTP 事务的能力，即对给定的请求获取响应。`RoundTripper` 对于多个 goroutine 的并发使用必须是安全的。

以下是 `RoundTrip` 方法的文档：

> RoundTrip executes a single HTTP transaction, returning a Response for the provided Request.
>
> RoundTrip should not attempt to interpret the response. In particular, RoundTrip must return err == nil if it obtained a response, regardless of the response's HTTP status code. A non-nil err should be reserved for failure to obtain a response. Similarly, RoundTrip should not attempt to handle higher-level protocol details such as redirects, authentication, or cookies.
> RoundTrip should not modify the request, except for consuming and closing the Request's Body. RoundTrip may read fields of the request in a separate goroutine. Callers should not mutate or reuse the request until the Response's Body has been closed.
> RoundTrip must always close the body, including on errors, but depending on the implementation may do so in a separate goroutine even after RoundTrip returns. This means that callers wanting to reuse the body for subsequent requests must arrange to wait for the Close call before doing so.
>
> The Request's URL and Header fields must be initialized.

由上可知，`RoundTrip` 的文档给实现者提了几点要求：

- `RoundTrip` 不应该尝试去解释收到的响应
- 如果 `RoundTrip` 获取了一个响应，无论该响应的 HTTP 状态码是什么，`RoundTrip` 都必须返回 `err == nil`。非 `nil` 的 `err` 应该保留给当获取不到响应的情况
- `RoundTrip` 不应该尝试处理更高层次的协议细节，比如重定向，校验或 cookies
- `RoundTrip` 不应该修改请求，除非是消耗或关闭 `Request` 的 `Body`
- `RoundTrip` 可能在独立的 goroutine 中读取请求的字段。在关闭 `Response` 的 `Body` 前，调用者不应改变或重用请求
- `RoundTrip` 必须始终关闭 `Body`，包括在错误时，但根据实现，即使在 `RoundTrip` 返回之后，也可能在单独的 goroutine 中这样做。这意味着想要为后续请求重用 `Body` 的调用者必须安排在执行此操作之前等待 `Close` 调用
- 必须初始化 `Request` 的 `URL` 和 `Header` 字段

综上所述，`RoundTripper` 代表着这样一个东西，它具有执行单个 HTTP 事物的能力，即发起一个请求，并获取一个响应。拥有这样能力的东西必须实现 `RoundTrip` 方法，因此它就是一个所谓的 `RoundTripper`。那么在 Go 语言中，什么类型实现了 `RoundTrip` 方法，可视为一个 `RoundTripper` 呢？没错，就是下面要介绍的 `Transport`。

## 什么是 `Transport`？

下面是 `Transport` 的源码：

```go
type Transport struct {
	idleMu       sync.Mutex
	closeIdle    bool                                // user has requested to close all idle conns
	idleConn     map[connectMethodKey][]*persistConn // most recently used at end
	idleConnWait map[connectMethodKey]wantConnQueue  // waiting getConns
	idleLRU      connLRU

	reqMu       sync.Mutex
	reqCanceler map[cancelKey]func(error)

	altMu    sync.Mutex   // guards changing altProto only
	altProto atomic.Value // of nil or map[string]RoundTripper, key is URI scheme

	connsPerHostMu   sync.Mutex
	connsPerHost     map[connectMethodKey]int
	connsPerHostWait map[connectMethodKey]wantConnQueue // waiting getConns
	Proxy func(*Request) (*url.URL, error)
	DialContext func(ctx context.Context, network, addr string) (net.Conn, error)
	Dial func(network, addr string) (net.Conn, error)
	DialTLSContext func(ctx context.Context, network, addr string) (net.Conn, error)
	DialTLS func(network, addr string) (net.Conn, error)
	TLSClientConfig *tls.Config
	TLSHandshakeTimeout time.Duration
	DisableKeepAlives bool
	DisableCompression bool
	MaxIdleConns int
	MaxIdleConnsPerHost int
	MaxConnsPerHost int
	IdleConnTimeout time.Duration
	ResponseHeaderTimeout time.Duration
	ExpectContinueTimeout time.Duration
	TLSNextProto map[string]func(authority string, c *tls.Conn) RoundTripper
	ProxyConnectHeader Header
	GetProxyConnectHeader func(ctx context.Context, proxyURL *url.URL, target string) (Header, error)
	MaxResponseHeaderBytes int64
	WriteBufferSize int
	ReadBufferSize int
	nextProtoOnce      sync.Once
	h2transport        h2Transport // non-nil if http2 wired up
	tlsNextProtoWasNil bool        // whether TLSNextProto was nil when the Once fired
	ForceAttemptHTTP2 bool
}
```

`Transport` 是一个结构体，拥有多个字段和方法。下面是它的文档：

> `Transport` is an implementation of `RoundTripper` that supports HTTP, HTTPS, and HTTP proxies (for either HTTP or HTTPS with CONNECT).
>
> By default, `Transport` caches connections for future re-use. This may leave many open connections when accessing many hosts. This behavior can be managed using `Transport`'s `CloseIdleConnections` method and the `MaxIdleConnsPerHost` and `DisableKeepAlives` fields.
>
> Transports should be reused instead of created as needed. Transports are safe for concurrent use by multiple goroutines.
>
> A `Transport` is a low-level primitive for making HTTP and HTTPS requests. For high-level functionality, such as cookies and redirects, see `Client`.
>
> `Transport` uses HTTP/1.1 for HTTP URLs and either HTTP/1.1 or HTTP/2 for HTTPS URLs, depending on whether the server supports HTTP/2, and how the `Transport` is configured. The `DefaultTransport` supports HTTP/2. To explicitly enable HTTP/2 on a transport, use `golang.org/x/net/http2` and call `ConfigureTransport`. See the package docs for more about HTTP/2.
>
> Responses with status codes in the `1xx` range are either handled automatically (100 expect-continue) or ignored. The one exception is HTTP status code 101 (Switching Protocols), which is considered a terminal status and returned by `RoundTrip`. To see the ignored 1xx responses, use the httptrace trace package's `ClientTrace.Got1xxResponse`.
>
> `Transport` only retries a request upon encountering a network error if the request is idempotent and either has no body or has its `Request.GetBody` defined. HTTP requests are considered idempotent if they have HTTP methods GET, HEAD, OPTIONS, or TRACE; or if their Header map contains an "Idempotency-Key" or "X-Idempotency-Key" entry. If the idempotency key value is a zero-length slice, the request is treated as idempotent but the header is not sent on the wire.

我们先不管官方文档对 `Transport` 的定义，先从字面意义上来理解 transport 和 round-trip。transport 的含义为：

- (v) take or carry (people or goods) from one place to another by means of a vehicle, aircraft, or ship.
- (n) a system or means of conveying people or goods from place to place by means of a vehicle, aircraft, or ship.

而 round-trip 的含义为：

- a journey to a place and back again, along the same route.

从字面含义理解，transport 可以做动词和名词，表示将人或商品从一个地方运输到另一个地方，通过汽车，飞机或轮船等交通工具，或者表示具有这种能力的一种系统或方式。round-trip 表示往返的行程。所以 Go 中的 `Transport` 代表的就是 HTTP 通信中的交通工具，可以将数据、信息传输到目的地，而且它具有 **往返** 的能力，因为其实现了 `RoundTripper` 接口（`RoundTripper` 接口描述的就是能往返传输数据的事物），所以 `Transport` 可以将 `Request` 运输到服务端，并将服务端的 `Response` 携带回客户端。

既然我们理解了 `Transport` 是什么，那么我们再来看看官方文档是怎么对其进行描述的。

> `Transport` 是 `RoundTripper` 的一个实现，它支持 HTTP、HTTPS 和 HTTP 代理（对于带有 `CONNECT` 的 HTTP 或 HTTPS）。

同时官方文档还对 `Transport` 的一些特性进行了详细的说明。

### `Transport` 的 `RountTrip` 方法

```go
// RoundTrip implements the RoundTripper interface.
//
// For higher-level HTTP client support (such as handling of cookies
// and redirects), see Get, Post, and the Client type.
//
// Like the RoundTripper interface, the error types returned
// by RoundTrip are unspecified.
func (t *Transport) RoundTrip(req *Request) (*Response, error) {
	return t.roundTrip(req)
}

// roundTrip implements a RoundTripper over HTTP.
func (t *Transport) roundTrip(req *Request) (*Response, error) {
	t.nextProtoOnce.Do(t.onceSetNextProtoDefaults)
	ctx := req.Context()
	trace := httptrace.ContextClientTrace(ctx)

    // 如果未设置 URL，关闭 Body，并且返回 nil 和错误
	if req.URL == nil {
		req.closeBody()
		return nil, errors.New("http: nil Request.URL")
	}
    // 如果未设置首部，关闭 Body，并且返回 nil 和错误
    // 可知符合 RoundTrip 方法的要求——必须初始化 uRL 和 Header
	if req.Header == nil {
		req.closeBody()
		return nil, errors.New("http: nil Request.Header")
	}
    // 获取 URL 的 Scheme，并且判断是否是 http 或 https 协议
	scheme := req.URL.Scheme
	isHTTP := scheme == "http" || scheme == "https"
	if isHTTP {
        // 如果为 HTTP 协议，遍历 Header
		for k, vv := range req.Header {
            // 校验首部字段名，如果某个首部字段不合法，立即关闭 Body 并返回错误
			if !httpguts.ValidHeaderFieldName(k) {
				req.closeBody()
				return nil, fmt.Errorf("net/http: invalid header field name %q", k)
			}
            // 校验首部字段值，如果某个首部字段值不合法，立即关闭 Body 并返回错误
			for _, v := range vv {
				if !httpguts.ValidHeaderFieldValue(v) {
					req.closeBody()
					return nil, fmt.Errorf("net/http: invalid header field value %q for key %v", v, k)
				}
			}
		}
	}

	origReq := req
	cancelKey := cancelKey{origReq}
	req = setupRewindBody(req)

	if altRT := t.alternateRoundTripper(req); altRT != nil {
		if resp, err := altRT.RoundTrip(req); err != ErrSkipAltProtocol {
			return resp, err
		}
		var err error
		req, err = rewindBody(req)
		if err != nil {
			return nil, err
		}
	}
    // 如果不是 HTTP 协议，立即关闭 Body 并返回错误
	if !isHTTP {
		req.closeBody()
		return nil, badStringError("unsupported protocol scheme", scheme)
	}

    // 如果请求方法为空或校验不合法，立即关闭 Body 并返回错误
	if req.Method != "" && !validMethod(req.Method) {
		req.closeBody()
		return nil, fmt.Errorf("net/http: invalid method %q", req.Method)
	}
    // 如果 URL 的 Host 为空，立即关闭 Body 并返回错误
	if req.URL.Host == "" {
		req.closeBody()
		return nil, errors.New("http: no Host in request URL")
	}

    // 以上校验通过，进入执行 HTTP 事物逻辑
	for {
		select {
		case <-ctx.Done():
			req.closeBody()
			return nil, ctx.Err()
		default:
		}

		// treq gets modified by roundTrip, so we need to recreate for each retry.
		treq := &transportRequest{Request: req, trace: trace, cancelKey: cancelKey}
		cm, err := t.connectMethodForRequest(treq)
		if err != nil {
			req.closeBody()
			return nil, err
		}

		// Get the cached or newly-created connection to either the
		// host (for http or https), the http proxy, or the http proxy
		// pre-CONNECTed to https server. In any case, we'll be ready
		// to send it requests.
		pconn, err := t.getConn(treq, cm)
		if err != nil {
			t.setReqCanceler(cancelKey, nil)
			req.closeBody()
			return nil, err
		}

		var resp *Response
		if pconn.alt != nil {
			// HTTP/2 path.
			t.setReqCanceler(cancelKey, nil) // not cancelable with CancelRequest
			resp, err = pconn.alt.RoundTrip(req)
		} else {
			resp, err = pconn.roundTrip(treq)
		}
		if err == nil {
			resp.Request = origReq
			return resp, nil
		}

		// Failed. Clean up and determine whether to retry.
		if http2isNoCachedConnError(err) {
			if t.removeIdleConn(pconn) {
				t.decConnsPerHost(pconn.cacheKey)
			}
		} else if !pconn.shouldRetryRequest(req, err) {
			// Issue 16465: return underlying net.Conn.Read error from peek,
			// as we've historically done.
			if e, ok := err.(transportReadFromServerError); ok {
				err = e.err
			}
			return nil, err
		}
		testHookRoundTripRetried()

		// Rewind the body if we're able to.
		req, err = rewindBody(req)
		if err != nil {
			return nil, err
		}
	}
}
```

### `DefaultTransport`

下面是 `DefaultTransport` 的源代码：

```go
var DefaultTransport RoundTripper = &Transport{
	Proxy: ProxyFromEnvironment,
	DialContext: (&net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}).DialContext,
	ForceAttemptHTTP2:     true,
	MaxIdleConns:          100,
	IdleConnTimeout:       90 * time.Second,
	TLSHandshakeTimeout:   10 * time.Second,
	ExpectContinueTimeout: 1 * time.Second,
}
```

`DefaultTransport` 是 `net/http` 的一个全局变量，`DefaultTransport` 是 `Transport` 的默认实现，由 `DefaultClient` 使用。它根据需要建立网络连接并缓存它们以供后续调用重用。它使用由 `$HTTP_PROXY` 和 `$NO_PROXY`（或 `$http_proxy` 和 `$no_proxy`）环境变量指示的 HTTP 代理。

## 参考

- [http.Client 的连接行为控制详解](https://tonybai.com/2021/04/02/go-http-client-connection-control/)
