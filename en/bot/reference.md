# Bot SDK interface index

This page is used to quickly find the public interface and business fields that are commonly used in the Bot development. It is recommended to complete [First Bot](./quick-start) and then view the corresponding chapter by specific scene.

```js
import {
  BubbleBot,
  InlineKeyboard,
  prepareImage,
} from '@jeejio-bubble/bot/sdk';
```

This list does not list the API client, the Query, the original update structure and the SDK internal support method. See [WebApp SDK interface index](/en/webapp/reference) for the WebApp interface with Bot.

## Create and run Bot

```js
const bot = new BubbleBot(token, { apiBaseUrl });

bot.on('message:text', async (ctx) => {
  await ctx.replyText(`Copy that.: ${ctx.message.text}`);
});

await bot.start();
```

| Interface | Purpose |
| --- | --- |
| `new BubbleBot(token, options)` | Create Bot instance |
| `bot.use(middleware)` | Registration of public middleware in effect for all events |
| `bot.on(event, ...handlers)` | Registered Event Processor |
| `bot.start(options)` | Sync device declarations and start receiving messages and device updates |
| `bot.stop()` | Stop Bot |
| `bot.setCommands(commands)` | Save command menu displayed in Bubble App |

The most commonly used options for building Bot are `apiBaseUrl`, `group_policy` and `debug`. A simple chat can be used to update the receiver with `start({ device: false })`. The mode of running is [Run Frame](./runtime), and the command menu and grouping policy is [Command to talk to the group.](./commands-and-groups).

## Event and Context

Each update is converted to a `ctx`. The business code usually requires the following fields:

| Fields | Meaning |
| --- | --- |
| `ctx.event` | Current Event Name |
| `ctx.chat` | Current chat; commonly used `id`, `type` and `language` |
| `ctx.from` | Current senders; common `id`, `name` and `language` |
| `ctx.message` | Current message, specifics as the news event changes |
| `ctx.callback.value` | Business values carried by users when clicking on inside messages |
| `ctx.error` | `error` or error in the device call failure |
| `ctx.tal.notify` | Notification of the device to be voluntarily reported to the `parseNotify()` resolution of the device |
| `ctx.deviceCall` | The mission of the walker device and its completion |

These fields only appear in the corresponding events. For example, buttons do not contain the normal message text, and device notification should not be read `ctx.message`.event handles and `next()` I'll see what you've done.[I'm going to have to go to the hospital.](./events).

### Common Events

| Events | When does it trigger? | Organisation |
| --- | --- | --- |
| `message` | I've received any information about the conversation. | `ctx.message` |
| `message:text` | Message received | `ctx.message.text` |
| `message:markdown` | Copy, Markdown. | `ctx.message.markdown` |
| `message:image` | Copy that. | `ctx.message.image` |
| `message:voice` | Copy that. | `ctx.message.voice` |
| `message:video` | We got the video. | `ctx.message.video` |
| `message:gif` | Copy that, GIF. | `ctx.message.gif` |
| `message:reply` | Reply after user quotes a message | `ctx.message.reply` |
| `message:bind_device` | Changes in the device association of the current chat | `ctx.message.attachedDevices` |
| `callback` | User Click Back button | `ctx.callback.value` |
| `contact_added` | User Add Boot as Contact | `ctx.chat`, `ctx.from` |
| `joined_group` | Bot was added to the group. | `ctx.chat`, `ctx.from` |
| `device_notify` | Proactive notification of device | `ctx.tal.notify` |
| `device_call:sent` | The call for the walker device is accepted | `ctx.deviceCall` |
| `device_call:response` | The walker device called back successfully | `ctx.deviceCall.result` |
| `device_call:error` | Moving device callback failed | `ctx.error` |
| `device_call:timeout` | The stept device is called for timeout | `ctx.error` |
| `error` | SDK Hand over anomalies during running to application | `ctx.error` |

See the location of the usual file for media message.[Media and documentation](./media)I'll see you at Deviceevent.[Data call and results](./device-rpc)and[I'm sorry, but I'm sorry, but I'm sorry.](./device-events).

## Send and Reply Messages

The sending interface in the handler will follow the current `chat` and `from`:

| Context interface | Purpose |
| --- | --- |
| `ctx.sendText(text, options)` | Can not open message |
| `ctx.replyText(text, options)` | Quote Current Message and Reply Text |
| `ctx.sendMarkdown(markdown, options)` | Send Markdown Message |
| `ctx.sendKeyboard(markdown, keyboard, options)` | Send Markdown message with message buttons |
| `ctx.sendImage(image, options)` | Send Picture |
| `ctx.sendVoice(voice, options)` | Send voice |
| `ctx.sendVideo(video, options)` | Send video and cover |
| `ctx.sendGif(gif, options)` | Send GIF |
| `ctx.sendBindDevice(options)` | Send Device Link Guide Card |

I can get it in the group chat. `mentionOnly` Controls whether or not only directed response sponsors, by `at` Specifies the user that needs to be warned. Message content and media object writing is available[Send and reply message](./messages)with[Media and documentation](./media).

## Inline keyboard

```js
const keyboard = new InlineKeyboard()
  .text('View Status', 'status')
  .row()
  .url('Open site', 'https://pixelmug.com/');

await ctx.sendKeyboard('**Select Operation**', keyboard);
```

| Interface | Purpose |
| --- | --- |
| `new InlineKeyboard()` | Create Message Keyboard |
| `keyboard.text(title, value)` | Add the echo button; click to receive `callback` by `value` event |
| `keyboard.url(title, url)` | Add Link button to open web page |
| `keyboard.row()` | End the current button line, next button starts with the new line |

For full use, see [Message button](./inline-keyboard).

## Pictures of documents and device

| Interface | Purpose |
| --- | --- |
| `bot.inputFile(localPath, options)` | Upload local files, return the objects that can be used to send messages |
| `prepareImage(bot, params)` | Download pictures, convert to the RGB565 used by PixelMug and upload |

`inputFile()` What is common in the return result `name`, `url`, `size` and `mimeType`.`prepareImage()` It's... `params` Use pictures `url`, you can specify `width`, `height` and `fileName`;returning to a direct pass to a decvice picture RPC `{ type, size, url }`. See you in the chat media.[Media and documentation](./media)I'll see you at the device.[Use device RPC SDK](./device-sdk#rpc-参数中的内容对象).

## Declarations and associated device

The example created in the data RPPC SDK describes the device capacity required for a slot, and does not mean that a physical device has been created or connected.

| Interface or Properties | Purpose |
| --- | --- |
| `bot.registerDevices(devices)` | Declares all devices in array order; array position starts with slot 1 |
| `device.name` | Set the slot name displayed in the associated interface |
| `device.compatible` | Declares that the slot also allows associated compatible device types |
| `bot.syncDeviceSlots()` | Syncs the latest slot list to the cloud as soon as the declaration is modified during run-up |
| `ctx.sendBindDevice(options)` | Guide users to the current chat connection device |
| `bot.isDeviceBound(ctx, device)` | Judge whether the specified device slot is associated |
| `bot.getBoundDevices(ctx)` | Getting devices associated with the current chat |

`registerDevices()` sets a full list of statements each time; a call again replaces the previous list. `getBoundDevices()` returns only associated items, and business usually focuses on the following fields:

| Fields | Meaning |
| --- | --- |
| `slot` | Logic Device Position in Bot |
| `deviceId` | Device ID of the user actually associated |
| `name` | Device Name |
| `online` | device online; `undefined` when not provided |

For device type compatibility, multiple slots and associated processes see [Device declaration and association](./devices).

## Construct and Call Device RPC

The `rpc` device example is used to construct the RPC and sent by Bot to the slot of the example:

```js
const rpc = await mug.rpc.talPrintText({ text: 'Hello.' });
await ctx.callDeviceAsync(mug, rpc);
```

| Interface | Purpose |
| --- | --- |
| `device.rpc.<method>(params)` | Construct a RPC by the definition of device RPC SDK |
| `ctx.callDeviceAsync(device, rpc, options)` | Submit a walker call during the current chat |
| `bot.callDeviceAsync(chat, device, rpc, options)` | Specify chat and submit a walker to call |
| `bot.callDevice(chat, device, rpc, options)` | Wait until the device returns |
| `device.parseNotify(ctx.tal.notify)` | Parsing device notifications to a list of available events |

The device operation usually gives preference to `callDeviceAsync()`, avoiding the use of the current message-processing chain while waiting for the device to return.

| Fields | Meaning |
| --- | --- |
| `ctx.deviceCall.traceId` | Track ID for this call |
| `ctx.deviceCall.slot` | Target slot |
| `ctx.deviceCall.rpc.method` | Called device RPC Method |
| `ctx.deviceCall.result` | Return results of device in `device_call:response` |
| `ctx.error` | Error in `device_call:error` or `device_call:timeout` |

You can wait if you need to use the device results immediately. `callDevice()`, from return value `response.tal.result` Reads the RPC results. Two calls, error processing and timeout syntax[Data call and results](./device-rpc). The RPCs that can be constructed[Use device RPC SDK](./device-sdk).

## Device Call Error

The following results are exported to distinguish between common devices that developers need to process:

| Export | Purpose |
| --- | --- |
| `isNeedBindDeviceError(error)` | Determines whether the call failure is caused by a device that is not associated with the current chat |
| `BubbleTimeoutError` | Waiting device call did not return within the set time |
| `DeviceRpcError` | Device returned failed result |

An example of the treatment of the wrong object can be found at [Device Call and Result](./device-rpc#在哪里处理错误).

## Internationalized field

Bot does not translate business cases automatically. The message is usually handled by reading `ctx.chat.language` or `ctx.from.language`, choosing to apply its own file; the command menu provides multilingual descriptions using `descTranslations`. See [Internationalization](./internationalization) for more details.
