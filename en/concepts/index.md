# Core concepts

First contact with the system? It is suggested to read [Quick Understanding](/en/overview/) first, to see the components from the overall structure and the interactive examples.

This page is organized on the basis of local source codes `mps/jeejio-bubble/sdk` and `mps/jeejio-bubble/examples` and has a baseline date of 2026-09-15. It describes the existing realized relationship; behaviour involving cloud services, Bubble App and firmware still needs to be certified in conjunction with the corresponding version.

## One SDK, two operating environments

`@jeejio-bubble/bot` also provides Bot and WebApp development capabilities. WebApp integrates internal communication with Bot, device RPC and BLE, but these capabilities use different communication channels.

| Composition | Run Location | Duties |
| --- | --- | --- |
| Bot / `BubbleBot` | Node.js, for example, the process started by Studio | Message processing, application logic, device statement, device RPC, WebApp request processing and transfer |
| WebApp / `BubbleWebApp` | Web page in Bubble App | User interface, request to Bot, call the device, receive transfer; use bluetooth by `.ble` |
| `JeeWeb` | Bubble App injected host bridge targets | Hand over web request to App's original capability; SDK seals it |
| Device Definition / `devices` | Usually import by Bot | Declaration `talId`, compatible type, RPC for construction of specific device; not an example of physical device |
| MPY Application | PixelMug Device | Execute device code, drawing, processing BLE applications, etc. |
| Studio | Computer development | Select items, run Bot, provide WebApp addresses, plant deployment and debugging |

A normal browser can display the HTML of WebApp, but does not automatically get `JeeWeb`. Calling the host's ability to call SDK requires opening the page in Bubble App or injecting simulations into the test. BLE is also not a browser's `navigator.bluetooth` interface.

## Communication channel

| scene | Entry and Path | Applying how to get results |
| --- | --- | --- |
| WebApp Request Bot | `webapp.request()` `JeeWeb.sendData` Cloud Message < Bot | `bot.onWebAppRequest()` returns value, replying back to WebApp |
| Bot Launch | `ctx.sendWebAppData()` / `bot.api.sendWebAppData()` Cloud → App page | `webapp.on(type, handler)` |
| Bot Call Device | `bot.callDevice()` Cloud davice RPC daemon | Waiting for final device response, get `responseCtx.tal.result` |
| WebApp Call Device | `webapp.callDevice()` `JeeWeb.sendTAL` Host Device Channel | Get final RPC response from host returned; does not equate to the business handler that executed Bot |
| Device Event to WebApp | Device Notification → Bot Device Rotation → Match Session → WebApp | `webapp.onDeviceEvent()` |
| WebApp Bluetooth Control | `webapp.ble`/ `BleAppClient` `JeeWeb` Cellular BLE > Device | Basic data, application response or Simple data event |

Bot can be called through `observeWebAppDeviceCalls` WebApp devices. Observation events are not operational implementation portals for WebApp devices.

## Device types, declarations, and associations

| Name | Meaning | Pay attention when using |
| --- | --- | --- |
| TALID / `talId` | Device class identification, e.g. `PixelMugS1` | Interface name can write TALID, code retains the actual field name `talId` |
| `compatible` | Other TALID that a device declares allowed to be associated | Allow association not to automatically convert RPCs from different devices for SDK |
| `slot` | Bot registration declaration serial number, starting with 1 | By the order of the array `registerDevices([...])` |
| `slotId` | Association id for service-end distribution | WebApp / BLE; cannot be replaced by a serial number `slot` |
| `deviceId` | Physical device ID | To identify specific devices, match events |
| `deviceTalId` | The current is the same as `talId` for TALID used when creating slot | Not to judge the actual type of compatible associated device |
| `sn`, `avatar`, `name` | Serial number, header, name | is the device information, not replacing the above ID |

The typical process is: declaration device `registerDevices()` → `start()` Synchronise declaration →userassociatephysicdevice → Querys the current sessionassociated device → call device.

`registerDevices()` Replaces the current list of declarations and does not complete the physical device association. SDK `getBoundDevices(ctx)`, WebApp `getDevices()` queryes the device for the current session, not all the devices in the Studio “My Device” page.

The Creator device used by Studio, the associated interface is a tool interface and should not be mixed with the interface description for Bot SDK.

## Three stages of request completion

1. Request received: The ACK business code for Bot data RPC is `201`.
2. The device returns the end result: Bot / WebApp device RPC judge success by the final business code `200`.
3. Continuous operation of device or active event: An event or status query observation is required and cannot be inferred from “sending success”.

`callDevice()` Only until the second step is completed. `callDeviceAsync()` returns to the task at the first step, with notification of `device_call:response/error/timeout` at the second step. `accepted` for BLE Simple only indicates that the sending is accepted and does not guarantee that the application has been executed.

HTTP status code, business response code, BLE writing confirmation should be explained separately, without a set of "200 is all complete".

## Session and association identifiers

| Identification | Purpose |
| --- | --- |
| `ctx.chat`, `ctx.from`, `ctx.to` | Context, sponsors and recipients of chats; group conversations and private conversations need to be handled separately |
| WebApp `sessionId` | Distinguishing page sessions, route requests answered and sent |
| WebApp Request `id` | Link requests and responses in one page |
| 设备 RPC `traceId` | Associated device call, final response and timeout |
| BLE `sessionId` | Apply bluetooth sessions from handshakes, independent of WebApp sessions |
| BLE `rev` / `stateRevision` | Track the application status version and request a snapshot once the event gap is identified |

WebApp reports opened and sends a heartbeat by default on startup; Bot maintenance page session is used for device event push. Business example may also have its own session and expiry time, and the example constant cannot be used as the SDK default.

## Where to start

- [Bot SDK](/en/bot/): Message, device call, WebApp request processing.
- [WebApp SDK](/en/webapp/): Web page initialization, communication and device interaction.
- [WebApp BLE](/en/ble/app/webapp/): Basic transmission, application session and real-time data.
- [Example Source Index](/en/concepts/source-examples): Existing examples correspond to document themes.
- [Document Frame and Completion Order](/en/concepts/documentation-map): Plan page, preparation of specifications and items to be checked.
