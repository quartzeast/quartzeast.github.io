---
title: 'Go 语言中的嵌入机制'
date: 2022-08-13T15:54:36+08:00
draft: false
author: 'quartzeast'
description: 'Golang Embedding mechanism.'
tags:
  - 'Go'
---

众所周知，Go 并不支持面向对象编程模式中的传统意义上的继承机制。相反，Go 鼓励使用组合（composition）这种方式来扩展类型的功能。组合并不是 Go 特有的概念。[_Compostion over inheritation_](https://en.wikipedia.org/wiki/Composition_over_inheritance) 是 OOP 中的一个知名的原则。

嵌入（_Embedding_）是 Go 语言中的一个重要的特点，它让组合变得更加方便和易用。在本文中，我将介绍 Go 中的以下三种嵌入方式：

- 结构体嵌入结构体（structs in structs）
- 接口嵌入接口（interfaces in interfaces）
- 接口嵌入结构体（interfaces in structs）

## 1. 结构体嵌入结构体

在下面的示例中演示了将一个结构体嵌入到另一个结构体中，本文中我们称嵌入其他结构的结构为『嵌入结构』（embedding struct），而被嵌入的结构就称为『被嵌结构』（embedded struct）：

```go
type Base struct {
  b int
}


type Container struct {     // Container is the embedding struct
  Base                      // Base is the embedded struct
  c string
}
```

`Container` 的实例现在也拥有了字段 `b`。在[规范](https://tip.golang.org/ref/spec)中，它被称为提升字段（promoted field）。我们可以像访问 `c` 一样直接访问它：

```go
co := Container{}
co.b = 1
co.c = "string"
fmt.Printf("co -> {b: %v, c: %v}\n", co.b, co.c)
```

被嵌结构也被称为匿名字段（anonymous field），但所谓匿名字段是有点『用词不当』的，因为这些字段也是有名字的，其名字即为其类型的名字。因此我们也可以通过类型名显式的访问一个被嵌结构的内部字段，如下所示：

```go
fmt.Println(co.Base.b)
```

当提升字段的名字没有命名冲突时，这样做通常是没有必要的，因此 linter 会给出我们这样的提示：`could remove embedded field "Base" from selector`。

然而，当使用结构体字面量时，我们必须将被嵌结构作为一个整体进行初始化，而不仅用其字段进行初始化。提升的字段不能用作结构的复合字面量中的字段进行初始化：

```go
co := Container{Base: Base{b: 10}, c: "foo"}
fmt.Printf("co -> {b: %v, c: %v}\n", co.b, co.c)

co := Container{b: 10, c: "foo"} // unknown field b in struct literal
```

我们都知道，结构体、数组、切片都具有两种类型的复合字面量，一种形式不给定下标或字段名，依赖给定值的顺序进行初始化，另一种形式则如上所示，给定下标或字段名，在这里被嵌结构的字段名正是我们上面所说的类型名。

### 方法

结构体嵌入也适用于方法。假设 `Base` 有此方法：

```go
func (base Base) Describe() string {
  return fmt.Sprintf("base %d belongs to us", base.b)
}
```

我们现在可以在 `Container` 的实例上调用它，就好像它也有这个方法一样：

```go
fmt.Println(cc.Describe())
```

为了更好地理解此调用的机制，我们可以认为 `Container` 类型有一个显式的 `Base` 类型字段并有一个显式的 `Describe` 方法转发该调用：

```go
type Container struct {
  base Base
  c string
}

func (cont Container) Describe() string {
  return cont.base.Describe()
}
```

在上面这个 `Container` 上调用 `Describe` 的效果和我们原来使用嵌入进行调用的效果相同。

这个例子还演示了被嵌结构方法的一个重要且微妙的细节。当调用 `Base` 的 `Describe` 时，它会传递 `Base` 类型作为接收器，无论它是通过哪个嵌入结构调用的。

### 遮蔽（Shadowing）被嵌入的字段

如果嵌入结构有一个字段 `x` 并嵌入也有字段 `x` 的结构会发生什么？在这种情况下，当通过嵌入访问 `x` 时，我们得到的是嵌入结构的字段，被嵌结构的 `x` 被遮蔽了。

```go
type Base struct {
  b   int
  tag string
}

func (base Base) DescribeTag() string {
  return fmt.Sprintf("Base tag is %s", base.tag)
}

type Container struct {
  Base
  c   string
  tag string
}

func (co Container) DescribeTag() string {
  return fmt.Sprintf("Container tag is %s", co.tag)
}
```

当我们这样使用时：

```go
b := Base{b: 10, tag: "b's tag"}
co := Container{Base: b, c: "foo", tag: "co's tag"}

fmt.Println(b.DescribeTag())
fmt.Println(co.DescribeTag())
```

将会输出：

```
Base tag is b's tag
Container tag is co's tag
```

注意在访问 `co.tag` 时，我们得到的是 `Container` 的 `tag` 字段，而不是 `Base` 的被遮蔽的字段。不过，我们可以使用 `co.Base.tag` 显式访问被遮蔽的字段。

### 示例：`sync.Mutex`

以下的示例来自于 Go 标准库。

Go 中 structs-in-structs 嵌入的一个经典示例是 `sync.Mutex`。

```go
// crypto/tls/common.go
type lruSessionCache struct {
  sync.Mutex
  m        map[string]*list.Element
  q        *list.List
  capacity int
}
```

注意 `sync.Mutex` 的嵌入，假设 `cache` 是 `lruSessionCache` 类型的示例，那么我们可以直接使用 `cache.Lock()` 和 `cache.Unlock()`。这在某些情况下很有用，如果锁是结构的公开 API 的一部分，则嵌入互斥锁很方便，这样就不需要显式转发方法了。

但是，锁可能仅由结构的方法在内部使用，而不向其用户公开。在这种情况下，则不应该嵌入 `sync.Mutex`，而是将其设置为非导出的字段（如 `mu sync.Mutex`）。

### 示例：`elf.FileHeader`

上面 `sync.Mutex` 的的示例很好的演示了通过一个结构通过嵌入另一个结构获得新行为的方式。接下来这个例子涉及数据的嵌入，在 `debug/elf/file.go` 有一个描述 `ELF` 文件的结构：

```go
// A FileHeader represents an ELF file header.
type FileHeader struct {
  Class      Class
  Data       Data
  Version    Version
  OSABI      OSABI
  ABIVersion uint8
  ByteOrder  binary.ByteOrder
  Type       Type
  Machine    Machine
  Entry      uint64
}

// A File represents an open ELF file.
type File struct {
  FileHeader
  Sections  []*Section
  Progs     []*Prog
  closer    io.Closer
  gnuNeed   []verneed
  gnuVersym []byte
}
```

`elf` 包的开发者可以直接在 `File` 中列出所有文件 header 字段，但将其放在单独的结构中，可以获得很好的数据分区的自解释性（self-documenting data partitioning）。用户代码可能希望独立于 `File` 来初始化和操作 `FileHeader`，而这里使用嵌入的设计就非常的自然了。

在 `compress/gzip/gunzip.go` 中可以找到类似的示例，其中 `gzip.Reader` 嵌入了 `gzip.Header`。这是一个非常好的嵌入数据可悲多处重用的示例，因为 `gzip.Writer` 也嵌入了 `gzip.Header`，因此这有助于避免复制粘贴。

### 示例：`bufio.ReadWriter`

由于嵌入结构『继承』了被嵌结构的方法，嵌入可以成为实现接口的有用工具。

例如 `bufio` 包中有一个 `bufio.Reader` 类型，指向此类型的指针 `*bufio.Reader` 实现了 `io.Reader`  接口。同样 ` *bufio.Writer` 实现了 `io.Writer`。那么我们如何使用 `bufio` 中的类型创建一个实现了 `io.ReadWriter` 接口的类型？

使用嵌入可以非常简单的实现：

```go
type Reader struct {
		*Reader
  	*Writer
}
```

这个类型『继承』了 `*bufio.Reader` 和 `*bufio.Writer` 的方法，从而实现了 `io.ReadWriter`。这是在不用显式的指定字段名（它们不需要）和不用编写显式转发方法的情况下完成的。

一个稍微复杂的例子是 `context` 包中的 `timerCtx`：

```go
type timerCtx struct {
    cancelCtx
    timer *time.Timer

    deadline time.Time
}
```

为了实现 `Context` 接口，`timerCtx` 嵌入了 `cancelCtx`，其实现了 4 个要求方法中的三个（`Done, Err, Value`）。它自己然后实现了第四个方法——`Deadline`。

## 2. 接口嵌入接口

在一个接口中嵌入另一个接口是 Go 语言中嵌入方式中最简单的一种了，因为接口仅声明了能力，它们并没有为一个类型定义任何新的数据或行为。

以下为 [Effective Go](https://go.dev/doc/effective_go#embedding) 中列出的示例，它展示了一个众所周知的在 Go 标准库中嵌入接口的案例 给定 `io.Reader` 和 `io.Writer` 接口：

```go
type Reader interface {
     Read(p []byte) (n int, err error)
}

type Writer interface {
     Write(p []byte) (n int, err error)
}
```

我们如何为既是 `Reader` 又是 `Writer` 的类型定义接口？一个明确的方法是：

```go
type ReadWriter interface {
     Read(p []byte) (n int, err error)
     Write(p []byte) (n int, err error)
}
```

除了在多个地方重复相同的方法签名这一明显问题之外，这降低了 `ReadWriter` 的可读性，因为它如何与其他两个接口进行组合的方式并不明显。你要么必须牢记每个方法的确切声明，要么继续查看其他接口。

请注意，标准库中有许多这样的接口组合；如 `io.ReadCloser`、`io.WriteCloser`、`io.ReadWriteCloser`、 `io.ReadSeeker`、`io.WriteSeeker`、`io.ReadWriteSeeker` 等。`Read` 方法的声明可能必须在标准库中重复 10 次以上。这将是一种耻辱，但幸运的是接口嵌入提供了完美的解决方案：

```go
type ReadWriter interface {
  	Reader
  	Writer
}
```

除了避免了重复之外，此声明还以最清晰的方式声明了*意图*：为了实现 `ReadWriter`，我们必须实现 `Reader` 和 `Writer`。

## 修复 Go 1.14 中的重叠方法

嵌入接口是可组合的，并且可以按我们的预期工作。例如，给定接口 `A`、`B`、`C` 和 `D`：

```go
type A interface {
  	Amethod()
}

type B interface {
  	A
  	Bmethod()
}

type C interface {
  	Cmethod()
}

type D interface {
    B
    C
    Dmethod()
}
```

`D` 的[方法集](https://tip.golang.org/ref/spec#Method_sets)将由 `Amethod()、Bmethod()、Cmethod()、Dmethod()` 组成。

但是，假设 `C` 被定义为：

```go
type C interface {
    A
    Cmethod()
}
```

一般来说，这不应该改变 `D` 的方法集。但是，在 Go 1.14 之前，这将导致 D出现 `"Duplicate method Amethod"` 错误，因为 `Amethod()` 将被声明两次——一次通过`B`的嵌入，一次通过`C`的嵌入。

[Go 1.14 修复了这个问题](https://github.com/golang/proposal/blob/master/design/6977-overlapping-interfaces.md) ，现在新示例可以正常工作，正如我们所期望的那样。`D` 的方法集是它嵌入的接口的方法集和它自己的方法的*联合。*

一个更实际的例子来自标准库。`io.ReadWriteCloser` 类型定义为：

```go
type ReadWriteCloser interface {
  Reader
  Writer
  Closer
}
```

但它可以更简洁地定义为：

```go
type ReadWriteCloser interface {
    io.ReadCloser
    io.WriteCloser
}
```

在 Go 1.14 之前，由于从 `io.ReadCloser` 和从 `io.WriteCloser` 进来的方法 `Close() `重复，这是不可能的。

### 示例：`net.Error`

`net` 包有自己的错误接口声明：

```go
// An Error represents a network error.
type Error interface {
    error
    Timeout() bool   // Is the error a timeout?
    Temporary() bool // Is the error temporary?
}
```

注意内置 `error` 接口的嵌入。这个嵌入非常清楚地声明了意图：一个 `net.Error` 也是一个`error`。代码的读者想知道他们是否可以这样对待它有一个立即的答案，而不是必须寻找一个 `Error()` 方法的声明并在心里将它与规范的 `error` 进行比较。

### 示例：`heap.Interface`

`heap` 包具有为客户端类型声明的以下接口来实现：

```go
type Interface interface {
  sort.Interface
  Push(x interface{}) // add x as element Len()
  Pop() interface{}   // remove and return element Len() - 1.
}
```

所有实现 `heap.Interface` 的类型也必须实现 `sort.Interface`，它需要 3 种方法，因此编写 `heap.Interface`  而不嵌入将如下所示：

```go
type Interface interface {
    Len() int
    Less(i, j int) bool
    Swap(i, j int)
    Push(x interface{}) // add x as element Len()
    Pop() interface{}   // remove and return element Len() - 1.
}
```

带有嵌入的版本在许多层面上都更胜一筹。最重要的是，它立即明确了一个类型必须首先实现 `sort.Interface` ；从较长版本的模式匹配此信息要棘手得多。

## 3. 接口嵌入结构体

乍一看，这是 Go 支持的最令人困惑的嵌入。目前还不清楚在结构中嵌入接口意味着什么。其实其底层机制非常简单，并且该技术在各种场景中都很有用。

让我们从一个简单的综合示例开始：

```go
type Fooer interface {
  Foo() string
}

type Container struct {
  Fooer
}
```

`Fooer` 是一个接口，`Container` 嵌入了它。struct-in-struct 嵌入中被嵌结构的方法会提升到嵌入结构。嵌入接口的工作方式类似，我们可以把它想象成 `Container` 有一个这样的转发方法：

```go
func (cont Container) Foo() string {
  	return cont.Fooer.Foo()
}
```

但是 `cont.Fooer` 指的是什么？好吧，它只是实现 `Fooer` 接口的任何对象。这个对象是从哪里来的？它是在 `Container` 初始化时或之后分配给 `Container` 的 `Fooer` 字段。这是一个例子：

```go
// sink takes a value implementing the Fooer interface.
func sink(f Fooer) {
  	fmt.Println("sink:", f.Foo())
}

// TheRealFoo is a type that implements the Fooer interface.
type TheRealFoo struct {
}

func (trf TheRealFoo) Foo() string {
  return "TheRealFoo Foo"
}
```

现在我们可以这样做：

```go
co := Container{Fooer: TheRealFoo{}}
sink(co)
```

这将打印 `sink: TheRealFoo Foo`。

这是怎么回事？注意 `Container` 是如何初始化的；嵌入的 `Fooer` 字段被分配了一个 `TheRealFoo` 类型的值。我们只能将实现 `Fooer` 接口的值分配给该字段 - 任何其他值都将被编译器拒绝。由于 `Fooer` 接口嵌入在 `Container`中，它的方法被提升为 `Container` 的方法，这使得 `Container` 也实现了 `Fooer` 接口！这就是为什么我们可以将 `Container` 传递给 `sink` 的原因；如果没有嵌入，`sink(co)` 将无法编译，因为 `co` 不会实现 `Fooer`。

你可能想知道如果`Container` 的内嵌 `Fooer` 字段没有初始化会发生什么；这是一个很好的问题！发生的事情几乎是您所期望的 - 该字段保留其默认值，在接口的情况下为 `nil`。所以这段代码：

```
co := Container{}
sink(co)
```

将导致 `runtime error: invalid memory address or nil pointer dereference`.

这几乎涵盖*了*在结构中嵌入接口的工作原理。剩下的是更重要的问题——我们为什么需要这个？以下示例将展示标准库中的几个用例，但我想从其他地方的一个用例开始，并演示在我看来，这种技术在用户代码中最重要的用途是什么。

### 示例：接口包装器

假设我们想要一个带有一些附加功能的套接字连接，比如计算从中读取的字节总数。我们可以定义以下结构：

```go
type StatsConn struct {
  net.Conn

  BytesRead uint64
}
```

`StatsConn` 现在实现了 `net.Conn` 接口，可以在任何需要 `net.Conn` 的地方使用。当`StatsConn使用为嵌入字段实现``net.Conn`的适当值初始化时，它“继承”该值的所有方法；然而，关键的见解是，我们可以拦截我们希望的任何方法，而保留所有其他方法。为了我们在这个例子中的目的，我们想拦截`Read`方法并记录读取的字节数：

```
func  ( sc  * StatsConn ) 读取( p  [] byte )  ( int ,  error )  { 
  n ,  err  :=  sc 。康涅狄格_ 阅读（p ）
  sc 。BytesRead  +=  uint64 ( n )
  返回 n ,  err 
}
```

对于 `StatsConn` 的用户来说，这种变化是透明的；我们仍然可以调用 `Read`并且它会做我们期望的事情（由于委托给 `sc.Conn.Read`），但它也会做额外的簿记。

如上一节所示，正确初始化`StatsConn`至关重要 ；例如：

```
连接， 错误 ：= 净。如果err ! = nil { log . _ _ _ _ _ _ _ _ _ 致命（错误）} sconn := & StatsConn { conn , 0 } 
    
  

   
```

这里`net.Dial`返回一个实现`net.Conn`的值，因此我们可以使用它来初始化`StatsConn`的嵌入字段。

我们现在可以将`sconn`传递给任何需要`net.Conn` 参数的函数，例如：

```
分别， 错误 ：=  ioutil 。ReadAll ( sconn ) 
if  err  !=  nil  { 
  log . 致命（错误）
}
```

稍后我们可以访问它的`BytesRead`字段来获取总数。

这是*包装*接口的示例。我们创建了一个实现现有接口的新类型，但重用了嵌入值来实现大部分功能。`我们可以通过像这样的显式conn`字段来实现这一点，而无需嵌入：

```
输入 StatsConn 结构 { 
  conn  net 。康恩

   字节读取
uint64 }
```

`然后在net.Conn`接口中为每个方法编写转发方法 ，例如：

```
func  ( sc  * StatsConn ) 关闭() 错误 {
  返回 sc 。康涅狄格州 关闭() 
}
```

然而，`net.Conn`接口有 8 个方法。为所有这些编写转发方法既繁琐又不必要。嵌入接口为我们免费提供了所有这些转发方法，我们可以只覆盖我们需要的那些。

## 示例：sort.Reverse

在 Go 标准库的结构中嵌入接口的经典示例是`sort.Reverse`。这个函数的使用经常让 Go 新手感到困惑，因为它完全不清楚它应该如何工作。

让我们从一个更简单的 Go 排序示例开始，对整数切片进行排序。

```
lst  :=  [] int { 4 ,  5 ,  2 ,  8 ,  1 ,  9 ,  3 }
排序。排序（排序。IntSlice （lst ））fmt 。打印( lst )
```

这将打印`[1 2 3 4 5 8 9]`。它是如何工作的？sort.Sort函数接受一个实现 sort.Interface 接口的参数`，``该`接口定义为：

```
type  Interface  interface  { 
    // Len 是集合中元素的数量。
    Len ()  int 
    // Less 报告
    索引为 i 的元素是否应该排在索引为 j 的元素之前。
    Less ( i ,  j  int )  bool 
    // Swap 交换索引为 i 和 j 的元素。
    交换( i ,  j  int ) 
}
```

如果我们想要使用`sort.Sort`进行排序，我们必须实现这个接口；对于像`int`切片这样的简单类型，标准库提供了像`sort.IntSlice`这样的便利类型，它们接受我们的值并在其上实现`sort.Interface`方法。到目前为止，一切都很好。

那么`sort.Reverse`是如何工作的呢？通过巧妙地使用嵌入在结构中的接口。`排序`包有这个（未导出的）类型来帮助完成任务：

```
类型 反向 结构 {
  排序。接口
}

func  ( r  reverse )  Less ( i ,  j  int )  bool  { 
  return  r . 接口。减( j ,  i ) 
}
```

至此，应该清楚这是做什么的；`reverse`通过嵌入它来实现 `sort.Interface`（只要它使用实现接口的值进行初始化），并且它从该接口拦截单个方法 - `Less`。然后它将它委托给嵌入值的`Less`，但颠倒了参数的顺序。这个`Less`实际上是反向比较元素，这将使排序反向工作。

要完成解决方案，`sort.Reverse`函数很简单：

```
func  Reverse （数据 排序。接口） 排序。接口 {
  返回 &反向{数据} 
}
```

现在我们可以这样做：

```
排序。排序（排序。反向（排序。IntSlice （lst ） ））fmt 。打印( lst )
```

打印`[9 8 5 4 3 2 1]`。这里要理解的关键点是调用`sort.Reverse`本身不会排序或反转任何内容。它可以被看作是一个高阶函数：它产生一个值来包装给它的接口并调整它的功能。`对sort.Sort`的调用是排序发生的地方。

## 示例：context.WithValue

`context`包有一个名为`WithValue`的函数：

```
func  WithValue ( parent  Context ,  key ,  val  interface {}) 上下文
```

`它“返回与key`关联的值为val `的``parent`副本。” 让我们看看它在引擎盖下是如何工作的。````

忽略错误检查，`WithValue`基本上可以归结为：

```
func  WithValue ( parent  Context ,  key ,  val  interface {})  Context  { 
  return  & valueCtx { parent ,  key ,  val } 
}
```

其中`valueCtx`是：

```
类型 valueCtx 结构 {
  上下文
  键,  val 接口{} 
}
```

这是 - 一个再次嵌入接口的结构。`valueCtx`现在实现了`Context`接口，并且可以自由拦截`Context`的 4 个方法中的任何一个。它拦截`Value`：

```
func  ( c  * valueCtx ) 值( key  interface {})  interface {}  { 
  if  c . 键 == 键 {
    返回 c 。val 
  }
  返回 c 。上下文。值（键）
}
```

其余的方法保持不变。

## 示例：使用更受限制的接口降低功能

这种技术相当先进，但它在整个标准库的许多地方都使用过。也就是说，我不认为客户端代码中通常需要它，所以如果你是 Go 新手并且在第一次阅读时没有得到它，不要太担心。在您获得更多围棋经验后回到它。

我们先从`io.ReaderFrom`接口说起：

```
类型 ReaderFrom 接口 { 
    ReadFrom ( r  Reader )  ( n  int64 ,  err  error ) 
}
```

`此接口由可以从io.Reader`有意义地读取数据的类型实现 。例如，`os.File`类型实现了这个接口，并将读取器中的数据读取到它（`os.File`）代表的打开文件中。让我们看看它是如何做到的：

```
func  ( f  * File )  ReadFrom ( r  io.Reader ) ( n int64 , err error ) { if err : = f . _ checkValid （“写” ）；err != nil { return 0 , err } n ,已处理, e := f 。从（r ）如果！处理{     
         
      
  
      
    
    返回 genericReadFrom ( f ,  r ) 
  }
  返回 n ,  f 。wrapErr ( "写" ,  e ) 
}
```

它首先尝试使用特定于操作系统的`readFrom`方法从`r读取。`例如，在 Linux 上，它直接在内核中使用[copy_file_range系统调用在两个文件之间进行非常快速的复制。](https://man7.org/linux/man-pages/man2/copy_file_range.2.html)``

`readFrom`返回一个布尔值，表示它是否成功（已`处理`）。如果不是， `ReadFrom`尝试使用`genericReadFrom`执行“通用”操作，其实现为：

```
func  genericReadFrom ( f  * File ,  r  io.Reader ) ( int64 , error ) { return io.Reader ) _ _ 复制( onlyWriter { f }, r ) }   
    
```

它使用`io.Copy`从`r`复制到`f`，到目前为止一切顺利。但是这个`onlyWriter`包装器是什么？

```
类型 onlyWriter  struct  { 
  io . 作家
}
```

有趣的。所以这是我们现在熟悉的——将接口嵌入到结构中的技巧。但是如果我们在文件中搜索，我们将找不到`onlyWriter`上定义的任何方法，因此它不会拦截任何内容。那为什么需要它呢？

要理解为什么，我们应该看看`io.Copy`做了什么。它的代码很长，所以我不会在这里完全复制它；但要注意的关键部分是，如果它的目的地实现`io.ReaderFrom`，它将调用`ReadFrom`。但这让我们回到了一个圈子，因为当 `File.ReadFrom`被调用时，我们最终进入了`io.Copy 。`这会导致无限递归！``

现在开始明白为什么需要`onlyWriter`了。通过将`f包装在对``io.Copy` 的调用中，`io.Copy`得到的不是实现 `io.ReaderFrom`的类型，而只是实现了`io.Writer`的类型。然后它将调用我们的`File的``Write`方法并避免`ReadFrom`的无限递归陷阱。````

正如我之前提到的，这种技术是先进的。我觉得强调这一点很重要，因为它代表了“在结构中嵌入接口”工具的明显不同用途，并且在整个标准库中普遍使用。

`File`中的用法很好，因为它为`onlyWriter`提供了一个明确命名的类型，这有助于理解它的作用。标准库中的一些代码避开了这种自记录模式并使用匿名结构。例如，在`tar`包中，它完成了：

```
伊奥。复制( struct {  io . Writer  }{ sw },  r )
```
