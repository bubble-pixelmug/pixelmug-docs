# TLS 与证书

固件提供标准名称的 `ssl` 模块，底层由 mbedTLS 实现。应用通常不需要直接操作 TLS：

- `requests` 遇到 `https://` 时自动创建安全连接。
- `mps_websocket` 遇到 `wss://` 时自动创建安全连接。
- 只有使用私有 CA、客户端证书或原始 TLS Socket 时，才需要显式创建 `ssl.SSLContext`。

```python
import ssl
```

## 默认验证行为

客户端 TLS 上下文默认使用：

```python
ssl.PROTOCOL_TLS_CLIENT
ssl.CERT_REQUIRED
```

系统启用了 ESP 的 CA 证书包。未提供自定义上下文时，HTTPS 和 WSS 会验证服务器证书以及访问主机名。

证书验证依赖设备当前 UTC 时间。时间明显错误时，即使网络连通，也可能因为证书尚未生效或已经过期而握手失败。设备时间同步由固件处理，MPY 应用不应自行重配 Wi-Fi 或固件的时间同步流程。

## 创建上下文

```python
context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
```

| 常量 | 用途 |
| --- | --- |
| `ssl.PROTOCOL_TLS_CLIENT` | 创建客户端 TLS 上下文 |
| `ssl.PROTOCOL_TLS_SERVER` | 创建服务端 TLS 上下文 |

客户端连接应使用 `PROTOCOL_TLS_CLIENT`。`mps_websocket` 对 `wss://` 还会检查自定义上下文，`verify_mode` 不是 `CERT_REQUIRED` 时会拒绝连接。

### `verify_mode`

```python
context.verify_mode = ssl.CERT_REQUIRED
```

| 常量 | 含义 |
| --- | --- |
| `ssl.CERT_REQUIRED` | 必须验证对端证书；客户端连接应使用此值 |
| `ssl.CERT_OPTIONAL` | 请求证书但不强制要求，主要用于特定服务端场景 |
| `ssl.CERT_NONE` | 不验证对端证书 |

不要为了绕过握手错误把生产连接改成 `CERT_NONE`。应检查域名、设备时间、证书链和自定义 CA 是否正确。

## 加载私有 CA

### `load_verify_locations()`

```python
context.load_verify_locations(cafile="private-ca.pem")
```

或直接传入 PEM/DER 数据：

```python
with open("private-ca.pem", "rb") as file:
    ca_data = file.read()

context.load_verify_locations(cadata=ca_data)
```

接口签名：

```python
context.load_verify_locations(cafile=None, cadata=None)
```

`cafile` 和 `cadata` 必须且只能提供一个。显式加载 CA 后，该上下文使用这组 CA，而不再使用固件系统 CA 包；同一上下文再次调用时，会用新的 CA 数据替换之前的数据。

如果一个应用既要访问公网服务，又要访问私有 CA 服务，分别创建两个上下文更清楚：公网请求使用默认上下文，私有服务使用加载了私有 CA 的上下文。

## 加载客户端证书

### `load_cert_chain()`

```python
context.load_cert_chain(
    certfile="client-cert.pem",
    keyfile="client-key.pem",
)
```

它用于需要双向 TLS（mTLS）的服务。证书和私钥文件会读入内存，因此应控制文件大小，并只在需要时创建上下文。

## 配合 HTTPS 使用

`requests.request()` 的 `ssl_context` 参数可以接收自定义上下文：

```python
import requests
import ssl

context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
context.verify_mode = ssl.CERT_REQUIRED
context.load_verify_locations(cafile="private-ca.pem")

response = requests.get(
    "https://api.example.local/status",
    ssl_context=context,
    timeout=10,
)
try:
    print(response.status_code, response.text)
finally:
    response.close()
```

## 配合 WSS 使用

```python
import asyncio
import mps_websocket
import ssl


async def main():
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.verify_mode = ssl.CERT_REQUIRED
    context.load_verify_locations(cafile="private-ca.pem")

    async with mps_websocket.ws_connect(
        "wss://events.example.local/ws",
        ssl_context=context,
    ) as ws:
        await ws.send_str("hello")


asyncio.run(main())
```

## 包装原始 Socket

```python
tls_socket = context.wrap_socket(
    raw_socket,
    server_hostname="example.com",
)
```

接口签名：

```python
context.wrap_socket(
    sock,
    server_side=False,
    do_handshake_on_connect=True,
    server_hostname=None,
)
```

客户端证书验证与主机名校验需要正确的 `server_hostname`。使用域名连接时，应同时把该域名传给 `server_hostname`。

模块还提供兼容函数 `ssl.wrap_socket()`，但新代码优先使用 `SSLContext`，便于集中配置证书和验证策略。

## 资源与生命周期

- TLS 握手和证书链验证会占用额外内存。避免同时创建大量 HTTPS/WSS 连接。
- 请求响应、WebSocket 和底层 Socket 使用结束后都应显式关闭。
- 私钥和访问凭据不要写入日志。
- 息屏后网络可能被固件暂停。恢复时应重新建立 TLS 连接，不能假定旧会话仍然有效。
