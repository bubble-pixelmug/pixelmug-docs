# 连接冒泡 App

使用官方冒泡 App 连接 PixelMug 时，开发者使用 `jeejio-bubble` SDK 编写 WebApp 交互界面，使用 `maopaoBleApp` 编写设备端 MPY。冒泡 App 的容器封装了手机和 PixelMug 之间蓝牙通信的底层功能，开发者无需关心通信细节，只需要关注应用本身。注意：普通浏览器没有与 PixelMug 通信的功能，页面必须运行在冒泡 App 容器中。

## 总体框架

```text
Bot：绑定设备、打开 WebApp
             ↓
WebApp：BleAppClient
             ↓
冒泡 App 容器的原生桥接
             ↕ 手机蓝牙
PixelMug：协议栈、鉴权、通信
             ↕
MPY 应用：BleAppService → 业务回调
```

Bot 只负责入口和设备关联；业务数据在手机和 PixelMug 之间通过 BLE 传输，不经过 Bot 转发。Studio 负责启动 Bot 与部署 MPY。PixelMug 底层提供三个 BLE 服务：

| 服务 | 用途 | 开发者是否直接操作 |
| --- | --- | --- |
| F140 | 冒泡鉴权 | 由冒泡 App 和固件内部处理 |
| F150 | 标准消息通道 | 通过 `command()`、状态、事件和配置等接口使用 |
| F160 | 高速数据通道（Simple） | 通过 `sendSimple*()` / `send_simple*()` 使用 |

## 从连接到业务就绪

1. MPY 调用 `ble.start()`，以默认的冒泡鉴权模式启动服务并广播。
2. WebApp 取得 bot 关联的设备 `device` 后，调用 `await client.connect(device)`。
3. 冒泡 App 负责完成扫描、BLE 连接和设备鉴权。
4. WebApp 与 MPY 的 `BleAppService` 执行 hello，检查应用标识并取得 session、能力和消息大小限制。
5. `connect()` 完成后，WebApp 通过应用接口发送业务数据；MPY 持续调用 `poll()` 处理请求。

连接、鉴权、应用会话是不同阶段。设备的 `on_connect()` 只表示 BLE 已连接，网页应等待 `connect()` 完成后再开始业务交互。重新连接时需要重新建立鉴权和应用会话。


## 一个完整示例：ble-minimal

下面是一个完整的简单示例，使用冒泡 App 模式和标准消息通道的命令接口。项目位于 `examples/ble-minimal`：

```text
ble-minimal/
├── bot/index.js         绑定设备、帮助、打开 WebApp
├── webapp/index.html    连接、断开、重连、echo 四个按钮
├── webapp/main.js       调用 WebApp BLE SDK
├── webapp/style.css     简单的按钮布局
├── mpy/__main__.py      接收命令并在杯子上显示文字
├── mpy/mps.json         声明 MicroPyxel 显示组件依赖
├── package.json
└── README.md
```

这个项目中的各部分这样配合：

```text
Studio ──部署并运行 MPY──→ PixelMug
                              
Bot ──绑定设备、打开页面──→ 冒泡 App 中的 WebApp
                              │
                     WebApp BLE SDK
                              │
                     冒泡 App 原生桥接
                              │
                        手机蓝牙
                              │
                       BLE 连接与命令
                              ↓
                  PixelMug 的 maopaoBleApp
                              │
                       echo 回调 → 屏幕
```

Bot 提供设备绑定和网页入口，Studio 负责加载设备代码。WebApp 打开后通过手机蓝牙与杯子通信，echo 命令不需要先发送给 Bot 再转发。

## 快速体验

1. 在 Studio 选择项目 `examples/ble-minimal`，选择 `bot/index.js`，填写 Bot token。
2. 勾选“启动后自动运行设备代码”，启动智能体。
3. 在冒泡 App 中发送 `/bindPixelMug`，关联一台 PixelMug S1 Pro/Lite。
4. 等待 Studio 完成设备代码加载，杯子显示 `DISC`。
5. 发送 `/webApp`，通过消息按钮打开页面。页面使用第一台已关联设备。
6. 点击“连接”，等待杯子显示 `CONN`，再点击“echo”，杯子显示 `echo`。
7. 点击“断开”，等杯子恢复 `DISC` 后再点击“重连”。

手机需要能够访问 Studio 提供的页面地址，并靠近杯子、允许蓝牙相关权限。页面运行在冒泡 App 容器中，普通浏览器没有所需的原生桥接。

`DISC` 表示未连接，`CONN` 表示设备已建立 BLE 连接。应用握手仍由 SDK 完成，不能把屏幕出现 CONN 当作所有业务已经就绪的证明。此教学页面省略了状态、错误展示和操作锁，请按步骤逐个操作。

下面对 WebApp 和设备端 MPY 代码进行解释，对开发一个 BLE 应用建立整体的了解。

## 1. Bot：绑定设备和打开页面

Bot 使用 `BubbleBot`，并注册 PixelMug S1 设备类型：

```js
import { BubbleBot, InlineKeyboard } from '@jeejio-bubble/bot/sdk';
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});
bot.registerDevices([new PixelMugS1()]);
```

在消息处理函数中，根据用户发送的命令调用三个接口：

| Bot 命令 | 最小接口 | 作用 |
| --- | --- | --- |
| `/bindPixelMug` | `ctx.sendBindDevice(...)` | 发送设备绑定入口 |
| `/help` | `ctx.sendText(...)` | 发送操作说明 |
| `/webApp` | `ctx.sendKeyboard(...)` 配合 `InlineKeyboard.url(...)` | 发送打开网页的按钮 |

例如，`/webApp` 的处理代码是：

```js
await ctx.sendKeyboard(
  '连接 PixelMug，发送第一条 BLE 命令。',
  new InlineKeyboard().url('打开 BLE 示例', process.env.STUDIO_WEBAPP_URL)
);
```

Studio 提供 `STUDIO_WEBAPP_URL`。完整 Bot 还通过 `bot.setCommands()` 注册三个命令，并调用 `bot.start()` 启动；直接运行项目中的 `bot/index.js` 即可。

绑定设备让 WebApp 能取得目标设备信息，不等于已经建立 BLE 连接。连接由页面的“连接”按钮发起。

## 2. WebApp：取得设备并建立连接

`webapp/main.js` 首先创建网页 SDK 对象，取得第一台关联设备，再创建 BLE 应用客户端：

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';

const webapp = new BubbleWebApp();
const [device] = await webapp.getDevices();
const ble = new BleAppClient(webapp.ble, { appId: 'BleMinimal' });
```

三个对象各有用途：

| 对象／接口 | 作用 |
| --- | --- |
| `webapp` | 访问冒泡 App 提供的 WebApp 能力 |
| `webapp.getDevices()` | 取得设备对象，包括连接所需的设备槽位信息 |
| `webapp.ble` | SDK 的 BLE 传输入口 |
| `new BleAppClient(...)` | 封装应用握手和命令收发 |
| `appId: 'BleMinimal'` | 指定要连接的设备端应用，必须与 MPY 的应用标识一致 |

HTML 中放一个按钮，再在 JavaScript 中给它绑定点击动作：

```html
<button id="connect">连接</button>
```

```js
document.querySelector('#connect').onclick = async () => {
  await ble.connect(device);
};
```

`querySelector('#connect')` 找到这个按钮，`onclick` 指定点击时执行的函数。`await` 等待连接操作完成。SDK 与冒泡 App 原生桥接负责扫描、连接、鉴权及应用握手；开发者不需要在网页里编写鉴权算法或操作蓝牙特征值。

## 3. 设备端 MPY：启动服务并接收 echo

下面从完整项目中提取连接和 echo 的核心代码；主动断开的扩展见后文和项目源码。

```python
import micropyxel as pyxel
from maopaoBleApp import BleAppService

ble = BleAppService("BleMinimal")
message = "DISC"


def on_connect(conn):
    global message
    message = "CONN"


def on_disconnect(conn, reason):
    global message
    message = "DISC"


def echo(params, context):
    global message
    message = "echo"
    return {"text": "echo"}


def update(rt):
    ble.poll()


def draw(rt):
    rt.cls(0)
    x = (rt.width - len(message) * 4) // 2
    rt.text(x, (rt.height - 6) // 2, message, 10)


ble.on_connect(on_connect)
ble.on_disconnect(on_disconnect)
ble.command("echo", echo, mutates=False)

pyxel.init(start_audio=False)
try:
    ble.start()
    pyxel.run(update, draw, fps=20)
finally:
    ble.deinit()
    pyxel.destroy()
```

`BleAppService("BleMinimal")` 的标识与网页的 appId 相同。`ble.start()` 默认启用冒泡鉴权，启动服务并广播；应用必须持续调用 `ble.poll()`，才能推进鉴权、命令处理和响应发送。本例在 MicroPyxel 的 update 回调中调用它。

`ble.command("echo", echo, mutates=False)` 注册名为 echo 的命令。处理函数接收 params 和 context，返回可序列化为 JSON 的结果。此例不使用状态同步，设置 mutates=False，避免命令后自动增加状态版本和发布状态。

## 4. WebApp：发送 echo 命令

页面的 echo 按钮只需要调用 `command()`：

```js
document.querySelector('#echo').onclick = async () => {
  await ble.command('echo', { text: 'echo' });
};
```

点击后发生的事情是：

1. SDK 组织请求，携带命令名、参数、请求 id 和当前应用 session。
2. 冒泡 App 将请求加密，通过标准消息通道（F150）发送到杯子。
3. 设备的 `ble.poll()` 分发请求，执行已注册的 echo 函数。
4. 函数把显示文字改为 echo，并返回 `{"text": "echo"}`。
5. 服务发送命令响应，SDK 将响应匹配到这次调用，Promise 完成。

示例的 echo 函数固定显示并返回 echo，未使用传入的 params.text。可以尝试从这里改成读取参数。

最小页面不显示返回值。如果需要取得设备响应：

```js
const response = await ble.command('echo', { text: 'echo' });
const text = response.result.text;
```

这里取得的是设备命令处理结果，区别于单纯的蓝牙写入完成。命令失败时 Promise 会拒绝；这个示例页面省略了错误展示，实际应用可以按业务需要处理异常。

## 5. 断开、重连和退出

完整项目另外注册了 `disconnect` 命令，所以页面可以这样请求断开：

```js
document.querySelector('#disconnect').onclick = async () => {
  if (!ble.ready) return;
  await ble.command('disconnect', {}, { retries: 0 });
};

document.querySelector('#reconnect').onclick = async () => {
  await ble.reconnect();
};
```

disconnect 是本例自定义的应用命令，不是 SDK 内置的命令。MPY 的处理函数先返回 accepted，主循环等待响应发送队列清空并额外等待 200 ms，再调用 `ble.disconnect()` 真正断开连接。不要在 echo 一类需要响应的处理函数中直接断开，以免响应尚未发送。

断开后杯子显示 DISC，设备服务保留，后续 poll 会推进重新广播。`reconnect()` 使用此前连接过的设备，重新执行连接与应用握手；它不保证先切断已有物理链路，因此本例按“断开 → 等待 DISC → 重连”操作。


退出页面时清理 SDK 监听和计时器：

```js
window.addEventListener('pagehide', () => {
  ble.close();
  webapp.stop();
});
```

`BleAppClient.close()` 不代表断开物理 BLE 链路，需要主动断开时先点击“断开”。

## WebApp 与设备端接口对照

WebApp 使用 `BleAppClient` 发起连接和命令，设备端使用 `BleAppService` 提供服务并处理请求。两端通过相同的应用标识和命令名对应起来。

| 用途 | 冒泡 WebApp | 设备端 MPY | 对应关系与详细说明 |
| --- | --- | --- | --- |
| 创建通信对象 | `new BubbleWebApp()`，取得 `webapp.ble` | N/A | WebApp 通过冒泡 App 原生桥接访问手机蓝牙。 |
| 创建应用客户端／服务 | `new BleAppClient(webapp.ble, { appId: 'BleMinimal' })` | `BleAppService("BleMinimal")` | App Client 发起请求，App Service 接收并处理请求。两端的 `appId` 必须一致，应用握手时会检查。 |
| 选择目标设备 | `await webapp.getDevices()` | N/A | 网页取得关联设备信息，用于指定连接哪台杯子。 |
| 连接与生命周期 | `connect()`、`reconnect()`、`close()` | `start()`、生命周期回调、`disconnect()`、`deinit()` | 设备先启动服务并广播，网页再主动连接。设备的连接回调表示 BLE 已连接；网页的 `connect()` 还会等待鉴权和应用握手。详见 [WebApp 连接管理](./webapp/) 和 [MPY 连接与生命周期](./mpy/)。 |
| 命令与响应 | `command(name, params)`，从 `response.result` 读取结果 | `command(name, handler)`，处理函数接收参数并返回结果 | 网页发送命令，设备注册同名处理函数。详见 [WebApp 控制命令](./webapp/commands) 和 [MPY 命令与响应](./mpy/commands)。 |
| 读取当前状态 | `requestSnapshot()` | `set_state_provider()` | 网页主动读取设备应用当前状态。详见 [WebApp 状态、事件](./webapp/state-events) 和 [MPY 状态与事件](./mpy/state-events)。 |
| 状态与事件通知 | `on('state')`、`on('event')` | `publish_state()`、`send_event()` | 设备主动通知网页状态变化或业务事件；事件不会在重新连接后自动补发。详见 [WebApp 状态、事件](./webapp/state-events) 和 [MPY 状态与事件](./mpy/state-events)。 |
| 配置传输 | `setConfig()` | `config()`、`process_pending_config()` | WebApp 分块上传较大的 JSON 配置，设备在主循环中执行对应处理函数。详见 [WebApp 配置接口](./webapp/config) 和 [MPY 配置传输](./mpy/config)。 |
| 高速数据通道 | `sendSimpleRaw()`、`sendSimpleText()`、`on('simpleData')` | `on_simple()`、`send_simple_raw()`、`send_simple_text()` | 两端按应用约定解释 RAW 或 UTF-8 文本数据。详见 [WebApp 高速数据通道](./webapp/simple) 和 [MPY 高速数据通道](./mpy/simple)。 |
| 推进通信 | N/A | 主循环持续调用 `ble.poll()` | 设备必须主动轮询，才能处理命令、配置、状态、事件和 Simple 回调。 |
| 退出清理 | `ble.close()`、`webapp.stop()` | `ble.deinit()` | 两端分别清理自己的资源；清理调用不能作为物理连接已经断开的确认。 |

两端代码都把对象命名为 `ble`，但类型和方法含义不同：网页的 `ble` 是 `BleAppClient`，设备端的 `ble` 是 `BleAppService`，尤其要区分 `command()` 的“发送”和“注册”。设备端回调应保持简短，不要长时间阻塞主循环。


## 下一步

- [WebApp BLE 接口](./webapp/)：网页侧完整入口与使用方式。
- [MPY BLE 接口](./mpy/)：设备侧生命周期与各业务接口。
- [连接自定义 BLE 中心设备](../custom-client)：无需冒泡 App 时使用的开放协议。
