# 03 Install and run MPY on PixelMug

The first two examples display text using the TAL interface already provided by the solid. This time, we put a Python program that we have prepared on PixelMug: a glass shows a light point, slides on the phone, the light moves; and a little bit, the light is set on the spark.

** MPY is the MicroPython application that runs at the end of the device.** You can use it to define drawing, animation and interactive behaviour to expand the capacity of the device, rather than just calling on actions that the solids already define.

This example only supports **PixelMug S1 Series (Pro / Lite), not supported P1**. Item location:`getting-started/03-ble-play`.

## I. Run the example in Studio

Select the same way to apply, configure Bot token, select WebApp access to the address [Title two.](/en/getting-started/02-pixel-text). This article adds two new things: to get Studio to autoload the device code, and to connect the device through BLE.

### 1. Select Application, Enable Autorun

Starts a agent running before you stop. Opens the entire `getting-started/03-ble-play` folder in Studio.

Confirms that the Bot portal is `bot/index.js`, configures token and WebApp addresses that can be accessed by mobile phones, and then ticks the " Post-Starting Auto-Rope Device Code"** in "Run Configuration"**.

This example contains `mpy/`, so Studio will show this option. When it is turned on, Studio automatically loads and runs the device code in the project after the agent is run and associated device is identified.

::: Tip This example is loaded by Studio
WebApp is only responsible for BLE connections and interactions, and does not contain the code to install or start MPY. Please tick the auto-run option and then start the agent.
:::

Computers, mobile phones and mugs are maintained in the same local area network, and the cups need to be online; they turn on BLE and approach the mug.

### 2. Start and associate S1 devices

Click Start Smart. Opens Bot private chats in Bubble App, looks at the introduction in `/help`, and links a PixelMug S1 with `/bindPixelMug`, or can be done in the Studio Link Device card.

Bot only states the location of the S1 device, so the P1 is not used in this case. If the right device is connected, you can wait for the automatic loading.

### 3. Waiting for device code to run

Studio handles the process of entering development mode, connecting devices, uploading codes and initiating programs. Click on the device sublabel under Debug Run to view the device running process and the device log.

When the device code is running successfully, ** confirm that light points have appeared on the mug** and continue with cell phone operations. Bot and WebApp services are started, which does not mean that the device code has been loaded.

If you forget to start auto-run, stop the agent, go back to the Run Configuration and tick this option and restart.

### 4. Open the touchboard and connect the BLE.

Send `/webApp` in Bubble App, click "Open the light touchboard", then click on "Bluetooth Connect PixelMug" in the middle of the page. Use a mobile phone tip to allow bluetooth-related privileges.

| Button Status | Meaning |
| --- | --- |
| Blue "Bluetooth Connect" PixelMug | Not yet connected, or connect timed out to try again |
| Blue Connecting | Creating BLE connection and application session |
| Green, "Signed with BLE, can start to experience." | It's ready, slide or light. |

Seeing the light on the cup before connecting helps you to distinguish between “device programs are not running” and “cell phones are not connected”.

### 5. Slide and gently

Press and slide on the dark-coloured touchboard to observe the position of the mug light; a little bit to observe the sparks spreading outward around the light point.

There are two different lines of communication in this case:

| Operation | Connection used |
| --- | --- |
| Open WebApp Page | Mobile phone access to the Studio web page via LAN |
| Slide, light control point | Cell phone sent to device end MPY via BLE |

Bot provides application portals and device connections, and touching does not need to be forwarded to Bot by article.

## II. Change the device code and try again

Expand `03-ble-play → mpy` in the Studio file tree, open `__main__.py` to find:

```python
COLOR = 10
```

was replaced by:

```python
COLOR = 11
```

Here the number is the colour index for the MicroPyxel palette.

Click " Reactivate Smart " after saving, waiting for Studio to reload and run the device program and reconnect Bluetooth in WebApp. See if the light points on the mug have changed color.

This modification occurs at the end of the device, so only refreshing the cell phone page does not update the application in the mug. Reloading or restarting the device also interrupts the original BLE session and needs to be reconnected.

## III. Understand the source code

```text
03-ble-play/
├─ bot/
│  └─ index.js       Statement S1 Equipment, Processing commands, Provide page entrances
├─ webapp/
│  ├─ index.html    Connect buttons and touchboards
│  ├─ style.css     Page Styles
│  └─ main.js       BLE Connection, Touch coordinates and data distribution
└─ mpy/
   ├─ mps.json      Device Program Name, Version and dependency declaration
   └─ __main__.py   Receive BLE Data and draw light points
```

The three programs run in different locations:

| Procedures | Run Location | Duties of the present case |
| --- | --- | --- |
| Bot | Node.js on the computer. | Registered device, help, connections, WebApp entrance |
| WebApp | WebView from Bubble App. | Read touch operations, send data through BLE |
| MPY | MicroPython packaging for PixelMug S1 | Receive data, update light points and animation |

Studio is responsible for loading the device code during development and does not need a manual installation process in this introductory example.

### Bot: declare an S1 device

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

bot.registerDevices([new PixelMugS1()]);
```

This example relies on the MicroPython packaging of S1 and therefore directly states the S1 device without adding P1 to the compatible list.

The three commands `/help`, `/bindPixelMug` and `/webApp` are treated in the same manner as the second. Bot continues to use `webAppDeviceAccess: 'any'`, meaning that WebApp can be opened once any device position has been bound; only one place in this case.

### MPY entry point and program structure

`mpy/__main__.py` is the device program portal.

`mpy/mps.json` Description Application:

```json
{
  "name": "getting-started-light",
  "version": "1.0.0",
  "description": "Use your cell phone. PixelMug Light",
  "dependencies": [
    { "name": "micropyxel", "version": ">=1.0.0" }
  ]
}
```

`name` and `version` describe the name, version of the device program; `dependencies` declare the components required. Here is the statement that MicroPyxel, the program is also provided `maopaoBleApp` with solids. These are end-of-device components, not npm packages installed on a computer.

### Device: start drawing and the BLE service

```python
import micropyxel as pyxel
from maopaoBleApp import BleAppService, DATA_TYPE_RAW

ble = BleAppService("GettingStartedLight")
```

`micropyxel` provides mapping and running loops, `BleAppService` provides device end-of-pipe BLE application services.

`GettingStartedLight` is the agreed application sign for both ends and must be consistent with `appId` in WebApp. It is not a device, TALID, or Bot token; it is for this BLE application session.

At the end of the file, connect the previously defined functions:

```python
ble.on_simple(receive)
ble.start()
pyxel.init(start_audio=False)
pyxel.run(update, draw, fps=30, on_exit=close)
```

- `on_simple(receive)` Registers the Simple data reception function.
- `start()` Starts BLE application service.
- `init(start_audio=False)` Initialized drawings, this example does not start audio.
- `run(...)` Performs updates and drawings in 30 frames per second of the target and calls the cleanup function upon exit.

### WebApp: connect to the BLE application

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';
```

Use `{ ble: false }` for the creation of the second WebApp. This example requires BLE, so the default configuration is used:

```js
webapp ||= new BubbleWebApp();
const [device] = await webapp.getDevices();

client = new BleAppClient(webapp.ble, {
  appId: 'GettingStartedLight',
});
await client.connect(device);
```

`getDevices()` does not change: to acquire associated devices for the current session. This example has only one device location, so take the first device; the actual source code will first check if the device exists.

`BleAppClient` Use `webapp.ble` to interact with Bubble App and manage connections and application handshakes. Wait for `connect(device)` to switch the button to green.

Connection status is `connectionState` event feedback; restore the blue button to the user when disconnected or failed. The page does not call MPY to install the interface, so it has to be automatically loaded with Studio before connecting.

### Protocol: three bytes per operation

This example uses simple binary messages:

```text
[Operation Type, x, y]
```

| Bytes | Meaning |
| --- | --- |
| 1st | `1` for movement, `2` for light |
| 2nd | x-coordinate, range of this case `0..31` |
| Third | Collation, range of this case `0..15` |

For example, `[2, 16, 8]` indicates the light point at coordinates `(16, 8)`. This is the message format that this example defines itself, not TAL RPC, and not the format that all BLE applications have to use.

The web page converts the position on the touchboard to the 32 x 16 coordinates range of this example, and constructs the message:

```js
nextPacket = new Uint8Array([kind, x, y]);
```

`Uint8Array` is used to store bytes. Coordinates are limited in range and three bytes are sufficient and do not need to wrap each touch into a large section of JSON.

### WebApp: send touch data

```js
await client.sendSimpleRaw(packet);
```

`sendSimpleRaw()` Sends original bytes, corresponding to the end of the device `DATA_TYPE_RAW`.

The touch move produces a number of events. Example: try to send the latest position every 50 milliseconds and delay sending until the last delivery is complete, reducing the backlog. Original connection, handshake and data transfer are processed by SDK, and the page is prepared by bytes only.

When you press down and slide to send the type of move; when you lift, you click less than 350 ms and move at a distance of less than 12 pages pixels, then you click the light point. These thresholds are the interactive selection of this example and can be adjusted for your application.

### MPY: receive data and update state

```python
def receive(data_type, data, context):
    global x, y, spark
    if data_type != DATA_TYPE_RAW or len(data) != 3:
        return
    x, y = min(data[1], 31), min(data[2], 15)
    if data[0] == 2:
        spark = 12
```

The receiving function checks the type and length of the data, and then puts the coordinates at `x`, `y`. If the operational type is light, set the spark animation count `spark`.

`context` is the context provided by the receiving call, which is not used in this case. The receiving function only updates the state, and the actual drawing is given to the drawing cycle.

### MPY: separate updates from drawing

```python
def update(rt):
    global spark
    ble.poll()
    spark = max(0, spark - 1)
```

`update()` Handle pending BLE services and reduce the number of sparks. Do not delete `ble.poll()`: It allows the receiving process to continue in the running of the program.

```python
def draw(rt):
    pyxel.cls(0)
    pyxel.rect(x - 1, y - 1, 3, 3, COLOR)
```

`draw()` Firstcolor Index `0` Clear screen, and draw a 3x3 light point at the centre of the current position. The actual source code is still in `spark` It's not zero. It's in eight directions. `pyxel.pset()` Draws sparks that gradually spread out.

Cell phones only send location and type of operation, drawing what, and how to change, is determined by the device 's end Python code. This is the extension of the device ' s end program: the same touch input that you can transform into light points, brushes or small games.

### Clean up resources

Device end registers cleanup function `on_exit=close`:

```python
def close(rt, reason, error):
    ble.deinit()
    pyxel.destroy()
```

WebApp stops sending timers at `pagehide`, closes the BLE application client and stops the WebApp session. Both ends release the resource and avoids the old page or the old application continuing to interact.

## When BLE cannot connect or the display does not respond

| phenomena | What do you want to check first? |
| --- | --- |
| There's no light in the mug. | Check to run automatically; link S1; view loading status and log on device debug page |
| Open page always load | Could you access the local area network address of Studio, please refer to title two? |
| button restores blue from Connect | Whether the device program is running; whether bluetooth permissions are allowed; whether the mobile phone is approaching the device; see WebApp log |
| Show connected but no light | Whether the two ends `appId` are consistent; whether the device log is wrong or not; whether MPY is still running |
| No change in Python after changing | Whether to save and restart the agent until reload is complete |
| Unable to operate after restarting device or redeploying | The old BLE session has been disconnected and needs to be reconnected |

Once this example has been completed, it will be possible to continue reading [MicroPyxel](/en/device/micropyxel/), [Deviceend BLE](/en/ble/) and [WebApp BLE](/en/ble/app/webapp/) to understand how to expand mapping and close-distance interaction.
