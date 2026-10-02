# Socket

`socket` 提供底层 TCP 和 UDP 通信。只有在服务端使用自定义协议，或高级模块无法满足需求时才使用它。HTTP 请求优先使用 `requests`，WebSocket 优先使用 `mps_websocket`。

```python
import socket
```

## 创建 Socket

```python
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
```

构造函数接收 0 到 3 个位置参数，不接受关键字参数。省略时默认创建 IPv4 TCP Socket：

```python
sock = socket.socket()
```

常用常量：

| 常量 | 含义 |
| --- | --- |
| `AF_INET` | IPv4 |
| `AF_INET6` | IPv6 |
| `SOCK_STREAM` | TCP 字节流 |
| `SOCK_DGRAM` | UDP 数据报 |
| `IPPROTO_TCP` | TCP 协议 |
| `IPPROTO_UDP` | UDP 协议 |

Socket 默认是阻塞模式且没有超时。网络应用应主动设置超时，避免设备永久等待。

## 域名解析

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

返回由五元组组成的列表：

```text
(family, type, proto, canonical_name, socket_address)
```

连接第一个可用地址的基本写法：

```python
address = socket.getaddrinfo(
    "example.com",
    80,
    0,
    socket.SOCK_STREAM,
)[0][-1]
```

当 `type=0` 时，当前端口实现返回的结果类型按 `SOCK_STREAM` 处理。UDP 解析应明确传 `socket.SOCK_DGRAM`。

## TCP 客户端

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

常用方法：

| 方法 | 返回值与说明 |
| --- | --- |
| `connect(address)` | 连接远端地址 |
| `send(data)` | 发送部分或全部数据，返回实际发送的字节数 |
| `sendall(data)` | 持续发送直到完成；成功返回 `None` |
| `recv(size[, flags])` | 最多读取 `size` 字节；对端正常关闭后返回空字节串 |
| `close()` | 关闭 Socket |

`send()` 可能只发送部分数据。需要发送完整缓冲区时使用 `sendall()`，或根据返回值自行循环。

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

| 方法 | 返回值与说明 |
| --- | --- |
| `sendto(data, address)` | 发送一个数据报，返回发送的字节数 |
| `recvfrom(size[, flags])` | 返回 `(data, address)` |

UDP 不保证到达、顺序或去重。需要可靠性时，由应用协议增加序号、确认和重试，或改用 TCP。

完整的 UDP 姿态传输示例位于 `tools/studio/examples/mpy-tutorial/examples/network-udp-motion`。设备以约 50 Hz 发送 `g_sensor.get_quaternion()` 返回的四元数、序号和采样时间；配套 Node.js Viewer 校验数据包，并在浏览器中用固定坐标变换和缓冲插值驱动 Three.js 水杯模型。

## 超时和非阻塞模式

### `settimeout()`

```python
sock.settimeout(5)     # 最多等待 5 秒
sock.settimeout(0.25)  # 支持浮点秒
sock.settimeout(None)  # 恢复无限等待
```

### `setblocking()`

```python
sock.setblocking(False)
sock.setblocking(True)
```

`setblocking(False)` 等价于超时为 0 的非阻塞模式。操作暂时无法完成时会抛出 `EAGAIN` 或 `EWOULDBLOCK`，应用需要稍后重试。对于多数 MPY 应用，短超时的阻塞 Socket 比手写非阻塞轮询更简单。

## 服务端方法

固件也提供：

```python
sock.bind(address)
sock.listen(backlog=2)
client, peer = sock.accept()
```

`listen()` 省略参数时 backlog 默认为 2。PixelMug 的内存和连接生命周期更适合客户端应用；如确需监听端口，应限制并发连接数，及时关闭客户端 Socket，并考虑局域网和息屏断网的影响。

## 文件式接口

Socket 还提供：

- `makefile(mode, buffering)`
- `read()`、`readinto()`、`readline()`、`write()`
- `fileno()`

当前实现的 `makefile()` 返回 Socket 自身，不会创建独立的文件对象，也没有单独的引用生命周期。关闭该对象就是关闭原 Socket。

## Socket 选项

`setsockopt(level, option, value)` 可用于设置底层选项。当前端口导出的常用常量包括：

- `SOL_SOCKET`、`SO_REUSEADDR`、`SO_BROADCAST`、`SO_BINDTODEVICE`
- `IP_ADD_MEMBERSHIP`
- `TCP_NODELAY`
- `MSG_PEEK`、`MSG_DONTWAIT`

这些是底层协议选项，应只在明确了解服务端协议和 lwIP 行为时使用。

## 使用限制

- Socket 对象未注册 Python 上下文管理协议，使用 `try/finally` 显式关闭。
- TCP 是字节流，不保留应用消息边界；必须自行设计长度、分隔符或固定帧格式。
- `recv(size)` 返回的数据可能少于 `size`，这不代表连接已结束。
- 原始 Socket 不会自动完成 TLS。安全连接需要用 [`ssl.SSLContext`](./tls) 包装。
- DNS、连接、读写都可能失败或超时；长期连接应实现重连。
- 息屏期间固件可能关闭 Wi-Fi 射频。恢复后重新解析并建立连接，不要继续复用旧 Socket。
