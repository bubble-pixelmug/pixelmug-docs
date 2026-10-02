# 上下文与事件

事件处理器收到的 `ctx`，把“这条更新来自哪里”和“如何回应”放在了一起。通常直接使用归一化后的字段，无需解析原始协议。

## 从上下文取得业务输入

```js
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const sender = ctx.from?.name || '朋友';
  await ctx.sendText(`${sender}，收到你的消息：${text}`);
});
```

最常用的是 `ctx.chat`（对话）、`ctx.from`（发送者）和 `ctx.message`（消息）。按钮事件读取 `ctx.callback`。这些字段随事件类型出现，不能在所有处理器里都假设存在 `message`。

`ctx.update` 保存原始更新，适合排查问题。业务逻辑优先使用 `ctx.message.text` 等归一化字段，避免依赖服务器内部结构。

## 先选择具体事件

只处理文字时使用 `message:text`；图片使用 `message:image`；语音使用 `message:voice`。这样不用在一个大处理器里反复判断消息类型。

```js
bot.on('message:image', async (ctx) => {
  const image = ctx.message.image;
  await ctx.sendText(`收到图片：${image?.width || '?'} × ${image?.height || '?'}`);
});
```

`message` 是普通对话消息的通用入口，也可能接收到媒体或关联设备消息，不等于“文字消息”。用户引用原消息发送的回复使用 `message:reply`，读取方式见[发送和回复消息](./messages)。

用户添加 Bot 为联系人或把 Bot 加入群聊时，分别会收到 `contact_added` 和 `joined_group` 两个事件消息，可以发欢迎语：

```js
bot.on('contact_added', async (ctx) => {
  await ctx.sendText('你好，发送 /help 查看用法。');
});

bot.on('joined_group', async (ctx) => {
  await ctx.sendText('大家好，@ 我并发送 /help 即可开始。', {
    mentionOnly: false,
  });
});
```

## 用中间件添加公共逻辑

中间件适合放置所有事件都需要执行的逻辑。下面统一记录事件来源、处理结果和耗时：

```js
bot.use(async (ctx, next) => {
  const started = Date.now();
  const event = ctx.event || 'unknown';
  const chatId = ctx.chat?.id || '-';
  const fromId = ctx.from?.id || '-';

  try {
    await next();
    console.log(
      `[${event}] chat=${chatId} from=${fromId} ` +
      `completed in ${Date.now() - started} ms`,
    );
  } catch (error) {
    console.error(
      `[${event}] chat=${chatId} from=${fromId} failed`,
      error,
    );
    throw error;
  }
});
```

`await next()` 执行后续中间件和事件处理器，因此它前后的代码可以覆盖整次事件处理。示例重新抛出异常，让 SDK 继续把错误交给 `error` 处理器；只记录而不抛出，会把异常截断在这个中间件中。

不调用 `next()` 就结束当前处理链。不要在同一次处理中调用两次 `next()`。

这里必须写出 `(ctx, next)` 两个参数。当前 `use()` 按函数形参数量区分用法：两个及以上参数是中间件，单参数函数会按接收 `bot` 的插件工厂执行。

## 什么是处理链

一次事件可能同时匹配公共中间件和多个事件处理器。SDK 会把这些函数按顺序组成一条处理链，并把同一个 `ctx` 依次交给它们。

每个处理器中的 `next` 代表链中的下一个处理器。调用 `await next()` 后，下游处理器开始执行；下游全部结束后，当前处理器再从 `await next()` 后面继续。因此，中间件可以在调用前执行准备工作，在调用后统一记录结果或清理资源。

```text
处理器 A 前半段 → 处理器 B 前半段 → 业务处理器
处理器 A 后半段 ← 处理器 B 后半段 ← 业务处理完成
```

如果某个处理器不调用 `next()`，处理链就在这里结束，后面的处理器不会执行。处理链是顺序调用关系，不是把同一个事件同时广播给所有处理器。

**注意：只有同一次更新会匹配多个处理器，并且希望继续执行后面的处理器时，才需要 next()。** 例如一条文字消息可能同时匹配 `message:text` 和 `message`，如果希望两个处理器都执行，才需要在前一个处理器中调用 `next()`。

## 多个处理器如何配合

处理顺序是公共中间件、`*` 处理器、上下文中的分类事件处理器，最后是主事件处理器。同一事件的多个处理器按注册顺序连接；它们之间也需要 `next()` 才能继续。

例如，专门处理 `/help`，其他文字交给通用消息处理器：

```js
bot.on('message:text', async (ctx, next) => {
  if (ctx.message.text.trim() === '/help') {
    await ctx.sendText('发一句话，我会回复你。');
    return;
  }
  await next();
});

bot.on('message', async (ctx) => {
  if (!ctx.message?.text) return;
  await ctx.sendText(`收到：${ctx.message.text}`);
});
```

上面的示例中，如果第一个处理器不调用 `next()`，那么非 `/help` 消息是不会被处理的。

欢迎语等业务处理器直接结束即可。不要为了“广播事件”盲目调用 `next()`；当前新增联系人和入群事件在分类与主事件中有重复名称，继续整条链可能让同名处理器再次执行。
