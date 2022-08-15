---
title: "Defer, Panic 和 Recover"
date: 2022-08-15T09:14:28+08:00
draft: false
author: "quartzeast"
description: "Go defer panic recover"
tags:
  - "Go"
---

Go 拥有寻常的控制代码流程的机制：`if, for, switch, goto`，而且还具有在单独的 goroutine 中运行代码的 `go` 语句。本文中，我们将讨论一些不太常见的流程控制机制：`defer`, `panic` 和 `recover`。

## 1. 延迟函数调用

### defer 的基本使用

在 Go 语言中，一个函数调用可以跟在 `defer` 关键字后，称为一个延迟函数调用。`defer` 关键字和此延迟函数调用一起形成一个延迟调用语句。和协程调用类似，被延迟的函数调用的所有返回值（如果存在）必须全部被舍弃。

一个 **defer 语句**将函数调用 push 到一个后进先出（LIFO）的列表中。保存的调用列表在外层函数返回后开始执行。Defer 通常用于简化执行各种清理操作的函数。

例如下面的函数将打开两个文件并将一个文件的内容拷贝到另一个文件中：

```go
func CopyFile(dstName, srcName string) (written int64, err error) {
	src, err := os.Open(srcName)
	if err != nil {
		return
	}

	dst, err := os.Create(dstName)
	if err != nil {
		return
	}
	written, err = io.Copy(dst, src)
	dst.Close()
	src.Close()
	return
}
```

这虽然能够工作，但还存在一个 bug。如果调用 `os.Create` 失败，函数将直接返回，就导致不会关闭源文件。这虽然可以通过在第二个 `return` 语句之前调用 `src.Close` 来轻松解决，如下所示：

```go
dst, err := os.Create(dstName)
if err != nil {
    src.Close()
    return
}
```

但如果函数更加复杂，那么这种时刻需要注意关闭文件的问题可能就会被我们忽视了，从而导致这种问题难以被解决。通过引入 `defer` 语句，我们就可以确保文件始终被关闭：

```go
func CopyFile(dstName, srcName string) (written int64, err error) {
	src, err := os.Open(srcName)
	if err != nil {
		return
	}
	defer src.Close()

	dst, err := os.Create(dstName)
	if err != nil {
		return
	}
	defer dst.Close()
	written, err = io.Copy(dst, src)
	return
}
```

Defer 语句允许我们打开每个文件后立即思考要将其关闭，这保证了无论函数中的 `return` 语句数量如何，文件都将被关闭。

### 函数的退出阶段

我们已经知道，当一个函数调用返回（此时可能尚未完全退出）并进入它的*退出阶段*后，所有在执行此函数调用期间中被 push 到延迟调用栈的调用将按照 LIFO 的顺序进行执行。当所有这些延迟调用执行完毕后，此函数调用的退出阶段也就结束了，或者说此函数调用退出完毕了。

那么，究竟什么是函数的退出阶段呢？

在 Go 中，当一个函数调用**返回**后（比如执行了一个 `return` 语句或者函数中的最后一条语句执行完毕），此函数调用可能并未立即退出。一个函数调用从返回开始到最终退出完毕的阶段称为此函数调用的退出阶段（exiting phase）。

一个函数调用可以通过三种方式进入它的退出阶段：

1. 此调用正常返回（`return` 语句或函数执行函数结尾处）
2. 此调用中产生了 panic
3. 此调用中调用了 `runtime.Goexit` 并且完全退出

在这里我们只简单的了解一下函数的退出阶段，之后会写一篇更详尽的文章来对函数的退出阶段进行分析。

### defer 语句三大规则

1. _A deferred function’s arguments are evaluated when the defer statement is evaluated._

第一条规则是说，被延迟函数调用的实参的计算发生在 defer 语句被计算时（evaluate）。这些被估值的结果将在此后此延迟调用被执行时使用。

我们来看下面这个示例 👇🏻：

```go
func main() {
	func() {
		for i := 0; i < 3; i++ {
			defer fmt.Println("a:", i)
		}
	}()

	fmt.Println()
	func() {
		for i := 0; i < 3; i++ {
			defer func() {
				fmt.Println("b:", i) // 闭包，对 i 的引用
			}()
		}
	}()
}

// 2 1 0
// 3 3 3
```

通过以上对 `defer` 语句中被延迟函数调用的实参计算分析容易得到第一个匿名函数中的循环会打印 `2 1 0`，那么为什么第二个匿名函数中输出 `3 3 3` 呢？

通过观察不难得出，第二个循环中的 `defer` 是将一个匿名函数 Push 到栈中，这个匿名函数会形成一个闭包，编译器会通过将其引用的外部变量分配到堆上以延长其生命周期。所以当第二个循环中被 Push 到栈的三个匿名函数执行时，引用的是同一个 `i` 变量，此时 `i` 的值为 `3`，所以将打印处 `3 3 3`。

我们可以对第二个循环略加修改（使用两种方法），使得它和第一个循环打印出相同的结果。

```go
for i := 0; i < 3; i++ {
    defer func(i int) {
        // 此 i 为形参 i，非实参循环变量 i
        fmt.Println("b:", i)
    }(i)
}

for i := 0; i < 3; i++ {
    i := i // 在下面的调用中，左i遮挡了右i。
            // <=> var i = i
    defer func() {
        // 此i为上面的左i，非循环变量i。
        fmt.Println("b:", i)
    }()
}
```

通过上面的分析就不难得出下面这个示例为什么输出了 `123 789`。

```go
func main() {
	var a = 123
	go func(x int) {
		time.Sleep(time.Second)
		fmt.Println(x, a) // 123 789
	}(a)

	a = 789

	time.Sleep(2 * time.Second)
}
```

2. _Deferred function calls are executed in Last In First Out order after the surrounding function returns._

在外围函数返回后，被延迟的函数调用以 LIFO 的顺序执行。

3. _Deferred functions may read and assign to the returning function’s named return values._

被延迟的函数可能会读取和赋值返回函数的命名返回值。

在下面这个示例中，延迟函数在外围函数返回后递增返回值 `i`。 因此，此函数返回 `2`：

```go
func c() (i int) {
    defer func() { i++ }()
    return 1
}
```

这样做可以方便地修改函数的错误返回值。

[Todo]

## 参考

- [Defer, Panic, and Recover](https://go.dev/blog/defer-panic-and-recover)
- _The Go Programming Language_
- [协程、延迟函数调用、以及恐慌和恢复](https://gfw.go101.org/article/control-flows-more.html)
- [详解恐慌和恢复原理](https://gfw.go101.org/article/panic-and-recover-more.html)
- [一些恐慌/恢复用例](https://gfw.go101.org/article/panic-and-recover-use-cases.html)
- [On the uses and misuses of panics in Go](https://eli.thegreenplace.net/2018/on-the-uses-and-misuses-of-panics-in-go/)
