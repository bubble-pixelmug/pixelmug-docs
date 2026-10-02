# First Bot

Do a simple Bot first: The user sends text, which quotes the original message. This example does not require a device.

## Prepare the runtime

You can use Studio, or you can run Bot in your own Node.js environment. Both ways require the preparation of Bot token and the API address for the environment.

### Use Studio

When the Studio is installed, bubble SDK (`@jeejio-bubble/bot`) is installed, and the example in the Studio directory does not need to be repeated. Select, configure, and start the application, Bot token in the Studio, and the operational steps are [Interactive with PixelMug through chat](/en/getting-started/01-chat).

If the project is located outside the Studio directory, SDK still needs to be installed in the project; Studio does not automatically install dependency when it starts Bot.

### Use your own Node.js environment

Prepare Node.js 18 or more for implementation in the new project directory:

```sh
npm init -y
npm install @jeejio-bubble/bot
```

Use below `index.mjs` As an entry point, you can run directly by Node.js. `index.js`Please be in. `package.json` Medium Settings `"type": "module"`. example code in`examples/bot-tutorial/examples/first-bot`

## Build a Bot that replies

New `index.mjs`:

```js
import { BubbleBot } from '@jeejio-bubble/bot/sdk';

const token = process.env.BOT_TOKEN;
const apiBaseUrl = process.env.BOT_API_BASE_URL;
if (!token || !apiBaseUrl) {
  throw new Error('Please configure BOT_TOKEN 和 BOT_API_BASE_URL');
}

const bot = new BubbleBot(token, { apiBaseUrl });

bot.on('error', (ctx) => {
  console.error('[bot]', ctx.error?.message || ctx.error);
});

bot.on('message:text', async (ctx) => {
  await ctx.replyText(`Copy that.: ${ctx.message.text}`);
});

await bot.start({ device: false });
console.log('Bot Started, Please, in a bubble. App Sending text.');

function shutdown() {
  bot.stop();
  bot.clearQueues();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
```

These steps are completed: creation of Bot, registration error processing, registration text processing, and start a round of inquiries. First you register the handler, then `start()`, you can get the first message into the business code.

`device: false` Closes the devicemmessagepoll, which is suitable for this pure messageexample. `await bot.start()`.

## Run and test

Sets the environment variable read in PowerShell and starts:

```powershell
$env:BOT_TOKEN = 'Replace with yours. Bot token'
node index.mjs
```

This example follows the name of the environmental variable of the Studio example and is read by the entry code and passed to SDK.

Opens this Boot chat at Bubble App to send "Hello." You should get the quote "Receive: Hello." Start with private chats to verify; the group is only processing normal messages marked @Bot. See [Command to talk to the group.](./commands-and-groups) for the same token.

If startup fails, see the terminal error and check the token, API environment and network. When the terminal shows that it has been started but no response, confirm that the chat with Bot has been opened and that the text is sent in plain text.

## Next steps

Replace `replyText()` with `sendText()` to send a new message without reference. Before you add a button or device, you can save this working entry and then add a handler by topic. The code segment of the following page is defaulted on `bot` after it was created and `bot.start()`; the example used to replace the handler does not duplicate the old handler. The import statement applied is placed at the top of the file.
