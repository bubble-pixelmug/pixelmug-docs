# 设备通知与多设备路由

设备调用的响应对应一次请求；设备通知则由设备主动产生，例如充电状态变化。接收通知用 `device_notify`，再通过设备 RPC SDK 中设备类的 `parseNotify()` 解析已知事件。

## 先观察通知

沿用已注册的 S1 实例 `mug`，在 `start()` 前加入：

```js
bot.on('device_notify', (ctx) => {
  const events = mug.parseNotify(ctx.tal?.notify);
  for (const event of events) {
    console.log('设备', ctx.from?.id, '事件', event.name, event.params);
  }
});
```

PixelMug S1 和 P1 都可以通过 `parseNotify()` 解析公开的 `CurChargingState` 事件，用于获知设备充电状态的变化。是否产生这项通知由设备固件决定；注册 `device_notify` 处理器只是接收设备已经上报的事件，不会主动订阅或要求设备开始上报。

## 把充电状态变化发回对话

通知中的发送者通常是设备，不能把它当成用户，也不能假设每条通知都带有可回复的对话。应用应记录谁订阅了哪台实际设备，在通知到达时找到对应目标。

下面展示一个进程内订阅方案：用户在目标对话发送 `/watch`，Bot 查询关联设备并记住它们。它可以记录同一对话中的多个 slot，也允许多个对话订阅同一设备。

```js
const watches = new Map();
const chatKey = (chat) => `${chat.type || 'chat'}:${chat.id}`;

async function refreshWatch(ctx) {
  const devices = await bot.getBoundDevices(ctx);
  watches.set(chatKey(ctx.chat), {
    chat: ctx.chat,
    to: ctx.from,
    deviceIds: new Set(devices.map((device) => device.deviceId)),
  });
  return devices.length;
}

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text === '/watch') {
    const count = await refreshWatch(ctx);
    await ctx.sendText(count ? `已关注 ${count} 个关联设备。` : '请先关联设备，再发送 /watch。');
  } else if (text === '/unwatch') {
    watches.delete(chatKey(ctx.chat));
    await ctx.sendText('已停止这个对话的设备通知。');
  }
});

bot.on('message:bind_device', async (ctx) => {
  if (watches.has(chatKey(ctx.chat))) await refreshWatch(ctx);
});

bot.on('device_notify', async (ctx) => {
  const deviceId = ctx.from?.id;
  if (!deviceId) return;
  const events = mug.parseNotify(ctx.tal?.notify);

  for (const event of events) {
    if (event.name !== 'CurChargingState') continue;
    const value = event.params?.value;
    if (![true, false, 0, 1, '0', '1'].includes(value)) continue;
    const charging = value === true || value === 1 || value === '1';

    for (const [key, watch] of watches) {
      if (!watch.deviceIds.has(deviceId)) continue;
      // 再查一次，避免漏掉关联变更后仍向旧对话发送。
      const devices = await bot.getBoundDevices({ chat: watch.chat });
      if (watches.get(key) !== watch) continue;
      watch.deviceIds = new Set(devices.map((device) => device.deviceId));
      const bound = devices.find((device) => device.deviceId === deviceId);
      if (!bound) continue;

      await bot.api.sendTextMessage({
        chat: watch.chat,
        to: watch.to,
        mentionOnly: watch.chat.type === 'group',
        text: `${bound.name || '水杯'}${charging ? '正在充电' : '已停止充电'}。`,
      });
    }
  }
});
```

把这组处理器作为独立的通知示例使用，替换同名业务处理器；如果要与已有 `/bind`、`/panel` 合并，可在同一个文字处理器里分派，或按[上下文与事件](./events)显式传递 `next()`。

先关联设备，再发 `/watch`，随后改变设备充电状态，观察日志和聊天通知。这里的“关注”是应用自己的转发规则，没有调用一个额外的设备订阅接口。

## 多设备应用需要保持的关系

slot 表示 Bot 中的位置，`deviceId` 表示实际设备。用户更换关联设备后，slot 可以不变，但 `deviceId` 会变化，因此通知应按实际设备 ID 匹配，再查找当前 slot 和显示名称。

上例适合 S1 或使用相同充电事件的设备。不同类型设备混合使用时，为各 slot 保存对应的设备类，用相应的 `parseNotify()` 解析，不能假设所有设备的事件都一样。

这个例子每个对话只有一份关注记录，后一次 `/watch` 会替换发起者；若需要群内每个用户独立订阅，把用户 ID 也纳入键。进程重启后内存记录会丢失，长期运行时按需持久化，并在恢复、重新关注和关联变更时刷新设备列表。新关联设备的变更通知若未送达，可以再次 `/watch` 更新。
