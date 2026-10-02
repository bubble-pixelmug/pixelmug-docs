# Get associated devices

The statement, registration, and guidance to user-connection devices for the device slot are the responsibility of Bot. WebApp does not create or associate the device, but only acquires and operates the device that is already associated in the current Bot chat. When the page is open, the device list should be accessed by `getDevices()`; only one device can be used directly and the user will be selected when multiple devices exist.

## Query devices

```js
const devices = await webapp.getDevices();

if (!devices.length) {
  showMessage('Please be there first. Bot Linking Devices in Dialogue.');
}
```

`getDevices()` will send a request to Bot, Bot to query the device associated with the current chat and return the associated device to the page upon receipt of the request. The list contains only the associated device and does not return the empty object for the unrelated slot.

## `getDevices()` returned device information

Below are the common fields for each device object in the `getDevices()` return array:

| Fields | Purpose |
| --- | --- |
| `slot` | Logical position of Bot starting with 1 |
| `slotId` | The ID of the cloud-related position is also the main target for the WebApp device. |
| `talId` | Bot creates the device type used when slot, such as "PixelMug", "PixelMugS1" |
| `deviceTalId` | The current device type used when creating the slot is the same as `talId` |
| `compatible` | The slot allows associated compatible device types such as "PixelMug" |
| `deviceId` | Only ID of the current associated device |
| `name` | Anonyms for devices in Bubble App |
| `online` | `true`, `false` or state unknown |

Compatibility only extends to one device that can be associated with a slot and does not change `talId` or `deviceTalId`. For example, after PixelMug S1 slot allows association with PixelMug P1, even if the user is actually associated with P1, the two fields are still `PixelMugS1` and cannot be used to judge the actual model of the associated device. Therefore, compatibility models should provide the common RPC, WebApp set of device types declared by slot.

Pages should keep `getDevices()` returned complete objects. Showing names is suitable for the interface display and cannot be the sole identifier of the device; multi-device status is usually saved at `deviceId` and is then returned to `slotId` if not found.

## Listen for association changes

```js
webapp.onDevicesChanged((event) => {
  const devices = event.payload?.devices || [];
  renderDeviceList(devices);
});
```

When Bot receives the device-related change message for the current chat, `system.devicesChanged` internal protocol messages are sent to the active page. The page can either use the list of devices carried by the protocol message directly or call `getDevices()` again.

When the device is replaced, the slot may change, but `deviceId` will change. Events that have been created with old devices should not continue, and new device objects should be used to resubscribe.

## When no device is associated

WebApp cannot directly complete the connection for the user. Usually, the linked card is sent by Bot during the chat, and the page is opened after the user has finished the connection. When the page finds the list empty, a clear reminder is given and the user is allowed to return the conversation to finish the connection.
