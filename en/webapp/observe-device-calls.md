# Observe device calls from a WebApp

When the WebApp calls the device directly `webapp.callDevice()`, the request does not pass through Bot’s business handler. Bot, if it is necessary to monitor the call of the Device RPC initiated by WebApp, can open the device to call and observe, receive requests, respond to and time-out events.

The observation function is only to copy to Bot when the cloud receives a call request from WebApp. It does not represent, intercept, or modify the device RPC, nor does it decide for WebApp whether the call is allowed.

## Enable observation

Set `observeWebAppDeviceCalls` when creating Bot:

```js
import { BubbleBot } from '@jeejio-bubble/bot';

const bot = new BubbleBot(process.env.BUBBLE_BOT_TOKEN, {
  apiBaseUrl: process.env.BUBBLE_API_BASE_URL,
  observeWebAppDeviceCalls: true,
  webAppDeviceCallTimeoutMillis: 30_000,
});

bot.on('web_app_device_call', (ctx) => {
  console.log(ctx.webAppDeviceCall);
});

await bot.start();
```

This setting is synchronized with the service when Bot starts. Only when it is on will the service send the WebApp device call to Bot.

## Handle requests, responses, and timeouts separately

You can listen to a single event or you can listen to it in stages:

```js
bot.on('web_app_device_call:request', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.log('request', call.id, call.deviceId, call.rpc);
});

bot.on('web_app_device_call:response', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.log('response', call.id, call.result);
});

bot.on('web_app_device_call:timeout', (ctx) => {
  const call = ctx.webAppDeviceCall;
  console.warn('timeout', call.id, call.rpc?.method);
});
```

`web_app_device_call` All of these three phases will be received.`request` and `response` By calling ID pairs. Bot waiting for response `webAppDeviceCallTimeoutMillis` setting;use when not configuration `deviceResponseTimeoutMillis`default is 20 seconds. Beyond that time, no corresponding resonance will occur. `timeout` I don't know.

The event handler can read this call via `ctx.webAppDeviceCall`. Common fields include:

| Fields | Meaning |
| --- | --- |
| `direction` | Current phase: `request`, `response` or `timeout` |
| `id` | This device calls ID, which can be used to associate requests and responses |
| `slotId`, `deviceId` | WebApp Call Target |
| `rpc` | Methods and parameters of the request |
| `result` | Results of device return; meaningful only during response phase |

The specific field may vary depending on the call stage. The business code should first judge `direction` and then read the corresponding data.

## Use cases

The central role of Bot observation device is to bring back the device operation that occurred in WebApp to the Bot chat, especially for information-sharing and multi-person collaboration in group conversations.

When WebApp calls directly from the Device RPC, the operation is usually only reflected on the current page and associated device. After opening the observation, Bot can see who initiated the operation, what it was, and whether the device was successfully implemented, and then send the content to the original chat via the Bot interface.

Yes. `request` Could be directly from the event. `ctx.from` and `ctx.chat` Read the operation user and chat.`response` The event was triggered by deviceresponse, at which point `ctx.from` means device; SDK saves original matching request in `ctx.webAppDeviceCall.request` . When dealing with successful response `request.extend.from` and `request.extend.chat` Gets a handler and the original chart and sends it in:

```js
bot.on('web_app_device_call:response', async (ctx) => {
  const call = ctx.webAppDeviceCall;
  if (!call?.ok) return;

  const user = call.request?.extend?.from;
  const chat = call.request?.extend?.chat;
  if (!user || !chat) return;

  await ctx.sendText(`${user.name} One equipment operation completed`, {
    chat,
    to: user,
    mentionOnly: false,
  });
});
```

```text
Group Members Operations WebApp → WebApp Caller Equipment RPC → Bot Watch Call
                                              ↓
                               Collate or summarize information → Can not open message
```

### Share WebApp actions in a group chat

For example, using text-sharing WebApp, group members select a PixelMug on their page, setting text, colour, font and scroll direction, and then directly calling the Device RPC. Bot observes that the call is successful in obtaining the user, target device and text content from the context and from the RPC parameters and sending to the chat "What text is sent by which user to which cup." This way, displaying on the device is also visible to the group members. The full example is at `tools/studio/examples/webapp-pixel-text-share`.

### Aggregate group member actions

The observation function is also appropriate for a scenario that requires a combination of multiple input. For example, when a group member votes in WebApp or changes a common setting, Bot collects each operation, calculates the results or organizes the current status, then sends the progress and final results to the group. Thus, WebApp is interactive, Bot is responsible for bringing together the operations of different members into a group information.

### Choose the appropriate call phase

`request` Events are suitable for reading RPCs and parameters submitted by members; `response` Events are appropriate for confirming that the device has been executed and for reading the results; `timeout` Events can be used to indicate that the operation did not return on time. If you only want to share a successful operation, the group message should be sent at `response` Phase to avoid treating a failed call as a completed operation.

If Bot needs to call the device on its own initiative, use [Bot's Device RPC](/en/bot/device-rpc). If you need to limit whether WebApp is open, configure [WebApp Open Conditions](./access-policy).
