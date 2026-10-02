# 第一个 Bot

先做一个最简单的 Bot：用户发来文字，它引用原消息回复。这个例子不需要设备。

## 准备运行环境

可以使用 Studio，也可以在自己的 Node.js 环境中运行 Bot。两种方式都需要准备 Bot token 和对应环境的 API 地址。

### 使用 Studio

安装 Studio 时已安装冒泡 SDK（`@jeejio-bubble/bot`），运行 Studio 目录内的示例无需重复安装。在 Studio 中选择应用、配置 Bot token 并启动即可，操作步骤见[通过对话与 PixelMug 交互](/getting-started/01-chat)。

如果项目位于 Studio 目录之外，仍需在项目中安装 SDK；Studio 启动 Bot 时不会自动安装依赖。

### 使用自己的 Node.js 环境

准备 Node.js 18 或更高版本，在新建的项目目录执行：

```sh
npm init -y
npm install @jeejio-bubble/bot
```

下面使用 `index.mjs` 作为入口，可直接由 Node.js 运行。如果使用 `index.js`，请在 `package.json` 中设置 `"type": "module"`。示例代码在`examples/bot-tutorial/examples/first-bot`

## 写一个能回复的 Bot

新建 `index.mjs`：

```js
import { BubbleBot } from '@jeejio-bubble/bot/sdk';

const token = process.env.BOT_TOKEN;
const apiBaseUrl = process.env.BOT_API_BASE_URL;
if (!token || !apiBaseUrl) {
  throw new Error('请配置 BOT_TOKEN 和 BOT_API_BASE_URL');
}

const bot = new BubbleBot(token, { apiBaseUrl });

bot.on('error', (ctx) => {
  console.error('[bot]', ctx.error?.message || ctx.error);
});

bot.on('message:text', async (ctx) => {
  await ctx.replyText(`收到：${ctx.message.text}`);
});

await bot.start({ device: false });
console.log('Bot 已启动，请在冒泡 App 中发送文字。');

function shutdown() {
  bot.stop();
  bot.clearQueues();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
```

这几步分别完成：创建 Bot、注册错误处理、注册文字处理、启动轮询。先注册处理器，再 `start()`，就能让第一条消息也进入业务代码。

`device: false` 关闭设备消息轮询，适合这个纯消息示例。后面加入设备控制时改为 `await bot.start()`。

## 启动并试一试

在 PowerShell 中设置本例读取的环境变量，然后启动：

```powershell
$env:BOT_TOKEN = '替换为你的 Bot token'
node index.mjs
```

本例沿用 Studio 示例的环境变量命名，由入口代码读取后传给 SDK。

在冒泡 App 打开这个 Bot 的私聊，发送“你好”。应收到引用原消息的“收到：你好”。先用私聊验证；群聊默认只处理标记为 @ Bot 的普通消息，见[命令与群聊](./commands-and-groups)。测试时同一个 token 只运行一个 Bot 实例。

若启动失败，先看终端错误并检查 token、API 环境和网络。终端显示已启动但没有回复时，确认打开的是对应 Bot 的对话，且发送的是普通文字。

## 继续扩展

把 `replyText()` 换成 `sendText()`，可以发送一条不带引用的新消息。加入按钮或设备前，先保留这个可以工作的入口，再按专题添加处理器。后续页面的代码片段默认放在 `bot` 创建之后、`bot.start()` 之前；用于替换处理器的例子不要与旧处理器重复注册。应用的导入语句放在文件顶部。
