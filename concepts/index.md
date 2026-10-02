# 核心概念

第一次接触这个体系？建议先阅读 [快速了解](/overview/)，从整体架构和交互例子认识各个组成部分。

本页依据 `mps/jeejio-bubble/sdk` 和 `mps/jeejio-bubble/examples` 的本地源码整理，基线日期为 2026-09-15。它说明现有实现的关系；涉及云服务、Bubble App 与固件配合的行为，仍需对应版本的联调验证。

## 一个 SDK，两个运行环境

`@jeejio-bubble/bot` 同时提供 Bot 和 WebApp 开发能力。WebApp 内部整合了与 Bot 通信、设备 RPC 和 BLE，但这些能力使用不同的通信通道。

| 组成 | 运行位置 | 职责 |
| --- | --- | --- |
| Bot / `BubbleBot` | Node.js，例如 Studio 启动的进程 | 消息处理、业务逻辑、设备声明、设备 RPC、WebApp 请求处理与推送 |
| WebApp / `BubbleWebApp` | Bubble App 内的网页 | 用户界面、向 Bot 发请求、调用设备、接收推送；通过 `.ble` 使用蓝牙 |
| `JeeWeb` | Bubble App 注入的宿主桥接对象 | 把网页请求交给 App 的原生能力；SDK 对它进行封装 |
| 设备定义 / `devices` | 通常由 Bot 导入 | 声明 `talId`、兼容类型，构造特定设备的 RPC；不是物理设备实例 |
| MPY 应用 | PixelMug 设备 | 执行设备代码、绘图、处理 BLE 应用消息等 |
| Studio | 开发电脑 | 选择项目、运行 Bot、提供 WebApp 地址、设备部署与调试 |

普通浏览器能够显示 WebApp 的 HTML，但不会自动获得 `JeeWeb`。调用 SDK 的宿主能力需要在 Bubble App 中打开页面，或在测试中注入模拟 bridge。BLE 封装也不是浏览器的 `navigator.bluetooth` 接口。

## 通信通道

| 场景 | 入口与路径 | 应用如何获得结果 |
| --- | --- | --- |
| WebApp 请求 Bot | `webapp.request()` → `JeeWeb.sendData` → 云端消息 → Bot | `bot.onWebAppRequest()` 的返回值，经应答返回 WebApp |
| Bot 主动推送 | `ctx.sendWebAppData()` / `bot.api.sendWebAppData()` → 云端 → App 网页 | `webapp.on(type, handler)` |
| Bot 调用设备 | `bot.callDevice()` → 云端设备 RPC → 设备 | 等待最终设备响应，得到 `responseCtx.tal.result` |
| WebApp 调用设备 | `webapp.callDevice()` → `JeeWeb.sendTAL` → 宿主设备通道 | 获得宿主返回的最终 RPC 响应；不等同于执行 Bot 的业务处理器 |
| 设备事件到 WebApp | 设备通知 → Bot 设备轮询 → 匹配会话订阅 → WebApp | `webapp.onDeviceEvent()` |
| WebApp 蓝牙控制 | `webapp.ble` / `BleAppClient` → `JeeWeb` → 手机 BLE → 设备 | 基础数据、应用应答或 Simple 数据事件 |

Bot 可通过 `observeWebAppDeviceCalls` 观察 WebApp 设备调用。观察事件不是 WebApp 调用设备的业务执行入口。

## 设备类型、声明和关联

| 名称 | 含义 | 使用时注意 |
| --- | --- | --- |
| TALID / `talId` | 设备品类标识，如 `PixelMugS1` | 界面名称可以写 TALID，代码保留实际字段名 `talId` |
| `compatible` | 一个设备声明允许关联的其他 TALID | 允许关联不代表 SDK 自动把不同设备的 RPC 相互转换 |
| `slot` | Bot 注册声明的序号，从 1 开始 | 由 `registerDevices([...])` 的数组顺序决定 |
| `slotId` | 服务端分配的关联位置 ID | WebApp / BLE 使用；不能用序号 `slot` 代替 |
| `deviceId` | 物理设备 ID | 用来识别具体设备、匹配事件 |
| `deviceTalId` | 当前与 `talId` 相同，表示创建 slot 时使用的 TALID | 不能用来判断兼容关联设备的实际型号 |
| `sn`、`avatar`、`name` | 序列号、头像、名称 | 属于设备信息，不代替以上 ID |

典型流程为：声明设备 → `registerDevices()` → `start()` 同步声明 → 用户关联物理设备 → 查询当前会话关联设备 → 调用设备。

`registerDevices()` 替换当前声明列表，不完成物理设备关联。SDK 的 `getBoundDevices(ctx)`、WebApp 的 `getDevices()` 查询当前会话对应的设备，不是 Studio“我的设备”页中的账号全部设备。

Studio 使用的 Creator 设备查询、关联接口属于开发工具接口，不应混入 Bot SDK 的接口说明。

## 请求成功的三个阶段

1. 请求被接收：Bot 设备 RPC 的 ACK 业务码为 `201`。
2. 设备返回最终结果：Bot / WebApp 设备 RPC 以最终业务码 `200` 判断成功。
3. 设备持续运行状态或主动事件：需要通过事件或状态查询观察，不能仅从“发送成功”推断。

`callDevice()` 等到第二步才完成。`callDeviceAsync()` 在第一步返回任务，第二步通过 `device_call:response/error/timeout` 通知。BLE Simple 的 `accepted` 仅表示发送被接受，不保证设备应用已经执行。

HTTP 状态码、业务响应码、BLE 写入确认应分别解释，不使用一套“200 都表示完成”的规则。

## 会话与关联标识

| 标识 | 用途 |
| --- | --- |
| `ctx.chat`、`ctx.from`、`ctx.to` | 聊天上下文、发起者与接收目标；群聊与私聊需要分别处理 |
| WebApp `sessionId` | 区分页面会话，路由请求应答与推送 |
| WebApp 请求 `id` | 在一个页面内关联请求和响应 |
| 设备 RPC `traceId` | 关联设备调用、最终响应与超时 |
| BLE `sessionId` | 应用握手产生的蓝牙应用会话，独立于 WebApp 会话 |
| BLE `rev` / `stateRevision` | 跟踪应用状态版本，发现事件缺口后请求快照 |

WebApp 默认启动时上报 opened，并发送心跳；Bot 维护页面会话用于设备事件推送。业务示例也可能有自己的会话表和过期时间，不能把示例常量当成 SDK 默认值。

## 阅读入口

- [Bot SDK](/bot/)：消息、设备调用、WebApp 请求处理。
- [WebApp SDK](/webapp/)：网页初始化、通信与设备交互。
- [WebApp BLE](/ble/app/webapp/)：基础传输、应用会话与实时数据。
- [示例来源索引](/concepts/source-examples)：现有示例与文档主题对应关系。
- [文档框架与补全顺序](/concepts/documentation-map)：计划页面、编写规范与待核对项。
