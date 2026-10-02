# 03 · 在 PixelMug 上安装和运行 MPY

前两个示例使用固件已经提供的 TAL 接口显示文字。这一次，我们把一段自己编写的 Python 程序放到 PixelMug 上运行：水杯显示一个光点，在手机上滑动，光点跟着移动；轻点一下，光点周围绽放火花。

**MPY 是本例运行在设备端的 MicroPython 应用。** 你可以用它定义绘图、动画和交互行为，扩展设备能力，而不只是调用固件已经定义好的动作。

本例仅支持 **PixelMug S1 系列（Pro / Lite），不支持 P1**。项目位置：`getting-started/03-ble-play`。

## 一、在 Studio 中体验

选择应用、配置 Bot token、选择 WebApp 访问地址的方法与[第二篇](/getting-started/02-pixel-text)相同。本篇新增两件事：让 Studio 自动加载设备代码，以及让手机通过 BLE 连接设备。

### 1. 选择应用，开启自动运行

停止之前运行的智能体，在 Studio 中打开整个 `getting-started/03-ble-play` 文件夹。

确认 Bot 入口为 `bot/index.js`，配置 token 和手机能够访问的 WebApp 地址，然后在“运行配置”中**勾选“启动后自动运行设备代码”**。

本例包含 `mpy/`，因此 Studio 会显示这个选项。开启后，Studio 会在运行智能体并识别到关联设备后，自动加载并运行项目中的设备代码。

::: tip 本例由 Studio 负责加载
WebApp 只负责 BLE 连接和交互，不包含安装或启动 MPY 的代码。请先勾选自动运行选项，再启动智能体。
:::

电脑、手机和水杯保持在同一局域网，水杯需要在线；手机开启蓝牙并靠近水杯。

### 2. 启动并关联 S1 设备

点击“启动智能体”。在冒泡 App 中打开 Bot 私聊，用 `/help` 查看介绍，再用 `/bindPixelMug` 关联一台 PixelMug S1，也可以在 Studio 的“关联设备”卡片中完成。

Bot 只声明了 S1 设备位置，因此本例不要使用 P1。若已经关联了正确的设备，可以直接等待自动加载。

### 3. 等待设备代码运行

Studio 会处理进入开发模式、连接设备、上传代码和启动程序的过程。点击“调试运行”下的设备子标签，可以查看设备运行过程和设备日志。

等到设备代码运行成功，**确认水杯上已经出现光点**，再继续手机操作。Bot 和 WebApp 服务启动，并不代表设备代码已经加载完成。

如果忘记开启自动运行，先停止智能体，回到“运行配置”勾选该选项，然后重新启动。

### 4. 打开触摸板并连接蓝牙

在冒泡 App 中发送 `/webApp`，点击“打开光点触摸板”，然后点击页面中间的“蓝牙连接 PixelMug”。按手机提示允许蓝牙相关权限。

| 按钮状态 | 含义 |
| --- | --- |
| 蓝色“蓝牙连接 PixelMug” | 尚未连接，或连接超时、断开后可以重试 |
| 蓝色“连接中” | 正在建立 BLE 连接和应用会话 |
| 绿色“已连接蓝牙，可以开始体验” | 已就绪，可以滑动或轻点 |

连接前先看到杯子上的光点，可以帮助你区分“设备程序尚未运行”和“手机蓝牙尚未连接”这两种情况。

### 5. 滑动和轻点

在深色触摸板上按住并滑动，观察水杯光点的位置；轻点一下，观察光点周围向外扩散的火花。

本例有两条不同的通信路径：

| 操作 | 使用的连接 |
| --- | --- |
| 打开 WebApp 页面 | 手机通过局域网访问 Studio 提供的网页 |
| 滑动、轻点控制光点 | 手机通过 BLE 把操作发送给设备端 MPY |

Bot 提供应用入口和设备关联，触摸操作不需要逐条交给 Bot 转发。

## 二、改一行设备代码，再试一次

在 Studio 文件树中展开 `03-ble-play → mpy`，打开 `__main__.py`，找到：

```python
COLOR = 10
```

改成：

```python
COLOR = 11
```

这里的数字是 MicroPyxel 调色板的颜色索引。

保存后点击“重启智能体”，等待 Studio 重新加载并运行设备程序，再在 WebApp 中重新连接蓝牙。看看水杯上的光点是否变了颜色。

本次修改发生在设备端，因此仅刷新手机页面不会更新水杯里的程序。设备程序重新加载或设备重启也会中断原有 BLE 会话，需要重新连接。

## 三、对照源码理解新增部分

```text
03-ble-play/
├─ bot/
│  └─ index.js       声明 S1 设备、处理命令、提供页面入口
├─ webapp/
│  ├─ index.html    连接按钮和触摸板
│  ├─ style.css     页面样式
│  └─ main.js       BLE 连接、触摸坐标和数据发送
└─ mpy/
   ├─ mps.json      设备程序名称、版本和依赖声明
   └─ __main__.py   接收 BLE 数据并绘制光点
```

三份程序分别运行在不同位置：

| 程序 | 运行位置 | 本例的职责 |
| --- | --- | --- |
| Bot | 电脑上的 Node.js | 注册设备、帮助、关联、WebApp 入口 |
| WebApp | 手机冒泡 App 的 WebView | 读取触摸操作，通过 BLE 发送数据 |
| MPY | PixelMug S1 的 MicroPython 容器 | 接收数据，更新光点和动画 |

Studio 负责开发期间的设备代码加载，不需要在这个入门示例中手写安装流程。

### Bot：使用 S1 设备声明

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

bot.registerDevices([new PixelMugS1()]);
```

本例依赖 S1 的 MicroPython 容器，因此直接声明 S1 设备，没有把 P1 加入兼容列表。

`/help`、`/bindPixelMug`、`/webApp` 三个命令与第二篇采用相同方式处理。Bot 继续使用 `webAppDeviceAccess: 'any'`，表示任意一个设备位置完成绑定后即可打开 WebApp；本例只有一个位置。

### MPY 入口与程序描述

`mpy/__main__.py` 是设备程序入口。Studio 加载项目中的设备代码后，从这个入口开始执行。

`mpy/mps.json` 描述应用：

```json
{
  "name": "getting-started-light",
  "version": "1.0.0",
  "description": "用手机控制 PixelMug 光点",
  "dependencies": [
    { "name": "micropyxel", "version": ">=1.0.0" }
  ]
}
```

`name` 和 `version` 描述设备程序的名称、版本；`dependencies` 声明所需组件。这里声明 MicroPyxel，程序还使用固件提供的 `maopaoBleApp`。这些是设备端组件，不是电脑上安装的 npm 包。

### 设备端：启动绘图和 BLE 服务

```python
import micropyxel as pyxel
from maopaoBleApp import BleAppService, DATA_TYPE_RAW

ble = BleAppService("GettingStartedLight")
```

`micropyxel` 提供绘图和运行循环，`BleAppService` 提供设备端 BLE 应用服务。

`GettingStartedLight` 是两端约定的应用标识，必须与 WebApp 中的 `appId` 一致。它不是设备 TALID，也不是 Bot token；它用于这次 BLE 应用会话。

文件末尾把前面定义的函数连接起来：

```python
ble.on_simple(receive)
ble.start()
pyxel.init(start_audio=False)
pyxel.run(update, draw, fps=30, on_exit=close)
```

- `on_simple(receive)` 注册 Simple 数据接收函数。
- `start()` 启动 BLE 应用服务。
- `init(start_audio=False)` 初始化绘图，本例不启动音频。
- `run(...)` 以目标每秒 30 帧执行更新和绘制，并在退出时调用清理函数。

### WebApp：连接 BLE 应用

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';
```

第二篇创建 WebApp 时使用 `{ ble: false }`。本例需要 BLE，因此使用默认配置：

```js
webapp ||= new BubbleWebApp();
const [device] = await webapp.getDevices();

client = new BleAppClient(webapp.ble, {
  appId: 'GettingStartedLight',
});
await client.connect(device);
```

`getDevices()` 的作用没有变化：获取当前会话的关联设备。本例只有一个设备位置，所以取第一个设备；实际源码会先检查设备是否存在。

`BleAppClient` 使用 `webapp.ble` 与冒泡 App 的蓝牙能力交互，并管理连接和应用握手。等待 `connect(device)` 成功后，才把按钮切换为绿色。

连接状态通过 `connectionState` 事件反馈；断开或失败时恢复蓝色按钮，让用户重新连接。页面没有调用 MPY 安装接口，因此连接前必须先完成 Studio 自动加载。

### 两端约定：三个字节表示一次操作

本例采用简单的二进制消息：

```text
[操作类型, x, y]
```

| 字节 | 含义 |
| --- | --- |
| 第 1 个 | `1` 表示移动，`2` 表示轻点 |
| 第 2 个 | 横坐标，本例范围 `0..31` |
| 第 3 个 | 纵坐标，本例范围 `0..15` |

例如 `[2, 16, 8]` 表示在坐标 `(16, 8)` 轻点。这是本示例自己定义的消息格式，不是 TAL RPC，也不是所有 BLE 应用必须使用的格式。

网页把触摸板上的位置换算到本例的 32 × 16 坐标范围，再构造消息：

```js
nextPacket = new Uint8Array([kind, x, y]);
```

`Uint8Array` 用来存放字节。坐标范围有限，三个字节已经足够，不需要把每次触摸都包装成一大段 JSON。

### WebApp：发送触摸数据

```js
await client.sendSimpleRaw(packet);
```

`sendSimpleRaw()` 发送原始字节，对应设备端的 `DATA_TYPE_RAW`。

触摸移动会产生很多事件。示例每 50 毫秒尝试发送最新位置，并在上一条发送完成前暂缓发送，减少积压。原生连接、握手和数据传输由 SDK 处理，页面只需准备这些字节。

按下和滑动时发送移动类型；抬起时，如果按压少于 350 毫秒且移动距离小于 12 个页面像素，就按轻点处理。这些阈值是本例的交互选择，可以根据自己的应用调整。

### MPY：接收数据，更新状态

```python
def receive(data_type, data, context):
    global x, y, spark
    if data_type != DATA_TYPE_RAW or len(data) != 3:
        return
    x, y = min(data[1], 31), min(data[2], 15)
    if data[0] == 2:
        spark = 12
```

接收函数检查数据类型和长度，再把坐标存入 `x`、`y`。如果操作类型为轻点，就设置火花动画计数 `spark`。

`context` 是接收回调提供的上下文，本例没有使用它。接收函数只更新状态，真正的绘制交给绘图循环。

### MPY：更新与绘制分开

```python
def update(rt):
    global spark
    ble.poll()
    spark = max(0, spark - 1)
```

`update()` 每帧处理 BLE 服务的待处理工作，并减少火花计数。不要删掉 `ble.poll()`：它让接收处理能在程序运行中持续进行。

```python
def draw(rt):
    pyxel.cls(0)
    pyxel.rect(x - 1, y - 1, 3, 3, COLOR)
```

`draw()` 先用颜色索引 `0` 清屏，再以当前位置为中心画一个 3 × 3 的光点。实际源码还会在 `spark` 非零时，沿八个方向用 `pyxel.pset()` 画出逐渐向外扩散的火花。

手机只发送位置和操作类型，画什么、如何变化由设备端 Python 代码决定。这就是设备端程序带来的扩展能力：同一份触摸输入，可以被你改造成光点、画笔或小游戏。

### 结束时清理资源

设备端通过 `on_exit=close` 注册清理函数：

```python
def close(rt, reason, error):
    ble.deinit()
    pyxel.destroy()
```

WebApp 在 `pagehide` 时停止发送定时器，关闭 BLE 应用客户端并停止 WebApp 会话。两端各自释放资源，避免旧页面或旧程序继续处理交互。

## 连接不上或光点没有响应时

| 现象 | 先检查什么 |
| --- | --- |
| 水杯没有出现光点 | 是否勾选自动运行；是否已关联 S1；在设备调试页查看加载状态和日志 |
| 打开页面一直加载 | 手机能否访问 Studio 的局域网地址，参考第二篇 |
| 按钮从“连接中”恢复蓝色 | 设备程序是否运行；蓝牙权限是否允许；手机是否靠近设备；查看 WebApp 日志 |
| 显示已连接，但光点不动 | 两端 `appId` 是否一致；设备日志是否报错；MPY 是否仍在运行 |
| 修改 Python 后效果没变化 | 是否保存并重启智能体，等待重新加载完成 |
| 重启设备或重新部署后无法操作 | 旧 BLE 会话已断开，需要重新连接 |

完成本例后，可以继续阅读 [MicroPyxel](/device/micropyxel/)、[设备端 BLE](/ble/) 和 [WebApp BLE](/ble/app/webapp/)，了解如何扩展绘图和近距离交互。
