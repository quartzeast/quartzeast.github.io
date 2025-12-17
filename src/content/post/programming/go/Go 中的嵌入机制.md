---
title: Go 中的嵌入机制
description: Go 语言中的嵌入：组合优于继承的实践与示例
publishDate: 27 June 2024
tags:
  - go
---

Go 语言并不支持传统意义上的继承，相反，它提倡使用组合 (composition) 作为扩展类型功能的方式。这并不是 Go 独有的理念，组合优于继承 (Composition over inheritance) 是面向对象编程中的一个著名原则，在《设计模式》(Design Patterns) 这本书的第一章就有详细论述。

嵌入 (Embedding) 是 Go 语言中一个重要特性，它使得组合变得更加便捷和实用。虽然 Go 一直致力于保持简洁，但在嵌入这个特性上，问题本身的复杂性还是不可避免地显现出来。在这一系列简短的文章中，我将介绍 Go 支持的不同类型的嵌入方式，并提供真实代码示例（主要来自 Go 标准库）。

Go 中有三种类型的嵌入：

1. 结构体中嵌入结构体
2. 接口中嵌入接口
3. 结构体中嵌入接口

## 结构体中嵌入结构体

让我们从一个简单的示例开始，这个示例演示了在一个结构体中嵌入另一个结构体：

```go
type Base struct {
	b int
}

type Container struct { // Container 是嵌入结构体
	Base // Base 是被嵌入的结构体
	c    string
}
```

此时 Container 的实例也会拥有字段 b。在 Go 语言规范中，这被称为提升 (promoted) 字段。我们可以像访问字段 c 一样直接访问它：

```go
co := Container{}
co.b = 1
co.c = "string"
fmt.Printf("co -> {b: %v, c: %v}\n", co.b, co.c)
```

然而，在使用结构体字面量时，我们必须整体初始化被嵌入的结构体，而不是直接初始化它的字段。提升的字段不能在结构体的复合字面量中直接用作字段名：

```go
co := Container{Base: Base{b: 10}, c: "foo"}
fmt.Printf("co -> {b: %v, c: %v}\\n", co.b, co.c)
```

需要注意的是，co.b 的访问方式是一种语法糖；我们也可以更明确地使用 co.Base.b 来访问。

#### 方法

结构体嵌入也能很好地与方法配合使用。假设我们为 Base 提供了这样一个方法：

```go
func (base Base) Describe() string {
	return fmt.Sprintf("base %d belongs to us", base.b)
}
```

现在我们可以在 Container 的实例上直接调用这个方法，就像它本身也拥有这个方法一样：

```go
fmt.Println(co.Describe()) //
```

为了更好地理解这个调用的机制，我们可以把 Container 想象成拥有一个显式的 Base 类型字段和一个显式的转发方法：

```go
type Container struct {
	base Base
	c    string
}

func (cont Container) Describe() string {
	return cont.base.Describe()
}
```

使用这种替代方式调用 Describe 的效果与我们使用嵌入的原始版本类似。

这个例子还展示了嵌入字段的方法行为中的一个重要细节：当调用 Base 的 Describe 方法时，无论是通过哪个嵌入结构体（指嵌入了 Base 的结构体）调用，它都会传递一个 Base 接收者。这与 Python 和 C++ 等其他语言中的继承不同，在那些语言中，继承的方法会获得对它们进行调用的子类的引用。这是 Go 中的嵌入区别于传统继承的一个关键特征。

#### 嵌入字段的遮蔽

当嵌入结构体有一个字段 x，并且它嵌入的结构体也有一个字段 x 时会发生什么？在这种情况下，通过嵌入结构体访问 x 时，我们会得到嵌入结构体的字段，而被嵌入结构体的 x 字段会被遮蔽 (shadowed)。

下面是一个示例：

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

当这样使用时：

```go
b := Base{b: 10, tag: "b's tag"} // 创建一个 Base 的实例 b
co := Container{Base: b, c: "foo", tag: "co's tag"} // 创建一个 Container 的实例 co

fmt.Println(b.DescribeTag())
fmt.Println(co.DescribeTag()) // 取的是 Container 的 DescribeTag，并在方法内是 co.tag 取的是 Container 的 tag
```

输出结果为：

```go
Base tag is b's tag
Container tag is co's tag
```

需要注意的是，当访问 co.tag 时，我们获取的是 Container 的 tag 字段，而不是通过 Base 遮蔽得到的字段。不过，我们可以通过 co.Base.tag 显式地访问 Base 中的 tag 字段。

#### 示例：sync.Mutex - 获得能力

以下示例均来自 Go 标准库。

Go 中结构体嵌入结构体的一个经典示例是 sync.Mutex。这是来自 crypto/tls/common.go 的 lruSessionCache 的实现：

```go
type lruSessionCache struct {
      sync.Mutex
      m        map[string]*list.Element
      q        *list.List
      capacity int
}
```

注意这里嵌入了 sync.Mutex；现在如果有一个 lruSessionCache 类型的 cache 对象，我们可以直接调用 cache.Lock() 和 cache.Unlock()。这种方式在某些场景下很有用，但并非总是适用。如果锁操作是结构体公开 API 的一部分，那么嵌入互斥锁确实很方便，可以避免编写显式的转发方法。

不过，有时锁可能仅在结构体的方法内部使用，而不需要暴露给用户。这种情况下，就不应该嵌入 sync.Mutex，而应该将其作为一个未导出的字段（比如 `mu sync.Mutex`）。

#### 示例：elf.FileHeader - 数据分区

sync.Mutex 的嵌入很好地展示了如何通过结构体嵌入来获得新的行为特性。另外还有一个关于数据嵌入的不同示例。在 elf 包的文件中（debug/elf/file.go），我们可以找到描述 ELF 文件的结构体定义：

```go
// FileHeader 表示 ELF 文件头
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

// File 表示一个打开的 ELF 文件
type File struct {
	FileHeader
	Sections  []*Section
	Progs     []*Prog
	closer    io.Closer
	gnuNeed   []verneed
	gnuVersym []byte
}
```

elf 包的开发者本可以直接在 File 结构体中列出所有的头部字段，但将它们放在单独的结构体中是一个很好的自文档化数据分区示例。用户代码可能需要独立于 File 来初始化和操作 FileHeader，而这种嵌入式设计使得这种操作变得自然。

在 gzip 包中也能找到类似的例子，其中 gzip.Reader 嵌入了 gzip.Header。这是一个很好的数据重用示例，因为 gzip.Writer 也嵌入了相同的 gzip.Header，从而避免了代码重复。

#### 示例：bufio.ReadWriter - 实现接口

由于嵌入结构体会「继承」被嵌入结构体的方法（但不是传统意义上的继承，如前所述），嵌入可以成为实现接口的有效工具。

以 bufio 包为例，它有 bufio.Reader 类型。这个类型的指针实现了 io.Reader 接口。同样，\*bufio.Writer 也实现了 io.Writer 接口。那么，如何创建一个实现 io.ReadWriter 接口的 bufio 类型呢？

通过嵌入可以非常容易地实现：

```go
type ReadWriter struct {
  	*Reader
  	*Writer
}
```

这个类型继承了 bufio.Reader 和 bufio.Writer 的方法，从而实现了 io.ReadWriter 接口。这种实现不需要为字段指定显式名称（因为不需要），也不需要编写显式的转发方法。

context 包中的 timerCtx 是一个稍微复杂的例子：

```go
type timerCtx struct {
  	cancelCtx
  	timer *time.Timer

  	deadline time.Time
}
```

为了实现 Context 接口，timerCtx 嵌入了 cancelCtx（它实现了所需的 4 个方法中的 3 个：Done、Err 和 Value），然后自己实现了第四个方法 - Deadline。

## 接口中嵌入接口

在 Go 语言中，接口嵌入接口是最简单的一种嵌入形式，因为接口只声明能力，而不会为类型定义任何新的数据或行为。

让我们从 Go 标准库中的一个典型例子说起。给定 io.Reader 和 io.Writer 这两个接口：

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

如果我们要定义一个既是 Reader 又是 Writer 的接口，一种直接的方式是：

```go
type ReadWriter interface {
    Read(p []byte) (n int, err error)
    Write(p []byte) (n int, err error)
}
```

这种方式存在两个问题：一是在多处重复声明相同的方法；二是影响了 ReadWriter 的可读性，因为它与其他两个接口的组合关系并不直观。你要么得记住每个方法的具体声明，要么需要不断回头查看其他接口。

标准库中有很多这样的组合接口，比如 io.ReadCloser、io.WriteCloser、io.ReadWriteCloser、io.ReadSeeker、io.WriteSeeker、io.ReadWriteSeeker 等。如果不使用接口嵌入，仅 Read 方法的声明就可能要在标准库中重复超过 10 次。好在接口嵌入提供了完美的解决方案：

```go
type ReadWriter interface {
  	Reader
  	Writer
}
```

这种声明方式不仅避免了重复，还以最清晰的方式表达了意图：要实现 ReadWriter 接口，你必须同时实现 Reader 和 Writer 接口。

#### Go 1.14 中重叠方法的修复

接口嵌入具有可组合性，其工作方式符合预期。让我们通过一个例子来说明，假设有 A、B、C 和 D 这几个接口：

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

D 的方法集将包含 Amethod()、Bmethod()、Cmethod() 和 Dmethod()。

但是，如果 C 被定义为：

```go
type C interface {
  	A
  	Cmethod()
}
```

从逻辑上讲，这不应该改变 D 的方法集。然而在 Go 1.14 之前，这种情况会导致 "Duplicate method Amethod" 错误，因为 Amethod() 会被声明两次——一次来自 B 的嵌入，另一次来自 C 的嵌入。

Go 1.14 修复了这个问题。现在这个例子可以正常工作，完全符合预期。D 的方法集就是它所嵌入的接口的方法集与其自身方法的并集。

标准库中有一个更实用的例子。io.ReadWriteCloser 类型的定义为：

```go
type ReadWriteCloser interface {
  	Reader
  	Writer
  	Closer
}
```

但现在可以更简洁地定义为：

```go
type ReadWriteCloser interface {
  io.ReadCloser
  io.WriteCloser
}
```

在 Go 1.14 之前，由于 Close() 方法同时从 io.ReadCloser 和 io.WriteCloser 重复引入，这种定义是不可能实现的。

#### 示例：net.Error

net 包定义了它自己的错误接口，代码如下：

```go
// Error 表示一个网络错误
type Error interface {
  	error
  	Timeout() bool   // 是否为超时错误？
  	Temporary() bool // 是否为临时错误？
}
```

注意这里嵌入了内置的 error 接口。这种嵌入方式非常清晰地表达了意图：net.Error 本身也是一个 error。代码阅读者如果想知道是否可以将其作为 error 使用，可以立即得到答案，而不必去查找 Error() 方法的声明并在脑中与 error 接口中的标准声明进行比对。

#### 示例：heap.Interface

heap 包为客户端类型定义了如下接口：

```go
type Interface interface {
  	sort.Interface
  	Push(x interface{}) // add x as element Len()
  	Pop() interface{}   // remove and return element Len() - 1.
}
```

所有实现 heap.Interface 的类型都必须同时实现 sort.Interface。由于后者需要实现 3 个方法，如果不使用嵌入式接口，heap.Interface 的写法就会变成：

```go
type Interface interface {
  Len() int
  Less(i, j int) bool
  Swap(i, j int)
  Push(x interface{}) // add x as element Len()
  Pop() interface{}   // remove and return element Len() - 1.
}
```

使用嵌入式接口的版本在多个方面都更为优越。最重要的是，它能够直接明确地表明一个类型必须首先实现 sort.Interface；而在较长的版本中，要从代码中识别出这种模式就要困难得多。

## 结构体中嵌入接口

以下是对所选内容的翻译：

Go 语言中最让人困惑的嵌入方式要数接口嵌入结构体了。将接口嵌入结构体的含义并不是一目了然的。在本节中，我们将慢慢深入这项技术，并展示几个实际应用的例子。最后，你会发现其底层机制其实很简单，而且这项技术在各种场景下都很有用。

让我们从一个简单的示例开始：

```go
type Fooer interface {
  	Foo() string
}

type Container struct {
  	Fooer
}
```

Fooer 是一个接口，而 Container 结构体嵌入了这个接口。回顾第一部分的内容，我们知道在结构体中的嵌入会将被嵌入结构体的方法「提升」到嵌入结构体中。对于嵌入的接口来说也是类似的原理；我们可以将其想象成 Container 有一个这样的转发方法：

```go
func (cont Container) Foo() string {
  	return cont.Fooer.Foo()
}
```

但 cont.Fooer 指的是什么呢？实际上，它就是任何实现了 Fooer 接口的对象。这个对象从何而来？它是在 Container 初始化时或之后被分配给 Container 实例的 Fooer 字段的。下面是一个例子：

```go
// sink 接收一个实现了 Fooer 接口的值
func sink(f Fooer) {
  	fmt.Println("sink:", f.Foo())
}

// TheRealFoo 是一个实现了 Fooer 接口的类型
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

这将输出 sink: `TheRealFoo Foo`。

让我们看看这里发生了什么？注意观察 Container 是如何初始化的：被嵌入的 Fooer 字段被赋予了一个 TheRealFoo 类型的值。我们只能为这个字段赋予实现了 Fooer 接口的值——任何其他类型的值都会被编译器拒绝。由于 Fooer 接口被嵌入到 Container 中，它的方法被提升为 Container 的方法，这使得 Container 也实现了 Fooer 接口！这就是为什么我们可以将 Container 传递给 sink 函数的原因。如果没有这种嵌入机制，sink(co) 将无法通过编译，因为 co 不会实现 Fooer 接口。

你可能会想知道，如果 Container 的嵌入式 Fooer 字段没有被初始化会发生什么？这是一个很好的问题！结果很符合预期——该字段会保持其默认值，对于接口类型来说，默认值就是 nil。因此，如果执行以下代码：

```go
co := Container{}
sink(co)
```

将会导致运行时错误："invalid memory address or nil pointer dereference"。

这基本上涵盖了接口嵌入到结构体中的工作原理。接下来要讨论的是一个更重要的问题——为什么我们需要这种技术？接下来的例子将展示标准库中的几个用例，但我想先从其他地方开始，展示一个在我看来是这种技术在代码中最重要的应用。

#### 示例：接口封装器

假设我们想要一个带有额外功能的套接字连接，比如统计从中读取的总字节数。我们可以定义以下结构体：

```go
type StatsConn struct {
  	net.Conn

  	BytesRead uint64
}
```

StatsConn 现在实现了 net.Conn 接口，可以在任何需要 net.Conn 的地方使用。当使用实现了 net.Conn 接口的合适值初始化 StatsConn 的嵌入字段时，它会「继承」该值的所有方法；关键的见解是，我们可以拦截任何我们想要的方法，而让其他方法保持不变。在这个例子中，我们想要拦截 Read 方法并记录读取的字节数：

```go
func (sc *StatsConn) Read(p []byte) (int, error) {
  	n, err := sc.Conn.Read(p)
  	sc.BytesRead += uint64(n)
  	return n, err
}
```

对于 StatsConn 的用户来说，这个变化是透明的；我们仍然可以在其上调用 Read，它会按照预期工作（因为委托给了 sc.Conn.Read），但同时还会进行额外的记录工作。

如前一节所示，正确初始化 StatsConn 是至关重要的。例如：

```go
conn, err := net.Dial("tcp", u.Host+":80")
if err != nil {
    log.Fatal(err)
}
sconn := &StatsConn{conn, 0}
```

这里 net.Dial 返回一个实现了 net.Conn 接口的值，因此我们可以用它来初始化 StatsConn 的嵌入字段。

现在我们可以将 sconn 传递给任何需要 net.Conn 参数的函数，例如：

```go
resp, err := ioutil.ReadAll(sconn)
if err != nil {
  	log.Fatal(err)
}
```

之后我们就可以通过访问其 BytesRead 字段来获取总计读取的字节数。

这是一个接口封装（wrapping）的示例。我们创建了一个新类型来实现现有的接口，但通过嵌入值的方式复用了大部分功能。如果不使用嵌入，我们也可以通过显式声明 conn 字段来实现，如下所示：

```go
type StatsConn struct {
  	conn net.Conn

  	BytesRead uint64
}
```

然后为 net.Conn 接口中的每个方法编写转发方法，例如：

```go
func (sc *StatsConn) Close() error {
  	return sc.conn.Close()
}
```

但是，net.Conn 接口包含 8 个方法。为所有这些方法编写转发方法既繁琐又没有必要。通过嵌入接口，我们可以自动获得所有这些转发方法，只需要重写我们真正需要修改的方法即可。

#### 示例：sort.Reverse

下面是一个经典的 Go 标准库案例，讲解如何在结构体中嵌入接口。sort.Reverse 这个函数对于 Go 新手来说经常感到困惑，因为它的工作原理并不直观。

让我们先从一个简单的 Go 排序示例开始，看看如何对整数切片进行排序。

```go
lst := []int{4, 5, 2, 8, 1, 9, 3}
sort.Sort(sort.IntSlice(lst))
fmt.Println(lst)
```

这段代码会输出 [1 2 3 4 5 8 9]。它是如何工作的呢？sort.Sort 函数接收一个实现了 sort.Interface 接口的参数，该接口定义如下：

```go
type Interface interface {
    // Len 返回集合中元素的数量
    Len() int
    // Less 判断索引 i 的元素是否应该排在索引 j 的元素前面
    Less(i, j int) bool
    // Swap 交换索引 i 和 j 的元素
    Swap(i, j int)
}
```

如果我们想要使用 sort.Sort 对某个类型进行排序，就需要实现这个接口。对于整数切片这样的简单类型，标准库提供了像 sort.IntSlice 这样的便捷类型，它们会帮我们实现 sort.Interface 接口。

那么 sort.Reverse 是如何工作的呢？它巧妙地运用了在结构体中嵌入接口的技术。sort 包中定义了一个未导出的类型来实现这个功能：

```go
type reverse struct {
  	sort.Interface
}

func (r reverse) Less(i, j int) bool {
  	return r.Interface.Less(j, i)
}
```

到这里原理就很清楚了：reverse 通过嵌入接口来实现 sort.Interface（前提是用实现了该接口的值进行初始化），并且只重写了接口中的 Less 方法。它将嵌入值的 Less 方法参数顺序颠倒过来，这样实际上就实现了反向比较，从而使排序变成逆序。

最后，sort.Reverse 函数的实现非常简单：

```go
func Reverse(data sort.Interface) sort.Interface {
  	return &reverse{data}
}
```

现在我们就可以这样使用：

```go
sort.Sort(sort.Reverse(sort.IntSlice(lst)))
fmt.Println(lst)
```

这会输出 [9 8 5 4 3 2 1]。这里需要理解的关键点是：调用 sort.Reverse 本身并不会进行排序或反转操作。它可以被视为一个高阶函数：它生成一个包装了输入接口的值，并调整了其功能。真正的排序是在调用 sort.Sort 时发生的。

#### 示例：context.WithValue

context 包中有一个名为 WithValue 的函数：

```sql
func WithValue(parent Context, key, val interface{}) Context
```

它的作用是「返回 parent 的一个副本，其中包含了与 key 关联的值 val」。让我们来看看它的内部实现原理。

忽略错误检查的部分，WithValue 的核心实现非常简单：

```sql
func WithValue(parent Context, key, val interface{}) Context {
    return &valueCtx{parent, key, val}
}
```

其中 valueCtx 的结构如下：

```sql
type valueCtx struct {
    Context
  	key, val interface{}
}
```

这里又一次用到了在结构体中嵌入接口的技巧。通过这种方式，valueCtx 实现了 Context 接口，并且可以自由地拦截 Context 的任意四个方法。在这个例子中，它只拦截了 Value 方法：

```sql
func (c *valueCtx) Value(key interface{}) interface{} {
    if c.key == key {
    	return c.val
    }
    return c.Context.Value(key)
}
```

而其他方法则保持不变。

#### 示例：降低能力的受限接口

这是一个相当高级的技术，在标准库中被广泛使用。不过，对于普通的客户端代码来说，这种技术并不常见。如果你是 Go 语言新手，第一次阅读时没有完全理解也不必太过担心，等你积累了更多 Go 经验后再回来看这部分内容。

让我们先来了解一下 io.ReaderFrom 接口：

```go
type ReaderFrom interface {
    ReadFrom(r Reader) (n int64, err error)
}
```

这个接口由那些能够从 io.Reader 中有效读取数据的类型来实现。比如，os.File 类型就实现了这个接口，它可以将从 reader 读取的数据写入它所代表的打开文件中。让我们来看看它是如何实现的：

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

它首先尝试使用 readFrom 方法从 r 中读取数据，这个方法是针对特定操作系统的。例如在 Linux 系统上，它会使用 copy_file_range 系统调用在内核中直接进行两个文件之间的快速复制。

readFrom 会返回一个布尔值来表示操作是否成功（handled）。如果不成功，ReadFrom 会尝试使用 genericReadFrom 进行 " 通用 " 操作，其实现如下：

```go
func genericReadFrom(f *File, r io.Reader) (int64, error) {
    return io.Copy(onlyWriter{f}, r)
}
```

它使用 io.Copy 从 r 复制到 f，到目前为止很好理解。但这个 onlyWriter 封装器是什么呢？

```go
type onlyWriter struct {
    io.Writer
}
```

有趣的是，这又是我们现在已经很熟悉的将接口嵌入结构体的技巧。但如果我们在文件中搜索，会发现没有为 onlyWriter 定义任何方法，所以它并没有拦截任何操作。那它为什么需要存在呢？

要理解原因，我们需要看看 io.Copy 做了什么。它的代码很长就不在这里完整展示了，但关键点是：如果它的目标实现了 io.ReaderFrom 接口，就会调用 ReadFrom。但这就让我们陷入了循环，因为我们是在调用 File.ReadFrom 时才到达 io.Copy 的。这会导致无限递归！

现在 onlyWriter 的必要性就变得清晰了。通过在调用 io.Copy 时将 f 封装起来，io.Copy 得到的不是一个实现了 io.ReaderFrom 的类型，而只是一个实现了 io.Writer 的类型。这样它就会调用我们的 File 的 Write 方法，避免了 ReadFrom 的无限递归陷阱。

如前所述，这个技巧属于比较高级的用法。我觉得强调它很重要，因为它展示了「在结构体中嵌入接口」这个工具的一个明显不同的用法，而且在标准库中被广泛使用。

File 中的用法很好，因为它给了 onlyWriter 一个明确的命名类型，这有助于理解它的作用。标准库中的一些代码放弃了这种自文档化的模式，而是使用匿名结构体。例如，在 tar 包中是这样实现的：

```go
io.Copy(struct{ io.Writer }{sw}, r)
```
