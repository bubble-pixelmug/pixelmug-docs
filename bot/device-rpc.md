# 设备调用与结果

设备指令发出后，要区分“云端已受理”和“设备已执行”。简单操作直接等待设备结果；较慢的任务可以先受理，再通过完成事件回复用户。

本页假设 `mug` 已创建并通过 `registerDevices()` 注册，Bot 使用 `start()` 开启两路轮询。

## 等待结果后再回复

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/battery') return;
  const response = await bot.callDevice(
    ctx.chat,
    mug,
    mug.rpc.talGetBatteryLevel(),
    { to: ctx.from, requireOnline: true, timeout: 10000 },
  );
  await ctx.sendText(`电量查询结果：${JSON.stringify(response.tal.result)}`);
});
```

`callDevice()` 返回 Promise，只有收到匹配的成功设备响应才得到结果。示例原样显示 `.tal.result`，具体结果字段应按设备 RPC 接口核对，不假设所有 RPC 都返回相同结构。

Bot SDK 生成 `traceId` 关联请求与响应。通常不需要自行指定；排查超时时可通过相关错误或异步任务中的 `traceId` 追踪请求。

## 先受理，再处理完成事件

用户消息队列按顺序处理。如果消息处理器通过 `await callDevice()` 一直等待设备返回，当前处理器在这段时间内不会结束，后续用户消息也只能继续排队。显示图片、播放 GIF 等设备操作耗时不确定，可能使 Bot 无法及时响应其他消息。

因此，设备 RPC 通常优先使用 `callDeviceAsync()`：云端受理请求后，当前消息处理器即可结束；设备最终返回成功、错误或超时时，再通过对应的完成事件处理结果。只有业务必须立即使用调用结果，并且设备 RPC 能够快速返回时，才适合直接等待 `callDevice()`。

希望发起操作后继续处理其他用户消息时，可以这样调用：

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/screen-on') return;
  try {
    const task = await ctx.callDeviceAsync(
      mug,
      mug.rpc.talSetDisplayOnOff({ onoff: true }),
      { requireOnline: true, timeout: 10000 },
    );
    console.log('已受理设备任务', task.traceId);
  } catch (error) {
    await ctx.sendText(`指令未受理：${error.message}`);
  }
});

bot.on('device_call:response', async (ctx) => {
  const task = ctx.deviceCall;
  await ctx.sendText(`设备执行成功：${task.rpc.method}`);
  console.log('设备结果', task.result);
});

bot.on('device_call:timeout', async (ctx) => {
  await ctx.sendText('等待设备响应超时，请先检查设备状态。');
});

bot.on('device_call:error', async (ctx) => {
  await ctx.sendText(`设备执行失败：${ctx.error?.message || '未知错误'}`);
});
```

`ctx.callDeviceAsync()` 自动沿用当前对话和发送者。也可以使用 `bot.callDeviceAsync(ctx.chat, mug, rpc, { to: ctx.from })`。它们返回的任务中，`status: 'accepted'`、`ackCode: 201` 只表示受理。

`device_call:sent` 可用于记录受理事件；最终通过 `response`、`timeout` 或 `error` 处理。事件上下文会恢复任务的对话与发起者，因此可以直接 `ctx.sendText()`。一个 Bot 有多种任务时，按 `ctx.deviceCall.rpc.method`、`slot` 或 `traceId` 区分业务。

异步完成事件由 Bot SDK 分发，不应假设它与普通消息处理器中的日志、回复有固定先后顺序。上例只在完成事件里发送结果，避免把“已受理”误写成“已执行”。

## 在哪里处理错误

未关联、发送前离线检查失败、云端拒绝受理等错误，会让调用本身抛出。`callDeviceAsync()` 受理之后的设备失败和超时，则交给上面的任务事件；不能只依赖发起处的 `try/catch`。

等待式调用可以按原因给出下一步提示：

```js
import {
  isNeedBindDeviceError,
  BubbleTimeoutError,
  DeviceRpcError,
} from '@jeejio-bubble/bot/sdk';

// 在消息或按钮处理器中使用。
try {
  await bot.callDevice(ctx.chat, mug, mug.rpc.talGetBatteryLevel(), {
    to: ctx.from,
    requireOnline: true,
    timeout: 10000,
  });
} catch (error) {
  if (isNeedBindDeviceError(error)) {
    await ctx.sendBindDevice({ actionButtonTitle: '关联设备' });
  } else if (error?.response?.code === 'DEVICE_OFFLINE') {
    await ctx.sendText('设备离线，请确认设备已开机并联网。');
  } else if (error instanceof BubbleTimeoutError) {
    await ctx.sendText('尚未收到设备结果，请检查状态后再试。');
  } else if (error instanceof DeviceRpcError) {
    await ctx.sendText(`设备返回错误：${error.code ?? '无错误码'}，${error.message}`);
  } else {
    throw error;
  }
}
```

`requireOnline` 是发送前的一次检查，不会让离线设备自动上线；状态未提供时也不等于确认在线。等待时间的单位是毫秒，未指定时默认 20000。

超时表示没有按时得到结果，不证明设备没有执行。不要无条件重发可能产生重复效果的操作，先查询状态或让用户决定是否再试。

## 常见的三个原因

没有收到设备结果时，先确认 Bot 使用 `start()`，没有关闭设备轮询；再确认所调用的 slot 在当前对话中已经关联；最后检查设备在线状态和实际支持的方法。

在 `device_notify` 等设备队列处理器里再次等待 `callDevice()`，可能阻塞同一队列接收后续响应。需要由通知触发新指令时，优先提交异步任务，再在任务事件中处理结果。

