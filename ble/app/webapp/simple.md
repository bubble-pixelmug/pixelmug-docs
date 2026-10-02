# 高速数据通道接口

高速数据通道（F160，Simple）适合发送摇杆、坐标、按键和传感器采样值等需要快速更新的数据。它支持二进制和 UTF-8 文本，两种数据共用同一个 BLE 连接和分包机制。

示例 `examples/ble-simple-control` 中，WebApp 发送虚拟触摸板的坐标，应用约定两个字节依次表示 x、y。下面的代码把 32 × 16 触摸网格中的坐标发送给设备：

```js
async function sendCoordinate(x, y) {
  await client.sendSimpleRaw(new Uint8Array([x, y]));
}
```

`sendSimpleRaw()` 原样发送 `Uint8Array`。设备端必须使用相同的字节顺序和含义解析数据。坐标范围为 x：0～31、y：0～15，所以每个值使用一个字节即可。

示例 `examples/ble-simple-text` 中，WebApp 使用 `sendSimpleText()` 发送单个字母：

```js
async function sendLetter(letter) {
  await client.sendSimpleText(letter);
}
```

SDK 会把字符串编码为 UTF-8。Simple 通道不区分普通文本和 JSON；如果应用约定文本内容为 JSON，需要自行调用 `JSON.stringify()` 和 `JSON.parse()`。

设备通过同一个 `on_simple()` 回调接收两种数据，并根据 `data_type` 区分：

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

`payload` 始终是 `bytes`。RAW 数据按应用约定读取字节；TEXT 数据需要调用 `decode("utf-8")` 转成字符串。设备主循环必须持续调用 `ble.poll()`，注册的回调才会执行。

设备向 WebApp 发送 Simple 数据时，网页通过 `simpleData` 事件接收：

```js
client.on('simpleData', (data) => {
  if (data.dataType === 0) {
    console.log(data.bytes);
  } else {
    console.log(data.text);
  }
});
```

`data.dataType` 表示数据类型：`0` 是 RAW 数据，`1` 是 UTF-8 文本。RAW 数据保存在 `data.bytes` 中，类型为 `Uint8Array`；文本还可以直接从 `data.text` 读取。

`examples/ble-simple-motion` 展示了如何用 RAW 数据持续发送多个数值。设备端读取同一份 G-sensor 快照，把三轴加速度和三轴角速度编码为六个小端序 `float32`：

```python
import struct

yaw, pitch, roll, gx, gy, gz, ax, ay, az = (
    g_sensor.get_attitude()
)

packet = struct.pack("<6f", ax, ay, az, gx, gy, gz)
ble.send_simple_raw(packet)
```

`<6f` 表示六个小端序 `float32`，生成的数据长度固定为 24 字节。六个数值的顺序由应用约定为 `ax、ay、az、gx、gy、gz`。

WebApp 在 `simpleData` 回调中检查数据类型和长度，再使用 `DataView` 按相同格式读取：

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

`getFloat32()` 的第二个参数 `true` 表示按小端序读取，必须与设备端 `struct.pack("<6f", ...)` 的字节序一致。构造 `DataView` 时同时传入 `byteOffset` 和 `byteLength`，可以正确处理 `data.bytes` 只是底层缓冲区一部分的情况。

`sendSimpleRaw()` 和 `sendSimpleText()` 完成，只表示数据已经提交给 BLE 发送流程，不代表设备已经收到或处理。Simple 通道不提供业务确认、自动重试或命令结果；需要确认操作结果时使用标准消息通道的 `command()`。连续输入还需要应用自行控制发送频率以及过期数据的处理方式。

设备端发送接口、消息大小和分包限制见[高速数据通道](../mpy/simple)。
