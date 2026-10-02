# 观察 WebApp 发起的设备调用

WebApp 通过 `webapp.callDevice()` 直接调用设备时，请求不会经过 Bot 的业务处理器。Bot 如果需要监测 WebApp 发起的设备 RPC 调用，可以开启设备调用观察功能，接收请求、响应和超时事件。

观察功能只是云端收到 WebApp 的调用请求时，将调用过程复制给 Bot。它不会代理、拦截或修改设备 RPC，也不会替 WebApp 决定调用是否允许执行。

## 开启观察

在创建 Bot 时设置 `observeWebAppDeviceCalls`：

```js
import { BubbleBot } from '@jeejio-bubble/bot';

const bot = new BubbleBot(process.env.BUBBLE_BOT_TOKEN, {
  apiBaseUrl: process.env.BUBBLE_API_BASE_URL,
  observeWebAppDeviceCalls: true,
  webAppDeviceCallTimeoutMillis: 30_000,
});

bot.on('web_app_device_call', (ctx) => {
  console.log(ctx.webAppDeviceCall);
});

await bot.start();
```

Bot 启动时会把这项设置同步给服务端。只有开启后，服务端才会把 WebApp 的设备调用过程发送给 Bot。

## 分别处理请求、响应和超时

可以监听统一事件，也可以按阶段监听：

```js
bot.on('web_app_device_call:request', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.log('request', call.id, call.deviceId, call.rpc);
});

bot.on('web_app_device_call:response', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.log('response', call.id, call.result);
});

bot.on('web_app_device_call:timeout', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.warn('timeout', call.id, call.rpc?.method);
});
```

`web_app_device_call` 会收到上述三个阶段的全部事件。`request` 和 `response` 通过调用 ID 配对。Bot 等待响应的时间由 `webAppDeviceCallTimeoutMillis` 设置；未配置时使用 `deviceResponseTimeoutMillis`，默认是 20 秒。超过这段时间仍未收到对应响应，就会产生 `timeout` 事件。

事件处理器通过 `ctx.webAppDeviceCall` 读取本次调用的信息，常用字段包括：

| 字段 | 含义 |
| --- | --- |
| `direction` | 当前阶段：`request`、`response` 或 `timeout` |
| `id` | 本次设备调用的 ID，可用于关联请求和响应 |
| `slotId`、`deviceId` | WebApp 调用的目标 |
| `rpc` | 请求的方法和参数 |
| `result` | 设备返回的结果；仅响应阶段有意义 |

具体字段可能随调用阶段不同而有所差异。业务代码应先判断 `direction`，再读取对应数据。

## 适合做什么

Bot 观察设备调用的核心作用，是把 WebApp 中发生的设备操作带回 Bot 对话，特别适合群聊中的信息共享和多人协作。

WebApp 直接调用设备 RPC 时，操作通常只反映在当前页面和关联设备上。开启观察后，Bot 可以知道谁发起了操作、操作了什么，以及设备是否执行成功，再通过 Bot 消息接口把相关内容发送到原对话。

在 `request` 事件中，可以直接从 `ctx.from` 和 `ctx.chat` 读取操作用户和对话。`response` 事件由设备响应触发，此时 `ctx.from` 表示设备；SDK 会把已经配对的原始请求保存在 `ctx.webAppDeviceCall.request` 中。处理成功响应时，应从 `request.extend.from` 和 `request.extend.chat` 取得操作用户和原对话，并在发送消息时显式传入：

```js
bot.on('web_app_device_call:response', async (ctx) => {
  const call = ctx.webAppDeviceCall;
  if (!call?.ok) return;

  const user = call.request?.extend?.from;
  const chat = call.request?.extend?.chat;
  if (!user || !chat) return;

  await ctx.sendText(`${user.name} 完成了一次设备操作`, {
    chat,
    to: user,
    mentionOnly: false,
  });
});
```

```text
群成员操作 WebApp → WebApp 调用设备 RPC → Bot 观察调用
                                              ↓
                               整理或汇总信息 → 发送群消息
```

### 将 WebApp 操作共享到群聊

以文字共享 WebApp 为例，群成员在页面中选择一台 PixelMug，设置文字、颜色、字体和滚动方向，再直接调用设备 RPC。Bot 观察到调用成功后，可以从上下文和 RPC 参数中取得操作用户、目标设备和文字内容，并向群聊发送“哪个用户给哪个水杯发送了什么文字”。这样，设备上的显示操作也会成为群成员都能看到的对话消息。完整示例位于 `tools/studio/examples/webapp-pixel-text-share`。

### 汇总群成员的操作

观察功能也适合需要汇总多人输入的场景。例如，群成员在 WebApp 中投票或修改共同设置时，Bot 可以收集每次操作，计算结果或整理当前状态，再向群聊发送进度和最终结果。这样，WebApp 负责交互，Bot 负责把不同成员的操作汇集成群组信息。

### 选择合适的调用阶段

`request` 事件适合读取成员提交的 RPC 和参数；`response` 事件适合确认设备已经执行，并读取执行结果；`timeout` 事件可用于提示操作没有按时返回。如果只希望共享执行成功的操作，应在 `response` 阶段发送群消息，避免把失败的调用当作已完成操作。

如果 Bot 需要主动调用设备，请使用 [Bot 的设备 RPC](/bot/device-rpc)。如果需要限制 WebApp 能否打开，请配置 [WebApp 打开条件](./access-policy)。
