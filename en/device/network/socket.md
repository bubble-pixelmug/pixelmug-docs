# Socket

`socket` Provides lower level TCP and UDP communications. Use it only if the service-end is using a custom protocol or if the advanced module is unable to meet the demand. HTTP requests to give priority to `requests`, and WebSocket to `mps_websocket`.

```python
import socket
```

## Create Socket

```python
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
```

Construct function receives 0 to 3 position parameters and does not accept keyword parameters. Default creation of IPv4 TCP Socket when omitted:

```python
sock = socket.socket()
```

Common constant:

| Constant | Meaning |
| --- | --- |
| `AF_INET` | IPv4 |
| `AF_INET6` | IPv6 |
| `SOCK_STREAM` | TCP bytes |
| `SOCK_DGRAM` | UDP Data Reporting |
| `IPPROTO_TCP` | TCP Protocol |
| `IPPROTO_UDP` | UDP Protocol |

Socket default is a blocker mode and there is no timeout. Network applications should set up timeouts on their own initiative to avoid permanent waiting for the device.

## DNS resolution

### `getaddrinfo()`

```python
addresses = socket.getaddrinfo(
    host,
    port,
    family=0,
    type=0,
    proto=0,
    flags=0,
)
```

Returns a list of five-member groups:

```text
(family, type, proto, canonical_name, socket_address)
```

Basic writing to connect to the first available address:

```python
address = socket.getaddrinfo(
    "example.com",
    80,
    0,
    socket.SOCK_STREAM,
)[0][-1]
```

When `type=0`, the result type of the current port to return is treated as `SOCK_STREAM`. The UDP resolution should be sent as `socket.SOCK_DGRAM`.

## TCP client

```python
import socket

address = socket.getaddrinfo(
    "example.com",
    80,
    0,
    socket.SOCK_STREAM,
)[0][-1]

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(10)

try:
    sock.connect(address)
    sock.sendall(b"GET / HTTP/1.0\r\nHost: example.com\r\n\r\n")

    while True:
        data = sock.recv(512)
        if not data:
            break
        print(data)
finally:
    sock.close()
```

Common methods:

| Methodology | Return value and description |
| --- | --- |
| `connect(address)` | Connect remote addresses |
| `send(data)` | Sends some or all data, returns the number of bytes actually sent |
| `sendall(data)` | Sending continuously until completion; successfully returning `None` |
| `recv(size[, flags])` | Read `size` bytes maximum; return empty bytes after the end is normally closed |
| `close()` | Close Socket |

`send()` may send only partial data. Use `sendall()` when sending a complete buffer zone or recycle on the basis of return values.

## UDP

```python
import socket

address = socket.getaddrinfo(
    "192.168.1.20",
    9000,
    0,
    socket.SOCK_DGRAM,
)[0][-1]

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(3)

try:
    sent = sock.sendto(b"hello", address)
    data, peer = sock.recvfrom(512)
    print("received", data, "from", peer)
finally:
    sock.close()
```

| Methodology | Return value and description |
| --- | --- |
| `sendto(data, address)` | Sends a data report, returns the bytes sent |
| `recvfrom(size[, flags])` | returns `(data, address)` |

UDP does not guarantee arrival, order or weight. If reliability is required, the application protocol adds a serial number, confirms and retrys, or changes to TCP.

The complete UDP attitude transfer example is at `tools/studio/examples/mpy-tutorial/examples/network-udp-motion`. The device sends about 50 Hz the four-digit, sequence and sample time returned by `g_sensor.get_quaternion()`; it supports the Node.js Viewer verification package and drives the Three.js cup model in the browser with a fixed coordinate transformation and buffer plug.

## Timeouts and non-blocking mode

### `settimeout()`

```python
sock.settimeout(5)     # Waiting at most 5 秒
sock.settimeout(0.25)  # Supporting floating point seconds
sock.settimeout(None)  # Restoring an infinite waiting period
```

### `setblocking()`

```python
sock.setblocking(False)
sock.setblocking(True)
```

`setblocking(False)` Equivalent to 0 is a non-stop mode. When the operation cannot be completed for the time being, the application will be dropped `EAGAIN` or `EWOULDBLOCK`, and the application will need to be retried at a later stage. For most MPY applications, the short-time block Socket is simpler than handwritten unstopped round.

## Server-side APIs

Solids also provide:

```python
sock.bind(address)
sock.listen(backlog=2)
client, peer = sock.accept()
```

`listen()` Backlog defaults 2. PixelMug 's memory and connection life cycle is more appropriate for client applications; if a listening port is required, it should limit and distribute the number of connections, close the client Socket in a timely manner and consider the impact of the local area network and the break-off.

## File-like APIs

Socket also provides:

- `makefile(mode, buffering)`
- `read()`, `readinto()`, `readline()`, `write()`
- `fileno()`

The `makefile()` currently achieved returns Socket itself, does not create a separate file object, nor does it have a single reference life cycle. Closes the object is to close the original Socket.

## Socket options

`setsockopt(level, option, value)` can be used to set the bottom options. The common constants from the current port include:

- `SOL_SOCKET`, `SO_REUSEADDR`, `SO_BROADCAST`, `SO_BINDTODEVICE`
- `IP_ADD_MEMBERSHIP`
- `TCP_NODELAY`
- `MSG_PEEK`, `MSG_DONTWAIT`

These are bottom protocol options that should be used only when there is a clear understanding of service-end protocols and lwIP behaviour.

## Usage limitations

- Socket object is not registered in the Python context management protocol, which is closed using `try/finally` visible.
- TCP is a byte stream that does not keep the applied message boundary; it must be self-designed for length, separator or fixed frame format.
- `recv(size)` returns data may be less than `size`, which does not mean that the connection is closed.
- Original Socket does not automatically complete TLS. Secure connections require [`ssl.SSLContext`](./tls) packaging.
- DNS, connection, reading and writing can fail or be time-consuming; long-term connections should be reconnected.
- The wi-Fi radio frequency may be closed during the sabbatical period. Resolve and connect when restored, and do not continue to repeat old Socket.
