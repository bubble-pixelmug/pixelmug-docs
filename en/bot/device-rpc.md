# Device Call and Result

When a device command is issued, a distinction is made between “cloud-enabled” and “device has been executed”. Simple operations await the results of the device; slower tasks can be processed before responding to the user by completing the event.

This page assumes that `mug` has been created and registered `registerDevices()` and that Bot uses `start()` to open two-way inquiries.

## Wait for a result before replying

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/battery') return;
  const response = await bot.callDevice(
    ctx.chat,
    mug,
    mug.rpc.talGetBatteryLevel(),
    { to: ctx.from, requireOnline: true, timeout: 10000 },
  );
  await ctx.sendText(`Query results: ${JSON.stringify(response.tal.result)}`);
});
```

`callDevice()` returns Promise, which results only if a successful device response matching the device is received. The example is shown as `.tal.result` and the specific result fields should be checked with the device RPC interface, without assuming that all the RPCs return to the same structure.

Bot SDK generates `traceId` associated requests and responses. Normally, no self-specify is required; requests can be tracked through `traceId` in the relevant error or walk task when the time is exceeded.

## Accept first, handle completion later

The user message queue is sequential. If the message handler is waiting for the device by `await callDevice()`, the current handler will not end during this time, and subsequent user messages will continue to line. Showing the picture, playing GIF, etc. will be time-consuming and uncertain and may prevent Bot from responding to other messages in a timely manner.

Therefore, device RPC is usually preferred `callDeviceAsync()`: claud service accepts request, and the current messagehandler ends; device eventually returns with success, or error or timeout, and then through the corresponding completed vent process. Only business must immediately use the call results and device RPC can quickly return is it appropriate to wait directly. `callDevice()`.

If you wish to continue processing other user messages after the start-up, you can call as follows:

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/screen-on') return;
  try {
    const task = await ctx.callDeviceAsync(
      mug,
      mug.rpc.talSetDisplayOnOff({ onoff: true }),
      { requireOnline: true, timeout: 10000 },
    );
    console.log('Receivable equipment tasks', task.traceId);
  } catch (error) {
    await ctx.sendText(`Command not accepted: ${error.message}`);
  }
});

bot.on('device_call:response', async (ctx) => {
  const task = ctx.deviceCall;
  await ctx.sendText(`Equipment implementation success: ${task.rpc.method}`);
  console.log('Device results', task.result);
});

bot.on('device_call:timeout', async (ctx) => {
  await ctx.sendText('Waiting for device response timeout, Please check the equipment's status..');
});

bot.on('device_call:error', async (ctx) => {
  await ctx.sendText(`Device execution failed: ${ctx.error?.message || 'Unknown error'}`);
});
```

`ctx.callDeviceAsync()` Automatically follow the current chat and sender. You can also use `bot.callDeviceAsync(ctx.chat, mug, rpc, { to: ctx.from })`. In their return missions, `status: 'accepted'`, `ackCode: 201` will be accepted only.

`device_call:sent` may be used to record admissible events; ultimately, they are handled by `response`, `timeout` or `error`. The context of the event will resume the mission ' s chat and sponsor, so that the task can be directly `ctx.sendText()`. A Bot with multiple tasks separates business by `ctx.deviceCall.rpc.method`, `slot` or `traceId`.

The stept completion event is distributed by Bot SDK and should not be assumed to have a fixed sequence of logs and responses in the regular message handler. The last example is to send the result only in the completed event, avoiding miswriting the word “admissible” as “executed”.

## Handle errors

Errors such as failure to associate, failure to send pre-offline check, cloud refusal to accept, etc., leave the call itself out. `callDeviceAsync()` Failed and timeout of the device after processing is assigned to the task event above; it cannot be relied on only `try/catch` at the launch point.

The waiting call gives the next hint by reason:

```js
import {
  isNeedBindDeviceError,
  BubbleTimeoutError,
  DeviceRpcError,
} from '@jeejio-bubble/bot/sdk';

// Use in message or button processor.
try {
  await bot.callDevice(ctx.chat, mug, mug.rpc.talGetBatteryLevel(), {
    to: ctx.from,
    requireOnline: true,
    timeout: 10000,
  });
} catch (error) {
  if (isNeedBindDeviceError(error)) {
    await ctx.sendBindDevice({ actionButtonTitle: 'Associated equipment' });
  } else if (error?.response?.code === 'DEVICE_OFFLINE') {
    await ctx.sendText('Device offline, Make sure the equipment is on and connected..');
  } else if (error instanceof BubbleTimeoutError) {
    await ctx.sendText('The results of the equipment have not yet been received, Please check the status and try again..');
  } else if (error instanceof DeviceRpcError) {
    await ctx.sendText(`Device Return Error: ${error.code ?? 'No error code'}, ${error.message}`);
  } else {
    throw error;
  }
}
```

`requireOnline` is a check before sending, and does not automatically turn off the offline device on line; the status is not confirmed online when not available. The unit of waiting time is milliseconds and defaults 20000 if not specified.

Timeout means that the results are not obtained on time and do not prove that the device was not executed. Do not reissue operations that may have a repetitive effect without conditions, either check the status or let the user decide whether to try again.

## Three common failure causes

When no results are received, confirm that Bot uses `start()` and does not close the device rotation; confirm that the call of slot is relevant in the current chat; and finally check the device online and the method of actual support.

Yes. `device_notify` Waiting for devicequeuehandler again. `callDevice()`, the same queue may be blocked.

