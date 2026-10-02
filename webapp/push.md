# Bot 主动向 WebApp 推送

请求响应适合“一问一答”。Bot 在处理 WebApp 请求时，还可以在最终响应之外向当前页面推送任务进度、状态变化等业务数据。

## `sessionId` 对应一个页面实例

每次页面创建 `BubbleWebApp` 实例时，SDK 都会生成一个 `sessionId`。它标识的是这一次打开并运行的 WebApp 页面实例，不是用户 ID、对话 ID，也不是页面 URL。

同一用户可能从不同消息打开不同的 WebApp，也可能重新打开或刷新同一个页面，因此一段时间内可能同时存在多个页面会话。WebApp 只处理属于自己 `sessionId` 的定向推送；`ctx.sendWebAppData()` 会自动沿用当前请求的用户、对话和 `sessionId`，把数据发送给发起请求的页面。会话的建立和结束过程见 [页面会话与生命周期](./lifecycle)。

## WebApp 接收推送

```js
webapp.on('app.progress', (event) => {
  const progress = event.payload?.progress || 0;
  renderProgress(progress);
});
```

回调中主要使用两个字段：

- `type`：推送类型，与 `ctx.sendWebAppData(type, payload)` 的 `type` 对应；
- `payload`：业务数据，与 `ctx.sendWebAppData(type, payload)` 的 `payload` 对应。

需要接收所有业务推送时，可以直接传入处理器：

```js
webapp.on((event) => {
  console.log('收到 Bot 推送的数据', event);
});
```

WebApp 请求 Bot 的响应由等待中的 `request()` 接收，不会触发这里的推送处理器。

## Bot 向当前页面推送

在 `onWebAppRequest()` 处理器中，可以使用 `ctx.sendWebAppData()` 向发起请求的页面推送数据：

```js
bot.onWebAppRequest('app.startTask', async (ctx) => {
  await ctx.sendWebAppData('app.progress', {
    progress: 0,
  });

  const result = await runTask();

  await ctx.sendWebAppData('app.progress', {
    progress: 100,
  });

  return {
    completed: true,
    result,
  };
});
```

`ctx.replyWebApp()` 或处理器返回值用于回答当前请求；`ctx.sendWebAppData()` 发送的是独立业务事件，可以在一次请求处理过程中调用多次。
