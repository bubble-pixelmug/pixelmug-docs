# 02 Interact with PixelMug through WebApp

In [First example](/en/getting-started/01-chat), you send Bot text, Bot allows the mug to display text. This time we replace the input with a page: Enter text, select font and colour, adjust the scroll effect, and click the button to send to PixelMug.

The chat is a good way to express intent, and the page is a good way to combine multiple options and re-engineer the parameters.** WebApp is the web application that was opened in Bubble App**, which gives the same Bot a much more interactive interface.

This example supports the PixelMug P1 and S1 series, does not need MPY and does not use BLE. Project location:`getting-started/02-pixel-text`.

## I. Run the example in Studio

The same method is used to select applications, fill in tokens, and associated devices as in the first. Here you focus on the new WebApp configuration and operation.

### 1. Selecting and Configure Access Addresses

If the previous example is still running, stop the agent and select the entire `getting-started/02-pixel-text` folder.

Confirm in Select Application Run Configuration:

| Configure Item | What kind of settings? |
| --- | --- |
| Bot entrance | `bot/index.js` |
| Bot token | Fill in your Bot token; you can follow the first Bot, stop the old example first. |
| WebApp Access Address | Select the LAN IP that your mobile phone can access, or use the default `pixelmug-studio.local` |

This example contains `webapp/` so Studio will show WebApp access options.

** The Bubble App on the phone requires access to the computer's web service. ** Please place the computer that runs Studio, the mobile phone that runs Bubble App and PixelMug in the same local area network. If the mobile phone cannot parse `pixelmug-studio.local`, you can switch to LAN IP; changes in the running address need to stop the agent.

### 2. Start, connect and open the page

Click "Start Smart" to wait for Bot and WebApp services to start. Open Bot private chat in Bubble App:

1. Send `/help` Look at the introduction.
2. With `/bindPixelMug` associated glass or in the "associated device" of Studio.
3. Send `/webApp`, click " Open the text controller " in your reply.

The page displays " Reading associated devices... " , finds the device and becomes " Ready: Name of the device " , and activates the " Show to PixelMug " button. If the hint does not have the associated device, you finish the connection and then reopen the page.

### 3. Adjust text and display effects

Enter `Hello PixelMug`, click " Show to PixelMug" to observe the mug display. Try again:

- Replace the font with the font " Small " or " Large " from " Medium " .
- Click on the colour block, select another colour.
- Switches the scrolling direction, adjusts the speed and sends it again.
- Closes the scroll display, keeping the text still.

The colour control is the HTML raw colour selection, and the cell phone system determines its panel style.

## II. Change one line and try again

Open `02-pixel-text → webapp → index.html` in the Studio file tree to find:

```html
<input id="color" type="color" value="#00ff00">
```

Replace the default green with orange:

```html
<input id="color" type="color" value="#ff8800">
```

Resumes the agent after saving, closes the old page and opens the text controller by `/webApp`. The default colour should be orange and click Show to PixelMug to verify the effect.

Studio will automatically build WebApp on start-up or restart, and pack the npm that it imports. You do not need to build manually or know which directory the SDK is installed on the computer. After saving the file, the open cell phone page will not be automatically updated and needs to be reopened.

## III. Understand the source code

The project is divided into two parts:

```text
02-pixel-text/
├─ bot/
│  └─ index.js       Registered equipment, Processing commands, Provide page entrances
└─ webapp/
   ├─ index.html    Input Box, Colour Selector, Sliders and Buttons
   ├─ style.css     Page Styles
   └─ main.js       Acquisition of equipment, Read Input, Caller Equipment
```

Bot runs in the Node.js environment on a computer, and the JavaScript of WebApp runs in WebView on a mobile phone Bubble App. Bubble App provides a bridge between the page and the platform.

The division of labour among the three ends in this case is:

| Component | For what? |
| --- | --- |
| Bot | Registering device location, handling help and connection commands, issuing WebApp entrance |
| WebApp | Show controls, read user input, acquire associated devices, launch device RPC |
| PixelMug | Execute solid TAL interfaces, display text |

The first is “Dialogue Bot Business Code Quest Device”; the display of this section is “WebApp Quest Device”.** There is no need to define a set of WebApp and Bot text control protocols, or to write a processing function in Bot to transmit display commands.** The SDK built-in request mechanism is still used when acquiring device, so Bot is kept running during the experience.

### Bot: require an associated device before opening the WebApp

```js
const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});
```

Compared to the first item, add `webAppDeviceAccess` to decide ** before opening WebApp, whether it is necessary to check Bot's device connection (slot) **.

| Configure Values | Open WebApp Conditions |
| --- | --- |
| `'none'` | Do not check whether or not to bind the device is also the default value for SDK |
| `'any'` | Any slot to bind the device, open it |
| `'all'` | All slots complete device binding to open |

This example is set at `'any'` and only one slot is registered, so you need to associate a PixelMug and then open the text controller. It controls the connection check before the page is opened, not the permission given to WebApp to call the device. When the page is open, the associated device is still available at `getDevices()` for subsequent selection and call.

The device declaration, TALID compatible and `registerDevices()` are the same as the first. Here Bot imports the basic device entry `devices/pixelmug` because Bot only needs to declare the device and no more text display instructions.

### Bot: open the WebApp from a link button

```js
if (text === '/webApp') {
  await ctx.sendKeyboard('Open Text controller, Settings PixelMug Text displayed.',
    new InlineKeyboard().url('Open Text controller', process.env.STUDIO_WEBAPP_URL));
}
```

`InlineKeyboard` The button in the creation message, `.url(标题, 地址)` The link button, `ctx.sendKeyboard()` sends the description and the button to the session. After clicking, Bubble App opens the web page.

`STUDIO_WEBAPP_URL` is the environment variable that Studio provides to start the application, including the access to this application. Use it without writing a dead PC IP or page path in Bot Source.

At the end of the document, three commands `bot.setCommands()` are registered `help`, `bindPixelMug`, and `webApp`. The connection between menu registration and message determination is the same as the first; the URL is used directly with the open button here, and no more callback is required.

### WebApp: import the two SDK entry points

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { rpc } from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

| Import | Role |
| --- | --- |
| `BubbleWebApp` | Access to device, call-up device using Bubble App's bridging capacity |
| `rpc` | RPC command to generate PixelMug, including `talPrintText()` shortcut method |

The `rpc` imported here is only a set of methods to generate commands, does not represent a real device and does not register a new connection.

Imports on both ends using the npm package name. Studio packs the code that WebApp uses as a browser loadable file.

### Get associated devices with `getDevices()`

executes when page initialization:

```js
webapp = new BubbleWebApp({ ble: false });
const devices = await webapp.getDevices();
device = devices.find((item) =>
  item.talId === 'PixelMug' ||
  item.talId === 'PixelMugS1' ||
  /pixelmug/i.test(item.name || '')
);
```

`new BubbleWebApp()` Use the bridging capability provided by Bubble App; `ble: false` indicates that BLE management is not enabled in this case.

`getDevices()` Gets information on associated devices in the current session, not all of the devices owned by the account number in Studio "My Device" nor the JavaScript device example in Bot. SDK requests to complete the query by `system.getDevices` , which is embedded, without us writing a different query processing function in Bot.

Example: PixelMug and PixelMugS1 are given priority at `talId`, and the device name matches, and the first eligible device is then selected. This example states only one relevant position; if applications have multiple locations, the target should be selected according to the corresponding `slotId` or interface.

When the device is found, the page saves the object and then sends it to `callDevice()` for subsequent transmission. If it is not found, displays the link hint instead of continuing to call the device.

::: Tip experience in Bubble App
A normal mobile browser can be used to check for web addresses, but does not have a Buble App bridging capability. The complete acquisition device and control process needs to be opened from the Bot link button in Bubble App.
:::

### Build a command with `rpc.talPrintText()`

When clicking " Show to PixelMug " , the page reads the value of the control:

```js
const command = await rpc.talPrintText({
  text: value,
  specifications: fontSize.value,
  color: color.value,
  direction: scroll.checked ? Number(direction.value) : 0,
  speed: Number(speed.value),
});
```

| Parameters | Source and meaning |
| --- | --- |
| `text` | Enter text in the box, remove blanks from both ends and enter |
| `specifications` | Font Options: `SMALL`, `MEDIUM`, `LARGE` |
| `color` | The value of the colour selector, for example `#00ff00` |
| `direction` | `0` Static; `1` Left; `2` Right; `3` Up; `4` Down |
| `speed` | The value of the velocity slider, which is 10 to 200 in this case, is growing and slowing. |

The HTML selection box and slider usually return the string by `.value`, so the direction and speed is converted to a number using `Number()`. The check box returns the selection by `.checked`.

Like the first, `talPrintText()` is responsible for converting text into data needed for the device and generating RPC;** Calling it will not allow the mug to display text**. The difference is that this step is now taking place in WebApp.

### Send a command with `webapp.callDevice()`

```js
await webapp.callDevice(device, command);
```

`device` from `getDevices()` to determine the relevant location; `command` from device SDK to describe the method and parameters to be implemented.

`callDevice()` Starts the device through Bubble App's bridge and waits for a response. The "direct call" here indicates that Bot business code is not required to be forwarded, and does not represent a direct connection to the mug through the local area network or BLE; the bottom device RPC communications are handled by the platform.

You can write these three steps down:

```js
const devices = await webapp.getDevices();      // Associated Device Found
const command = await rpc.talPrintText(params); // Ready. RPC Command
await webapp.callDevice(device, command);       // Launch Remote Call
```

Here `device` is the target selected from `devices`, `params` is the text collected and the parameters displayed on the page.

### Show feedback in the page

During sending, the example disables the button and displays " Sending text... " . The device is shown after a successful call; the `error.message` is displayed on the page when the device fails; the final restoration button allows the user to adjust and try again.

This is the same treatment as `try / catch` on the first page, except that the result is to change from a Bot chat back to a page status text. Call successfully indicates the device's response, without waiting for the whole scrolling text to be played.

## When page cannot be opened or the device does not respond

| phenomena | What do you want to check first? |
| --- | --- |
| Loading always after clicking on links | Studio whether or not to run; whether mobile phones can access the selected IP and port; `.local` Whether to parse |
| The hint is missing `JeeWeb` | Whether to open the Bot link from Bubble App instead of the normal browser |
| Always show reading associated devices | Bot is still running; see whether Bot and WebApp logs of Studio are still running |
| Hint unconnected PixelMug | Finish device association at current session and reopen the page |
| Send failed or timed out | Whether the mug is online and specific errors in the pages and logs |
| Saved Page or Old | Resume the agent after saving, close the old page and open it by `/webApp` |

## Next: add the device end program and BLE

This example is interactive by displaying the TAL interface already provided by the solid. Read [03 Install and run MPY on PixelMug](/en/getting-started/03-ble-play): Use WebApp BLE to interact closely with the PixelMug S1 series by autoloading the device end of the Studio. Selecting the application, configuration, start-up and editing steps continue.
