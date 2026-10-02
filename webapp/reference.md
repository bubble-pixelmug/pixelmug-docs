# WebApp SDK 接口索引

本页用于快速查找 WebApp 开发中常用的公开接口。建议先阅读 [快速开始](./quick-start)，再按具体场景查看对应章节。

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
```

本文不包含 BLE 接口；蓝牙能力见 [WebApp BLE 文档](/ble/app/webapp/)。

## 创建 WebApp

```js
const webapp = new BubbleWebApp({ ble: false });
```

| 接口 | 用途 |
| --- | --- |
| `new BubbleWebApp(options)` | 创建 WebApp 实例并开始当前页面会话 |
| `start()` | 手动开始页面会话 |
| `stop()` | 手动结束页面会话 |

WebApp 默认会自动开始页面会话，普通应用不需要调用 `start()` 或 `stop()`。常用选项是 `ble: false`、`timeoutMillis` 和 `debug`；需要自行控制启动时机时再使用 `autoStart: false`。详见 [页面会话与生命周期](./lifecycle)。

## WebApp 与 Bot 通信

| WebApp 接口 | 用途 |
| --- | --- |
| `request(type, payload)` | 向 Bot 发起业务请求并等待返回结果 |
| `on(type, handler)` | 接收 Bot 推送的指定类型数据 |
| `on(handler)` | 接收 Bot 推送的所有业务数据 |

`on()` 的处理器通常读取 `event.type` 和 `event.payload`。请求与响应见 [WebApp 请求 Bot](./bot-channel)，主动推送见 [Bot 主动向 WebApp 推送](./push)。

Bot 侧对应接口：

| Bot 或 Context 接口 | 用途 |
| --- | --- |
| `bot.onWebAppRequest(type, handler)` | 处理指定类型的 WebApp 请求；处理器返回值会自动回复 |
| `bot.on('web_app_data', handler)` | 处理没有对应 `onWebAppRequest()` 处理器的业务请求 |
| `ctx.replyWebApp(result)` | 在 `web_app_data` 处理器中回复当前请求 |
| `ctx.sendWebAppData(type, payload)` | 向当前页面会话推送业务数据 |

## 设备相关

| WebApp 接口 | 用途 |
| --- | --- |
| `getDevices()` | 获取当前 Bot 对话已经关联的设备 |
| `callDevice(device, rpc)` | 直接调用关联设备的 RPC |
| `subscribeDeviceEvents(device)` | 订阅一台设备主动上报的事件 |
| `unsubscribeDeviceEvents(device)` | 取消该设备的事件订阅 |
| `onDeviceEvent(handler)` | 接收已订阅设备的上报事件 |
| `onDevicesChanged(handler)` | 接收设备关联变化 |

传给 `callDevice()` 和订阅接口的设备对象应来自 `getDevices()`，RPC 应由对应的设备 RPC SDK 构造。详见 [获取关联设备](./devices)、[调用设备 RPC](./device-rpc)和[接收设备主动上报事件](./device-events)。

## Bot 的 WebApp 配置

| 配置或接口 | 用途 |
| --- | --- |
| `webAppDeviceAccess` | 设置打开 WebApp 前需要满足的设备关联条件 |
| `observeWebAppDeviceCalls` | 让 Bot 接收 WebApp 设备调用的观察事件 |
| `webAppDeviceCallTimeoutMillis` | 设置 Bot 观察设备调用时等待响应的时间 |

设备调用观察可以统一监听 `web_app_device_call`，也可以分别监听 `web_app_device_call:request`、`web_app_device_call:response` 和 `web_app_device_call:timeout`。详见 [观察 WebApp 的设备调用](./observe-device-calls)和[设置 WebApp 的打开条件](./access-policy)。

错误处理和使用限制见 [错误处理与使用限制](./errors-and-limits)。
