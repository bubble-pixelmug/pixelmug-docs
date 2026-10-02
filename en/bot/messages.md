# Send and reply messages

The three most common methods in the handler are: `sendText()` Send Normal Text, `sendMarkdown()` Send Formatted Content, `replyText()` Reference User Message Response.

## Send text and Markdown

The following clips are in the message handler:

```js
await ctx.sendText('The mission has begun..');
await ctx.sendMarkdown('**Operation Hint**\n\nSend `/help` View Usage.');
```

`ctx` Automatically adds the current chat and sender, usually without having to fill out each target. The method returns to Promise, using `await` to align the response order with the code and to send an anomaly to the wrong path of the current handler.

Markdown is presented by the bubble client. When you spell a user in a business, you should be careful with the formatting characters; only what is shown as it is shown is more directly by `sendText()`.

## Reply to and quote messages

```js
bot.on('message:text', async (ctx) => {
  await ctx.replyText('I've seen the news..');
});
```

`replyText()` Automatically constructs the reference information from the current message, message ID and sender. It is suitable for the response after receiving the message; buttons or device notifications do not necessarily have quoted original messages, using `sendText()` at this time.

When the user quotes a Reference (Reference) message in Bubble App, Bot receives `message:reply` event, `reply.text` is this input, `reply.quoted.content` is the reference. Only the handler listening to `message:text` does not receive such reference responses:

```js
bot.on('message:reply', async (ctx) => {
  const reply = ctx.message.reply;
  await ctx.sendText(`You quote:: ${reply.quoted.content}\nYour response.: ${reply.text}`);
});
```

## Save context for proactive messages

Time job or external service callback, with no available information `ctx`. You can save the target when the user starts the business and send it `bot.api.sendTextMessage()`:

```js
const targets = new Map();

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/subscribe') return;
  const key = `${ctx.chat.type || 'chat'}:${ctx.chat.id}`;
  targets.set(key, { chat: ctx.chat, to: ctx.from });
  await ctx.sendText('The context of this conversation has been documented');
});

// Called by application upon completion of business; key dialogue key saved during subscription.
async function sendCompletion(key, text) {
  const target = targets.get(key);
  if (!target) return;
  await bot.api.sendTextMessage({ ...target, text });
}
```

Here `Map` is only an example of a process that is lost when restarted. The practical application is as long as necessary, provides for unsubscription and confirms that the subscription is still valid when sent.

`ctx.sendText(text, { chat, to })` also covers the current target; the lower `bot.api` is used to transfer the target to itself, which does not automatically inherit the default set for group chats in context. See [Command to talk to the group.](./commands-and-groups) for group chats.

## Understand send results

These send methods return cloud API response packages, do not return the new `ctx` directly, nor do they prove that the user has read them. The bottom request throws out network, nonJSON and HTTP errors; the operational status of a successful HTTP response should still be checked on the response package and not all return values should be considered business success.
