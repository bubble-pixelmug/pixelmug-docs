# WebApp and Bot communication

The bubble platform provides a dedicated two-way message channel between WebApp and Bot. WebApp can send requests to Bot via SDK, Bot can return the processing results or actively transfer data to the page. Messages are forwarded by Bubble App and clouds. Developers do not need to create WebApp service alone to connect WebApp to Bot.

This dedicated channel is an open-boxing means of communication and does not restrict the application of other structures. If the business requires a custom protocol, reuse of existing services or direct use of Web API standards, the developer can still provide services such as HTTP in Bot, or access an independent backend for WebApp.

SDK provides a business path that is suitable for searching business data, submitting forms and implementing service-end logic that is not part of Device RPC. Each request has an independent ID, Bot returns the corresponding response.

## Send a request from the WebApp

```js
const response = await webapp.request('app.sum', {
  a: 1,
  b: 2,
});

console.log(response.result.sum);
```

The type of request suggests the use of a namespace that applies to it, e.g. `app.sum`, `clock.save`. Note: `system.*` is used by an internal SDK process and should not be used as a generic business name.

## Handle and return a result from the Bot

```js
bot.onWebAppRequest('app.sum', async (ctx) => {
  const { a, b } = ctx.webAppData.payload || {};

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    const error = new Error('a 和 b It has to be a number.');
    error.code = 400;
    throw error;
  }

  return { sum: a + b };
});
```

Boot's handler can read `ctx.webAppData`:

- `type`: Type of request;
- `payload`: Operational parameters;
- `id`: Request for marking;
- `sessionId`: page session identification.

Returns values are packaged by SDK as a successful response. When the handler throws out the anomaly, SDK returns a failed response using the abnormal `code` and `message`; the anomaly will then enter the Bot `error` handler to facilitate the recording.

WebApp received a failure to repopone,`request()` You will refuse and give an order of order. `result` Defines the structure of its business results without relying on ordinary `Error` Saves the whole serverresponse.

`request()` returns a Promise and continues to wait until Bot completes processing and returns the final response. Default waiting for 20 seconds can also be adjusted for a single request by `timeout` or `timeoutMillis`; if Bot does not run, requests do not answer or responses overtime, Promise will be denied.

## When no matching request handler is registered

`webapp.request(type, payload)` Use the `type` identification request, `bot.onWebAppRequest(type, handler)` in Bot to state which handler will receive the type. For example, `webapp.request('app.sum', payload)` will be given to `bot.onWebAppRequest('app.sum', handler)`; `type` on both sides must be consistent.

If Bot didn't do that, `type` The corresponding statement `onWebAppRequest()` Handler, SDK doesn't respond automatically. `web_app_data` Eventhandler.

### Use `ctx.replyWebApp()` manual response

In `web_app_data` handler, you can use `ctx.replyWebApp(result)` to respond manually to the current request:

```js
bot.on('web_app_data', async (ctx) => {
  const request = ctx.webAppData;
  if (request?.__kind !== 'request') return;
  if (request.type !== 'app.ping') return;

  await ctx.replyWebApp({ message: 'pong' });
});
```

`replyWebApp()` will automatically follow the current request `id`, `type` and `sessionId`, so the response will be received by `request()` in WebApp, which is waiting for the same request. The first parameter will appear in `result` for WebApp.

```js
const response = await webapp.request('app.ping');
console.log(response.result.message); // pong
```

General operations priority use `onWebAppRequest()`. SDK automatically calls the response process, so do not be present `onWebAppRequest()` handler calling again `ctx.replyWebApp()`, otherwise a copy will be sent over and over again.`ctx.replyWebApp()` Mainly for general use `web_app_data` Handler needs to respond manually.
