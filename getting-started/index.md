# 立刻体验

从给水杯发送一句话开始，逐步体验 Bot、WebApp 和设备端 MPY 如何协作。每个示例都是一个可以在 Studio 中直接运行的项目，代码放在 `getting-started/`；这里介绍使用过程和代码含义。

如果还不熟悉这些概念，可以先阅读 [快速了解](/overview/)。不必记住所有接口，先看到水杯响应，再回头理解代码。

## 开始之前

当前教程从你**已经获得 Bot token、已经安装好 Studio**开始。请同时准备：

- 已登录的冒泡 App，并能打开你的 Bot 私聊。
- 已在冒泡账号下绑定、联网且在线的 PixelMug。
- 可以运行 Studio 的电脑，以及随项目提供的 `getting-started` 示例目录。

第一个示例支持 PixelMug P1 和 S1 系列，直接使用固件提供的接口，不需要安装设备端 MPY 程序。电脑和水杯需要能访问 Bubble 服务；后面的 WebApp 示例还需要手机能够访问电脑的局域网地址。

### 申请 Bot token

::: info 待补充
这里将补充创建冒泡 Bot、获取 Bot token，以及在冒泡 App 中找到它的步骤。已有 token 的读者可以直接继续。
:::

### 安装 Studio

::: info 待补充
这里将补充 Studio 的下载、安装和首次启动步骤。下文以 Studio 已可打开为前提。
:::

## 按顺序体验四个示例

| 示例 | 你会看到什么 | 新学到什么 |
| --- | --- | --- |
| [01 · 通过对话与 PixelMug 交互](/getting-started/01-chat) | 给 Bot 发文字，水杯显示文字，Bot 回复结果 | Studio 完整操作流程；Bot、设备声明、TALID、绑定、RPC、命令与回复 |
| [02 · 通过 WebApp 与 PixelMug 交互](/getting-started/02-pixel-text) | 在页面中设置文字、字体、颜色和滚动效果 | WebApp 获取关联设备，并通过设备 SDK 直接调用设备 |
| [03 · 在 PixelMug 上安装和运行 MPY](/getting-started/03-ble-play) | 在手机上滑动和点击，水杯上的光点移动、闪烁 | Studio 自动加载 MPY、WebApp BLE、两端消息格式与实时交互 |
| [04 · 体验更多 MPY 应用](/getting-started/04-more-mpy) | 实时行情、旋转图片、音乐频谱和运动粒子 | 手动安装 MPY，在多个独立应用之间切换 |

四篇教程可按顺序体验。第二篇沿用第一篇的选择应用、启动、编辑保存和重启流程，重点介绍 WebApp 访问地址和页面交互；第三篇增加 S1 系列的 MPY 自动加载、设备端绘图与 BLE 连接；第四篇体验多个独立 MPY 应用，重点介绍使用和切换方法。

继续阅读：[01 · 通过对话与 PixelMug 交互](/getting-started/01-chat)。
