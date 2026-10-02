# Device declaration and association

Bot first states what type of device is needed, and then the user connects its own devices to these locations. The device is already in the bubble account's “My Devices” and is not related to the current Bot chat.

## Declare a device slot

Imports devices provided by device RPC SDK at the import, creates examples and registers, for example in PixelMug S1 Pro/Lite:

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const mug = new PixelMugS1();
bot.registerDevices([mug]);
```

This section is before `start()`. At startup, Bot SDK synchronizes the device statement to the cloud. `new PixelMugS1()` Creates a description of the device's capability that does not connect to a cup; `registerDevices()` does not automatically select the device for the user.

The three concepts here are repeated:

- `talId`: Device type, currently supporting two device types `PixelMug`, `PixelMugS1`.
- `slot`: The location of the associated device in Bot, starting with 1, is determined by the order of the registration array.
- `deviceId`: The device ID that the user is actually associated with, can only be consulted if associated.

## Send a device association prompt

```js
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/bind') return;
  await ctx.sendBindDevice({
    content: 'Let's start with one. PixelMug S1, Start again bot',
    actionButtonTitle: 'Association S1',
  });
});
```

`sendBindDevice()` For initiating the device connection. After the user sends `/bind`, Bot returns an associated guide card; when the user clicks the entry in the card, Bubble App shows the optional device and directs the user to select and confirm the device for the current Bot. This method is only for sending the link entry, Promise returns the message and does not mean that the device has been linked.

** Bot can be understood as the “brain” responsible for judgement and control, and slot as the “outside slot” it has left.** Developer first uses `registerDevices()` to state what type of device each slot needs, and then users access their actual device to the slot. Once the connection is completed, Bot code is oriented towards the slot calling capacity; replacement of the associated device usually does not require modification of the business code as long as the new device meets the type or compatibility requirements of the slot.

The slot is the logical position in Bot, is not a physical interface on the device and does not mean that a device was connected at the time of the statement.

## Confirm the associated devices

Before calling the device, you can query the current chat:

```js
// In message or button processor that requires the device.
if (!(await bot.isDeviceBound(ctx, mug))) {
  await ctx.sendBindDevice({ actionButtonTitle: 'Association S1' });
  return;
}
```

If you want to show a name or an online status, use `getBoundDevices()`:

```js
const devices = await bot.getBoundDevices(ctx);
const bound = devices.find((device) => Number(device.slot) === 1);
await ctx.sendText(bound ? `Association: ${bound.name || bound.deviceId}` : 'Not related S1.');
```

Returns the list only for associated devices and does not fill unassociated slot objects. Each contains such normalized information as `slot`, `deviceId`, `name`, `deviceTalId`, and `online`. `online` may be `undefined`, indicating that the response has not been provided; the connection successfully cannot be independently shown to be on-line at the moment.

Bot SDK can update the interface or your own cache when you receive the association change message:

```js
bot.on('message:bind_device', async (ctx) => {
  const devices = ctx.message?.attachedDevices;
  if (!Array.isArray(devices)) return;
  await ctx.sendText(`It's connected. ${devices.length} Equipment.`);
});
```

`attachedDevices` List of devices from this message. The business should still start with a proactive search, not relying solely on the change notification that happens to be received after the process has started; the group chat is also affected by [Group chat strategy](./commands-and-groups).

## Define multiple devices

Create a stand-alone example of a device at each location, even if the model is the same:

```js
const deskMug = new PixelMugS1();
deskMug.name = 'Desktop Water Cup';
const livingRoomMug = new PixelMugS1();
livingRoomMug.name = 'The living room glass.';

bot.registerDevices([deskMug, livingRoomMug]);
// deskMug Correspond slot 1, livingRoomMug Correspond slot 2.
```

This paragraph replaces the previous single device statement.`registerDevices()` Every time a full list of statements is replaced, not added; keep the array sequence stable and avoid a change in the meaning of slot in the business. Once a statement is changed in operation, the call is immediately synchronized. `await bot.syncDeviceSlots()`.

When sending the device command, enter the corresponding example, Bot SDK will search for its slot; it can also specify `slot` in a visible manner. The slot serial number used for calling is not `slotId` for cloud-related records, and does not mix.

## Allow one slot to use compatible device types

A slot has a default device type, and can also declare other device types that are allowed to be associated by `compatible`. For example, the following slot default is for PixelMug S1 and allows users to associate with the first generation product, PixelMug P1:

```js
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1';

const mug = new PixelMugS1();
mug.compatible = ['PixelMug'];
bot.registerDevices([mug]);
```

The type of slot registered here is still `PixelMugS1`, `compatible`, except for P1 that allows `PixelMug` to be associated with this position. This way, the same set of Bots can be selected by the user for S1 or P1, without having to set a separate slot for each model.

Device compatibility also means that Bot must be supported by these models together. `compatible` does not automatically convert S1-specific RPCs to P1 interfaces; if this slot may be associated with P1, the business code should call the RPCs that are, parameters and behaviour compatible with both S1 and P1. The current return results `talId` and `deviceTalId` are all types used to create a slot that cannot be used to distinguish between S1 or P1.

Next: [Control screen using device RPC SDK](./device-sdk).

