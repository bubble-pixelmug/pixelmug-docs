# WebSocket

`mps_websocket` is a walk-in WebSocket client for MPY applications. It supports `ws://` and `wss://`, suitable for server active delivery, two-way real-time messages and application connections that need to be maintained over time.

```python
import asyncio
import mps_websocket
```

`mps_websocket` Internalally reuses the WebSocket protocol from the solid. Applications only import `mps_websocket`; do not rely on internal `aiohttp.aiohttp_ws` paths.

## Create Connection

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

Returns WebSocket objects after successful connection.

| Parameters | Default value | Annotations |
| --- | --- | --- |
| `url` | shall fill | ASCII strings, supporting `ws://` and `wss://`; non-ASCII content in path and query parameters should be coded in percentage numbers first |
| `ssl_context` | `None` | `wss://` TLS context; create a client context to enable authentication of certificates when omitted |
| `headers` | `None` | Additional Request Header, passable dictionaries or key values to sequence; cannot overwrite WebSocket handshake header |
| `protocols` | `()` | requested sequence of sub-agreements; each name must be a valid and non-duplicate HTTP token |
| `timeout` | `15` | Creates TCP, TLS and WebSocket handshake timeout in seconds, which must be greater than 0 |
| `receive_timeout` | `30` | Timeout to wait for the next message in seconds; pass `None` means no timeout set for reception, otherwise must be greater than 0 |
| `close_timeout` | `2` | The time to wait for the end to close the frame at normal close, in seconds, must be greater than 0 |
| `max_msg_size` | `16384` | Maximum bytes allowed by a complete text or binary message, which must be greater than 0 |
| `proxy` | `None` | Optional HTTP CONNECT proxy; only `wss://` is currently supported in format `http://host:port` without authentication, path and query parameters |

Minimal example:

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

`ws_connect(url, **kwargs)` returns the rectangular context manager. It receives the same parameters as `connect()` and closes the connection upon exit `async with`.

```python
async def main():
    async with mps_websocket.ws_connect(
        "wss://example.com/events",
        receive_timeout=60,
    ) as ws:
        await ws.send_json({"type": "ready"})
        print(await ws.receive_json())
```

## Send Message

| Methodology | Annotations |
| --- | --- |
| `await ws.send_str(text)` | sending text messages;parameters must be string |
| `await ws.send_bytes(data)` | Send binary messages; arguments should be bytes-like objects |
| `await ws.send_json(value)` | Use JSON encoding first, then text message |
| `await ws.ping(data=b"")` | Sending Ping; control frame load cannot exceed 125 bytes |

The current send realization will encode each call as a complete WebSocket frame, without providing a sub-send interface for the application layer. A large amount of data should be split into multiple messages in the application protocol and set a reasonable limit for each message.

## Receive Message

### Receive a specific type

```python
text = await ws.receive_str()
data = await ws.receive_bytes()
value = await ws.receive_json()
```

- `receive_str()` Only text is accepted.
- `receive_bytes()` Accept binary message only.
- `receive_json()` parsing text messages from JSON.

The fractional frame received will be merged internally into a complete message and limited by `max_msg_size`.

### Receive any message type

```python
message = await ws.receive()

if message.type == mps_websocket.WSMsgType.TEXT:
    print("text:", message.data)
elif message.type == mps_websocket.WSMsgType.BINARY:
    print("binary bytes:", len(message.data))
elif message.type == mps_websocket.WSMsgType.CLOSE:
    print("peer closed")
```

Common message type:

| Type | Value | `message.data` |
| --- | ---: | --- |
| `WSMsgType.TEXT` | `1` | String |
| `WSMsgType.BINARY` | `2` | Binary Data |
| `WSMsgType.CLOSE` | `8` | Can not open message |

The Ping sent to the end will be answered automatically by achieving Pong; Pong does not return as a normal application message.

### Fragmentation

The webSocket object also supports anaesthesia:

```python
async for message in ws:
    if message.type == mps_websocket.WSMsgType.TEXT:
        print(message.data)
```

Only one recipient can be connected to the same connection at the same time. Do not allow both processes to call `receive*()` at the same time or the same WebSocket at the same time.

## Connection state and close

| Members | Annotations |
| --- | --- |
| `ws.closed` | Connection is closed |
| `ws.close_code` | Closed status code received or used |
| `ws.close_reason` | Reason for closure |
| `ws.protocol` | service-end end-selected sub-agreements; `None` without consultation |
| `await ws.close(code=1000, message="")` | Send off frame and wait for normal closure |
| `await ws.abort()` | Discard the connection without a normal handshake |

The normal path is `close()`. Only `abort()` is used if the connection has been damaged, the task is cancelled or the normal handshake cannot be continued.

## Reconnect after a disconnect

`mps_websocket` does not automatically reconnect. Applications need to define the interval for retrying and reaccreditation and subscription once each new connection is established.

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

## Current limitations

- URLs must be ASCII strings; non-ASCII paths and query parameters are encoded by application.
- The connection is currently denied when the service-side consultation is being conducted on the WebSocket extension; no compression extension is requested.
- The default limit for a message is 16 KiB, which can be adjusted by `max_msg_size`. The upper limit increases the memory to which the message is received.
- When incomplete messages are received, the current connection is cleared and cannot be reused if the reception process is cancelled, timed out or protocol error occurs.
- `wss://` Default validation service-end certificate. A device time error affects the validity of the certificate.
- Wi-Fi may be suspended for the duration of the device's syllable. When restored, the existing WebSocket should be considered to be likely to fail and reconnect as applied.
