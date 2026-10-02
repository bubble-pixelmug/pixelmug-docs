# Context & Events

The event handler receives `ctx`, which combines “where this update comes from” with “how to respond”.

## Read application data from context

```js
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const sender = ctx.from?.name || 'Friends.';
  await ctx.sendText(`${sender}, I got your message.: ${text}`);
});
```

The most common uses are `ctx.chat` (chat), `ctx.from` (sender) and `ctx.message` (message). Button events read `ctx.callback`. These fields appear with the type of event and cannot be assumed to exist in all handlers `message`.

`ctx.update` stores the raw update for troubleshooting. Application logic should prefer normalized fields such as `ctx.message.text` so it does not depend on the server's internal structure.

## Subscribe to specific events

Use `message:text` for text, `message:image` for images, and `message:voice` for voice messages. This avoids checking message types manually in one large handler.

```js
bot.on('message:image', async (ctx) => {
  const image = ctx.message.image;
  await ctx.sendText(`Copy that.: ${image?.width || '?'} × ${image?.height || '?'}`);
});
```

`message` is the general event for chat messages. It can also receive media and device-association messages, so it does not mean text messages only. Use `message:reply` when a user replies to an earlier message; see [Sending and replying to messages](./messages).

When a user adds the Bot as a contact or adds it to a group, the Bot receives `contact_added` or `joined_group`. These events are useful for welcome messages:

```js
bot.on('contact_added', async (ctx) => {
  await ctx.sendText('Hello., Send /help View Usage.');
});

bot.on('joined_group', async (ctx) => {
  await ctx.sendText('Hello., @ I'm sending it. /help Then we can start..', {
    mentionOnly: false,
  });
});
```

## Add shared logic with middleware

The middleware is suitable to place the logic that all events need to be implemented.

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

`await next()` Executes the follow-up middleware and event handler, so that the code before and after it covers the entire event process. Example: Releasing the anomaly and allowing SDK to continue giving the error to the `error` handler; recording only, not throwing, will cut the anomaly in this middle.

Do Not Call `next()` End the current Handler chain. Do not call twice in the same processing `next()`.

Here you must write two parameters `(ctx, next)`. The current `use()` is differentiated by the number of functional parameters: two or more parameters are middleware, and a single parameter function is executed by the receiving plugin `bot`.

## Understand the handler chain

One event may match both a public middleware and several event handlers. SDK will make up these functions in order of a processing chain and give them the same `ctx` in order.

Each handler `next` represents the next handler in the chain. After `await next()` calls, the downstream handler starts; after all downstream ends, the current handler continues from `await next()`. Therefore, the middleware is ready to perform pre-call preparation, and after call, to record the results or clean up the resources.

```text
Processor A First half → Processor B First half → Business processor
Processor A Second half ← Processor B Second half ← Operations processed
```

If a handler does not call `next()`, the processing chain ends here, and the handler in the back is not executed. The process chain is sequentially called, not broadcast the same event to all handlers simultaneously.

**Note: Next() is required only if the same update matches multiple Handlers and wishes to continue with the later Handler.** For example, a text message might match the same. `message:text` and `message`If you want both Handlers to be executed, you need to call in the previous Handler `next()`.

## How multiple handlers work together

The order of processing is the public middle, `*` handler, the classified event handler in the context, and the main event handler. Multiple handlers for the same event are connected in the order of registration; they also need `next()` to continue.

For example, for special processing `/help`, other text is given to the General Message Processor:

```js
bot.on('message:text', async (ctx, next) => {
  if (ctx.message.text.trim() === '/help') {
    await ctx.sendText('One word., I'll get back to you..');
    return;
  }
  await next();
});

bot.on('message', async (ctx) => {
  if (!ctx.message?.text) return;
  await ctx.sendText(`Copy that.: ${ctx.message.text}`);
});
```

In the example above, if the first handler does not call `next()`, then not `/help` messages will not be processed.

Welcome to business handlers such as languages. Do not call `next()` blindly for “broadcast events”; the current new contact and grouping events have duplicate names in the classification and main event, and the continuation of the whole chain may allow the same name handler to re-exercise.
