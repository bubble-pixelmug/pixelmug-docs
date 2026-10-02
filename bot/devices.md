# 设备声明与关联

Bot 先声明需要什么类型的设备，用户再把属于自己的设备关联到这些位置。设备已经出现在冒泡账号的“我的设备”中，并不等于已经关联到当前 Bot 对话。

## 声明一个设备位置

在入口导入设备 RPC SDK 提供的设备类，创建实例并注册，以 PixelMug S1 Pro/Lite 为例：

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const mug = new PixelMugS1();
bot.registerDevices([mug]);
```

这段放在 `start()` 之前。启动时 Bot SDK 把设备声明同步到云端。`new PixelMugS1()` 创建的是设备能力描述，不会连接某只水杯；`registerDevices()` 也不会自动替用户选择设备。

这里的三个概念后面会反复用到：

- `talId`：设备类型，目前支持两种设备类型`PixelMug`， `PixelMugS1`。
- `slot`：Bot 中关联设备的位置，从 1 开始，由注册数组的顺序确定。
- `deviceId`：用户实际关联的设备 ID，关联后才能查询到。

## 发出关联入口

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/bind') return;
  await ctx.sendBindDevice({
    content: '先关联一台 PixelMug S1，再开始使用 bot',
    actionButtonTitle: '关联 S1',
  });
});
```

`sendBindDevice()` 用于发起设备关联。用户发送 `/bind` 后，Bot 会回复一张关联引导卡片；用户点击卡片中的入口，冒泡 App 会显示可选设备，并引导用户为当前 Bot 选择和确认设备。这个方法只负责发出关联入口，Promise 返回表示消息已经发送，并不表示设备已经完成关联。

**可以把 Bot 理解为负责判断和调度的“大脑”，把 slot 理解为它预留的“外设插槽”。** 开发者先通过 `registerDevices()` 声明每个 slot 需要哪类设备，用户再把自己的实际设备接入相应 slot。关联完成后，Bot 代码面向 slot 调用设备能力；只要新设备满足该 slot 的类型或兼容要求，更换关联设备通常不需要修改业务代码。

slot 是 Bot 中的逻辑位置，并不是设备上的物理接口，也不代表在声明时已经连接了某台设备。

## 确认关联结果

调用设备前，可以查询当前对话：

```js
// 放在需要设备的消息或按钮处理器中。
if (!(await bot.isDeviceBound(ctx, mug))) {
  await ctx.sendBindDevice({ actionButtonTitle: '关联 S1' });
  return;
}
```

希望显示名称或在线状态时，用 `getBoundDevices()`：

```js
const devices = await bot.getBoundDevices(ctx);
const bound = devices.find((device) => Number(device.slot) === 1);
await ctx.sendText(bound ? `已关联：${bound.name || bound.deviceId}` : '尚未关联 S1。');
```

返回列表只包含已关联的设备，不会为未关联 slot 填空对象。每项包含 `slot`、`deviceId`、`name`、`deviceTalId`、`online` 等归一化信息。`online` 可能是 `undefined`，表示响应未提供状态；关联成功不能单独证明设备此刻在线。

Bot SDK 收到关联变更消息时，可以更新界面或自己的缓存：

```js
bot.on('message:bind_device', async (ctx) => {
  const devices = ctx.message?.attachedDevices;
  if (!Array.isArray(devices)) return;
  await ctx.sendText(`当前关联了 ${devices.length} 个设备。`);
});
```

`attachedDevices` 来自该消息中的设备列表。业务开始时仍应主动查询，不要只依赖进程启动后碰巧收到的变更通知；群聊更新还受[群聊策略](./commands-and-groups)影响。

## 一个 Bot 使用多个设备

每个位置创建独立的设备实例，即使型号相同：

```js
const deskMug = new PixelMugS1();
deskMug.name = '桌面水杯';
const livingRoomMug = new PixelMugS1();
livingRoomMug.name = '客厅水杯';

bot.registerDevices([deskMug, livingRoomMug]);
// deskMug 对应 slot 1，livingRoomMug 对应 slot 2。
```

这段替换前面的单设备声明。`registerDevices()` 每次替换完整声明列表，不是追加；保持数组顺序稳定，避免业务中 slot 的含义发生变化。运行中修改声明后，如需立即同步，调用 `await bot.syncDeviceSlots()`。

发送设备指令时传入对应实例，Bot SDK 会查找它的 slot；也可显式指定 `slot`。用于调用的 slot 序号不是云端关联记录的 `slotId`，两者不要混用。

## 一个 slot 兼容多个设备类型

一个 slot 有一个默认设备类型，也可以通过 `compatible` 声明其他允许关联的设备类型。例如，下面的 slot 默认用于 PixelMug S1，同时也允许用户关联第一代产品 PixelMug P1：

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const mug = new PixelMugS1();
mug.compatible = ['PixelMug'];
bot.registerDevices([mug]);
```

这里注册的 slot 类型仍是 `PixelMugS1`，`compatible` 只是允许 `PixelMug` 类型的 P1 也关联到这个位置。这样，同一套 Bot 可以由用户选择 S1 或 P1，而不需要为每个型号设置单独的 slot。

设备兼容也意味着 Bot 调用的设备 RPC 必须由这些型号共同支持。`compatible` 不会把 S1 专有的 RPC 自动转换成 P1 接口；如果这个 slot 可能关联 P1，业务代码就应调用 S1 和 P1 都具备、参数和行为也兼容的 RPC。当前返回结果中的 `talId` 和 `deviceTalId` 都是创建 slot 时使用的类型，不能用来区分实际关联的是 S1 还是 P1。

下一步：[使用设备 RPC SDK 控制屏幕](./device-sdk)。

