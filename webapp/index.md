# WebApp SDK

WebApp 是运行在冒泡 App 内的网页应用，是一种 `Mini App`。它可以直接使用当前 Bot 对话中已关联的设备，并通过图形化界面扩展对话交互，适合实现设备控制面板、信息表单以及需要连续操作的功能。

## WebApp 与 Bot 的分工

WebApp 负责呈现界面和响应用户操作，Bot 则承担两个基础职责：首先，Bot 通过对话消息中的按钮提供 WebApp 入口，让用户从当前单聊或群聊打开页面；其次，Bot 定义可关联的设备，向用户提供设备关联入口，并将当前对话中的关联设备及其变化同步给 WebApp。

在此基础上，Bot 还可以根据业务需要充当 WebApp 的后端。WebApp 可以把需要长期保存或集中处理的数据交给 Bot，也可以由 Bot 统一协调多台关联设备，实现跨设备联动。对于天气、BTC 行情等需要定期从外部服务获取的信息，也可以由 Bot 负责查询和更新，再把结果返回或主动推送给 WebApp。

`jeejio-bubble` 提供的 WebApp SDK 通过冒泡 App 注入的原生桥接能力，连接 WebApp、Bot 和当前对话中关联的设备。开发者可以用它查询关联设备、与 Bot 双向通信、直接调用设备 RPC，以及接收设备主动上报的事件。开始开发前，先了解 SDK 中三条职责不同的通信通道：

```text
WebApp 与 Bot 双向通信：
WebApp ⇄ 冒泡 App 桥 ⇄ 云端 ⇄ Bot

WebApp 直接调用设备 RPC：
WebApp → 冒泡 App 桥 → 云端 → 关联设备
                           └→ Bot 可旁路观察

WebApp 接收设备上报事件：
设备 → 云端 → Bot 设备轮询 → 云端 → 冒泡 App 桥 → WebApp
```

WebApp 与 Bot 可以通过消息通道发送请求、返回结果或主动推送数据。WebApp 调用设备 RPC 时，由冒泡 App 直接把请求发送给关联设备，不经过 Bot 的业务处理器。设备主动上报的事件则由 Bot 接收，并根据页面会话中的订阅关系，转发给仍然有效且已经订阅该设备的 WebApp。

## WebApp SDK 的主要能力

| 目标 | 主要入口 | 是否依赖 Bot |
| --- | --- | --- |
| WebApp -> Bot | `webapp.request()`、`bot.onWebAppRequest()` | 需要 Bot 消息轮询 |
| Bot -> WebApp | `webapp.on()`、`ctx.sendWebAppData()` | 需要 Bot 和有效页面会话 |
| 获取关联设备 | `webapp.getDevices()` | 由 Bot 内置系统请求处理 |
| 调用设备 RPC | `webapp.callDevice()` | 通过冒泡 App 原生桥直接调用设备 |
| 接收设备通知 | `subscribeDeviceEvents()`、`onDeviceEvent()` | 需要 Bot 轮询设备消息并转发给会话 |
| 观察 WebApp 的设备调用 | `observeWebAppDeviceCalls` | 需要 Bot 开启观察 |

WebApp 页面必须在冒泡 App 中打开。普通浏览器没有冒泡 App 的原生桥 `globalThis.JeeWeb`，不支持上述能力。因此，界面开发可以在浏览器中进行，涉及冒泡 App 桥接和设备的流程需要在冒泡 App 中验证。
