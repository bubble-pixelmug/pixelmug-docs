# 使用设备 RPC SDK

设备 RPC SDK 是运行在 Bot 一侧的 JavaScript 库，封装了设备固件内置能力的远程调用（RPC）接口。Bot 可以直接控制显示、读取状态或向设备发送数据，无需为这些能力编写和部署设备端程序。

设备 RPC SDK 负责构造指令，Bot SDK 负责把指令发送给当前对话关联的设备，设备固件负责执行并返回结果。

## 导入 `/ext` 设备类

Bot 应用直接使用设备的 `/ext` 入口。下面以 PixelMug S1 为例：

```js
import PixelMugS1, {
  Specifications,
} from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const mug = new PixelMugS1();
bot.registerDevices([mug]);
```

PixelMug P1 使用：

```js
import PixelMug, {
  Specifications,
} from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

设备实例需要在 `start()` 前通过 `registerDevices()` 注册，使 Bot 知道它对应哪个 slot。

## 分清构造和发送

以显示文字为例，先让设备 RPC SDK 构造指令，再由 Bot SDK 发送：

```js
const rpc = await mug.rpc.talPrintText({
  text: '你好，PixelMug',
  color: '#00ff00',
  speed: 80,
});
// 这里只生成了 { method, params }，还没有向设备发送。

const response = await bot.callDevice(ctx.chat, mug, rpc, {
  to: ctx.from,
});
console.log(response.tal.result);
```

Bot 可以在不同的单聊和群聊中关联不同的用户的设备，因此需要 `ctx` 来定位调用哪个设备的接口。`ctx.chat` 指定当前对话，Bot SDK 再根据 `mug` 对应的 slot 找到这个对话所关联的实际设备。设备执行结果位于 `response.tal.result`。

`talPrintText()` 会先生成显示文字所需的字模数据，所以构造指令时也要使用 `await`。不能把尚未完成的 Promise 直接传给 `callDevice()`。

## 把用户发来的文字显示在 S1 上

沿用[第一个 Bot](./quick-start)中的配置读取、Bot 创建和错误处理。在 `start()` 前加入下面的设备声明和消息处理器：

```js
import {
  isNeedBindDeviceError,
} from '@jeejio-bubble/bot/sdk';
import PixelMugS1, {
  Specifications,
} from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const mug = new PixelMugS1();
bot.registerDevices([mug]);

async function askToBind(ctx) {
  await ctx.sendBindDevice({
    content: '请先关联 PixelMug S1。',
    actionButtonTitle: '关联 S1',
  });
}

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();

  if (text === '/bind') {
    await askToBind(ctx);
    return;
  }
  if (!text || text.startsWith('/')) return;

  if (!(await bot.isDeviceBound(ctx, mug))) {
    await askToBind(ctx);
    return;
  }

  try {
    const rpc = await mug.rpc.talPrintText({
      text,
      specifications: Specifications.MEDIUM,
      color: '#00ff00',
      speed: 80,
    });

    await bot.callDevice(ctx.chat, mug, rpc, {
      to: ctx.from,
      requireOnline: true,
      timeout: 30000,
    });
    await ctx.sendText('文字已经显示在 PixelMug S1 上。');
  } catch (error) {
    if (isNeedBindDeviceError(error)) {
      await askToBind(ctx);
      return;
    }
    await ctx.sendText(`显示文字失败：${error.message}`);
  }
});
```

最后使用 `await bot.start()` 同时开启消息和设备轮询。先发送 `/bind` 关联设备，再发送任意普通文字，即可让 S1 显示这段内容。生成字模和设备显示都可能需要时间，因此示例使用 30 秒超时；异步处理方式见[设备调用与结果](./device-rpc)。

## RPC 参数中的内容对象

播放图片、GIF 或远程字体时，参数中的内容对象采用以下结构：

```js
const content = {
  type: 'application/bin', // 也可以是实际媒体类型
  size: 1024,              // 文件大小，单位为字节
  url: 'https://example.com/file.bin',
};
```

图片可以使用 `prepareImage()` 转换并上传，得到可直接作为 `imageContent` 使用的对象。下表中的 `imageContent`、`gifContent` 和 `fontContent` 都表示这种包含 `type`、`size`、`url` 的内容对象。表内示例只构造 RPC，构造后仍需调用 `bot.callDevice()` 才会发送到设备。

## PixelMug S1 RPC 接口

导入入口：`@jeejio-bubble/bot/devices/pixelmug-s1/ext`

| 接口 | 注释 | 参数 | 构造 RPC 示例 |
| --- | --- | --- | --- |
| `talPrintText()` | 生成文字字模并在设备屏幕上显示文字 | `text` 必填；可选 `specifications`（`LARGE`、`MEDIUM`、`SMALL`）、`color`、`speed`、`direction` | `await mug.rpc.talPrintText({ text: '你好', color: '#00ff00' })` |
| `talGetWaterTemperature()` | 读取当前水温 | 无 | `mug.rpc.talGetWaterTemperature()` |
| `talGetWifiInfo()` | 读取设备当前的 Wi-Fi 连接信息 | 无 | `mug.rpc.talGetWifiInfo()` |
| `talGetBatteryLevel()` | 读取设备当前电量 | 无 | `mug.rpc.talGetBatteryLevel()` |
| `talGetBrightness()` | 读取屏幕当前亮度 | 无 | `mug.rpc.talGetBrightness()` |
| `talSetBrightness()` | 设置屏幕亮度 | `percent: number` | `mug.rpc.talSetBrightness({ percent: 60 })` |
| `talPlayGif()` | 在设备屏幕上播放 GIF | `gifContent` | `mug.rpc.talPlayGif({ gifContent })` |
| `talPlayPNG()` | 在指定位置显示 PNG 图片 | `imageContent`、`xoff`、`yoff` | `mug.rpc.talPlayPNG({ imageContent, xoff: 0, yoff: 0 })` |
| `talPlaySyncGif()` | 按指定时间戳和位置同步播放 GIF | `gifContent`、`TimeStamp`、`xoff`、`yoff` | `mug.rpc.talPlaySyncGif({ gifContent, TimeStamp: Date.now(), xoff: 0, yoff: 0 })` |
| `talSetLocalTimeSyncEnabled()` | 配置设备本地时间同步及主设备角色 | `isMaster: boolean`、`isEnable: boolean` | `mug.rpc.talSetLocalTimeSyncEnabled({ isMaster: true, isEnable: true })` |
| `pushMessage()` | 向设备上正在运行的 MPY 应用发送字符串消息 | `message: string` | `mug.rpc.pushMessage({ message: '{"action":"refresh"}' })` |


`pushMessage()` 只有在设备端已有 MPY 应用接收并理解这段字符串时才有业务效果。

## PixelMug P1 RPC 接口

导入入口：`@jeejio-bubble/bot/devices/pixelmug/ext`

| 接口 | 注释 | 参数 | 构造 RPC 示例 |
| --- | --- | --- | --- |
| `talPrintText()` | 生成文字字模并在设备屏幕上显示文字 | `text` 必填；可选 `specifications`（`LARGE`、`MEDIUM`、`SMALL`）、`color`、`speed`、`direction` | `await mug.rpc.talPrintText({ text: '你好', color: '#00ff00' })` |
| `talGetDisplayOnOff()` | 读取屏幕当前的开关状态 | 无 | `mug.rpc.talGetDisplayOnOff()` |
| `talSetDisplayOnOff()` | 打开或关闭设备屏幕 | `onoff: boolean` | `mug.rpc.talSetDisplayOnOff({ onoff: true })` |
| `talGetWaterTemperature()` | 读取当前水温 | 无 | `mug.rpc.talGetWaterTemperature()` |
| `talGetWifiInfo()` | 读取设备当前的 Wi-Fi 连接信息 | 无 | `mug.rpc.talGetWifiInfo()` |
| `talGetBatteryLevel()` | 读取设备当前电量 | 无 | `mug.rpc.talGetBatteryLevel()` |
| `talGetBrightness()` | 读取屏幕当前亮度 | 无 | `mug.rpc.talGetBrightness()` |
| `talSetBrightness()` | 设置屏幕亮度 | `percent: number` | `mug.rpc.talSetBrightness({ percent: 60 })` |
| `talPlayGif()` | 在设备屏幕上播放 GIF | `gifContent` | `mug.rpc.talPlayGif({ gifContent })` |
| `talPlaySyncGif()` | 按指定时间戳和位置同步播放 GIF | `gifContent`、`TimeStamp`、`xoff`、`yoff` | `mug.rpc.talPlaySyncGif({ gifContent, TimeStamp: Date.now(), xoff: 0, yoff: 0 })` |
| `talSetLocalTimeSyncEnabled()` | 配置设备本地时间同步及主设备角色 | `isMaster: boolean`、`isEnable: boolean` | `mug.rpc.talSetLocalTimeSyncEnabled({ isMaster: true, isEnable: true })` |

Bot 应用通常使用已注册的设备实例 `mug.rpc`，这样 Bot SDK 才能确定对应的 slot。设备实例上的 `parseNotify()` 用于解析设备通知，见[设备通知与多设备路由](./device-events)；`setBot()` 会在注册设备时由 Bot SDK 调用，应用一般不需要直接使用。
