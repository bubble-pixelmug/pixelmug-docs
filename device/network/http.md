# HTTP 与 HTTPS

当前固件使用 micropython-lib 的 `requests` 模块提供同步 HTTP 客户端。它适合 REST API、JSON 请求以及大小可控的文件下载。

```python
import requests
```

`urequests` 仍可作为兼容别名导入，但新应用统一使用 `requests`。

## 最小请求

```python
import requests

response = None
try:
    response = requests.get(
        "https://example.com/status",
        timeout=10,
    )
    print("status:", response.status_code)
    print("body:", response.text)
finally:
    if response is not None:
        response.close()
```

`requests` 是同步阻塞接口。DNS、建立 TCP 连接、TLS 握手、发送请求和读取响应期间，当前 Python 调用都会等待。始终设置 `timeout`。

## 请求接口

```python
requests.request(
    method,
    url,
    data=None,
    json=None,
    headers=None,
    stream=None,
    auth=None,
    timeout=None,
    parse_headers=True,
    ssl_context=None,
)
```

便捷方法：

```python
requests.head(url, **kwargs)
requests.get(url, **kwargs)
requests.post(url, **kwargs)
requests.put(url, **kwargs)
requests.patch(url, **kwargs)
requests.delete(url, **kwargs)
```

| 参数 | 默认值 | 当前行为 |
| --- | --- | --- |
| `method` | 必填 | HTTP 方法字符串 |
| `url` | 必填 | `http://` 或 `https://` URL |
| `data` | `None` | 字节、字符串或可迭代的数据块；不自动编码字典或表单 |
| `json` | `None` | 用 `json.dumps()` 编码；与 `data` 不能同时使用；缺省时补 `Content-Type: application/json` |
| `headers` | `None` | 请求头字典；内部会复制一份，不直接修改传入字典 |
| `stream` | `None` | 当前实现保留此参数用于兼容，但没有根据其值切换行为 |
| `auth` | `None` | `(username, password)`，生成 HTTP Basic Authentication 请求头 |
| `timeout` | `None` | Socket 超时，单位为秒；可传整数或浮点数 |
| `parse_headers` | `True` | `True` 生成响应头字典；`False` 不保存响应头；也可以传入底层解析回调 |
| `ssl_context` | `None` | HTTPS 使用的自定义 `SSLContext`；省略时创建默认安全客户端上下文 |

如果同时传入 `data` 和 `json`，当前实现通过断言拒绝请求。

### 发送 JSON

```python
import requests

response = None
try:
    response = requests.post(
        "https://api.example.com/readings",
        json={"temperature": 26.5, "unit": "C"},
        headers={"Authorization": "Bearer TOKEN"},
        timeout=10,
    )
    print(response.status_code)
    result = response.json()
    print(result)
finally:
    if response is not None:
        response.close()
```

### 发送原始数据

```python
payload = b"pixelmug"
response = requests.put(
    "http://192.168.1.20/data",
    data=payload,
    headers={"Content-Type": "application/octet-stream"},
    timeout=5,
)
try:
    print(response.status_code)
finally:
    response.close()
```

对于带 `__next__`、但没有 `__len__` 的数据迭代器，如果调用方没有设置 `Content-Length` 或 `Transfer-Encoding`，当前实现会使用 chunked 请求体逐块发送。该能力只针对请求体；当前实现不支持 chunked 响应体。

## Response

请求成功建立并读取完响应头后返回 `Response`：

| 成员 | 含义 |
| --- | --- |
| `status_code` | HTTP 状态码整数 |
| `reason` | 状态行中的原因字段；当前实现保留为字节数据 |
| `headers` | 响应头字典；仅在启用头解析时存在，键保持服务器返回的大小写 |
| `raw` | 尚未读取完响应体的底层 Socket 流 |
| `encoding` | `text` 使用的字符编码，默认 `"utf-8"` |
| `content` | 一次读取全部响应体并缓存为 `bytes` |
| `text` | 按 `encoding` 解码完整响应体 |
| `json()` | 读取完整响应体并调用 `json.loads()` |
| `close()` | 关闭底层流并清理响应缓存 |

读取 `content`、`text` 或 `json()` 会把剩余响应体全部载入 MicroPython 堆。响应可能较大时应直接分块读取 `raw`。

## 分块下载

```python
import requests

response = None
try:
    response = requests.get(
        "https://example.com/asset.bin",
        timeout=10,
    )
    if response.status_code != 200:
        raise RuntimeError("HTTP status %d" % response.status_code)

    buffer = bytearray(2048)
    with open("asset.bin", "wb") as output:
        while True:
            size = response.raw.readinto(buffer)
            if not size:
                break
            output.write(memoryview(buffer)[:size])
finally:
    if response is not None:
        response.close()
```

当前 `stream` 参数不会改变响应对象；是否分块由应用选择读取 `response.raw`，还是读取 `content`、`text`、`json()` 决定。

## 重定向

当前实现识别 `301`、`302`、`303`、`307` 和 `308`：

- `301`、`302`、`303` 改用 `GET` 请求新地址；
- `307`、`308` 保留原方法和请求数据；
- 重定向到新的主机时会重新生成 `Host`；
- HTTPS 请求拒绝降级重定向到 HTTP。

## HTTPS

`https://` 请求在没有传入 `ssl_context` 时会创建 TLS 客户端上下文，并设置：

```python
context.verify_mode = ssl.CERT_REQUIRED
```

固件已连接公共 CA 证书包。访问公共 CA 签发的服务通常不需要额外配置。私有 CA 和客户端证书见 [TLS 与证书](./tls)。

证书验证依赖正确的系统 UTC。时间由固件管理，应用不要自行调用 `ntptime` 修改系统时间。

## 当前限制

- 使用 HTTP/1.0，并默认发送 `Connection: close`，不提供连接池。
- 不支持 chunked 响应；检测到 `Transfer-Encoding: chunked` 时抛出 `ValueError`。
- 不自动解压 gzip 或 deflate 响应。
- 不自动进行表单、multipart 或文件上传编码。
- `headers` 是普通字典，不提供 CPython Requests 的大小写无关响应头对象。
- `timeout` 是单个 Socket 超时值，不区分连接、读取和写入超时。
- HTTP 状态码为 4xx 或 5xx 时仍返回 `Response`，不会自动抛出 `HTTPError`。
- 没有 `raise_for_status()`、Session 或连接复用接口。

## 资源与异常

```python
response = None
try:
    response = requests.get(URL, timeout=10)
    if response.status_code != 200:
        raise RuntimeError("unexpected status: %d" % response.status_code)
    handle(response)
except OSError as error:
    print("network error:", error)
finally:
    if response is not None:
        response.close()
```

不要只在成功路径关闭响应。DNS 失败、连接超时、TLS 验证失败和读取中断都可能表现为 `OSError`；无效 URL、协议和部分响应格式也可能抛出 `ValueError`。应用通常应记录原始异常，再按[连接生命周期](./lifecycle)决定是否重试。
