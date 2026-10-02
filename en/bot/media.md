# Media and files

Sending media usually takes two steps: first to get accessable URLs, and then to send file information to the message interface. Local path cannot be sent directly as chat attachments, uploading first with `bot.inputFile()`.

The following send segment is in the message or button handler; the material path relative to the working directory of the Bot process.

## Upload and send pictures

Prepare a copy of `assets/photo.png` for 1 1160 x 904:

```js
const image = await bot.inputFile('./assets/photo.png');
await ctx.sendImage({ ...image, width: 1160, height: 904 });
```

The upload results contain file information such as `name`, `url`, `size`. SDK does not automatically read image sizes when uploading, and width needs to be consistent with actual material. `sendImage()` does not automatically generate compression or thumbnails, and the same document is currently used for original, compressed and thumbnail positions in messages.

When documents are online, direct access can be made to file objects, such as:

```js
await ctx.sendImage({
  name: 'photo.png',
  url: 'https://example.com/photo.png',
  size: 26200,
  width: 272,
  height: 272,
});
```

URLs and metadata here are examples of formats that are replaced with real resources. `size` is the byte number of files, and the width is pixels. Only images of URLs can also pass strings, but complete objects are easier to keep material information.

## Send voice

Prepare a playable Ogg Opus voice:

```js
const voice = await bot.inputFile('./assets/voice.ogg');
await ctx.sendVoice(voice, { duration: 1874 });
```

The length of the time is written in milliseconds by example of the repository, which means about 1.9 seconds, and the actual value should be from your material. The object of the voice file must be `url` and `size` in the form of a value; only one URL does not meet the verification requirements of the current voice interface. SDK does not code, nor does it calculate the duration.

## Send video and GIF

Video requires video files, cover and width. First, the cover is ready, SDK does not automatically intercept from the video:

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

The previous example corresponds to a video of 960 x 720, or about 10 seconds. Both the video and the cover need `name` and `url`, and the upload results already contain these fields.

GIF uses independent methods of communication:

```js
const gif = await bot.inputFile('./assets/demo.gif');
await ctx.sendGif({ ...gif, width: 32, height: 16 });
```

Send this to bubble conversations. Let the mug play pictures or GIF, which need to be called separately by device RPC SDK, which is not automatically linked.

## Receive media from users

SDK has organized fields by type of message. Take voice as an example:

```js
bot.on('message:voice', async (ctx) => {
  const voice = ctx.message.voice;
  await ctx.sendText(`Copy that., Length ${voice?.duration || 0} milliseconds.`);
  // voice.voice.url It's a voice file address..
});
```

Other media can retrieve documents from:

| Events | File Location |
| --- | --- |
| `message:image` | `ctx.message.image.original`, may also be withdrawn as required to `compressed` or `thumb` |
| `message:voice` | `ctx.message.voice.voice` |
| `message:video` | `ctx.message.video.video`, cover `.thumb` |
| `message:gif` | `ctx.message.gif.gifFile` |

SDK provides file addresses and metadata that do not automatically download attachments. Operations need to recognize or convert to download the required files; and, when uploading, downloading or sending failed, capture errors in the handler and inform the user.
