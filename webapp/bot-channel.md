# WebApp 请求 Bot

冒泡平台在 WebApp 与 Bot 之间提供了一条专用的双向消息通道。WebApp 可以通过 SDK 向 Bot 发送请求，Bot 可以返回处理结果或主动向页面推送数据。消息由冒泡 App 和云端负责转发，开发者不需要为了连接 WebApp 与 Bot 再单独搭建 Web 服务。

这条专用通道是一种开箱即用的通信方式，并不限制应用采用其他架构。如果业务需要自定义协议、复用现有服务或直接使用标准 Web API，开发者仍然可以在 Bot 中提供 HTTP 等服务，或者接入独立后端供 WebApp 访问。

SDK 提供的业务通道适合查询业务数据、提交表单和执行不属于设备 RPC 的服务端逻辑。每次请求都有独立 ID，Bot 返回对应响应。

## WebApp 发起请求

```js
const response = await webapp.request('app.sum', {
  a: 1,
  b: 2,
});

console.log(response.result.sum);
```

请求类型建议使用应用自己的命名空间，例如 `app.sum`、`clock.save`。注意：`system.*` 由 SDK 内置流程使用，不应作为普通业务名称。

## Bot 处理并返回结果

```js
bot.onWebAppRequest('app.sum', async (ctx) => {
  const { a, b } = ctx.webAppData.payload || {};

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    const error = new Error('a 和 b 必须是数字');
    error.code = 400;
    throw error;
  }

  return { sum: a + b };
});
```

Bot 的处理器可以从 `ctx.webAppData` 读取：

- `type`：请求类型；
- `payload`：业务参数；
- `id`：请求标识；
- `sessionId`：页面会话标识。

返回值由 SDK 包装成成功响应。处理器抛出异常时，SDK 使用异常的 `code` 和 `message` 返回失败响应；随后异常仍会进入 Bot 的 `error` 处理器，便于记录。

WebApp 收到失败响应时，`request()` 会拒绝并给出错误消息。业务需要稳定错误分类时，可以在成功响应的 `result` 中定义自己的业务结果结构，不要依赖普通 `Error` 保存完整服务端响应。

`request()` 返回一个 Promise，并持续等待 Bot 完成处理并返回最终响应。默认等待 20 秒，也可以通过 `timeout` 或 `timeoutMillis` 为单次请求调整；如果 Bot 没有运行、请求没有得到回复或响应超时，Promise 会进入拒绝状态。

## 没有对应请求处理器时

`webapp.request(type, payload)` 使用 `type` 标识请求，`bot.onWebAppRequest(type, handler)` 则在 Bot 中声明由哪个处理器接收该类型。例如，`webapp.request('app.sum', payload)` 会交给 `bot.onWebAppRequest('app.sum', handler)` 处理；两边的 `type` 必须一致。

如果 Bot 没有为该 `type` 声明对应的 `onWebAppRequest()` 处理器，SDK 不会自动回复，请求会继续进入普通的 `web_app_data` 事件处理器。

### 使用 `ctx.replyWebApp()` 手动回复

在 `web_app_data` 处理器中，可以使用 `ctx.replyWebApp(result)` 手动回复当前请求：

```js
bot.on('web_app_data', async (ctx) => {
  const request = ctx.webAppData;
  if (request?.__kind !== 'request') return;
  if (request.type !== 'app.ping') return;

  await ctx.replyWebApp({ message: 'pong' });
});
```

`replyWebApp()` 会自动沿用当前请求的 `id`、`type` 和 `sessionId`，因此 WebApp 中等待同一请求的 `request()` 能收到该响应。传入的第一个参数会出现在 WebApp 响应的 `result` 中。

```js
const response = await webapp.request('app.ping');
console.log(response.result.message); // pong
```

一般业务优先使用 `onWebAppRequest()`，直接返回处理结果即可。SDK 会自动调用回复流程，因此不要在 `onWebAppRequest()` 处理器中再次调用 `ctx.replyWebApp()`，否则会重复发送响应。`ctx.replyWebApp()` 主要用于普通 `web_app_data` 处理器需要手动回复的场景。
