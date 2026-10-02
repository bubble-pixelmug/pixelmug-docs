# 发送和回复消息

处理器里最常用的三个方法是：`sendText()` 发送普通文字，`sendMarkdown()` 发送格式化内容，`replyText()` 引用用户消息回复。

## 发送文字和 Markdown

以下片段放在消息处理器内：

```js
await ctx.sendText('任务已开始。');
await ctx.sendMarkdown('**操作提示**\n\n发送 `/help` 查看用法。');
```

`ctx` 自动补上当前对话和发送者，通常不必每次填写目标。方法返回 Promise，使用 `await` 可以让回复顺序与代码一致，并让发送异常进入当前处理器的错误路径。

Markdown 由冒泡客户端呈现。业务中拼接用户输入时，应留意其中的格式字符；只需要原样显示的内容用 `sendText()` 更直接。

## 回复消息和引用消息

```js
bot.on('message:text', async (ctx) => {
  await ctx.replyText('这条消息我已经看到了。');
});
```

`replyText()` 自动从当前消息、消息 ID 和发送者构造引用信息。它适合接收消息后的回应；按钮回调或设备通知不一定带有可引用的原消息，此时用 `sendText()`。

当用户在冒泡 App 中引用（Reference）一条消息时，Bot 会收到 `message:reply` 事件，`reply.text` 是本次输入，`reply.quoted.content` 是引用内容。只监听 `message:text` 的处理器不会接收这类引用回复：

```js
bot.on('message:reply', async (ctx) => {
  const reply = ctx.message.reply;
  await ctx.sendText(`你引用的是：${reply.quoted.content}\n你的回复：${reply.text}`);
});
```

## 保存上下文，主动发送消息

定时任务或外部服务回调中，没有现成的消息 `ctx`。可以在用户发起业务时保存目标，再用 `bot.api.sendTextMessage()` 发送：

```js
const targets = new Map();

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/subscribe') return;
  const key = `${ctx.chat.type || 'chat'}:${ctx.chat.id}`;
  targets.set(key, { chat: ctx.chat, to: ctx.from });
  await ctx.sendText('已记录这个对话的上下文');
});

// 由应用在业务完成时调用；key 是订阅时保存的对话键。
async function sendCompletion(key, text) {
  const target = targets.get(key);
  if (!target) return;
  await bot.api.sendTextMessage({ ...target, text });
}
```

这里的 `Map` 只是进程内示例，重启后会丢失。实际应用按需要持久化目标、提供取消订阅，并在发送时确认订阅仍有效。

`ctx.sendText(text, { chat, to })` 也能覆盖当前目标；使用低层 `bot.api` 时需要自己传入目标，它不会自动继承上下文的群聊默认设置。群聊定向消息见[命令与群聊](./commands-and-groups)。

## 发送结果如何理解

这些发送方法返回云端 API 响应包，并不直接返回新的 `ctx`，也不证明用户已经阅读。底层请求会抛出网络、非 JSON 和 HTTP 错误；HTTP 成功响应中的业务状态仍应按响应包检查，不能把所有返回值都当作业务成功。
