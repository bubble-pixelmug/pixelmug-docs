# Quick Start

The following are the two smallest full examples of how to make a webApp available to developers. In the first example, users open WebApp in chat with Bot, page sends greeting requests to Bot, Bot returns results. In the second example, users send RPC requests directly to the device in WebApp.

## First WebApp: hello bot

### The example has two parts

```text
webapp-hello-bot/
├─ bot/
│  └─ index.js
├─ webapp/
│  ├─ index.html
│  └─ main.js
└─ package.json
```

Bot offers page entry and handles application requests; `webapp/` is the front page displayed in Bubble App. The page needs to be made available via the Bubble App accessable HTTP or HTTPS address.

### The Bot handles requests

```js
import {
  BubbleBot,
  InlineKeyboard,
} from '@jeejio-bubble/bot/sdk';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
});

bot.onWebAppRequest('app.hello', async (ctx) => {
  const name = String(ctx.webAppData.payload?.name || 'Friends.');
  return {
    message: 'Hello., ' + name + '！',
  };
});

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/open') return;

  const keyboard = new InlineKeyboard()
    .url('Open WebApp', process.env.STUDIO_WEBAPP_URL);

  await ctx.sendKeyboard('Click on the button below to open the page.', keyboard);
});

await bot.start({ device: false });
```

The return value of `onWebAppRequest()` will be `result` in the WebApp response. This example does not have a device function, so Bot can turn off the device.

### The WebApp sends requests

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';

const webapp = new BubbleWebApp({ ble: false });

const response = await webapp.request('app.hello', {
  name: 'PixelMug',
});

document.querySelector('#result').textContent =
  response.result.message;
```

`ble: false` indicates that this page does not create a BLE manager. Examples in this group document do not depend on BLE.

`BubbleWebApp` Default `globalThis.JeeWeb`. If the page is not opened in Bubble App, the construction function reports the `JeeWeb` bridge that lacks Bubble App input.

### Run in Studio

Configures the agent after Bot token and API addresses in PixelMug Studio. Studio builds `webapp/` directories and provides the page address to Bot by `STUDIO_WEBAPP_URL`. Sends `/open` from the Bubble App Bot chat.

The certification shall include:

1. Bot sends messages with page links.
2. page opens in Bubble App.
3. WebApp's `app.hello` request to reach Bot.
4. Page shows `response.result.message` returns by Bot.

## Second WebApp: call a device RPC

This example registers a PixelMug S1 slot in Bot, and allows the slot to associate PixelMug P1. When the user completes the device, open WebApp from Bot chat, and directly open or closes the device screen by two buttons on the page.

### Bot: register a device and provide the page entry point

```js
import {
  BubbleBot,
  InlineKeyboard,
} from '@jeejio-bubble/bot/sdk';
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});

const mug = new PixelMugS1();
mug.name = 'Pixels.';
mug.compatible = ['PixelMug'];
bot.registerDevices([mug]);

bot.on('message:text', async (ctx) => {
  const command = ctx.message.text.trim();

  if (command === '/bind') {
    await ctx.sendBindDevice({
      content: 'Please choose one. PixelMug S1 或 PixelMug P1.',
      actionButtonTitle: 'Associated equipment',
    });
    return;
  }

  if (command === '/open') {
    const keyboard = new InlineKeyboard()
      .url('Open Device Control', process.env.STUDIO_WEBAPP_URL);

    await ctx.sendKeyboard('Open WebApp, Control the glass screen.', keyboard);
  }
});

await bot.setCommands([
  { command: 'bind', description: 'Association PixelMug' },
  { command: 'open', description: 'Open Device Control Page' },
]);

await bot.start({ device: false });
```

`webAppDeviceAccess: 'any'` indicates that the user can only open WebApp if at least one Bot-defined device is associated. This is PixelMug S1 registered, but `compatible` allows the same slot association PixelMug P1. Compatible devices must provide a common RPC to which the page is to be called; `talSetDisplayOnOff` used in this example is supported by two models.

The data RPC is sent directly to the device by WebApp via Bubble App, without the need for Bot to forward it. This case does not listen to the device event, so it is possible to close Bot's device rotation.

### WebApp: add control buttons

. Two buttons and a status text are placed on the page:

```html
<button id="turn-on" type="button" disabled>Turn on display</button>
<button id="turn-off" type="button" disabled>Turn off display</button>
<p id="status"></p>
```

Starts the page to get the device associated with the current chat, and creates the RPC constructor by PixelMug S1 data SDK. When the device is found, the button is enabled and the constructed RPC is sent to `callDevice()`:

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const webapp = new BubbleWebApp({ ble: false });
const [device] = await webapp.getDevices();
const turnOnButton = document.querySelector('#turn-on');
const turnOffButton = document.querySelector('#turn-off');
const status = document.querySelector('#status');

if (!device) {
  status.textContent = 'Please return. Bot Send /bind, Related Devices First.';
} else {
  turnOnButton.disabled = false;
  turnOffButton.disabled = false;
}

turnOnButton.addEventListener('click', () => setDisplay(true));
turnOffButton.addEventListener('click', () => setDisplay(false));

async function setDisplay(onoff) {
  turnOnButton.disabled = true;
  turnOffButton.disabled = true;
  status.textContent = onoff ? 'Opening screen…' : 'Closing screen…';

  try {
    const rpc = deviceRpc.talSetDisplayOnOff({ onoff });
    await webapp.callDevice(device, rpc);
    status.textContent = onoff ? 'Screen is open.' : 'Screen closed.';
  } catch (error) {
    status.textContent = `Call Failed: ${error.message}`;
  } finally {
    turnOnButton.disabled = false;
    turnOffButton.disabled = false;
  }
}
```

`deviceRpc.talSetDisplayOnOff()` Generates an RPC with `method` and `params` according to the device interface. The business code does not need to be manually filled in a method name. `getDevices()` returns the device that is already associated with the current Bot chat; this example has only one slot and therefore directly uses the first device in the list. `callDevice()` Use the device object `slotId` to locate the associated device and wait for the device to return to the call.

### Run in Studio

1. Opens `examples/webapp-device-rpc` in Studio, configures Bot token and WebApp access addresses.
2. Starts the agent, you do not need to run the device code.
3. Send `/bind` in Bubble App, associated with PixelMug S1 or PixelMug P1.
4. Send `/open` and open WebApp.
5. Click "Turn on Display" or "Turn off Display", to observe the state of the device's screen.
