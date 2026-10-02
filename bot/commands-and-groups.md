# 命令与群聊

## 设置命令菜单

命令菜单让用户更容易发现和使用 Bot 的功能。Bot 保存命令菜单后，冒泡 App 会在与 Bot 的单聊和群聊输入区显示 `/` 入口；用户点击后可以看到 Bot 提供的命令及说明。

选择某个命令，等同于在当前对话中发送一条 `/命令名` 的文字消息，例如 `/help`。命令菜单只负责展示和发送消息，具体执行什么操作，仍由 Bot 的消息处理器解析和决定。

在 `start()` 前保存菜单：

```js
await bot.setCommands([
  { command: 'help', description: '查看帮助' },
  { command: 'panel', description: '打开操作面板' },
]);
```

菜单中的 `command` 不带前导 `/`。`setCommands()` 会请求云端保存菜单，返回 API 响应；它不会替你注册命令处理器。

在消息处理器中识别命令时，不要直接判断完整消息是否等于 `/help`。群聊中的命令可能带有 Bot 后缀，例如 `/help@botName`；消息内容中也可能同时包含提及信息。可以从 `content` 或 `text` 中提取命令 token，再去掉 `@Bot` 后缀：

为了同时处理带真实提及的群消息，示例监听通用的 `message` 事件，而不是只监听 `message:text`。

```js
bot.on('message', async (ctx) => {
  const text = String(
    ctx.message?.content || ctx.message?.text || '',
  );
  const command = extractCommand(text);

  if (command === '/help') {
    await ctx.sendText('发送 /panel 打开操作面板。');
  } else if (command === '/panel') {
    await ctx.sendText('这里放置你的面板发送逻辑。');
  }
});

function extractCommand(text) {
  const match = String(text).match(
    /\/[a-zA-Z0-9_-]+(?:@[a-zA-Z0-9_-]+)?/,
  );
  return match?.[0].split('@')[0] || '';
}
```

这里有两个独立步骤：`group_policy` 和服务端的提及标记决定群消息是否会送到处理器；消息进入处理器后，业务代码再识别并执行命令。SDK 不会自动分派命令，也不需要业务代码再次从文字中判断用户是否 `@Bot`。

## Bot 在群聊中什么时候会收到消息

默认 `group_policy` 是 `mention`。发送群聊文字消息时，用户需要在冒泡 App 中使用 `@Bot` 选择并提到这个 Bot；服务端会据此为消息添加 `mentionedMe: true` 标记，SDK 才会把消息交给业务处理器。仅在文字中手动输入 Bot 名称不等同于 `@Bot`。

图片、视频、GIF 和语音消息目前不支持同时 `@Bot`。服务端对这些多媒体消息默认按 `open` 处理，因此无论 Bot 使用 `mention` 还是 `open`，都可以收到群聊中的这些消息。

需要处理所有送达 SDK 的群消息时，在创建 Bot 时设置：

```js
const bot = new BubbleBot(token, {
  apiBaseUrl,
  group_policy: 'open',
});
```

`open` 放开 SDK 本地过滤，bot 会收到群聊中的所有对话消息，无论是否提到这个 bot。

以下更新使用独立的处理路径，不受 `group_policy` 的本地过滤：

- InlineKeyboard 按钮回调；
- Bot 被添加到群聊的通知；
- WebApp 发给 Bot 的数据。

设备上报事件和设备 RPC 调用结果来自设备轮询，也不受 `group_policy` 影响。这里的“不受影响”是指更新到达 SDK 后不会被该策略过滤，并不表示 SDK 能读取群历史或保证云端一定推送。除 Bot 被添加通知外，其他以群聊 IM 通知形式送达的更新仍按群消息规则过滤。

## Bot 在群聊中发出的消息，谁会看到？

上下文的 `sendText()` 等聊天发送方法，默认使用当前 `chat` 和 `from`；在群聊中还会默认带上 `mentionOnly: true` 表示定向回复，也就是在群聊中，bot 只定向回复消息发送者，群中的其它成员是看不到的。如果希望让整个群成员都看到，需要显式设为 `false`：

```js
await ctx.sendText('本轮任务已经完成。', { mentionOnly: false });
```

需要 @ 发起者时，传入用户 ID：

```js
await ctx.sendText('你的任务已经完成。', {
  at: ctx.from?.id ? [ctx.from.id] : undefined,
});
```

`group_policy` 控制收到的更新是否进入处理器；`mentionOnly` 与 `at` 是发送消息时交给服务端的字段。最终可见范围和 @ 展示由云端与冒泡客户端处理，不应仅凭 SDK 字段推断隐私隔离。

## 群聊里的设备和状态

以 `ctx.chat` 为当前业务范围查询关联设备，不要把私聊查询得到的设备列表直接用于另一群聊。记录应用状态时至少使用对话类型与 ID；如果同一群内的用户各有任务，还需要加上 `ctx.from.id`。
