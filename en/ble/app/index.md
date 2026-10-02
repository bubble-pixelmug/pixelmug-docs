# Connect Bubble App

When using the official Bubble App to connect PixelMug, the developers use `jeejio-bubble` SDK to write WebApp interfaces, using `maopaoBleApp` to write the end of the device MPY. The container in Bubble App has sealed the bottom function of Bluetooth communication between the mobile phone and PixelMug, and the developers need to focus on the application itself without concern for the details of the communication. Note: The normal browser does not have a function for communication with PixelMug, and the page must run in the Bubble App container.

## General framework

```text
Bot: Tie Device, Open WebApp
             ↓
WebApp: BleAppClient
             ↓
Bubble App Primary bridge for container
             ↕ Bluetooth.
PixelMug: The contract., Supervisory authority, Communications
             ↕
MPY Apply: BleAppService → Business recall
```

Bot is responsible only for access and device linkages; business data are transmitted via BLE between the mobile phone and PixelMug without going through Bot. Studio is responsible for starting Bot and deploying MPY. PixelMug provides three BLE services at the bottom:

| Services | Purpose | Whether or not the developer directly handles |
| --- | --- | --- |
| F140 | Frozen Knowledge | Handled internally by Bubble App and hardware |
| F150 | Standard Message Channel | Use via interface `command()`, status, event and configuration |
| F160 | High-speed data channel (Simple) | Used through `sendSimple*()`/ `send_simple*()` |

## From connection to business readiness

1. MPY calls `ble.start()` to initiate service and broadcast in default bubble mode.
2. WebApp Get Bot Assocate Device `device` Later, call `await client.connect(device)`.
3. Bubble App is responsible for the completion of scans, BLE connections and device clearances.
4. WebApp and MPY `BleAppService` execute hello, check application identification and access session, ability and message size limits.
5. `connect()` Upon completion, WebApp sends business data through the application interface; MPY calls `poll()` on an ongoing basis to process requests.

Connection, Accumulation, and Application Sessions are different stages. The device `on_connect()` only means that BLE is connected and the web page should wait for `connect()` to be completed before the business interaction starts. Reconnecting requires re-establishing Accumulation and Application Sessions.


## A full example: ble-minimal

The following is a complete and simple example of a command interface using the Bubble App mode and the standard message channel. The project is at `examples/ble-minimal`:

```text
ble-minimal/
├── bot/index.js         Tie Device, Help, Open WebApp
├── webapp/index.html    Connection, Disconnect, Reconnect, echo Four Buttons
├── webapp/main.js       Call WebApp BLE SDK
├── webapp/style.css     Simple button layout
├── mpy/__main__.py      Receive command and display text on cup
├── mpy/mps.json         Statement MicroPyxel Show component dependencies
├── package.json
└── README.md
```

The components of the project are thus aligned:

```text
Studio ──Deployment and operation MPY──→ PixelMug
                              
Bot ──Tie Device, Open Page──→ Bubble App Medium WebApp
                              │
                     WebApp BLE SDK
                              │
                     Bubble App Original Bridge
                              │
                        Bluetooth.
                              │
                       BLE Connect to Command
                              ↓
                  PixelMug 的 maopaoBleApp
                              │
                       echo Rewind → Screen
```

Bot provides device binding and web portals, and Studio loads device codes. WebApp opens and communicates with the cup via Bluetooth, and the echo command does not need to be sent to Bot first.

## Quick start

1. Select item `examples/ble-minimal` in Studio, select `bot/index.js`, fill in Bot token.
2. Check the " Auto-run device code after startup " to start the agent.
3. Send `/bindPixelMug` in Bubble App, associated with a PixelMug S1 Pro/Lite.
4. Waiting for the Studio to complete the device code loading, the cup display `DISC`.
5. Send `/webApp`, open the page by the message button. The page uses the first associated device.
6. Click Connect, waiting for the cup to be displayed `CONN`, and then click "echo", the cup being displayed `echo`.
7. Click Break, and then click Reconnect after the cup is restored `DISC`.

The cell phone needs to be able to access the page address provided by Studio and to access the cup to allow for bluetooth-related access. The page runs in the Bubble App container, and the normal browser does not have the required primary connection.

`DISC` indicates that the device has not been connected, `CONN` indicates that the BLE connection has been created. The application is still completed by SDK and cannot be used as proof that the screen is available for all operations. This teaching page omits the state, error display, and operation locks, and please proceed step by step.

WebApp and the end-of-the-mill MPY code are explained below to create an overall understanding of the development of a BLE application.

## 1. Bot: associate a device and open the page

Bot uses `BubbleBot` and registers PixelMug S1 device type:

```js
import { BubbleBot, InlineKeyboard } from '@jeejio-bubble/bot/sdk';
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});
bot.registerDevices([new PixelMugS1()]);
```

In the message-processing function, three interfaces are called by order sent by the user:

| Bot Command | Minimum interface | Role |
| --- | --- | --- |
| `/bindPixelMug` | `ctx.sendBindDevice(...)` | Sending device bound access |
| `/help` | `ctx.sendText(...)` | Send Operations Notes |
| `/webApp` | `ctx.sendKeyboard(...)` Match `InlineKeyboard.url(...)` | Send a button to open a web page |

For example, the processing code `/webApp` is:

```js
await ctx.sendKeyboard(
  'Connection PixelMug, Send First BLE Command.',
  new InlineKeyboard().url('Open BLE Example:', process.env.STUDIO_WEBAPP_URL)
);
```

Studio provides `STUDIO_WEBAPP_URL`. Full Bot also passed `bot.setCommands()` Three guys, call. `bot.start()` starting;directly running items `bot/index.js` It's all right.

The binding device allows WebApp to access the target device information, which is not equal to the BLE connection that has been created. The connection is initiated by the Connect button on the page.

## 2. WebApp: get the device and connect

`webapp/main.js` Create first the web-page SDK object, get the first associated device, then create the BLE application client:

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';

const webapp = new BubbleWebApp();
const [device] = await webapp.getDevices();
const ble = new BleAppClient(webapp.ble, { appId: 'BleMinimal' });
```

Three objects each have a purpose:

| Object/interface | Role |
| --- | --- |
| `webapp` | Visit WebApp capabilities provided by Bubble App |
| `webapp.getDevices()` | Obtain device objects, including device slot information for connection |
| `webapp.ble` | BLE transfer entrance for SDK |
| `new BleAppClient(...)` | Seal the handshake and commands to and from. |
| `appId: 'BleMinimal'` | Specify the end-end application of the device to be connected, which must be consistent with the MPY application identifier |

Puts a button in HTML and binds it to a click action in JavaScript:

```html
<button id="connect">Connection</button>
```

```js
document.querySelector('#connect').onclick = async () => {
  await ble.connect(device);
};
```

`querySelector('#connect')` Finds this button, `onclick` specifies the function to be performed on the click. `await` Waits for the connection operation to be completed. SDK and Bubble App Primary Bridge are responsible for scanning, connection, assurance, and application handshakes; developers do not need to write a forensic algorithm or operate bluetooth feature values on the web page.

## 3. Device-side MPY: start the service and receive echo data

The core code of the connection and the echo is extracted from the complete project below; the active cut-off extension can be found in the background and the project source code.

```python
import micropyxel as pyxel
from maopaoBleApp import BleAppService

ble = BleAppService("BleMinimal")
message = "DISC"


def on_connect(conn):
    global message
    message = "CONN"


def on_disconnect(conn, reason):
    global message
    message = "DISC"


def echo(params, context):
    global message
    message = "echo"
    return {"text": "echo"}


def update(rt):
    ble.poll()


def draw(rt):
    rt.cls(0)
    x = (rt.width - len(message) * 4) // 2
    rt.text(x, (rt.height - 6) // 2, message, 10)


ble.on_connect(on_connect)
ble.on_disconnect(on_disconnect)
ble.command("echo", echo, mutates=False)

pyxel.init(start_audio=False)
try:
    ble.start()
    pyxel.run(update, draw, fps=20)
finally:
    ble.deinit()
    pyxel.destroy()
```

The `BleAppService("BleMinimal")` logo is the same as the appId on the web page. `ble.start()` Defaults to enable ebustion, start service and broadcast; applications must be called `ble.poll()` on a continuous basis in order to advance acquis, command processing and response. This example is called in the MicroPyxel update callback.

`ble.command("echo", echo, mutates=False)` Register command named echo. The processing function receives params and constext and returns the result of serialization to JSON. This example does not use state sync, setting Mutates=False to avoid automatically adding state versions and distribution after the command.

## 4. WebApp: send an echo command

The echo button on the page only needs to call `command()`:

```js
document.querySelector('#echo').onclick = async () => {
  await ble.command('echo', { text: 'echo' });
};
```

What happened after the click was:

1. SDK Organisation requests to carry command name, parameters, id and current application session.
2. Bubble App will encrypt the request and send it to the cup via the Standard Message Channel (F150).
3. `ble.poll()` distribution request for device to execute the registered echo function.
4. The function changes the display text to echo and returns `{"text": "echo"}`.
5. The service sends the command response, and the SDK will match the call to the call, Promise complete.

An example of an echo function fixes and returns an echo, without using the imported params.text. You can try to read parameters from here.

The minimum page does not show the return value. If you need to get the device to respond:

```js
const response = await ble.command('echo', { text: 'echo' });
const text = response.result.text;
```

Here you get the result of the device command processing, which is different from the completion of a simple bluetooth writing. Promise rejects the command when it fails; this example omits the error display, and the actual application can handle the anomaly as required by business.

## 5. Disconnect, reconnect and exit

The complete item has a separate `disconnect` command so the page can request a disconnect:

```js
document.querySelector('#disconnect').onclick = async () => {
  if (!ble.ready) return;
  await ble.command('disconnect', {}, { retries: 0 });
};

document.querySelector('#reconnect').onclick = async () => {
  await ble.reconnect();
};
```

Disconnect is a custom application command for this example, not an SDK-in-built command. MPY processes functions first return accepted, the main loop waits for response queues to be emptied and 200 ms to wait, and then calls `ble.disconnect()` for a real disconnect. Do not disconnect directly from a processing function such as echo that needs to respond, so that the response is not sent.

Disconnect the cup to show DISC, device service retention, and subsequent pol will promote rebroadcasting. `reconnect()` Use the previously connected device to re-enact the connection and application handshake; it does not guarantee to cut off the existing physical link, so this example follows the "disconnection waiting for DISC reconnection" operation.


Clear SDK listening and timer on exit page:

```js
window.addEventListener('pagehide', () => {
  ble.close();
  webapp.stop();
});
```

`BleAppClient.close()` does not mean that the physical BLE link has to be cut off.

## WebApp and device-side API mapping

WebApp uses `BleAppClient` to initiate connections and commands, and the end of the device uses `BleAppService` to provide services and process requests.

| Purpose | Bubble WebApp | Deviceend MPY | Response and detail |
| --- | --- | --- | --- |
| Create an object | `new BubbleWebApp()`, get `webapp.ble` | N/A | WebApp access to Bluetooth through Bubble App Primary Bridge. |
| Create application client/service | `new BleAppClient(webapp.ble, { appId: 'BleMinimal' })` | `BleAppService("BleMinimal")` | AppClint initiates requests, App Service receives and processes them. The `appId` at both ends must be consistent and the application shakes will be checked. |
| Select Target Device | `await webapp.getDevices()` | N/A | The web page takes information on associated devices to specify which cup to connect to. |
| Connection and life cycle | `connect()`, `reconnect()`, `close()` | `start()`, life cycle echo, `disconnect()`, `deinit()` | The device starts with a service and is broadcast, and the web page is actively connected. The device is connected back to the BLE; the `connect()` page is also waiting for a handshake for the app. See [WebApp Connection Management](./webapp/) and [MPY Connection and Life Cycle](./mpy/) for more details. |
| Commands and Responses | `command(name, params)`, read from `response.result` | `command(name, handler)`, processing function receiving parameters and returning results | Web send commands, devices are registered with the same name processing function. See [WebApp Control Command](./webapp/commands) and [MPY commands and responses](./mpy/commands) for details. |
| Read the current state | `requestSnapshot()` | `set_state_provider()` | You can read the current status of the website. [WebApp state, event](./webapp/state-events) and [MPY state with event](./mpy/state-events). |
| Status and event notification | `on('state')`, `on('event')` | `publish_state()`, `send_event()` | Devices proactively notify changes in the status of the web page or business events; the event will not be automatically re-connected and will not be automatically re-exported. See [WebApp Status, Events](./webapp/state-events) and [MPY status and events](./mpy/state-events) for further details. |
| Configure Transfer | `setConfig()` | `config()`, `process_pending_config()` | The WebApp section uploads a larger JSON configuration, and the device performs a corresponding processing function in the main cycle. See [WebApp Configuration Interface](./webapp/config) and [MPY Configuration Transfer](./mpy/config) for details. |
| High-speed data channels | `sendSimpleRaw()`, `sendSimpleText()`, `on('simpleData')` | `on_simple()`, `send_simple_raw()`, `send_simple_text()` | At both ends, interpret RAW or UTF-8 text data as agreed to by application. See [WebApp High-speed Data Channel](./webapp/simple) and [MPY high-speed data channel](./mpy/simple) for further details. |
| Advance communications | N/A | The main cycle continues to call `ble.poll()` | The device must be proactive in order to handle command, configuration, state, event and Simple callback. |
| Quit Cleaning | `ble.close()`, `webapp.stop()` | `ble.deinit()` | Both ends clean up their own resources; clean-up calls cannot be confirmed as physical connections that have been disconnected. |

Both end-end codes name objects `ble`, but the type and method meaning are different: `ble` on the web page is `BleAppClient` and `ble` on the end of the device is `BleAppService`, in particular to distinguish between `command()` "send" and "Registration". The end-end calls should be kept brief and not block the main cycle for long periods.


## Next

- [WebApp BLE interface](./webapp/): Full access and usage of the page side.
- [MPY BLE interface](./mpy/): Device side-cycle interfaces with operations.
- [Connect custom BLE centre devices](../custom-client): Open Agreement to use when Bubble App is not required.
