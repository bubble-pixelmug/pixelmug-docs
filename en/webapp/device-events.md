# Receive device-reported events

Device events are initiated by the device, such as changes in the charging state. WebApp accepts events require two steps to be completed: using `onDeviceEvent()` registration handler, and `subscribeDeviceEvents()` subscription to devices that require attention.

## Register an event handler

```js
webapp.onDeviceEvent(handleDeviceEvent);
```

`onDeviceEvent(handler)` Tell WebApp which function to call upon when a device event is received. It only handles Bot already forwarded to the page, and does not automatically subscribe to the device. A handler can receive all device events that are subscribed to on the current page and then process them according to the device information on the event.

Usually you register a handler and then you start a subscription, avoiding that the first event that results from a successful subscription does not have a corresponding logic.

## Subscribe to a device

```js
const devices = await webapp.getDevices();
const mug = devices[0];

await webapp.subscribeDeviceEvents(mug);
```

`subscribeDeviceEvents(device)` Tell Bot to forward the event reported after this device to the current WebApp page. The incoming device should be directly from `getDevices()`. The subscription is only effective for events that arise after that, and no historical event will be returned or replayed.

This link requires:

- Bot Cancellation is running to process WebApp subscription requests;
- Bot device query is in operation to receive the device ' s report;
- WebApp sessions are active;
- The subscription `deviceId` is consistent with the notification source.

## Event object format

In the `onDeviceEvent()` echo, business usually needs only to read the list of device and events in `payload`:

```js
{
  payload: {
    device: {
      deviceId: 'device-id',
      name: 'My pixel glass.',
    },
    events: [
      {
        method: 'CurChargingState',
        params: { value: 1 },
      },
    ],
  },
}
```

- `device`: the object of the device used for the subscription to determine which device is used;
- `events`: Devices for the sequence of events reported this time, one notification may contain multiple incidents.

Originalevent `method` Name of the event, specify `params` By deviceAPI.

## Parse events with the device RPC SDK

Bot Business Code processing device notifications usually call `parseNotify()` for device RPC SDK. WebApp subscribes to event arrays that have not yet been called `parseNotify()`, so the page can also resolve them using the same method. This method only handles event data and does not depend on Bot's message context. device RPC SDK directly exports `parseNotify`, importing it only gets event resolution functions, and does not create, register or connect devices.

```js
import { parseNotify } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

function handleDeviceEvent(event) {
  const device = event.payload?.device;
  const rawEvents = event.payload?.events || [];
  const events = parseNotify(rawEvents);

  for (const item of events) {
    if (item.name !== 'CurChargingState') continue;

    const value = item.params?.value;
    const charging =
      value === true || value === 1 || value === '1';

    updateChargingState(device.deviceId, charging);
  }
}
```

`parseNotify()` Converts the original event `method` to `name` more suitable for business processing, and ignores events that are not recognized by device RPC SDK. The page should use the current slot for device RPC SDK; if the slot allows associated compatible models, only the mutually supported events of these models should be handled.

Do not directly use `Boolean(value)` to resolve the state of the string, as `Boolean('0')` is also `true`.
## Pages with multiple devices

Call `subscribeDeviceEvents()` for several devices and save as `deviceId`:

```js
for (const device of devices) {
  await webapp.subscribeDeviceEvents(device);
}

const stateByDevice = new Map();
```

When an event is received, the corresponding card will be updated by matching `event.payload.device.deviceId`. Do not consider the last notification as a notification of the currently selected device.

The actual `deviceId` may change after a change in the device association. The page should refresh the list of devices, resubscribe new devices and clear the interface status of old devices.

## Unsubscribe from events

```js
await webapp.unsubscribeDeviceEvents(mug);
```

`unsubscribeDeviceEvents()` After completion, Bot will stop the reported event after transmitting this device to the current WebApp page.

`stop()` does not call off subscriptions on a case-by-case basis. After the page closes, Bot will stop transmitting messages to closed messages or sessions when they expire.
