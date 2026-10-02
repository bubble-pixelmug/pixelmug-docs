# WebSocket

`mps_websocket` 是 MPY 应用使用的异步 WebSocket 客户端。它支持 `ws://` 和 `wss://`，适合服务器主动推送、双向实时消息以及需要长期保持的应用连接。

```python
import asyncio
import mps_websocket
```

`mps_websocket` 内部复用了固件中的 WebSocket 协议实现。应用只需导入 `mps_websocket`；不要依赖内部的 `aiohttp.aiohttp_ws` 路径。

## 建立连接

### `connect()`

```python
await mps_websocket.connect(
    url,
    ssl_context=None,
    headers=None,
    protocols=(),
    timeout=15,
    receive_timeout=30,
    close_timeout=2,
    max_msg_size=16384,
    proxy=None,
)
```

连接成功后返回 WebSocket 对象。

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `url` | 必填 | ASCII 字符串，支持 `ws://` 和 `wss://`；路径和查询参数中的非 ASCII 内容应先进行百分号编码 |
| `ssl_context` | `None` | `wss://` 使用的 TLS 上下文；省略时创建启用证书校验的客户端上下文 |
| `headers` | `None` | 附加请求头，可传字典或键值对序列；不能覆盖 WebSocket 握手保留头 |
| `protocols` | `()` | 请求的子协议序列；每个名称必须是合法且不重复的 HTTP token |
| `timeout` | `15` | 建立 TCP、TLS 和 WebSocket 握手的超时时间，单位为秒，必须大于 0 |
| `receive_timeout` | `30` | 等待下一条消息的超时时间，单位为秒；传 `None` 表示不设置接收超时，否则必须大于 0 |
| `close_timeout` | `2` | 正常关闭时等待对端关闭帧的时间，单位为秒，必须大于 0 |
| `max_msg_size` | `16384` | 一条完整文本或二进制消息允许的最大字节数，必须大于 0 |
| `proxy` | `None` | 可选 HTTP CONNECT 代理；当前只支持 `wss://`，格式为不带认证、路径和查询参数的 `http://host:port` |

最小示例：

```python
import asyncio
import mps_websocket


async def main():
    ws = await mps_websocket.connect("wss://example.com/events")
    try:
        await ws.send_str("hello")
        reply = await ws.receive_str()
        print(reply)
    finally:
        await ws.close()


asyncio.run(main())
```

### `ws_connect()`

`ws_connect(url, **kwargs)` 返回异步上下文管理器。它接收与 `connect()` 相同的参数，并在退出 `async with` 时关闭连接。

```python
async def main():
    async with mps_websocket.ws_connect(
        "wss://example.com/events",
        receive_timeout=60,
    ) as ws:
        await ws.send_json({"type": "ready"})
        print(await ws.receive_json())
```

## 发送消息

| 方法 | 说明 |
| --- | --- |
| `await ws.send_str(text)` | 发送文本消息；参数必须是字符串 |
| `await ws.send_bytes(data)` | 发送二进制消息；参数应为 bytes-like 对象 |
| `await ws.send_json(value)` | 先用 JSON 编码，再作为文本消息发送 |
| `await ws.ping(data=b"")` | 发送 Ping；控制帧负载不能超过 125 字节 |

当前发送实现会把每次调用编码为一个完整 WebSocket 帧，不提供应用层的分片发送接口。大量数据应在应用协议中拆成多条消息，并为每条消息设置合理的上限。

## 接收消息

### 按类型接收

```python
text = await ws.receive_str()
data = await ws.receive_bytes()
value = await ws.receive_json()
```

- `receive_str()` 只接受文本消息。
- `receive_bytes()` 只接受二进制消息。
- `receive_json()` 从文本消息解析 JSON。

收到的分片帧会在内部合并为一条完整消息，并受 `max_msg_size` 限制。

### 接收任意类型

```python
message = await ws.receive()

if message.type == mps_websocket.WSMsgType.TEXT:
    print("text:", message.data)
elif message.type == mps_websocket.WSMsgType.BINARY:
    print("binary bytes:", len(message.data))
elif message.type == mps_websocket.WSMsgType.CLOSE:
    print("peer closed")
```

常用消息类型：

| 类型 | 数值 | `message.data` |
| --- | ---: | --- |
| `WSMsgType.TEXT` | `1` | 字符串 |
| `WSMsgType.BINARY` | `2` | 二进制数据 |
| `WSMsgType.CLOSE` | `8` | 关闭信息 |

对端发来的 Ping 会由实现自动回复 Pong；Pong 不作为普通应用消息返回。

### 异步迭代

WebSocket 对象也支持异步迭代：

```python
async for message in ws:
    if message.type == mps_websocket.WSMsgType.TEXT:
        print(message.data)
```

同一个连接同一时间只能有一个接收者。不要让两个协程同时调用 `receive*()` 或同时迭代同一个 WebSocket。

## 连接状态和关闭

| 成员 | 说明 |
| --- | --- |
| `ws.closed` | 连接是否已经关闭 |
| `ws.close_code` | 收到或使用的关闭状态码 |
| `ws.close_reason` | 关闭原因 |
| `ws.protocol` | 服务端最终选择的子协议；未协商时为 `None` |
| `await ws.close(code=1000, message="")` | 发送关闭帧并等待正常关闭 |
| `await ws.abort()` | 直接丢弃连接，不进行正常关闭握手 |

正常路径使用 `close()`。只有连接已经损坏、任务正在取消或无法继续执行正常握手时，才使用 `abort()`。

## 断线重连示例

`mps_websocket` 不会自动重连。应用需要定义重试间隔，并在每次新连接建立后重新认证和订阅。

```python
import asyncio
import mps_websocket


async def run_connection():
    async with mps_websocket.ws_connect(
        "wss://example.com/events",
        receive_timeout=45,
    ) as ws:
        await ws.send_json({"type": "subscribe", "topic": "status"})

        async for message in ws:
            if message.type == mps_websocket.WSMsgType.TEXT:
                print(message.data)


async def main():
    while True:
        try:
            await run_connection()
        except Exception as exc:
            print("WebSocket disconnected:", exc)
        await asyncio.sleep(3)


asyncio.run(main())
```

## 当前限制

- URL 必须是 ASCII 字符串；非 ASCII 路径和查询参数由应用编码。
- 服务端协商 WebSocket 扩展时，当前实现会拒绝连接；不要请求压缩扩展。
- 一条消息默认上限为 16 KiB，可通过 `max_msg_size` 调整。提高上限会增加接收消息占用的内存。
- 收到不完整消息时，如果接收协程被取消、超时或发生协议错误，当前连接会被清理，不能继续复用。
- `wss://` 默认校验服务端证书。设备时间错误会影响证书有效期校验。
- Wi-Fi 在设备息屏期间可能被固件暂停。恢复后应把已有 WebSocket 视为可能失效，并按应用策略重新连接。
