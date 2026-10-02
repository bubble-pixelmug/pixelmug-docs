# 媒体与文件

发送媒体通常分两步：先得到可访问的文件 URL，再把文件信息交给消息接口。本地路径不能直接当作聊天附件发送，先用 `bot.inputFile()` 上传。

下面的发送片段放在消息或按钮处理器中；素材路径相对于 Bot 进程的工作目录。

## 上传并发送图片

准备一张 1160 × 904 的 `assets/photo.png`：

```js
const image = await bot.inputFile('./assets/photo.png');
await ctx.sendImage({ ...image, width: 1160, height: 904 });
```

上传结果包含 `name`、`url`、`size` 等文件信息。SDK 不会在上传时自动读取图片尺寸，宽高需要与实际素材一致。`sendImage()` 也不会自动生成压缩图或缩略图，当前会把同一文件用于消息中的原图、压缩图和缩略图位置。

文件已经在线时，可以直接使用文件对象，例如：

```js
await ctx.sendImage({
  name: 'photo.png',
  url: 'https://example.com/photo.png',
  size: 26200,
  width: 272,
  height: 272,
});
```

这里的 URL 和元数据是格式示例，请替换为真实资源。`size` 是文件字节数，宽高单位是像素。仅有 URL 的图片也可以传字符串，但完整对象更便于保留素材信息。

## 发送语音

准备一段可播放的 Ogg Opus 语音：

```js
const voice = await bot.inputFile('./assets/voice.ogg');
await ctx.sendVoice(voice, { duration: 1874 });
```

时长按仓库示例以毫秒填写，这里表示约 1.9 秒，实际值应来自你的素材。语音文件对象必须有 `url` 和数值形式的 `size`；只传一个 URL 不满足当前语音接口的校验要求。SDK 不会转码，也不会计算时长。

## 发送视频和 GIF

视频需要视频文件、封面及宽高。先准备好封面，SDK 不会自动从视频截取：

```js
const video = await bot.inputFile('./assets/demo.mp4');
const thumb = await bot.inputFile('./assets/cover.png');
await ctx.sendVideo(video, {
  thumb,
  width: 960,
  height: 720,
  duration: 10000,
});
```

上例对应 960 × 720、约 10 秒的视频。视频和封面都需要 `name` 与 `url`，上传结果已包含这些字段。

GIF 使用独立的消息方法：

```js
const gif = await bot.inputFile('./assets/demo.gif');
await ctx.sendGif({ ...gif, width: 32, height: 16 });
```

这里发送到冒泡对话。让水杯播放图片或 GIF，需要另行调用设备 RPC SDK，两者不会自动联动。

## 接收用户发来的媒体

SDK 已经按消息类型整理字段。以语音为例：

```js
bot.on('message:voice', async (ctx) => {
  const voice = ctx.message.voice;
  await ctx.sendText(`收到语音，时长 ${voice?.duration || 0} 毫秒。`);
  // voice.voice.url 是语音文件地址。
});
```

其他媒体可以从以下位置取文件：

| 事件 | 文件位置 |
| --- | --- |
| `message:image` | `ctx.message.image.original`，也可按需回退到 `compressed` 或 `thumb` |
| `message:voice` | `ctx.message.voice.voice` |
| `message:video` | `ctx.message.video.video`，封面在 `.thumb` |
| `message:gif` | `ctx.message.gif.gifFile` |

SDK 提供文件地址和元数据，不会自动下载附件。业务需要识别或转换时，再下载所需文件；上传、下载或发送失败时，在处理器内捕获错误并告知用户。
