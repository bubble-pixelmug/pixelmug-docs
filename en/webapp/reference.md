# WebApp SDK interface index

This page is used to quickly find the public interface that is commonly used in WebApp development. It is recommended to read [Quick Start](./quick-start) and then view the corresponding chapter by specific scene.

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
```

This document does not contain BLE interfaces; see [WebApp BLE Document](/en/ble/app/webapp/) for Bluetooth capabilities.

## Create WebApp

```js
const webapp = new BubbleWebApp({ ble: false });
```

| Interface | Purpose |
| --- | --- |
| `new BubbleWebApp(options)` | Create WebApp instance and start the current page session |
| `start()` | Manual Start Page Session |
| `stop()` | Manual End Page Session |

WebApp defaults to automatically start page sessions, and normal applications do not need to call `start()` or `stop()`. Common options are `ble: false`, `timeoutMillis` and `debug`; use `autoStart: false` when starting at your own control. See [Page Session and Life Cycle](./lifecycle) for more details.

## WebApp and Bot communication

| WebApp Interface | Purpose |
| --- | --- |
| `request(type, payload)` | Start application request with Bot and await return results |
| `on(type, handler)` | Receive specified type data sent by Bot |
| `on(handler)` | Receive all business data sent by Bot |

The handler at `on()` normally reads `event.type` and `event.payload`. Requests and responses are available at [WebApp Request Bot](./bot-channel) and are available at [Bot Actively Send to WebApp](./push).

Bot side interface:

| Bot or Context interface | Purpose |
| --- | --- |
| `bot.onWebAppRequest(type, handler)` | Processing specified type WebApp requests; handler returns value automatically |
| `bot.on('web_app_data', handler)` | Processing application requests for `onWebAppRequest()` handler |
| `ctx.replyWebApp(result)` | Reply to current request in `web_app_data` handler |
| `ctx.sendWebAppData(type, payload)` | Send business data to the current page session |

## Devices

| WebApp Interface | Purpose |
| --- | --- |
| `getDevices()` | Fetches devices that are currently associated with the Bot chat |
| `callDevice(device, rpc)` | RPC direct call to associated device |
| `subscribeDeviceEvents(device)` | Incidents where a device is actively reported |
| `unsubscribeDeviceEvents(device)` | Can not open message |
| `onDeviceEvent(handler)` | Receives Subscriptions for reporting events |
| `onDevicesChanged(handler)` | Changes in receipt device association |

Device objects for transmission to `callDevice()` and subscriptions should be from `getDevices()`, and the RPC should be constructed from the corresponding device RPC SDK. See [Acquisition of associated device](./devices), [Call Device RPC](./device-rpc) and [Receiving device to report the incident at its own initiative](./device-events) for details.

## Configure WebApp behavior from the Bot

| Configure or Interface | Purpose |
| --- | --- |
| `webAppDeviceAccess` | Set the device connection condition that needs to be met before opening WebApp |
| `observeWebAppDeviceCalls` | Let Bot receive observation events called by WebApp devices |
| `webAppDeviceCallTimeoutMillis` | Set up the time when the Bot observation device is called while waiting for a response |

Device calls for observation can be heard `web_app_device_call`, or separately `web_app_device_call:request`, `web_app_device_call:response` and `web_app_device_call:timeout`. See [Watch the WebApp device call](./observe-device-calls) and [Set open conditions for WebApp](./access-policy) for further details.

See [Error handling and use limits](./errors-and-limits) for error handling and use limits.
