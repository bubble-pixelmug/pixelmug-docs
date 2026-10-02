# Push data from a Bot to a WebApp

The request is suitable for " ask for an answer " . Bot, when processing WebApp requests, can also send operational data on the current page, such as progress of the task, changes in status, etc., in addition to the final response.

## `sessionId` Against a page instance

Each page creates `BubbleWebApp` instance, SDK generates `sessionId`. It identifies the example of a WebApp page that is open and running this time, not a user ID, chat ID, or a page URL.

The same user may open a different WebApp from a different message, or may reopen or refresh the same page, so there may be more than one pagesession at the same time for a period of time. WebApp only handles its own `sessionId` (a) Targeted delivery;`ctx.sendWebAppData()` It automatically follows the user, chat and `sessionId`, send the data to the page from the launch. See the creation and closure of the session [Pagesession and Lifecycle](./lifecycle).

## Receive pushes in the WebApp

```js
webapp.on('app.progress', (event) => {
  const progress = event.payload?.progress || 0;
  renderProgress(progress);
});
```

Two fields are mainly used in the echo:

- `type`: Type of push, with `ctx.sendWebAppData(type, payload)` It's... `type` Corresponding;
- `payload`: operational data, and `ctx.sendWebAppData(type, payload)` It's... `payload` Correspond.

Direct access to handlers when all business pushes are required:

```js
webapp.on((event) => {
  console.log('Copy that. Bot Sending data', event);
});
```

WebApp requests Bot's response to be received by `request()`, which does not trigger the delivery handler here.

## Push from the Bot to the current page

In the `onWebAppRequest()` handler, you can use `ctx.sendWebAppData()` to transfer data to the page where the request is launched:

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

`ctx.replyWebApp()` or handler return value is used to answer the current request; `ctx.sendWebAppData()` is sent by an independent business event that can be called several times during a request processing process.
