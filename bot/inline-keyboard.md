# 消息内按钮

InlineKeyboard 把可点击的操作放进消息里。用回调按钮执行 Bot 业务，用链接按钮打开一个地址。

## 发送一个操作面板

在入口顶部增加导入：

```js
import { InlineKeyboard } from '@jeejio-bubble/bot/sdk';
```

注册文字处理器：

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/panel') return;

  const keyboard = new InlineKeyboard()
    .text('查看状态', 'status')
    .text('帮助', 'help')
    .row()
    .url('打开网站', 'https://pixelmug.com/');

  await ctx.sendKeyboard('**操作面板**\n请选择一个操作：', keyboard);
});
```

`text()` 的第一个值是显示标题，第二个值是回调业务值。`row()` 结束当前行；上例第一行两个按钮，第二行一个链接按钮。最后一行无需再调用 `row()`，发送时会自动收尾。

`sendKeyboard()` 的正文按 Markdown 消息发送。直接传 `InlineKeyboard` 实例即可；只有自己组装消息数据时，才需要用 `toJSON()` 得到键盘结构。

## 处理点击

```js
bot.on('callback', async (ctx) => {
  const data = ctx.callback?.value;
  const action = typeof data === 'string' ? data : data?.value || data?.data;

  if (action === 'status') {
    await ctx.sendText('Bot 正在运行。');
  } else if (action === 'help') {
    await ctx.sendText('发送 /panel 可以再次打开操作面板。');
  } else {
    await ctx.sendText('这个操作暂不支持，请重新打开面板。');
  }
});
```

SDK 将原始事件的 `data` 放在 `ctx.callback.value` 中；上例兼容字符串和带 `value` / `data` 的对象。点击链接按钮用于打开地址，不应依赖它触发同样的业务回调。

发 `/panel` 后点击“查看状态”，应收到一条新消息。当前键盘接口负责创建和发送按钮，这里的回复不会自动修改或关闭原面板。
