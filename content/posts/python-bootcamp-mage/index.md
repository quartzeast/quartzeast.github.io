---
title: "Python 简明笔记"
date: 2023-01-06T19:27:33+08:00
tags:
  - python
categories:
  - python
---

Python 训练营简明笔记。

<!--more-->

# Python 函数

## 函数基本概念

### 函数

- 由若干语句组成的语句块、函数名称、参数列表构成，它是组织代码的最小单元
- 完成一定的功能

函数的作用：

- 结构化编程对代码的最基本的**封装**，一般按照功能组织一段代码
- 封装的目的为了**复用**，减少冗余代码
- 代码更加简介美观，可读移动

函数的分类：

- 内建函数，如 `max()`, `reversed()` 等
- 库函数，如 `match.ceil()` 等
- 自定义函数，使用 `def` 关键字定义

### 函数定义

```python
def name(param-list):
    body
    [return result]
```

- 函数名就是标识符，需遵循标识符的命名规则
- 语句块（函数体）必须缩进，约定 4 个空格
- Python 的函数如果没有 `return` 语句，会隐式返回一个 `None` 值
- 定义中的参数列表称为形式参数，只是一种符号表达（标识符），简称形参
- `pass` 就是 do nothing，在没有函数体时必须要显示的使用 `pass`

### 函数定义

- 函数定义，只是声明了一个函数，只有在调用后才能执行
- 调用的方式，就是函数名后加上小括号，如有必要在括号内填写上参数
- 调用时写的参数是实际参数，简称实参
- 函数的定义必须在调用前，否则会抛出 `NameError` 异常
- 函数是可调用对象，`callable(add)` 返回 `True`

```python
def add(x, y): # 定义
    return x + y

add(4, 5) # 调用
```

## 函数参数

### 实参传参方式

1. 位置传参

定义时 `def f(x, y, z)`，调用使用 `f(1, 3, 4)`，按照参数定义顺序传入实参

2. 关键字传参

定义 `def f(x, y, z)`，调用: `f(x=1, y=3, z=5)`，使用形参的名字来传入实参的方式，如果使用了形参名字，那么传参顺序就可以和定义顺序不同。

要求位置参数必须在关键字参数之前传入，位置参数是按位置对应的。

### 形参默认值

在函数定义时，可以为形参增加一个默认值。

- 参数的默认值可以在未传入足够的实参时，对没有给定值的参数赋值为默认值
- 参数非常多的时候，并不需要使用者每次都输入所有的参数，简化函数调用

```python
# x, y 都可以接收两种传参方式（位置，关键字）
# 称为既可以接收位置又可以接收关键字的参数（一般/普通参数）
# 普通参数可以有默认值，但是默认值应该在参数列表的最后
def add(x=4, y=5):
    return x + y


add()
add(6)
add(y=8)
add(9, y=10)
add(10, 11)
add(x=12)
add(x=12, y=13)
add(y=14, x=15)

# 错误调用方式
add(4, 5, x=10)
add(x=3, 4)


def add(x, y=10):  # add是变量，add指向这个新函数对象
    return x + y


# 错误调用方式
add()
add(5, 6, x=8)
add(y=8, 10)

add(4)  # 位置传参给 x
add(x=5)  # 按关键字传参给 x
add(6, 7)
add(x=8, y=9)
add(y=11, x=12)
add(13, y=14)

# 语法错误 non-default argument follows default argument
def add(x=4, y):
    return x + y

def login(host='localhost', port='3306', username='root', password='root'):
    print('mysql://{2}:{3}@{0}:{1}/test'.format(
        host, port, username, password
    ))


login() # 默认值的第二个作用，简化操作
login('192.168.142.1')
login('192.168.142.1', username='lang')
```

### 可变参数

```python
def fn(iterable):
    s = 0
    for x in iterable:
        s += x
    return s


print(fn(range(5)))

# * 可变（位置）形参，可以收集多个实参，多个实参被收集到一个元组对象中，元组不可变
def fn1(*nums):
    print(nums, type(nums))


print(fn1(1, 2, 3))
#错误传参方式
fn1(nums=[1, 2, 3])

def showconfig(**kwargs):  # *args, **kwargs
    print(type(kwargs), kwargs)  # 可变关键字参数收集关键字传参，收集成字典kv，字典可变


showconfig(host='127.0.0.1', password='wayne')

def showconfig(host, port, username='root', password='root'): pass
def showconfig(host='127.0.0.1', port=3306, username='root', password='root'): pass
def showconfig(host, username, password, port=3306, **kwargs): pass
def showconfig(host, port=3306, *args, **kwargs): pass
def showconfig(*args, **kwargs): pass
```

可变位置参数：

- 在形参前使用 `*` 表示该形参是可变位置参数，可以接收多个实参
- 它将收集到的实参组织到一个 tuple 中

可变关键字参数：

- 在形参前使用 `**` 表示该形参是可变关键字参数，可以接收多个关键字参数
- 它将收集到的实参的名称和值，组织到一个 dict 中

总结：

- 有可变位置参数和可变关键字参数
- 可变位置参数在形参前使用一个星号 `*`
- 可变关键字参数在形参前使用两个星号 `**`
- 可变位置参数和可变关键字参数都可以收集若干个实参，可变位置参数收集形成一个 tuple 类型对象 ，可变关键字参数收集形成一个 dict 类型对象
- 混合使用参数时，形参的顺序为，普通参数、普通默认值参数、可变位置参数、可变关键字参数

```python
def fn(x, y, z=6, *args, **kwargs):
    print(x, y, z, args, kwargs)


# fn()
fn(1, 2)
fn(1, 2, 3)
# fn(range(5)) 一个对象 range(5)
fn(1, 2, 3, 4)
fn(1, 2, a=100)
fn(1, 2, z=10, a=100, b='abc')
# fn(1, 2, z=10, a=100, b='abc', x=20) x 给了多个值
fn(y=2, a=5, x=4)
fn(1, a=100, b=200, y=300)
# fn(1, 2, 3, 4, 5, a=100, b=200, x=300, y=400, z=500)
```

### keyword-only 参数

```python
# keyword-only 仅仅能关键字传参的形参
# 在 * 后的参数
def fn(*args, x, y, **kwargs):
    print(args, kwargs)
    print(type(x), x)
    print(type(y), y)


# fn()  # fn() missing 2 required keyword-only arguments: 'x' and 'y'
# fn(1, 2)  # 位置传参
fn(x=4, y=5)
fn(y=10, x=20)


# def fn2(**kwargs, x, y): pass 语法错误

def fn3(a, *, x, y):
    print(a, x, y)


fn3(1, y=2, x=3)
```

Python3 之后新增了 keyword-only 参数：在形参定义时，在一个星号 `*` 后，或一个可变位置参数之后，出现的普通参数称为 keyword-only 参数。

keyword-only 参数，言下之意就是这个参数必须采用关键字传参。

### positional-only 参数

Python3.8 开始，增加了最后一种形参定义：Position-only 参数

```python
def fn(a, b, /):
    print(a, b)


fn(1, 2)
# fn(a=1, b=2) fn() got some positional-only arguments passed as keyword arguments: 'a, b'

def fn(a, /, b):
    print(a, b)


fn(1, 2)
fn(1, b=2)
# fn(1, y=2)
fn(a=1, b=2)

# def fn(a, b=2, /, x, y, *args)
def fn(a, /, x, y, b=2, *args)
```

### 参数的混合使用

```python
def fn(a, b, /, x, y, z=6, *args, m=4, n, **kwargs): pass

fn(1, 2, 3, 4, 5, 6, n=10)
fn(1, 2, n=20, x=5, y=6, t=10)
fn(1, 2, 3, t=100, m=200, n=300, y=400)
```

### 参数规则
