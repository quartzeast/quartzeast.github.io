---
title: "Python Data Strucutre and Algorithm"
date: 2023-01-08T19:48:13+08:00
tags:
  - python
  - 数据结构与算法
categories:
  - 数据结构与算法
---

Python 实现基本的数据结构和算法，以及剑指 Offer 的 Python 实现。

<!--more-->

# 链表

## 单链表

```python
# -*- coding: utf-8 -*-


class Node(object):
    def __init__(self, value=None, next=None):   # 这里我们 root 节点默认都是 None，所以都给了默认值
        self.value = value
        self.next = next

    def __str__(self):
        """方便你打出来调试，复杂的代码可能需要断点调试"""
        return '<Node: value: {}, next={}>'.format(self.value, self.next)

    __repr__ = __str__


class LinkedList(object):
    """ 链接表 ADT
    [root] -> [node0] -> [node1] -> [node2]
    """

    def __init__(self, maxsize=None):
        """
        :param maxsize: int or None, 如果是 None，无限扩充
        """
        self.maxsize = maxsize
        self.root = Node()     # 默认 root 节点指向 None
        self.tailnode = None
        self.length = 0

    def __len__(self):
        return self.length

    def append(self, value):    # O(1)
        if self.maxsize is not None and len(self) >= self.maxsize:
            raise Exception('LinkedList is Full')
        node = Node(value)    # 构造节点
        tailnode = self.tailnode
        if tailnode is None:    # 还没有 append 过，length = 0， 追加到 root 后
            self.root.next = node
        else:     # 否则追加到最后一个节点的后边，并更新最后一个节点是 append 的节点
            tailnode.next = node
        self.tailnode = node
        self.length += 1

    def appendleft(self, value):
        if self.maxsize is not None and len(self) >= self.maxsize:
            raise Exception('LinkedList is Full')
        node = Node(value)
        if self.tailnode is None:  # 如果原链表为空，插入第一个元素需要设置 tailnode
            self.tailnode = node

        headnode = self.root.next
        self.root.next = node
        node.next = headnode
        self.length += 1

    def __iter__(self):
        for node in self.iter_node():
            yield node.value

    def iter_node(self):
        """遍历 从 head 节点到 tail 节点"""
        curnode = self.root.next
        while curnode is not self.tailnode:    # 从第一个节点开始遍历
            yield curnode
            curnode = curnode.next    # 移动到下一个节点
        if curnode is not None:
            yield curnode

    def remove(self, value):    # O(n)
        """ 删除包含值的一个节点，将其前一个节点的 next 指向被查询节点的下一个即可

        :param value:
        """
        prevnode = self.root    #
        for curnode in self.iter_node():
            if curnode.value == value:
                prevnode.next = curnode.next
                if curnode is self.tailnode:  # NOTE: 注意更新 tailnode
                    if prevnode is self.root:
                        self.tailnode = None
                    else:
                        self.tailnode = prevnode
                del curnode
                self.length -= 1
                return 1  # 表明删除成功
            else:
                prevnode = curnode
        return -1  # 表明删除失败

    def find(self, value):    # O(n)
        """ 查找一个节点，返回序号，从 0 开始

        :param value:
        """
        index = 0
        for node in self.iter_node():   # 我们定义了 __iter__，这里就可以用 for 遍历它了
            if node.value == value:
                return index
            index += 1
        return -1    # 没找到

    def popleft(self):    # O(1)
        """ 删除第一个链表节点
        """
        if self.root.next is None:
            raise Exception('pop from empty LinkedList')
        headnode = self.root.next
        self.root.next = headnode.next
        self.length -= 1
        value = headnode.value

        if self.tailnode is headnode:   # 勘误：增加单节点删除 tailnode 处理
            self.tailnode = None
        del headnode
        return value

    def clear(self):
        for node in self.iter_node():
            del node
        self.root.next = None
        self.length = 0
        self.tailnode = None

    def reverse(self):
        """反转链表"""
        curnode = self.root.next
        self.tailnode = curnode  # 记得更新 tailnode，多了这个属性处理起来经常忘记
        prevnode = None

        while curnode:
            nextnode = curnode.next
            curnode.next = prevnode

            if nextnode is None:
                self.root.next = curnode

            prevnode = curnode
            curnode = nextnode


def test_linked_list():
    ll = LinkedList()

    ll.append(0)
    ll.append(1)
    ll.append(2)
    ll.append(3)

    assert len(ll) == 4
    assert ll.find(2) == 2
    assert ll.find(-1) == -1

    assert ll.remove(0) == 1
    assert ll.remove(10) == -1
    assert ll.remove(2) == 1
    assert len(ll) == 2
    assert list(ll) == [1, 3]
    assert ll.find(0) == -1

    ll.appendleft(0)
    assert list(ll) == [0, 1, 3]
    assert len(ll) == 3

    headvalue = ll.popleft()
    assert headvalue == 0
    assert len(ll) == 2
    assert list(ll) == [1, 3]

    assert ll.popleft() == 1
    assert list(ll) == [3]
    ll.popleft()
    assert len(ll) == 0
    assert ll.tailnode is None

    ll.clear()
    assert len(ll) == 0
    assert list(ll) == []


def test_linked_list_remove():
    ll = LinkedList()
    ll.append(3)
    ll.append(4)
    ll.append(5)
    ll.append(6)
    ll.append(7)
    ll.remove(7)
    print(list(ll))

def test_single_node():
    ll = LinkedList()
    ll.append(0)
    ll.remove(0)
    ll.appendleft(1)
    assert list(ll) == [1]

def test_linked_list_reverse():
    ll = LinkedList()
    n = 10
    for i in range(n):
        ll.append(i)
    ll.reverse()
    assert list(ll) == list(reversed(range(n)))


def test_linked_list_append():
    ll = LinkedList()
    ll.appendleft(1)
    ll.append(2)
    assert list(ll) == [1, 2]


if __name__ == '__main__':
    test_single_node()
    test_linked_list()
    test_linked_list_append()
    test_linked_list_reverse()
```


## 双链表

上边我们亲自实现了一个单链表，但是能看到很明显的问题，单链表虽然 `append` 是 `O(1)`，但是它的 `find` 和 `remove` 都是 `O(n)` 的，因为删除你也需要先查找，而单链表查找只有一个方式就是从头找到尾，中间找到才退出。

双链表相比单链表来说，每个节点既保存了指向下一个节点的指针，同时还保存了上一个节点的指针。

```python
# -*- coding: utf-8 -*-


class Node(object):
    __slots__ = ('value', 'prev', 'next')   # save memory

    def __init__(self, value=None, prev=None, next=None):
        self.value, self.prev, self.next = value, prev, next


class CircularDoubleLinkedList(object):
    """循环双端链表 ADT
    多了个循环其实就是把 root 的 prev 指向 tail 节点，串起来
    """

    def __init__(self, maxsize=None):
        self.maxsize = maxsize
        node = Node()
        node.next, node.prev = node, node
        self.root = node
        self.length = 0

    def __len__(self):
        return self.length

    def headnode(self):
        return self.root.next

    def tailnode(self):
        return self.root.prev

    def append(self, value):    # O(1), 你发现一般不用 for 循环的就是 O(1)，有限个步骤
        if self.maxsize is not None and len(self) >= self.maxsize:
            raise Exception('LinkedList is Full')
        node = Node(value=value)
        tailnode = self.tailnode() or self.root

        tailnode.next = node
        node.prev = tailnode
        node.next = self.root
        self.root.prev = node
        self.length += 1

    def appendleft(self, value):
        if self.maxsize is not None and len(self) >= self.maxsize:
            raise Exception('LinkedList is Full')
        node = Node(value=value)
        if self.root.next is self.root:   # empty
            node.next = self.root
            node.prev = self.root
            self.root.next = node
            self.root.prev = node
        else:
            node.prev = self.root
            headnode = self.root.next
            node.next = headnode
            headnode.prev = node
            self.root.next = node
        self.length += 1

    def remove(self, node):      # O(1)，传入node 而不是 value 我们就能实现 O(1) 删除
        """remove
        :param node  # 在 lru_cache 里实际上根据key 保存了整个node:
        """
        if node is self.root:
            return
        else:    #
            node.prev.next = node.next
            node.next.prev = node.prev
        self.length -= 1
        return node

    def iter_node(self):
        if self.root.next is self.root:
            return
        curnode = self.root.next
        while curnode.next is not self.root:
            yield curnode
            curnode = curnode.next
        yield curnode

    def __iter__(self):
        for node in self.iter_node():
            yield node.value

    def iter_node_reverse(self):
        """相比单链表独有的反序遍历"""
        if self.root.prev is self.root:
            return
        curnode = self.root.prev
        while curnode.prev is not self.root:
            yield curnode
            curnode = curnode.prev
        yield curnode


def test_double_link_list():
    dll = CircularDoubleLinkedList()
    assert len(dll) == 0

    dll.append(0)
    dll.append(1)
    dll.append(2)

    assert list(dll) == [0, 1, 2]

    assert [node.value for node in dll.iter_node()] == [0, 1, 2]
    assert [node.value for node in dll.iter_node_reverse()] == [2, 1, 0]

    headnode = dll.headnode()
    assert headnode.value == 0
    dll.remove(headnode)
    assert len(dll) == 2
    assert [node.value for node in dll.iter_node()] == [1, 2]

    dll.appendleft(0)
    assert [node.value for node in dll.iter_node()] == [0, 1, 2]


if __name__ == '__main__':
    test_double_link_list()
```


## 小问题：

- 这里单链表我没有实现 `insert` 方法，你能自己尝试实现吗？  `insert(value, new_value)`，我想在某个值之前插入一个值。你同样需要先查找，所以这个步骤也不够高效。
- 你能尝试自己实现个 lru cache 吗？需要使用到我们这里提到的循环双端链表

```python
"""
python3 only
LRU cache
"""
from collections import OrderedDict
from functools import wraps


def fib(n):
    if n <= 1:  # 0 or 1
        return n
    return f(n - 1) + f(n - 2)  # 由于涉及到重复计算，这个递归函数在 n 大了以后会非常慢。 O(2^n)


"""
下边就来写一个缓存装饰器来优化它。传统方法是用个数组记录之前计算过的值，但是这种方式不够 Pythonic
"""


def cache(func):
    """先引入一个简单的装饰器缓存，其实原理很简单，就是内部用一个字典缓存已经计算过的结果"""
    store = {}

    @wraps(func)
    def _(n):   # 这里函数没啥意义就随便用下划线命名了
        if n in store:
            return store[n]
        else:
            res = func(n)
            store[n] = res
            return res
    return _


@cache
def f(n):
    if n <= 1:  # 0 or 1
        return n
    return f(n - 1) + f(n - 2)


"""
问题来了，假如空间有限怎么办，我们不可能一直向缓存塞东西，当缓存达到一定个数之后，我们需要一种策略踢出一些元素，
用来给新的元素腾出空间。
一般缓存失效策略有
- LRU(Least-Recently-Used): 替换掉最近请求最少的对象，实际中使用最广。cpu缓存淘汰和虚拟内存效果好，web应用欠佳
- LFU(Least-Frequently-Used): 缓存污染问题(一个先前流行的缓存对象会在缓存中驻留很长时间)
- First in First out(FIFO)
- Random Cache: 随机选一个删除

LRU 是常用的一个，比如 redis 就实现了这个策略，这里我们来模拟实现一个。
要想实现一个 LRU，我们需要一种方式能够记录访问的顺序，并且每次访问之后我们要把最新使用到的元素放到最后（表示最新访问）。
当容量满了以后，我们踢出最早访问的元素。假如用一个链表来表示的话：

[1] -> [2] -> [3]

假设最后边是最后访问的，当访问到一个元素以后，我们把它放到最后。当容量满了，我们踢出第一个元素就行了。
一开始的想法可能是用一个链表来记录访问顺序，但是单链表有个问题就是如果访问了中间一个元素，我们需要拿掉它并且放到链表尾部。
而单链表无法在O(1)的时间内删除一个节点（必须要先搜索到它），但是双端链表可以，因为一个节点记录了它的前后节点，
只需要把要删除的节点的前后节点链接起来就行了。
还有个问题是如何把删除后的节点放到链表尾部，如果是循环双端链表就可以啦，我们有个 root 节点链接了首位节点，
只需要让 root 的前一个指向这个被删除节点，然后让之前的最后一个节点也指向它就行了。

使用了循环双端链表之后，我们的操作就都是 O(1) 的了。这也就是使用一个 dict 和一个 循环双端链表 实现LRU 的思路。
不过一般我们使用内置的 OrderedDict(原理和这个类似)就好了，要实现一个循环双端链表是一个不简单的事情，因为链表操作很容易出错。

补充：其实 lru 有个缺点就是额外的链表比较占用空间，如果你感兴趣的话可以看看 redis 如何实现的 lru 算法
"""


class LRUCache:
    def __init__(self, capacity=128):
        self.capacity = capacity
        # 借助 OrderedDict 我们可以快速实现一个 LRUCache，OrderedDict 内部其实也是使用循环双端链表实现的
        # OrderedDict 有两个重要的函数用来实现 LRU，一个是 move_to_end，一个是 popitem，请自己看文档
        self.od = OrderedDict()

    def get(self, key, default=None):
        val = self.od.get(key, default)  # 如果没有返回 default，保持 dict 语义
        self.od.move_to_end(key)   # 每次访问就把key 放到最后表示最新访问
        return val

    def add_or_update(self, key, value):
        if key in self.od:  # update
            self.od[key] = value
            self.od.move_to_end(key)
        else:  # insert
            self.od[key] = value
            if len(self.od) > self.capacity:  # full
                self.od.popitem(last=False)

    def __call__(self, func):
        """
        一个简单的 LRU 实现。有一些问题需要思考下：

        - 这里为了简化默认参数只有一个数字 n，假如可以传入多个参数，如何确定缓存的key 呢？
        - 这里实现没有考虑线程安全的问题，要如何才能实现线程安全的 LRU 呢？当然如果不是多线程环境下使用是不需要考虑的
        - 假如这里没有用内置的 dict，你能使用 redis 来实现这个 LRU 吗，如果使用了 redis，我们可以存储更多数据到服务器。而使用字典实际上是缓存了Python进程里(localCache)。
        - 这里只是实现了 lru 策略，你能同时实现一个超时 timeout 参数吗？比如像是memcache 实现的 lazy expiration 策略
        - LRU有个缺点就是，对于周期性的数据访问会导致命中率迅速下降，有一种优化是 LRU-K，访问了次数达到 k 次才会将数据放入缓存
        """
        def _(n):
            if n in self.od:
                return self.get(n)
            else:
                val = func(n)
                self.add_or_update(n, val)
                return val
        return _


@LRUCache(10)
def f_use_lru(n):
    if n <= 1:  # 0 or 1
        return n
    return f_use_lru(n - 1) + f_use_lru(n - 2)


def test():
    import time
    beg = time.time()
    for i in range(34):
        print(f(i))
    print(time.time() - beg)
    beg = time.time()
    for i in range(34):
        print(f_use_lru(i))
    print(time.time() - beg)


# TODO 要怎么给 lru 写单测？

if __name__ == '__main__':
    test()


######################################### 使用双链表实现 LRUcache ####################################################
"""
一般面试中不会让我们直接用内置结构，所以这里提供一个自己实现的双链表+map lru 缓存。这也是力扣上的一道真题：
[146] LRU 缓存 https://leetcode-cn.com/problems/lru-cache/description/
"""

class ListNode:
    def __init__(self, key=None, value=None):
        self.key = key
        self.value = value
        self.prev = self.next = None


class List:
    def __init__(self):
        """循环双链表。注意增加了虚拟头尾结点 head,tail 方便处理"""
        self.head = ListNode()
        self.tail = ListNode()
        self.head.prev = self.head.next = self.tail
        self.tail.next = self.tail.prev = self.head

    def delete_node(self, node):  # 删除指定节点
        node.prev.next = node.next
        node.next.prev = node.prev

    def add_to_head(self, node):  # 指定节点添加到 self.head 后
        nextnode = self.head.next
        node.next = nextnode
        node.prev = self.head
        self.head.next = node
        nextnode.prev = node


class LRUCache(object):

    def __init__(self, capacity):
        """
        思路：循环双链表 + 字典
        :type capacity: int
        """
        self.map = dict()
        self.ll = List()
        self.capacity = capacity

    def get(self, key):
        """
        :type key: int
        :rtype: int
        """
        if key not in self.map:
            return -1

        node = self.map[key]
        self.ll.delete_node(node)
        self.ll.add_to_head(node)
        return node.value

    def put(self, key, value):
        """
        :type key: int
        :type value: int
        :rtype: None
        """
        if key in self.map: # 更新不会改变元素个数，这里不用判断是否需要剔除
            node = self.map[key]
            node.value = value  # 修改结构体会也会修改 map 对应 value 的引用
            self.ll.delete_node(node)
            self.ll.add_to_head(node)
        else:
            if len(self.map) >= self.capacity:  # 直接用 len(self.map) ，不需要self.size 字段了
                tailnode = self.ll.tail.prev
                self.ll.delete_node(tailnode)
                del self.map[tailnode.key]

            node = ListNode(key, value)
            self.map[key] = node
            self.ll.add_to_head(node)
```

- 借助内置的 `collections.OrderedDict`，它有两个方法 `popitem` 和 `move_to_end`，我们可以迅速实现一个 LRU cache。请你尝试用 `OrderedDict` 来实现。
- python 内置库的哪些数据结构使用到了本章讲的链式结构？


## 相关阅读

[那些年，我们一起跪过的算法题- Lru cache[视频]](https://zhuanlan.zhihu.com/p/35175401)

## Leetcode

- 反转链表 [reverse-linked-list](https://leetcode.com/problems/reverse-linked-list/)

- 这里有一道关于 LRU 的练习题你可以尝试下。
  [LRU Cache](https://leetcode.com/problems/lru-cache/description/)

- 合并两个有序链表 [merge-two-sorted-lists](/https://leetcode.com/problems/merge-two-sorted-lists/submissions/)
