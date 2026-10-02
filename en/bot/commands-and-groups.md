# Commands and group chats

## Set up the command menu

The command menu makes it easier for users to find out and use Bot 's functionality. After Bot saves the command menu, Bubble App shows `/` access to the single and group chat input area with Bot; after a user click, Bot can see the commands and instructions provided by Bot.

Select a command that is equivalent to sending a text message `/命令名` in the current chat, such as `/help`. The command menu is only for displaying and sending messages, for what operation, and is still analysed and determined by Bot's message handler.

Save menu before `start()`:

```js
await bot.setCommands([
  { command: 'help', description: 'View Help' },
  { command: 'panel', description: 'Open Operator Panel' },
]);
```

menu `command` without a lead `/`. `setCommands()` will request the cloud to save the menu and return the API response; it will not register your command handler.

When identifying commands in a message handler, do not judge whether the complete message is equal to `/help`. The commands in the group conversations may have Bot suffixes, such as `/help@botName`; messages may also include references to information at the same time. Commands token can be extracted from `content` or `text` and the suffix `@Bot` removed:

In order to deal with both the aggregating information with a true reference, the example of listening to a common `message` event, instead of only `message:text`.

```js
bot.on('message', async (ctx) => {
  const text = String(
    ctx.message?.content || ctx.message?.text || '',
  );
  const command = extractCommand(text);

  if (command === '/help') {
    await ctx.sendText('Send /panel Open Operator Panel.');
  } else if (command === '/panel') {
    await ctx.sendText('Put your panel here to send logic..');
  }
});

function extractCommand(text) {
  const match = String(text).match(
    /\/[a-zA-Z0-9_-]+(?:@[a-zA-Z0-9_-]+)?/,
  );
  return match?.[0].split('@')[0] || '';
}
```

There are two separate steps: `group_policy` and service-end references determine whether the group message will be sent to the handler; after the message enters the handler, the business code re-identifies and executes the command. SDK does not automatically assign the command, nor does it need to judge the user again from text `@Bot`.

## When does a Bot receive group messages?

The default `group_policy` is `mention`. When sending group text messages, the user needs to use `@Bot` in the Bubble App to select and refer to this Bot; the server will then add `mentionedMe: true` tags to the message so that the SDK will send the message to the business handler. Only manual entry of the Bot name in text is not equivalent to `@Bot`.

Pictures, videos, GIFs and voice messages are not currently supported at the same time `@Bot`. The service defaults on `open` to process these multimedia messages, so either Bot uses `mention` or `open` to receive them in the group.

Set when all group messages for SDK are to be processed when creating Bot:

```js
const bot = new BubbleBot(token, {
  apiBaseUrl,
  group_policy: 'open',
});
```

`open` Unleashing SDK local filters, bot will receive all conversations in the group, whether or not it mentions this bot.

The following updates use a stand-alone processing path and are not filtered locally by `group_policy`:

- InlineKeyboard button back
- Bot was added to the grouping notifications;
- WebApp to Bot data.

Devices report events and access RPC calls from device rotations, and are not affected by `group_policy`. The term "unaffected" here is used to mean that updates to SDK do not filter after they reach SDK, and does not mean that SDK can read group history or ensure that clouds are sent. Other updates delivered in group chat IM notifications are filtered according to the group message rules, except for Bot when added.

## Who can see messages sent by a Bot in a group?

Context `sendText()` etc. chat sending methods, using the current `chat` and `from` by default; in group conversations, a `mentionOnly: true` will also be used by default to indicate a targeted response, i.e., in group conversations, bot will only target the sender and the other members of the group will not see. If you want the entire group to see, it will need to be `false`:

```js
await ctx.sendText('This round of assignments is complete..', { mentionOnly: false });
```

Call user ID when @systemer:

```js
await ctx.sendText('Your mission is complete..', {
  at: ctx.from?.id ? [ctx.from.id] : undefined,
});
```

`group_policy` controls whether the received updates enter the handler; `mentionOnly` and `at` are fields that are handed to the service at the time of sending the message. The final visible range and @ display is handled by cloud and bubble clients and should not be inferred from the SDK field alone.

## Devices and state in group chats

Here. `ctx.chat` Check the current range of operations, do not use the list of devices obtained from private conversations directly for another group chat. At least chat type and ID are used for recording applications; if there are tasks for user in the same group, add `ctx.from.id`.
