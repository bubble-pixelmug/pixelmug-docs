# Inline keyboard

InlineKeyboard places a clickable operation in the message. Use the callback button to execute the Bot business and open an address with a link button.

## Send an operation panel

Add import at the top of the entry:

```js
import { InlineKeyboard } from '@jeejio-bubble/bot/sdk';
```

Register text handler:

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/panel') return;

  const keyboard = new InlineKeyboard()
    .text('View Status', 'status')
    .text('Help', 'help')
    .row()
    .url('Open site', 'https://pixelmug.com/');

  await ctx.sendKeyboard('**Operator Panel**\nPlease select an operation: ', keyboard);
});
```

The first value of `text()` is the title displayed, the second value is the return to the business value. `row()` Ends the current line; the first line of two buttons, the second line of one link button. The last line does not need to call `row()` again, and will end automatically when sent.

The text of `sendKeyboard()` is sent by the Markdown message. Just send the example `InlineKeyboard` directly; only when you assemble the message data will you need to get the keyboard structure with `toJSON()`.

## Handle button clicks

```js
bot.on('callback', async (ctx) => {
  const data = ctx.callback?.value;
  const action = typeof data === 'string' ? data : data?.value || data?.data;

  if (action === 'status') {
    await ctx.sendText('Bot Running.');
  } else if (action === 'help') {
    await ctx.sendText('Send /panel Could open the operating panel again.');
  } else {
    await ctx.sendText('This operation is not supported at this time., Please reopen the panel..');
  }
});
```

SDK places the original event `data` in `ctx.callback.value`; the previous compatible string and objects with `value`/ `data`. Clicking on the link button to open the address should not rely on it to trigger the same business callback.

Click " View Status " after `/panel` to receive a new message. The current keyboard interface creates and sends buttons, and the reply here does not automatically modify or close the original panel.
