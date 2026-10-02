# 高速数据通道（Simple）

高速数据通道使用 F160 服务，代码与协议中称为 Simple。它支持二进制和 UTF-8 文本的轻量收发与分包，适合连续摇杆坐标、传感器采样值等紧凑数据，与标准消息通道（F150）共用一个 BLE 连接。

设备发送时直接分包提交通知，减少标准消息通道的排队环节；应用接收回调仍通过 `BleAppService.poll()` 分发。“高速”不代表固定速率或实时性保证，实际表现取决于 MTU、连接参数和应用处理速度。

冒泡模式下需先通过鉴权，开放模式下连接后放行。两种模式的 Simple 负载都不经过应用层加密；不要用它传输凭据或其它需要保密的数据。

本通道不内置命令应答、自动重试、消息有效期检查或按业务类型合并最新值的规则。需要明确操作结果时使用标准消息通道的 `command()`；连续输入的发送频率、消息序号、过期丢弃和最新值处理由应用自行设计。

## 接收数据

```python
from maopaoBleApp import DATA_TYPE_RAW, DATA_TYPE_TEXT

def receive(data_type, payload, context):
    if data_type == DATA_TYPE_RAW:
        print("binary:", payload)
    elif data_type == DATA_TYPE_TEXT:
        text = payload.decode("utf-8")
        print("text:", text)

ble.on_simple(receive)
```

`on_simple(handler)` 返回 handler，同类注册替换旧函数。回调签名为 `handler(data_type, payload, context)`：

| 参数 | 内容 |
| --- | --- |
| data_type | `DATA_TYPE_RAW = 0` 或 `DATA_TYPE_TEXT = 1` |
| payload | 已重组并复制的 bytes |
| context | `conn` 连接对象和 `received_ms` 设备接收时刻 |

类型 1 表示 UTF-8 文本，接收端需要自行调用 `payload.decode("utf-8")`。

## 接收队列

底层收到数据后先放入队列，应用回调在 `ble.poll()` 中执行。队列满时会丢弃最旧的数据，因此连续输入应控制发送频率，并保证设备主循环及时调用 `poll()`。

默认队列最多保存 8 条。确实需要容纳短时突发数据时，可以在创建服务时设置 `simple_queue_limit`；增大队列只会延后丢弃，不能提高 BLE 传输速度。

## 发送数据

| 方法 | 输入 |
| --- | --- |
| `send_simple_raw(data)` | RAW 数据，推荐 bytes |
| `send_simple_text(text)` | str，使用类型 1 |

```python
ble.send_simple_raw(b"\x01\x20\x30")
ble.send_simple_text("ready")
```

返回 `True` 表示全部分包已提交底层通知调用，不代表对端收到或业务完成。未连接、未获鉴权放行、空数据、类型无效、消息过大或通知失败时可能返回 `False`。文本类型错误可能直接抛出异常。

返回 `False` 表示本次发送没有完整提交，部分分包可能已经发出。重试和确认由业务协议决定。

## 客户端对应接口

```js
await client.sendSimpleRaw(new Uint8Array([1, 32, 48]));
await client.sendSimpleText('ready');

client.on('simpleData', (event) => {
  console.log(event.dataType, event.bytes);
  if (event.dataType === 1) console.log(event.text);
});
```

`client` 是已初始化的 BleAppClient，其发送方法会先确保应用握手完成。接收类型 1 提供 `text`。如果应用约定文本内容为 JSON，由应用自行序列化和解析。

## 消息大小

Simple 会根据当前 MTU 自动分包，单条消息的当前上限为 4024 字节；实际可发送大小还会受双方协商 MTU 限制。应用不应假定所有终端都能使用最大值，大数据应自行拆分并携带序号。

Simple 不提供业务确认、自动重传或并发消息编号。应用应限制发送频率，避免与标准消息通道的通知争用资源。自定义终端需要了解的包头、精确大小和重组规则见[接入协议](/ble/custom-client#simple-分包协议)。
