---
title: "详解 VSCode 的调试功能"
date: 2022-08-30T23:46:36+08:00
draft: true
author: "Hugo Authors"
description: "Sample article showcasing basic Markdown syntax and formatting for HTML elements."
tags:
  - "Debugging"
---

Visual Studio Code 的一个关键特性是其强大的调试支持。VS Code 的内置调试器有助于加速编辑、编译和调试循环。

## 基础调试功能

### Run and Debug 视窗

运行和调试视窗显示运行和调试相关的所有信息，并有一个带有调试命令和配置设置的顶栏。

![Simplified initial Run and Debug view](https://code.visualstudio.com/assets/docs/editor/debugging/debug-start.png)

### 启动配置

要在 VS Code 中运行或调试一个简单的应用程序，请在『调试』窗口中选择『运行和调试』或按 F5，VS Code 将尝试运行你当前活动的文件。

但是，对于大多数调试场景，创建启动配置文件是很有好处的，因为它允许你配置和保存调试的设置信息。VS Code 将调试配置信息保存在 `launch.json` 文件中。

### Lauch vs. attach 配置

在 VS Code 中，有两种核心调试模式 Launch 和 Attach，它们分别处理两类不同工作流和两类开发者。取决于工作流，知道哪种类型的配置适合我们的项目可能会令人困惑。

如果你来自浏览器开发者工具背景，你可能不习惯『从你的工具启动』，因为你的浏览器实例已经打开。当你打开 DevTools 时，你只是将 DevTools 附加到你打开的浏览器选项卡。另一方面，如果你来自服务器或桌面背景，让你的编辑器为你启动进程是很正常的，并且你的编辑器会自动将其调试器附加到新启动的进程。

解释启动和附加之间的区别的最好方法是把启动配置（lauch configuration）看作是在 VS Code 附加到应用程序之前以调试模式启动应用程序的配方，而附加配置（attach configuration）是如何将 VS Code 的调试器连接到已经在运行的应用程序或进程的配方。

VS Code 调试器通常支持在调试模式下启动程序或在调试模式下附加到已经运行的程序。根据请求（`attach` 或 `lauch`），需要不同的属性，而 VS Code 的 `launch.json` 验证和建议应该对此有所帮助。

## 参考

- [Debugging](https://code.visualstudio.com/docs/editor/debugging)
