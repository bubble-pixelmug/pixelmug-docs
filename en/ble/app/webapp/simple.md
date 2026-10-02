# High-speed data channel interface

The high-speed data channel (F160, Simple) is suitable for sending data that need to be updated quickly, such as rollers, coordinates, keys and sensor sampling. It supports binary and UTF-8 text, both of which share the same BLE connection and subcontracting mechanism.

For example `examples/ble-simple-control`, WebApp sends the coordinates of the virtual touchpad, using the agreed two bytes to indicate x, y. The following code sends the coordinates from the 32 x 16 touch grid to the device:

```js
async function sendCoordinate(x, y) {
  await client.sendSimpleRaw(new Uint8Array([x, y]));
}
```

`sendSimpleRaw()` Sends `Uint8Array` as it stands. The end of the device must interpret the data using the same byte order and meaning. The coordinates range is x:0-31, y:0-15, so one byte for each value.

For example `examples/ble-simple-text`, WebApp uses `sendSimpleText()` to send individual letters:

```js
async function sendLetter(letter) {
  await client.sendSimpleText(letter);
}
```

SDK encodes a string to UTF-8. The Simple channel does not distinguish between normal text and JSON; if the agreed text is JSON, it needs to call `JSON.stringify()` and `JSON.parse()`.

The device receives both data through the same `on_simple()` call back and distinguishes between `data_type`:

```python
from maopaoBleApp import DATA_TYPE_RAW, DATA_TYPE_TEXT

def receive_simple(data_type, payload, context):
    if data_type == DATA_TYPE_RAW and len(payload) == 2:
        x = payload[0]
        y = payload[1]
        print("coordinate:", x, y)
    elif data_type == DATA_TYPE_TEXT:
        text = payload.decode("utf-8")
        print("text:", text)

ble.on_simple(receive_simple)
```

`payload` always `bytes`. RAW data read bytes according to application protocol; TEXT data need to be called `decode("utf-8")` to string. The main cycle of the device must be called `ble.poll()` on a continuous basis to perform the registered callback.

When the device sends Simple data to WebApp, the web page receives `simpleData` events:

```js
client.on('simpleData', (data) => {
  if (data.dataType === 0) {
    console.log(data.bytes);
  } else {
    console.log(data.text);
  }
});
```

`data.dataType` indicates the data type: `0` is RAW data, `1` is UTF-8 text. RAW data are saved in `data.bytes` for type `Uint8Array`; text is also read directly from `data.text`.

`examples/ble-simple-motion` shows how to continue sending multiple values using RAW data. The device end reads the same G-sensor snapshot, and encodes the three-axis acceleration and three-axis angle speeds in six small-end sequences `float32`:

```python
import struct

yaw, pitch, roll, gx, gy, gz, ax, ay, az = (
    g_sensor.get_attitude()
)

packet = struct.pack("<6f", ax, ay, az, gx, gy, gz)
ble.send_simple_raw(packet)
```

`<6f` is the six small-end sequence `float32` and the resulting data length is fixed at 24 bytes. The order of the six values is agreed at `ax、ay、az、gx、gy、gz`.

WebApp, in `simpleData` return, check the data type and length and use `DataView` to read in the same format:

```js
client.on('simpleData', (data) => {
  if (data.dataType !== 0 || data.bytes.byteLength !== 24) return;

  const view = new DataView(
    data.bytes.buffer,
    data.bytes.byteOffset,
    data.bytes.byteLength,
  );

  const ax = view.getFloat32(0, true);
  const ay = view.getFloat32(4, true);
  const az = view.getFloat32(8, true);
  const gx = view.getFloat32(12, true);
  const gy = view.getFloat32(16, true);
  const gz = view.getFloat32(20, true);
});
```

The second parameter of `getFloat32()` `true` indicates that it must be read in small order and be consistent with the byte order of the end of the device `struct.pack("<6f", ...)`. The construction of `DataView` is accompanied by `byteOffset` and `byteLength`, which correctly addresses the situation of `data.bytes` as part of the lower buffer zone.

`sendSimpleRaw()` and `sendSimpleText()` have been completed, but only if the data has been submitted to the BLE dispatch process, does not mean that the device has been received or processed. The Simple channel does not provide business confirmation, automatic retry or command results; the `command()` standard message channel needs to be used to confirm the results of the operation. Continuous input also requires the application of self-control of the frequency of transmission and the processing of expired data.

Device end-to-end delivery interfaces, message sizes and subcontract limitations are [High-speed data channels](../mpy/simple).
