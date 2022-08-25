---
title: "go 语言中的嵌入机制"
date: 2022-05-22T15:39:11+08:00
draft: false
author: "quartzeast"
description: "golang embedding mechanism."
tags:
  - "go"
---

众所周知，go 并不支持面向对象编程模式中的传统意义上的继承机制。相反，go 鼓励使用组合（composition）这种方式来扩展类型的功能。组合并不是 go 特有的概念。[_compostion over inheritation_](https://en.wikipedia.org/wiki/composition_over_inheritance) 是 oop 中的一个知名的原则。

嵌入（_embedding_）是 go 语言中的一个重要的特点，它让组合变得更加方便和易用。在本文中，我将介绍 go 中的以下三种嵌入方式：

- 结构体嵌入结构体（structs in structs）
- 接口嵌入接口（interfaces in interfaces）
- 接口嵌入结构体（interfaces in structs）

## 1. 结构体嵌入结构体

在下面的示例中演示了将一个结构体嵌入到另一个结构体中，本文中我们称嵌入其他结构的结构为『嵌入结构』（embedding struct），而被嵌入的结构就称为『被嵌结构』（embedded struct）：

```go
type base struct {
  b int
}


type container struct {     // container is the embedding struct
  base                      // base is the embedded struct
  c string
}
```

`container` 的实例现在也拥有了字段 `b`。在[规范](https://tip.golang.org/ref/spec)中，它被称为提升字段（promoted field）。我们可以像访问 `c` 一样直接访问它：

```go
co := container{}
co.b = 1
co.c = "string"
fmt.printf("co -> {b: %v, c: %v}\n", co.b, co.c)
```

被嵌结构也被称为匿名字段（anonymous field），但所谓匿名字段是有点『用词不当』的，因为这些字段也是有名字的，其名字即为其类型的名字。因此我们也可以通过类型名显式的访问一个被嵌结构的内部字段，如下所示：

```go
fmt.println(co.base.b)
```

当提升字段的名字没有命名冲突时，这样做通常是没有必要的，因此 linter 会给出我们这样的提示：`could remove embedded field "base" from selector`。

然而，当使用结构体字面量时，我们必须将被嵌结构作为一个整体进行初始化，而不仅用其字段进行初始化。提升的字段不能用作结构的复合字面量中的字段进行初始化：

```go
co := container{base: base{b: 10}, c: "foo"}
fmt.printf("co -> {b: %v, c: %v}\n", co.b, co.c)

co := container{b: 10, c: "foo"} // unknown field b in struct literal
```

我们都知道，结构体、数组、切片都具有两种类型的复合字面量，一种形式不给定下标或字段名，依赖给定值的顺序进行初始化，另一种形式则如上所示，给定下标或字段名，在这里被嵌结构的字段名正是我们上面所说的类型名。

### 方法

结构体嵌入也适用于方法。假设 `base` 有此方法：

```go
func (base base) describe() string {
  return fmt.sprintf("base %d belongs to us", base.b)
}
```

我们现在可以在 `container` 的实例上调用它，就好像它也有这个方法一样：

```go
fmt.println(cc.describe())
```

为了更好地理解此调用的机制，我们可以认为 `container` 类型有一个显式的 `base` 类型字段并有一个显式的 `describe` 方法转发该调用：

```go
type container struct {
  base base
  c string
}

func (cont container) describe() string {
  return cont.base.describe()
}
```

在上面这个 `container` 上调用 `describe` 的效果和我们原来使用嵌入进行调用的效果相同。

这个例子还演示了被嵌结构方法的一个重要且微妙的细节。当调用 `base` 的 `describe` 时，它会传递 `base` 类型作为接收器，无论它是通过哪个嵌入结构调用的。

### 遮蔽（shadowing）被嵌入的字段

如果嵌入结构有一个字段 `x` 并嵌入也有字段 `x` 的结构会发生什么？在这种情况下，当通过嵌入访问 `x` 时，我们得到的是嵌入结构的字段，被嵌结构的 `x` 被遮蔽了。

```go
type base struct {
  b   int
  tag string
}

func (base base) describetag() string {
  return fmt.sprintf("base tag is %s", base.tag)
}

type container struct {
  base
  c   string
  tag string
}

func (co container) describetag() string {
  return fmt.sprintf("container tag is %s", co.tag)
}
```

当我们这样使用时：

```go
b := base{b: 10, tag: "b's tag"}
co := container{base: b, c: "foo", tag: "co's tag"}

fmt.println(b.describetag())
fmt.println(co.describetag())
```

将会输出：

```
base tag is b's tag
container tag is co's tag
```

注意在访问 `co.tag` 时，我们得到的是 `container` 的 `tag` 字段，而不是 `base` 的被遮蔽的字段。不过，我们可以使用 `co.base.tag` 显式访问被遮蔽的字段。

### 示例：`sync.mutex`

以下的示例来自于 go 标准库。

go 中 structs-in-structs 嵌入的一个经典示例是 `sync.mutex`。

```go
// crypto/tls/common.go
type lrusessioncache struct {
  sync.mutex
  m        map[string]*list.element
  q        *list.list
  capacity int
}
```

注意 `sync.mutex` 的嵌入，假设 `cache` 是 `lrusessioncache` 类型的示例，那么我们可以直接使用 `cache.lock()` 和 `cache.unlock()`。这在某些情况下很有用，如果锁是结构的公开 api 的一部分，则嵌入互斥锁很方便，这样就不需要显式转发方法了。

但是，锁可能仅由结构的方法在内部使用，而不向其用户公开。在这种情况下，则不应该嵌入 `sync.mutex`，而是将其设置为非导出的字段（如 `mu sync.mutex`）。

### 示例：`elf.fileheader`

上面 `sync.mutex` 的的示例很好的演示了通过一个结构通过嵌入另一个结构获得新行为的方式。接下来这个例子涉及数据的嵌入，在 `debug/elf/file.go` 有一个描述 `elf` 文件的结构：

```go
// a fileheader represents an elf file header.
type fileheader struct {
  class      class
  data       data
  version    version
  osabi      osabi
  abiversion uint8
  byteorder  binary.byteorder
  type       type
  machine    machine
  entry      uint64
}

// a file represents an open elf file.
type file struct {
  fileheader
  sections  []*section
  progs     []*prog
  closer    io.closer
  gnuneed   []verneed
  gnuversym []byte
}
```

`elf` 包的开发者可以直接在 `file` 中列出所有文件 header 字段，但将其放在单独的结构中，可以获得很好的数据分区的自解释性（self-documenting data partitioning）。用户代码可能希望独立于 `file` 来初始化和操作 `fileheader`，而这里使用嵌入的设计就非常的自然了。

在 `compress/gzip/gunzip.go` 中可以找到类似的示例，其中 `gzip.reader` 嵌入了 `gzip.header`。这是一个非常好的嵌入数据可悲多处重用的示例，因为 `gzip.writer` 也嵌入了 `gzip.header`，因此这有助于避免复制粘贴。

### 示例：`bufio.readwriter`

由于嵌入结构『继承』了被嵌结构的方法，嵌入可以成为实现接口的有用工具。

例如 `bufio` 包中有一个 `bufio.reader` 类型，指向此类型的指针 `*bufio.reader` 实现了 `io.reader` 接口。同样 ` *bufio.writer` 实现了 `io.writer`。那么我们如何使用 `bufio` 中的类型创建一个实现了 `io.readwriter` 接口的类型？

使用嵌入可以非常简单的实现：

```go
type reader struct {
		*reader
  	*writer
}
```

这个类型『继承』了 `*bufio.reader` 和 `*bufio.writer` 的方法，从而实现了 `io.readwriter`。这是在不用显式的指定字段名（它们不需要）和不用编写显式转发方法的情况下完成的。

一个稍微复杂的例子是 `context` 包中的 `timerctx`：

```go
type timerctx struct {
    cancelctx
    timer *time.timer

    deadline time.time
}
```

为了实现 `context` 接口，`timerctx` 嵌入了 `cancelctx`，其实现了 4 个要求方法中的三个（`done, err, value`）。它自己然后实现了第四个方法——`deadline`。

## 2. 接口嵌入接口

在一个接口中嵌入另一个接口是 go 语言中嵌入方式中最简单的一种了，因为接口仅声明了能力，它们并没有为一个类型定义任何新的数据或行为。

以下为 [effective go](https://go.dev/doc/effective_go#embedding) 中列出的示例，它展示了一个众所周知的在 go 标准库中嵌入接口的案例 给定 `io.reader` 和 `io.writer` 接口：

```go
type reader interface {
     read(p []byte) (n int, err error)
}

type writer interface {
     write(p []byte) (n int, err error)
}
```

我们如何为既是 `reader` 又是 `writer` 的类型定义接口？一个明确的方法是：

```go
type readwriter interface {
     read(p []byte) (n int, err error)
     write(p []byte) (n int, err error)
}
```

除了在多个地方重复相同的方法签名这一明显问题之外，这降低了 `readwriter` 的可读性，因为它如何与其他两个接口进行组合的方式并不明显。你要么必须牢记每个方法的确切声明，要么继续查看其他接口。

请注意，标准库中有许多这样的接口组合；如 `io.readcloser`、`io.writecloser`、`io.readwritecloser`、 `io.readseeker`、`io.writeseeker`、`io.readwriteseeker` 等。`read` 方法的声明可能必须在标准库中重复 10 次以上。这将是一种耻辱，但幸运的是接口嵌入提供了完美的解决方案：

```go
type readwriter interface {
  	reader
  	writer
}
```

除了避免了重复之外，此声明还以最清晰的方式声明了*意图*：为了实现 `readwriter`，我们必须实现 `reader` 和 `writer`。

## 修复 go 1.14 中的重叠方法

嵌入接口是可组合的，并且可以按我们的预期工作。例如，给定接口 `a`、`b`、`c` 和 `d`：

```go
type a interface {
  	amethod()
}

type b interface {
  	a
  	bmethod()
}

type c interface {
  	cmethod()
}

type d interface {
    b
    c
    dmethod()
}
```

`d` 的[方法集](https://tip.golang.org/ref/spec#method_sets)将由 `amethod()、bmethod()、cmethod()、dmethod()` 组成。

但是，假设 `c` 被定义为：

```go
type c interface {
    a
    cmethod()
}
```

一般来说，这不应该改变 `d` 的方法集。但是，在 go 1.14 之前，这将导致 d 出现 `"duplicate method amethod"` 错误，因为 `amethod()` 将被声明两次——一次通过`b`的嵌入，一次通过`c`的嵌入。

[go 1.14 修复了这个问题](https://github.com/golang/proposal/blob/master/design/6977-overlapping-interfaces.md) ，现在新示例可以正常工作，正如我们所期望的那样。`d` 的方法集是它嵌入的接口的方法集和它自己的方法的*联合。*

一个更实际的例子来自标准库。`io.readwritecloser` 类型定义为：

```go
type readwritecloser interface {
  reader
  writer
  closer
}
```

但它可以更简洁地定义为：

```go
type readwritecloser interface {
    io.readcloser
    io.writecloser
}
```

在 go 1.14 之前，由于从 `io.readcloser` 和从 `io.writecloser` 进来的方法 `close() `重复，这是不可能的。

### 示例：`net.error`

`net` 包有自己的错误接口声明：

```go
// an error represents a network error.
type error interface {
    error
    timeout() bool   // is the error a timeout?
    temporary() bool // is the error temporary?
}
```

注意内置 `error` 接口的嵌入。这个嵌入非常清楚地声明了意图：一个 `net.error` 也是一个`error`。代码的读者想知道他们是否可以这样对待它有一个立即的答案，而不是必须寻找一个 `error()` 方法的声明并在心里将它与规范的 `error` 进行比较。

### 示例：`heap.interface`

`heap` 包具有为客户端类型声明的以下接口来实现：

```go
type interface interface {
  sort.interface
  push(x interface{}) // add x as element len()
  pop() interface{}   // remove and return element len() - 1.
}
```

所有实现 `heap.interface` 的类型也必须实现 `sort.interface`，它需要 3 种方法，因此编写 `heap.interface` 而不嵌入将如下所示：

```go
type interface interface {
    len() int
    less(i, j int) bool
    swap(i, j int)
    push(x interface{}) // add x as element len()
    pop() interface{}   // remove and return element len() - 1.
}
```

带有嵌入的版本在许多层面上都更胜一筹。最重要的是，它立即明确了一个类型必须首先实现 `sort.interface` ；从较长版本的模式匹配此信息要棘手得多。

## 3. 接口嵌入结构体

初看这是 go 中所支持的最令人困惑的嵌入。目前还不清楚在结构中嵌入接口的含义是什么，但其实其底层机制非常简单，并且该技术在各种场景中都很有用。

```go
type fooer interface {
  foo() string
}

type container struct {
  fooer
}
```

如上所示，在 `container` 结构体中嵌入了 `fooer` 接口。struct-in-struct 的嵌入中被嵌结构的方法会提升到嵌入结构。嵌入接口的工作方式也类似，我们可以认为 `container` 有一个这样的转发方法：

```go
func (cont container) foo() string {
  	return cont.fooer.foo()
}
```

那么 `cont.fooer` 指的又是什么呢？好吧，它其实只是实现了 `fooer` 接口的任何对象。这个对象是从哪里来的？它是在 `container` 初始化时或之后分配给 `container` 的 `fooer` 字段的。

```go
// sink 接收实现了 fooer 接口的值
func sink(f fooer) {
  	fmt.println("sink:", f.foo())
}

// therealfoo 是一个实现了 fooer 接口的类型
type therealfoo struct {
}

func (trf therealfoo) foo() string {
  return "therealfoo foo"
}
```

现在我们可以这样做：

```go
co := container{fooer: therealfoo{}}
sink(co)
```

输出的结果为 `sink: therealfoo foo`。

为什么 `co` 也能作为 `sink` 的参数呢？注意 `container` 在初始化时，嵌入的 `fooer` 字段被分配了一个 `therealfoo` 类型的值。我们只能将实现 `fooer` 接口的值分配给该字段 - 任何其他值都将被编译器拒绝。由于 `fooer` 接口嵌入在 `container` 中，它的方法被提升为 `container` 的方法，这使得 `container` 也实现了 `fooer` 接口！这就是为什么我们可以将 `container` 传递给 `sink` 的原因；如果没有嵌入，`sink(co)` 将无法编译，因为 `co` 不会实现 `fooer`。

那么当 `container` 的内嵌 `fooer` 字段没有初始化时 - 该字段将保留其默认值，接口的零值为 `nil`。所以这段代码：

```
co := container{}
sink(co)
```

将导致 `runtime error: invalid memory address or nil pointer dereference`.

这几乎涵盖了在结构中嵌入接口的工作原理。剩下的是更重要的问题，我们为什么需要在结构中嵌入接口？

### 示例：接口包装器（wrapper）

假设我们想要一个带有一些额外功能的 socket 连接，比如计算从中读取的字节总数。我们可以定义以下结构：

```go
type statsconn struct {
  net.conn

  bytesread uint64
}
```

`statsconn` 现在实现了 `net.conn` 接口，可以在任何需要 `net.conn` 的地方使用它。当为 `statsconn` 的嵌入字段提供了正确实现了 `net.conn ` 接口的值时，它「继承」该值的所有方法；关键的思想在于，我们可以拦截想要拦截的方法，而保留所有其他方法。如下我们想拦截 `read` 方法并记录读取的字节数：

```go
func (sc *statsconn) read(p []byte) (int, error) {
    n, err := sc.conn.read(p)
    sc.bytesread += uint64(n)
    return n, err
}
```

对于 `statsconn` 的使用者来说，这种变化是透明的；我们仍然可以调用 `read` 并且它会做我们期望的事情（由于委托给 `sc.conn.read`），但它也会做额外的记录。

如上一节所示，正确初始化 `statsconn` 至关重要，例如：

```go
conn, err := net.dial("tcp", u.host+":80")
if err != nil {
  log.fatal(err)
}
sconn := &statsconn{conn, 0}
```

这里 `net.dial` 返回一个实现了 `net.conn` 的值，因此我们可以使用它来初始化 `statsconn` 的嵌入字段。

我们现在可以将 `sconn` 传递给任何需要 `net.conn` 参数的函数，例如：

```go
resp, err := ioutil.readall(sconn)
if err != nil {
  log.fatal(err)
}
```

稍后我们可以访问它的 `bytesread` 字段来获取读取的字节总数。

这是*包装（wrapping）*一个接口的示例。我们创建一个实现已有接口的新类型，并且通过重用嵌入值来实现大部分功能。我们也可以下面这样不使用嵌入，而使用显式的 `conn` 字段来实现：

```go
type statsconn struct {
    conn net.conn

    bytesread uint64
}
```

然后为 `net.conn` 接口中为每个方法编写转发方法，例如：

```go
func (sc *statsconn) close() error {
  return sc.conn.close()
}
```

然而，`net.conn` 接口有 8 个方法。为所有这些方法编写转发方法既繁琐又不必要。嵌入接口为我们免费提供了所有这些转发方法，我们可以只覆盖我们想要覆盖的那些方法。

### 示例：`sort.reverse`

在 go 标准库的结构中嵌入接口的经典示例是 `sort.reverse`。

让我们从一个更简单的 go 排序示例开始，对整数切片进行排序。

```go
lst := []int{4, 5, 2, 8, 1, 9, 3}
sort.sort(sort.intslice(lst))
fmt.println(lst)
```

这将打印 `[1 2 3 4 5 8 9]`。它是如何工作的？`sort.sort` 函数接受一个实现 `sort.interface` 接口的参数，该接口定义为：

```go
type Interface interface {
    // Len is the number of elements in the collection.
    Len() int
    // Less reports whether the element with
    // index i should sort before the element with index j.
    Less(i, j int) bool
    // Swap swaps the elements with indexes i and j.
    Swap(i, j int)
}
```

如果我们想要使用 `sort.Sort` 进行排序，我们必须实现这个接口；对于像 `int` 切片这样的简单类型，标准库提供了像 `sort.IntSlice` 这样的便利类型，它们接收切片并在其上实现 `sort.Interface` 的方法。

那么 `sort.Reverse` 是如何工作的呢？通过巧妙地在结构中嵌入接口。`sort` 包有下面这个（未导出的）类型来帮助完成任务：

```go
type reverse struct {
  sort.Interface
}

func (r reverse) Less(i, j int) bool {
  return r.Interface.Less(j, i)
}
```

`reverse` 通过嵌入来实现 `sort.Interface`（只要它使用实现接口的值进行初始化），并且它从该接口拦截（intercept）方法 `Less`。然后它将它委托给嵌入值的 `Less`，但颠倒了参数的顺序。这个 `Less` 实际上是反向比较元素，这将使排序反向工作。

要完成解决方案，`sort.Reverse` 函数很简单：

```go
func Reverse(data sort.Interface) sort.Interface {
  return &reverse{data}
}
```

现在我们可以这样做：

```go
sort.Sort(sort.Reverse(sort.IntSlice(lst)))
fmt.Println(lst)
```

打印 `[9 8 5 4 3 2 1]`。这里要理解的关键点是调用 `sort.Reverse` 本身不会排序或反转任何内容。它可以被看作是一个高阶函数：它产生一个值来包装给它的接口并调整它的功能。对 `sort.Sort` 的调用是排序发生的地方。

## 示例：`context.WithValue`

`context` 包有一个称为 `WithValue` 的函数：

```go
func WithValue(parent Context, key, val interface{}) Context
```

这个函数返回其父 `Context` 的拷贝，并且其 `key` 相关联的值是 `val`。

忽略错误检查，`WithValue` 基本上可以归结为：

```go
func WithValue(parent Context, key, val interface{}) Context {
  return &valueCtx{parent, key, val}
}
```

其中 `valueCtx` 是：

```go
type valueCtx struct {
  Context
  key, val interface{}
}
```

这又是一个嵌入接口的结构。`valueCtx` 现在实现了 `Context` 接口，并且可以自由的拦截 `Context` 的 4 个方法中的任何一个。它拦截了 `Value`：

```go
func (c *valueCtx) Value(key interface{}) interface{} {
  if c.key == key {
    return c.val
  }
  return c.Context.Value(key)
}
```

其余的方法保持不变。

### 示例：使用更受限制的接口降级功能

我们先从 `io.ReaderFrom` 接口说起：

```go
type ReaderFrom interface {
    ReadFrom(r Reader) (n int64, err error)
}
```

此接口由可以从 `io.Reader` 有意义地读取数据的类型实现。例如，`os.File` 类型实现了这个接口，并将 reader 中的数据读取到它（`os.File`）代表的打开文件中。让我们看看它是如何做到的：

```go
func (f *File) ReadFrom(r io.Reader) (n int64, err error) {
    if err := f.checkValid("write"); err != nil {
      return 0, err
    }
    n, handled, e := f.readFrom(r)
    if !handled {
      return genericReadFrom(f, r)
    }
    return n, f.wrapErr("write", e)
}
```

它首先尝试使用特定于操作系统的 `readFrom` 方法从 `r` 读取。例如，在 Linux 上，它直接在内核中使用 [copy_file_range](https://man7.org/linux/man-pages/man2/copy_file_range.2.html) 系统调用在两个文件之间进行非常快速的复制。

`readFrom` 返回一个布尔值表示它是否成功（handled）。如果没有成功，`ReadFrom` 尝试使用 `genericReadFrom` 执行「通用」操作，其实现为：

```go
func genericReadFrom(f *File, r io.Reader) (int64, error) {
    return io.Copy(onlyWriter{f}, r)
}
```

它使用 `io.Copy` 从 `r` 复制到 `f`，到目前为止一切顺利。但是这个 `onlyWriter` 包装器是什么？

```go
type onlyWriter struct {
    io.Writer
}
```

有意思，所以这是我们现在熟悉的——将接口嵌入到结构中的技巧。但是如果我们在文件中搜索，我们将找不到 `onlyWriter` 上定义的任何方法，因此它不会拦截任何内容。那为什么需要它呢？

要理解为什么，我们应该看看 `io.Copy` 做了什么。它的代码很长，所以我不会在这里完全复制它；但要注意的关键部分是，如果它的 dest 实现 `io.ReaderFrom`，它将调用 `ReadFrom`。但这让我们回到了一个圈子，因为当 `File.ReadFrom` 被调用时，我们最终进入了`io.Copy` 。这会导致无限递归！

现在开始明白为什么需要 `onlyWriter` 了。通过将 `f` 包装在对 `io.Copy` 的调用中，`io.Copy` 得到的不是实现 `io.ReaderFrom` 的类型，而只是实现了 `io.Writer` 的类型。然后它将调用我们的 `File`的 `Write` 方法并避免 `ReadFrom` 的无限递归陷阱。

正如我之前提到的，这种技术是先进的。我觉得强调这一点很重要，因为它代表了「在结构中嵌入接口」工具的明显不同用途，并且在整个标准库中普遍使用。

`File` 中的用法很好，因为它为 `onlyWriter` 提供了一个明确命名的类型，这有助于理解它的作用。标准库中的一些代码避开了这种自记录模式并使用匿名结构。例如，在 `tar` 包中，它完成了：

```go
io.Copy(struct{ io.Writer }{sw}, r)
```
