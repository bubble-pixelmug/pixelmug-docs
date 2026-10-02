# 01 Interact with PixelMug through chat

To Bot, "Hello," PixelMug, "Hello," "Bot," and then "Cup: Hello." This example... [Quick Understanding](/en/overview/) In the middle of this, "chat hoo Bot hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo hoo.

This example supports the PixelMug P1 and S1 series.

Item location: `getting-started/01-chat`. The application logic is all in `bot/index.js`; no WebApp is available and MPY is not required in this example.

## I. Run the example in Studio

### 1. Login and Select Application

Open Studio, log in with a bubble account number. Use the PixelMug account number to confirm that it can be seen in "My Device" and in "Online".

Click on the left " Select Application " , click on " Open Application Directory " , and select `getting-started/01-chat` folders. Here you want to select the whole `01-chat` and not only `bot` folders or `index.js` files.

After selection, a `01-chat` file tree appears under the left " Choose Application " . Even if the page has jumped to " Debug Run " , you can click " Select Application " to check " Run Configuration " .

### 2. Configure Application

Confirm the following in the Selection Application Quest Configuration:

| Configure Item | Where to fill this, for example |
| --- | --- |
| Bot entrance | `bot/index.js`, usually automatically identified |
| Bot token | Fill in the Bot token you've applied for. |
| Auto-run device code after startup | This example is not `mpy/` and does not need to be opened |

This example does not have `webapp/`, and therefore the WebApp access address is not selected. Bot token is passed from Studio to Bot without writing the example source; the current configuration is saved only in the Studio process and needs to be reconfigured once the Studio is completely out. The same token only runs one Bot instance for testing.

### 3. Start Smart

Go to Debug Run and see the Current Status card. If the tip is not checked, return to the Select Application configuration with a red hint; click " Start Smart " when the configuration is correct.

Click to enter the "Advance Smart, Use and Test" card, the following description being updated with the startup process. Wait until Bot starts running and then interacts with Bubble App; if Bot starts, you can see the error in the "Application Runbook" Bot log.

This is a computer-based Bot application. The glass is then given through a solid TAL interface to display commands without having to upload the code to the mug.

### 4. Your PixelMug.

Opens this Bot private chat in Bubble App and sends `/help` for example.

Then click `/bindPixelMug` on the command menu. Bot will make a binding request to select your device at the requested PixelMug entrance.

You can also find Associated Device 1, click " Select and Associated Devices" in Studio 'Debug Run Linking Devices', and select one of the matching devices. Studio will use this location to declare TALID and compatible TALID filtering devices. Select one of the two associated entry points.

There are two different levels of relationships:

- "My Device" means this glass already belongs to your bubble account.
- "Conjunction with an intelligent body" means this Bot can control this device.

This is the soft and hardware decoupling: device supply capacity, Bot definition of use, and the two collaborate by connecting and integrating. It is similar to using different software for the same device, but Bot actually operates on a computer or server, working with PixelMug via the network, and does not need to be installed inside a glass. So, the mug appears in “My Device” and is not the same as Bot is now connected to it.

### 5. Say one word, watch the mug and respond.

When associated, send normal text to Bot, for example `你好`.

You should have seen the mug display this text in green and received a reply from Bot:

```text
Got it.: Hello.
```

Try your own name or a short message. The whole process is: You send a message, Bot reads text and calls the device, the mug execution, Bot answers.

Bot sends a binding request first if the device has failed or is timed out. If the device has failed, Bot answers " Shows failure: ..." and the reason for the error. You can first confirm the mug online, then combine the Bot log check with Studio.

## II. Change one line and try again

Expand `01-chat → bot` on the left side of Studio, click `index.js`. Find this line:

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
```

For green `#00ff00` read orange `#ff8800`:

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#ff8800', speed: 80 });
```

Click on the editor 's "Save" or press `Ctrl + S` (macOS for `⌘ + S`). Return to " Debug Run" and click "Reboot Smart " , wait for Bot to rerun and then send a sentence. The text on the mug should be orange.

Saves updates the machine file and restarts it to get Bot to load the new code. The code for this example runs on a computer, so this change does not have to upload MPY to the mug.

You can also change the `ctx.sendText` cup received to your own response, save, restart, and send messages to verify. This is the development process that will be followed in the next few examples.

## III. Understand the source code

Go back to `bot/index.js`. It does five things from top to bottom: import SDK, create Boot and Device Declaration, register messages, set command menus, start Bot. Read in this order.

### What do the Bot SDK and device RPC SDK do?

```js
import { BubbleBot } from '@jeejio-bubble/bot/sdk';
import PixelMug from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

The two entrances come from the same npm package, but with different duties:

| Import | Duties in this instance |
| --- | --- |
| `BubbleBot` | Connect Bubble services, process messages, set commands, find associated devices, send Device RPC |
| `PixelMug` | Description of PixelMug 's device interface and provision of method for organizing device instructions |

This is the `/ext` entrance to SDK because this example requires an extension-aided method like `talPrintText`. It converts text to data that the device displays, so that applications only provide text and colour.

Corresponding to the concept of "quick-understanding": Bot SDK helps you to develop application logic, device SDK helps you to use the device defined by TAL.

### Create a Bot: where does the token come from?

```js
const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
});
```

`new BubbleBot(...)` Creates the Bot instance. `process.env` is the entry for Node.js to read environment variables; when the Studio starts the program, token and optional API addresses are sent in.

So the same code can run with the Bot identity you configured in Studio without writing token in the file.

### Declare a device slot and compatibility

```js
const mug = new PixelMug();
mug.compatible = ['PixelMugS1'];
bot.registerDevices([mug]);
```

`mug` is a device statement required for application: it relies on `PixelMug` this set of interfaces. At this time, no specific mug serial number is specified and no mug is connected.

`registerDevices([mug])` Declares the position of a device as **slot**. This example has only one device statement, so Studio will display a “associated device” card. On booting, SDK will declare to the service sync device that the user will subsequently associate with the actual device.

`compatible = ['PixelMugS1']` indicates that this position also accepts TALID as `PixelMugS1` device. This is therefore used for the P1 and S1 series, which use the display capability that both support.

This corresponds to the role of TALID in "Quick Awareness": applications rely on a pool of interfaces, and users select the actual hardware.** Declaration compatibility does not automatically complete interfaces**; only when the capabilities used for applications are actually compatible should another TALID be added to the list.

### Receive messages: what is `ctx`?

```js
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  // Processing commands, Check Association, Caller Equipment, Reply Message
});
```

`bot.on('message:text', ...)` Registers a text message processing function. Bot, upon receipt of text messages, calls this function and places the context of this message in `ctx`.

| Contents used in the present case | Meaning |
| --- | --- |
| `ctx.message.text` | Text sent by user |
| `ctx.chat` | Current session to call the associated device in the corresponding session |
| `ctx.sendText(...)` | Reply text to the interactive session |
| `ctx.sendBindDevice(...)` | Request for issuance of associated device |

`.trim()` removes the blanks at both ends of the text. `async` and `await` allow the code to wait in order for the network request or the device to be completed, for example, waiting for the device to be called and then responding to the user.

### Bot commands: register a menu and handle messages

At the end of the file, set the command menu and start the Bot:

```js
await bot.setCommands([
  { command: 'help', description: 'Understand this. Bot Usage methods' },
  { command: 'bindPixelMug', description: 'It's about you. PixelMug' },
]);
await bot.start();
```

`setCommands` Compamand and description register used in Bubble App. `help`No, I don't. `/`;user clicks on command or manually enters, this example is received and judged `/help`.

The command menu will not perform the logic of your processing. Therefore, the message function will need a corresponding judgement:

```js
if (text === '/help') {
  await ctx.sendText('It's the simplest. PixelMug Bot: Send text, Bot Will let PixelMug Show it..\n\nUse /bindPixelMug Associated equipment.');
  return;
}

if (text === '/bindPixelMug') {
  await ctx.sendBindDevice({
    content: 'Select the one to associate with PixelMug.',
    actionButtonTitle: 'Association PixelMug',
  });
  return;
}
```

`return` closes this message so that the command text is not sent back to the cup. The command judgement is placed before the device link check, so that users who have not yet done so can also view the help and initiate the connection.

`bot.start()` is used to really start the message and device for Bot. This example only deals with two clear commands above, and other non-empty text is used to display the mug.

### Associate a device: match a physical mug to the slot

```js
if (!(await bot.isDeviceBound(ctx, mug))) {
  await ctx.sendBindDevice({ content: 'I'll contact you first. PixelMug, One more word..' });
  return;
}
```

`isDeviceBound(ctx, mug)` Checks if the device in this interaction is connected. If not, make a binding request and end the current processing, and send text after the user has completed the connection.

Note that `sendBindDevice` is the start of a connection process, which ultimately requires the user to select the device; `isDeviceBound` checks the connection and does not guarantee that the device is on-line at this time. The actual call back may still fail.

Thus, the code always uses the same `mug` statement, which determines the specific device by the session and the binding relationship, and does not need to include your glass ID in the example.

### Call an RPC: build the request and wait for the result

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
await bot.callDevice(ctx.chat, mug, rpc);
```

These two lines have different tasks:

1. `talPrintText` The display data required to convert the text to the device constructs the RPC command. `color` The specified colour, `speed` sets the speed parameters for the display command. This step has not yet reached the actual glass.
2. `callDevice` Sends this RPC according to the current session and device location and waits for the device to respond. Bottom communications are handled by SDK and the platform.

This is the remote method of calling in "Quick Understanding": Bot runs on a computer, showing the action on the mug. `mug.rpc` provides a way to describe the action, `bot.callDevice` is responsible for initiating the remote call.

### Reply from the Bot and handle failures

```js
try {
  const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
  await bot.callDevice(ctx.chat, mug, rpc);
  await ctx.sendText(`Got it.: ${text}`);
} catch (error) {
  await ctx.sendText(`Show Failed: ${error.message}`);
}
```

When the call is successful, `sendText` returns the result to the chat; when there is a conversion error, the device is called wrong or timed out, enter `catch` to inform the user of the reason for the failure. This is the result of the device's call, which does not mean that the entire text on the screen must be played before the answer.

The global error processing in the file also includes errors reported by SDK in the log:

```js
bot.on('error', (ctx) => console.error(ctx.error.message));
```

When using Studio start, you can view these outputs in the Bot log.

## Next: Interact with PixelMug via WebApp

You have completed the complete process of selecting applications, configuration, start-up, associated devices, and editing to save and restart, and can also find the location of message processing, device declaration and RPC call from the source code.

Continues to read [02 Interact with PixelMug through WebApp](/en/getting-started/02-pixel-text). It follows these bases and adds `webapp/`: Users open text controllers in Bubble App, setting text, font, colour and scroll effects, and WebApp gets associated devices and calls them directly. The Academy focuses on explaining WebApp access addresses, `getDevices()`, `talPrintText()` and `callDevice()`, without repeating the underlying actions of this section.
