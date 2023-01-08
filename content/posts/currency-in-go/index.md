---
title: "Go 语言并发之道"
date: 2023-01-05T21:17:45+08:00
tags:
  - Go
categories:
  - Go
---

Go 语言并发编程之道。

<!--more-->

## `sync` 包

sync 包包含了对低级内存访问同步最有用的并发性基元。如果你在那些主要通过内存访问同步来处理并发的语言中工作过，这些类型很可能已经为你所熟悉。Go 中这些语言的不同之处在于，Go 在内存访问同步原语的基础上建立了一套新的并发原语，为你提供了一套扩展的东西来工作。正如我们在 Go 的并发哲学中所讨论的，这些操作有其用处--主要是在小范围内，如结构体。至于什么时候适合进行内存访问同步，那就要看你的决定了。说到这里，让我们开始看看 sync 包所暴露的各种原语。

### `WaitGroup`

```go
var wg sync.WaitGroup

wg.Add(1)
go func() {
	defer wg.Done()
	fmt.Println("1st goroutine sleeping...")
	time.Sleep(1)
}()

wg.Add(1)
go func() {
	defer wg.Done()
	fmt.Println("2nd goroutine sleeping...")
	time.Sleep(2)
}()

wg.Wait()
fmt.Println("All goroutines complete.")
```

可以把 `WaitGroup` 想象成一个并发安全的计数器：对 `Add` 的调用使计数器增加所传入的整数，对 `Done` 的调用使计数器减少 1。对 `Wait` 的调用会阻塞，直到计数器为零。

### `Mutex` 和 `RWMutex`

_Mutex_ stands for “mutual exclusion” and is a way to guard critical sections of your program. A critical section is an area of your program that requires exclusive access to a shared resource. A `Mutex` provides a concurrent-safe way to express exclusive access to these shared resources. To borrow a Goism, whereas channels share memory by communicating, a `Mutex` shares memory by creating a convention developers must follow to synchronize access to the memory. You are responsible for coordinating access to this memory by guarding access to it with a mutex.

```go
// 两个goroutine试图增加和减少同一个值，它们使用一个 Mutex 来同步访问
var count int
var lock sync.Mutex

increment := func() {
    lock.Lock()
    defer lock.Unlock()
    count++
    fmt.Printf("Incrementing: %d\n", count)
}

decrement := func() {
    lock.Lock()
    defer lock.Unlock()
    count--
    fmt.Printf("Decrementing: %d\n", count)
}

// Increment
var arithmetic sync.WaitGroup
for i := 0; i <= 5; i++ {
    arithmetic.Add(1)
    go func() {
        defer arithmetic.Done()
        increment()
    }()
}

// Decrement
for i := 0; i <= 5; i++ {
    arithmetic.Add(1)
    go func() {
        defer arithmetic.Done()
        decrement()
    }()
}

arithmetic.Wait()
fmt.Println("Arithmetic complete.")
```

You’ll notice that we always call `Unlock` within a `defer` statement. This is a very common idiom when utilizing a `Mutex` to ensure the call always happens, even when `panic`ing. Failing to do so will probably cause your program to deadlock.

Critical sections are so named because they reflect a bottleneck in your program. It is somewhat expensive to enter and exit a critical section, and so generally people attempt to minimize the time spent in critical sections.

One strategy for doing so is to reduce the cross-section of the critical section. There may be memory that needs to be shared between multiple concurrent processes, but perhaps not all of these processes will read _and_ write to this memory. If this is the case, you can take advantage of a different type of mutex: `sync.RWMutex`.

The `sync.RWMutex` is conceptually the same thing as a `Mutex`: it guards access to memory; however, `RWMutex` gives you a little bit more control over the memory. You can request a lock for reading, in which case you will be granted access unless the lock is being held for writing（除非该锁已经正在被用于写操作）. This means that an arbitrary number of readers can hold a reader lock so long as nothing else is holding a writer lock. Here’s an example that demonstrates a producer that is less active than the numerous consumers the code creates:

```go
producer := func(wg *sync.WaitGroup, l sync.Locker) { // 1
    defer wg.Done()
    for i := 5; i > 0; i-- {
        l.Lock()
        l.Unlock()
        time.Sleep(1) // 2
    }
}

observer := func(wg *sync.WaitGroup, l sync.Locker) {
    defer wg.Done()
    l.Lock()
    defer l.Unlock()
}

test := func(count int, mutex, rwMutex sync.Locker) time.Duration {
    var wg sync.WaitGroup
    wg.Add(count+1)
    beginTestTime := time.Now()
    go producer(&wg, mutex)
    for i := count; i > 0; i-- {
        go observer(&wg, rwMutex)
    }

    wg.Wait()
    return time.Since(beginTestTime)
}

tw := tabwriter.NewWriter(os.Stdout, 0, 1, 2, ' ', 0)
defer tw.Flush()

var m sync.RWMutex
fmt.Fprintf(tw, "Readers\tRWMutext\tMutex\n")
for i := 0; i < 20; i++ {
    count := int(math.Pow(2, float64(i)))
    fmt.Fprintf(
        tw,
        "%d\t%v\t%v\n",
        count,
        test(count, &m, m.RLocker()),
        test(count, &m, &m),
    )
}
```

1. The `producer` function’s second parameter is of the type `sync.Locker`. This interface has two methods, `Lock` and `Unlock`, which the `Mutex` and `RWMutex` types satisfy.

2. Here we make the producer sleep for one second to make it less active than the `observer` goroutines.

You can see for this particular example that reducing the cross-section of our critical-section really only begins to pay off around 213 readers. This will vary depending on what your critical section is doing, but it’s usually advisable to use `RWMutex` instead of `Mutex` when it logically makes sense.

### `Cond`

The comment for the `Cond` type really does a great job of describing its purpose:

>...a rendezvous point for goroutines waiting for or announcing the occurrence of an event.

In that definition, an “event” is any arbitrary signal between two or more goroutines that carries no information other than the fact that it has occurred. Very often you’ll want to wait for one of these signals before continuing execution on a goroutine. If we were to look at how to accomplish this without the `Cond` type, one naive approach to doing this is to use an infinite loop:

```go
for conditionTrue() == false {
}
```

However this would consume all cycles of one core. To fix that, we could introduce a `time.Sleep`:

```go
for conditionTrue() == false {
    time.Sleep(1*time.Millisecond)
}
```

This is better, but it’s still inefficient, and you have to figure out how long to sleep for: too long, and you’re artificially degrading performance; too short, and you’re unnecessarily consuming too much CPU time. It would be better if there were some kind of way for a goroutine to efficiently sleep until it was signaled to wake and check its condition. This is exactly what the `Cond` type does for us. Using a `Cond`, we could write the previous examples like this:

```go
c := sync.NewCond(&sync.Mutex{}) // 1 
c.L.Lock() // 2
for conditionTrue() == false {
    c.Wait() // 3
}
c.L.Unlock() // 4
```

1. Here we instantiate a new `Cond`. The `NewCond` function takes in a type that satisfies the `sync.Locker` interface. This is what allows the `Cond` type to facilitate coordination with other goroutines in a concurrent-safe way.
2. Here we lock the `Locker` for this condition. This is necessary because the call to `Wait` automatically calls `Unlock` on the `Locker` when entered.
3. Here we wait to be notified that the condition has occurred. This is a blocking call and the goroutine will be suspended.
4. Here we unlock the `Locker` for this condition. This is necessary because when the call to `Wait` exits, it calls `Lock` on the `Locker` for the condition.

This approach is *much* more efficient. Note that the call to `Wait` doesn’t just block, it *suspends* the current goroutine, allowing other goroutines to run on the OS thread. A few other things happen when you call `Wait`: upon entering `Wait`, `Unlock` is called on the `Cond` variable’s `Locker`, and upon exiting `Wait`, `Lock` is called on the `Cond` variable’s `Locker`. In my opinion, this takes a little getting used to; it’s effectively a hidden side effect of the method. It looks like we’re holding this lock the entire time while we wait for the condition to occur, but that’s not actually the case. When you’re scanning code, you’ll just have to keep an eye out for this pattern.

Let’s expand on this example and show both sides of the equation: a goroutine that is waiting for a signal, and a goroutine that is sending signals. Say we have a queue of fixed length 2, and 10 items we want to push onto the queue. We want to enqueue items as soon as there is room, so we want to be notified as soon as there’s room in the queue. Let’s try using a `Cond` to manage this coordination:

## Channels

Channels are one of the synchronization primitives in Go derived from Hoare’s CSP. While they can be used to synchronize access of the memory, they are best used to communicate information between goroutines.

Like a river, a channel serves as a conduit for a stream of information; values may be passed along the channel, and then read out downstream. For this reason I usually end my `chan` variable names with the word “Stream.” When using channels, you’ll pass a value into a `chan` variable, and then somewhere else in your program read it off the channel. The disparate parts of your program don’t require knowledge of each other, only a reference to the same place in memory where the channel resides. This can be done by passing references of channels around your program.

```go
var dataStream chan interface{}
dataStream = make(chan interface{})
```



## 参考资料

1. r
