# Bot SDK 接口索引

本页用于快速查找 Bot 开发中常用的公开接口和业务字段。建议先完成[第一个 Bot](./quick-start)，再按具体场景查看对应章节。

```js
import {
  BubbleBot,
  InlineKeyboard,
  prepareImage,
} from '@jeejio-bubble/bot/sdk';
```

这里不列出 API 客户端、轮询器、队列、原始更新结构和 SDK 内部辅助方法。WebApp 与 Bot 通信的接口见 [WebApp SDK 接口索引](/webapp/reference)。

## 创建和运行 Bot

```js
const bot = new BubbleBot(token, { apiBaseUrl });

bot.on('message:text', async (ctx) => {
  await ctx.replyText(`收到：${ctx.message.text}`);
});

await bot.start();
```

| 接口 | 用途 |
| --- | --- |
| `new BubbleBot(token, options)` | 创建 Bot 实例 |
| `bot.use(middleware)` | 注册对所有事件生效的公共中间件 |
| `bot.on(event, ...handlers)` | 注册事件处理器 |
| `bot.start(options)` | 同步设备声明并开始接收消息和设备更新 |
| `bot.stop()` | 停止 Bot |
| `bot.setCommands(commands)` | 保存冒泡 App 中显示的命令菜单 |

构造 Bot 时最常用的选项是 `apiBaseUrl`、`group_policy` 和 `debug`。纯聊天 Bot 可以使用 `start({ device: false })` 关闭设备更新接收。运行方式见[运行框架](./runtime)，命令菜单和群聊策略见[命令与群聊](./commands-and-groups)。

## 事件和处理上下文

每次更新都会转换成一个 `ctx`。业务代码通常只需要以下字段：

| 字段 | 含义 |
| --- | --- |
| `ctx.event` | 当前事件名称 |
| `ctx.chat` | 当前对话；常用 `id`、`type` 和 `language` |
| `ctx.from` | 当前发送者；常用 `id`、`name` 和 `language` |
| `ctx.message` | 当前消息，具体内容随消息事件变化 |
| `ctx.callback.value` | 用户点击消息内按钮时携带的业务值 |
| `ctx.error` | `error` 或设备调用失败事件中的错误 |
| `ctx.tal.notify` | 设备主动上报的通知，交给设备实例的 `parseNotify()` 解析 |
| `ctx.deviceCall` | 异步设备调用任务及其完成结果 |

这些字段只在对应事件中出现。例如，按钮事件不包含普通消息正文，设备通知也不应读取 `ctx.message`。事件处理和 `next()` 的行为见[上下文与事件](./events)。

### 常用事件

| 事件 | 何时触发 | 主要读取位置 |
| --- | --- | --- |
| `message` | 收到任意对话消息 | `ctx.message` |
| `message:text` | 收到文字消息 | `ctx.message.text` |
| `message:markdown` | 收到 Markdown 消息 | `ctx.message.markdown` |
| `message:image` | 收到图片 | `ctx.message.image` |
| `message:voice` | 收到语音 | `ctx.message.voice` |
| `message:video` | 收到视频 | `ctx.message.video` |
| `message:gif` | 收到 GIF | `ctx.message.gif` |
| `message:reply` | 用户引用一条消息后回复 | `ctx.message.reply` |
| `message:bind_device` | 当前对话的设备关联发生变化 | `ctx.message.attachedDevices` |
| `callback` | 用户点击回调按钮 | `ctx.callback.value` |
| `contact_added` | 用户把 Bot 添加为联系人 | `ctx.chat`、`ctx.from` |
| `joined_group` | Bot 被加入群聊 | `ctx.chat`、`ctx.from` |
| `device_notify` | 设备主动上报通知 | `ctx.tal.notify` |
| `device_call:sent` | 异步设备调用已受理 | `ctx.deviceCall` |
| `device_call:response` | 异步设备调用成功返回 | `ctx.deviceCall.result` |
| `device_call:error` | 异步设备调用返回失败 | `ctx.error` |
| `device_call:timeout` | 异步设备调用等待超时 | `ctx.error` |
| `error` | SDK 把运行期间的异常交给应用处理 | `ctx.error` |

媒体消息的常用文件位置见[媒体与文件](./media)。设备事件见[设备调用与结果](./device-rpc)和[设备通知与多设备路由](./device-events)。

## 发送和回复消息

处理器中的发送接口会沿用当前 `chat` 和 `from`：

| Context 接口 | 用途 |
| --- | --- |
| `ctx.sendText(text, options)` | 发送文字消息 |
| `ctx.replyText(text, options)` | 引用当前消息并回复文字 |
| `ctx.sendMarkdown(markdown, options)` | 发送 Markdown 消息 |
| `ctx.sendKeyboard(markdown, keyboard, options)` | 发送带消息内按钮的 Markdown 消息 |
| `ctx.sendImage(image, options)` | 发送图片 |
| `ctx.sendVoice(voice, options)` | 发送语音 |
| `ctx.sendVideo(video, options)` | 发送视频及封面 |
| `ctx.sendGif(gif, options)` | 发送 GIF |
| `ctx.sendBindDevice(options)` | 发送设备关联引导卡片 |

群聊中可以通过 `mentionOnly` 控制是否只定向回复发起者，通过 `at` 指定需要提醒的用户。消息内容和媒体对象的写法见[发送和回复消息](./messages)与[媒体与文件](./media)。

## 消息内按钮

```js
const keyboard = new InlineKeyboard()
  .text('查看状态', 'status')
  .row()
  .url('打开网站', 'https://pixelmug.com/');

await ctx.sendKeyboard('**请选择操作**', keyboard);
```

| 接口 | 用途 |
| --- | --- |
| `new InlineKeyboard()` | 创建消息内键盘 |
| `keyboard.text(title, value)` | 添加回调按钮；点击后通过 `callback` 事件收到 `value` |
| `keyboard.url(title, url)` | 添加打开网页的链接按钮 |
| `keyboard.row()` | 结束当前按钮行，下一枚按钮从新行开始 |

完整用法见[消息内按钮](./inline-keyboard)。

## 文件和设备图片

| 接口 | 用途 |
| --- | --- |
| `bot.inputFile(localPath, options)` | 上传本地文件，返回可用于消息发送的文件对象 |
| `prepareImage(bot, params)` | 下载图片、转换为 PixelMug 使用的 RGB565 内容并上传 |

`inputFile()` 返回结果中常用的是 `name`、`url`、`size` 和 `mimeType`。`prepareImage()` 的 `params` 使用图片 `url`，可以指定 `width`、`height` 和 `fileName`；返回可直接传给设备图片 RPC 的 `{ type, size, url }`。聊天媒体见[媒体与文件](./media)，设备内容对象见[使用设备 RPC SDK](./device-sdk#rpc-参数中的内容对象)。

## 声明和关联设备

设备 RPC SDK 中创建的实例描述一个 slot 所需的设备能力，并不代表新建或连接了一台实体设备。

| 接口或属性 | 用途 |
| --- | --- |
| `bot.registerDevices(devices)` | 按数组顺序声明全部设备 slot；数组位置从 slot 1 开始 |
| `device.name` | 设置关联界面中显示的 slot 名称 |
| `device.compatible` | 声明该 slot 还允许关联的兼容设备类型 |
| `bot.syncDeviceSlots()` | 运行期间修改声明后，立即把最新 slot 列表同步到云端 |
| `ctx.sendBindDevice(options)` | 引导用户为当前对话关联设备 |
| `bot.isDeviceBound(ctx, device)` | 判断指定设备 slot 是否已经关联 |
| `bot.getBoundDevices(ctx)` | 获取当前对话已经关联的设备 |

`registerDevices()` 每次设置完整的声明列表；再次调用会替换此前的列表。`getBoundDevices()` 只返回已关联项，业务通常关注以下字段：

| 字段 | 含义 |
| --- | --- |
| `slot` | Bot 中的逻辑设备位置 |
| `deviceId` | 用户实际关联的设备 ID |
| `name` | 设备名称 |
| `online` | 设备在线状态；未提供状态时为 `undefined` |

设备类型兼容、多个 slot 和关联流程见[设备声明与关联](./devices)。

## 构造和调用设备 RPC

设备实例的 `rpc` 用于构造 RPC，再由 Bot 发送到该实例对应的 slot：

```js
const rpc = await mug.rpc.talPrintText({ text: '你好' });
await ctx.callDeviceAsync(mug, rpc);
```

| 接口 | 用途 |
| --- | --- |
| `device.rpc.<method>(params)` | 按设备 RPC SDK 的定义构造一条 RPC |
| `ctx.callDeviceAsync(device, rpc, options)` | 在当前对话中提交异步设备调用 |
| `bot.callDeviceAsync(chat, device, rpc, options)` | 指定对话并提交异步设备调用 |
| `bot.callDevice(chat, device, rpc, options)` | 等待设备返回结果后再继续 |
| `device.parseNotify(ctx.tal.notify)` | 把设备通知解析成业务可用的事件列表 |

设备操作通常优先使用 `callDeviceAsync()`，避免等待设备返回时占用当前消息处理链。异步任务和完成事件中常用的字段是：

| 字段 | 含义 |
| --- | --- |
| `ctx.deviceCall.traceId` | 本次调用的跟踪 ID |
| `ctx.deviceCall.slot` | 目标 slot |
| `ctx.deviceCall.rpc.method` | 调用的设备 RPC 方法 |
| `ctx.deviceCall.result` | `device_call:response` 中的设备返回结果 |
| `ctx.error` | `device_call:error` 或 `device_call:timeout` 中的错误 |

必须立即使用设备结果时，可以等待 `callDevice()`，并从返回值的 `response.tal.result` 读取 RPC 结果。两种调用方式、错误处理和超时语义见[设备调用与结果](./device-rpc)。各型号可以构造的 RPC 见[使用设备 RPC SDK](./device-sdk)。

## 设备调用错误

以下导出用于区分开发者需要处理的常见设备调用结果：

| 导出 | 用途 |
| --- | --- |
| `isNeedBindDeviceError(error)` | 判断调用失败是否由当前对话尚未关联设备引起 |
| `BubbleTimeoutError` | 等待式设备调用没有在设定时间内返回 |
| `DeviceRpcError` | 设备已经返回失败结果 |

错误对象的处理示例见[设备调用与结果](./device-rpc#在哪里处理错误)。

## 国际化字段

Bot 不自动翻译业务文案。处理消息时通常读取 `ctx.chat.language` 或 `ctx.from.language`，选择应用自己的文案；命令菜单使用 `descTranslations` 提供多语言说明。详见[国际化](./internationalization)。
