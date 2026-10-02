# WebApp BLE interface

WebApp communicates with PixelMug on the Bubble App phone. `BleAppClient` Connect to device, send commands and receive data, device side `maopaoBleApp.BleAppService` handles these requests. All page codes on this page are running in Bubble App.

## Create client and connection management

### Create client and connect

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';

const webapp = new BubbleWebApp();
const [device] = await webapp.getDevices();
const client = new BleAppClient(webapp.ble, { appId: 'BleMinimal' });

await client.connect(device);
```

- `webapp.getDevices()` Get associated devices, for example, select the first; please tie the cup first through Bot.
- `appId` Specifies that the MPY application to be connected must be `BleAppService("BleMinimal")` on the end of the device.
- `await client.connect(device)` Waits for BLE connection, bubble power and application handshakes to be completed before you can send the command.

If the page needs to judge whether the current interactive is possible, `client.ready`: is `true` to indicate that the connection and application sessions are already in place. The introductory example will simply wait for `connect()` to be completed and the rest of the construction options will normally use the default value.

### Active Disconnect

`BleAppClient` does not directly disconnect the physical BLE interface. The smallest example is the registration of a custom `disconnect` command in MPY, by which the web page requests the device to be voluntarily disconnected:

```js
await client.command('disconnect', {}, { retries: 0 });
```

`retries: 0` here means that this disconnection request is not automatically retryed. The device returns to the command response and then calls `ble.disconnect()`; therefore the response received only indicates that the device has been processed and does not mean that the BLE connection has been disconnected.

### Reconnect

Call after the cup is displayed:

```js
await client.reconnect();
```

`reconnect()` does not need to re-enter `device` with a device previously connected. It does not cut the existing connection first, so the smallest example is done in the order of "Close Zoom Waiting for DISSC Zooming".

### Page Exit

Releases the bugs held by the client and WebApp when the page exits:

```js
window.addEventListener('pagehide', () => {
  client.close();
  webapp.stop();
});
```

`close()` does not disconnect the physical BLE connection; if a spontaneous break is required, the above cut-off process should be executed. See [Minimal Example](../) for full realization.
