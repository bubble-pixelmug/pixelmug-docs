# Use device RPC SDK

Data is a JavaScript library running on the Bot side, which contains a remote call (RPC) interface for the device's built-in capacity. Bot can directly control the display, read state or send data to the device without having to develop and deploy end-of-device programs for these capabilities.

Device RPC SDK is responsible for the construction of the command, Bot SDK is responsible for sending the instruction to the device associated with the current chat, and the firmware of the device is responsible for implementation and for returning the results.

## Import `/ext` Device class

Bot applies the `/ext` direct-use entrance to the device. Below is the example of PixelMug S1:

```js
import PixelMugS1, {
  Specifications,
} from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const mug = new PixelMugS1();
bot.registerDevices([mug]);
```

PixelMug P1 Usage:

```js
import PixelMug, {
  Specifications,
} from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

The device example needs to be registered by `start()` by `registerDevices()` so Bot knows which slot it should be.

## Build and send RPC calls

For example, display text, first let device RPC SDK construct commands and then send them by Bot SDK:

```js
const rpc = await mug.rpc.talPrintText({
  text: 'Hello., PixelMug',
  color: '#00ff00',
  speed: 80,
});
// It's just here. { method, params }, Not sent to device.

const response = await bot.callDevice(ctx.chat, mug, rpc, {
  to: ctx.from,
});
console.log(response.tal.result);
```

Bot can connect different users in separate and group conversations, so `ctx` is needed to locate the interface to which the device is to be called. `ctx.chat` Specifies the current chat, Bot SDK then finds the actual device associated with this chat according to `mug` corresponding slot. The device execution results are at `response.tal.result`.

`talPrintText()` The word model data for the display of the text by Mr. X are also used to construct the command `await`. Cannot pass unfinished Promise directly `callDevice()`.

## Show text sent by user on S1

Follow [First Bot](./quick-start) configuration reading, Bot creation and error processing. Add the following device declaration and message handler before `start()`:

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
    content: 'Please contact first. PixelMug S1.',
    actionButtonTitle: 'Association S1',
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
    await ctx.sendText('Text already shown in PixelMug S1 上.');
  } catch (error) {
    if (isNeedBindDeviceError(error)) {
      await askToBind(ctx);
      return;
    }
    await ctx.sendText(`Show text failed: ${error.message}`);
  }
});
```

Last use of `await bot.start()` to open both message and device rounds. Send `/bind` associated devices and then send any normal text, so that S1 displays this content. Generating a word model and device display may take time, so the example is 30 seconds out of time; see [Device Call and Result](./device-rpc) for a different step.

## Content objects in RPC parameters

When playing pictures, GIF or remote fonts, the content objects in the parameters are structured as follows:

```js
const content = {
  type: 'application/bin', // It can also be the type of actual media.
  size: 1024,              // File Size, Bytes in units
  url: 'https://example.com/file.bin',
};
```

Pictures can be used `prepareImage()` Convert and upload, get direct action `imageContent` The object that you want to use. `imageContent`, `gifContent` and `fontContent` It's all about that. `type`, `size`, `url` . The table contains only RPCs, which still need to be called. `bot.callDevice()` I'll send it to Device.

## PixelMug S1 RPC interface

Import entry: `@jeejio-bubble/bot/devices/pixelmug-s1/ext`

| Interface | Comment | Parameters | Construct RPC Example |
| --- | --- | --- | --- |
| `talPrintText()` | Generates text symmetry and displays text on the device screen | `text` Required; optional `specifications` (`LARGE`, `MEDIUM`, `SMALL`, `color`, `speed`, `direction` | `await mug.rpc.talPrintText({ text: '你好', color: '#00ff00' })` |
| `talGetWaterTemperature()` | Read current water temperature | None | `mug.rpc.talGetWaterTemperature()` |
| `talGetWifiInfo()` | Read the device 's current Wi-Fi connection information | None | `mug.rpc.talGetWifiInfo()` |
| `talGetBatteryLevel()` | Read the device 's current capacity | None | `mug.rpc.talGetBatteryLevel()` |
| `talGetBrightness()` | Read the current brightness of the screen | None | `mug.rpc.talGetBrightness()` |
| `talSetBrightness()` | Set the brightness of the screen | `percent: number` | `mug.rpc.talSetBrightness({ percent: 60 })` |
| `talPlayGif()` | Play GIF on device screen | `gifContent` | `mug.rpc.talPlayGif({ gifContent })` |
| `talPlayPNG()` | Show PNG pictures at specified locations | `imageContent`, `xoff`, `yoff` | `mug.rpc.talPlayPNG({ imageContent, xoff: 0, yoff: 0 })` |
| `talPlaySyncGif()` | Sync GIF by the given time stamp and position | `gifContent`, `TimeStamp`, `xoff`, `yoff` | `mug.rpc.talPlaySyncGif({ gifContent, TimeStamp: Date.now(), xoff: 0, yoff: 0 })` |
| `talSetLocalTimeSyncEnabled()` | Configure Device Local Time Synchronization and Master Device Roles | `isMaster: boolean`, `isEnable: boolean` | `mug.rpc.talSetLocalTimeSyncEnabled({ isMaster: true, isEnable: true })` |
| `pushMessage()` | Send string messages to running MPY applications on the device | `message: string` | `mug.rpc.pushMessage({ message: '{"action":"refresh"}' })` |


`pushMessage()` Business effects only when the MPY application is received and understood at the end of the device.

## PixelMug P1 RPC Interface

Import entry: `@jeejio-bubble/bot/devices/pixelmug/ext`

| Interface | Comment | Parameters | Construct RPC Example |
| --- | --- | --- | --- |
| `talPrintText()` | Generates text symmetry and displays text on the device screen | `text` Required; optional `specifications` (`LARGE`, `MEDIUM`, `SMALL`, `color`, `speed`, `direction` | `await mug.rpc.talPrintText({ text: '你好', color: '#00ff00' })` |
| `talGetDisplayOnOff()` | Read the current switch status of the screen | None | `mug.rpc.talGetDisplayOnOff()` |
| `talSetDisplayOnOff()` | Turning on or off the device screen | `onoff: boolean` | `mug.rpc.talSetDisplayOnOff({ onoff: true })` |
| `talGetWaterTemperature()` | Read current water temperature | None | `mug.rpc.talGetWaterTemperature()` |
| `talGetWifiInfo()` | Read the device 's current Wi-Fi connection information | None | `mug.rpc.talGetWifiInfo()` |
| `talGetBatteryLevel()` | Read the device 's current capacity | None | `mug.rpc.talGetBatteryLevel()` |
| `talGetBrightness()` | Read the current brightness of the screen | None | `mug.rpc.talGetBrightness()` |
| `talSetBrightness()` | Set the brightness of the screen | `percent: number` | `mug.rpc.talSetBrightness({ percent: 60 })` |
| `talPlayGif()` | Play GIF on device screen | `gifContent` | `mug.rpc.talPlayGif({ gifContent })` |
| `talPlaySyncGif()` | Sync GIF by the given time stamp and position | `gifContent`, `TimeStamp`, `xoff`, `yoff` | `mug.rpc.talPlaySyncGif({ gifContent, TimeStamp: Date.now(), xoff: 0, yoff: 0 })` |
| `talSetLocalTimeSyncEnabled()` | Configure Device Local Time Synchronization and Master Device Roles | `isMaster: boolean`, `isEnable: boolean` | `mug.rpc.talSetLocalTimeSyncEnabled({ isMaster: true, isEnable: true })` |

Bot applies `mug.rpc`, which is the normal example of a registered device, so that Bot SDK can determine the corresponding slot. The `parseNotify()` on the device example is used to interpret the device notification, see [Device notification and multiple devices route](./device-events); `setBot()` is called by Bot SDK at the time the device is registered and the application does not normally require direct use.
