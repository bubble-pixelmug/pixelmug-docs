# HTTP and HTTPS

The current firmware uses the micropython-lib module `requests` to provide sync HTTP client. It fits RET API, JSON requests and size-controlled file downloads.

```python
import requests
```

`urequests` may still be imported as a compatible aliases, but new applications are used `requests`.

## Minimal request

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

`requests` is the simultaneous blocking interface. The current Python call is waiting during the DNS, TCP connection, TLS handshake, send requests and read responses. Set `timeout` at all times.

## Request Interface

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

An easy-to-use approach:

```python
requests.head(url, **kwargs)
requests.get(url, **kwargs)
requests.post(url, **kwargs)
requests.put(url, **kwargs)
requests.patch(url, **kwargs)
requests.delete(url, **kwargs)
```

| Parameters | Default value | Current behaviour |
| --- | --- | --- |
| `method` | shall fill | HTTP method string |
| `url` | shall fill | `http://` or `https://` URL |
| `data` | `None` | bytes, strings or invertable data blocks;not automatically encoded dictionaries or forms |
| `json` | `None` | Encoding with `json.dumps()`; not available at `data`; and replacing `Content-Type: application/json` when default |
| `headers` | `None` | Request header dictionary; a copy will be copied internally and not directly modified for uploading to the dictionary |
| `stream` | `None` | Currently achieves the retention of this parameter for compatibility, but does not switch to its value |
| `auth` | `None` | `(username, password)`, generate HTTP Basic Information Request Header |
| `timeout` | `None` | Socket timeout in seconds; integer or floating point numbers |
| `parse_headers` | `True` | `True` Generates response headers; `False` does not save response headers; it can also be sent to bottom resolution back |
| `ssl_context` | `None` | Custom `SSLContext` for HTTPS; create default security client context when omitted |

If both `data` and `json` are being carried in, the request is being denied by an assertion.

### Send JSON

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

### Send raw data

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

For data anipheries with `__next__` but without `__len__`, if the caller does not set `Content-Length` or `Transfer-Encoding`, the chunked request will be sent on a block-by-block basis. This capability is only for the request; the chunked response is not supported at this time.

## Response

Request to successfully create and read the response head and return to `Response`:

| Members | Meaning |
| --- | --- |
| `status_code` | HTTP Status Code Integer |
| `reason` | cause field in status line;current achieves byte data |
| `headers` | Respond to head dictionaries; only exists when head resolution is enabled, key keeps case back from the server |
| `raw` | The bottom Socket stream of the response is not yet read out |
| `encoding` | `text` character encoding, default `"utf-8"` |
| `content` | Read all responses at once and cache to `bytes` |
| `text` | Press `encoding` to decode the complete response |
| `json()` | Read the complete response and call `json.loads()` |
| `close()` | Close bottom stream and clear response cache |

Read `content`, `text` or `json()` You can load all the rest of the reponse in the MicroPython stack. Response may be larger and read directly in segments `raw`.

## Chunked downloads

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

The current `stream` parameter does not change the responding object; the decision whether the section is to be divided by the application choice `response.raw` or `content`, `text`, `json()`.

## Redirect

Current achievement of identification `301`, `302`, `303`, `307` and `308`:

- `301`, `302`, `303` to `GET` for new address;
- `307`, `308` retain the original methodology and requested data;
- Redirect to the new host and recreate `Host`;
- HTTPS requests to refuse to re-direct downgrade to HTTP.

## HTTPS

`https://` Requests to create a context for the TLS client without `ssl_context` and set:

```python
context.verify_mode = ssl.CERT_REQUIRED
```

Solids are connected to a public CA certificate package. Access to services issued by a public CA usually does not require additional configuration. Private CA and client certificates are available at [TLS and Certificate](./tls).

Certificate authentication relies on the correct system UTC. Time is managed by firmware, and application does not use `ntptime` to modify system time.

## Current limitations

- Use HTTP/1.0 and send `Connection: close` by default, without a connection pool.
- chunked 's response is not supported; when `Transfer-Encoding: chunked` is detected, throw `ValueError`.
- No automatic gzip or deflate response.
- Do not automatically upload forms, multipart or files.
- `headers` is a normal dictionary without CPythonRequests case unresponsive header.
- `timeout` is a single Socket timeout value that does not distinguish between connection, reading and writing timeout.
- The HTTP status code 4xx or 5xx returns `Response` and does not automatically eject `HTTPError`.
- No `raise_for_status()`, Session or connect to reuse interface.

## Resources and exceptions

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

Do not only close the response to a successful path. DNS failure, connection timeout, TLS validation failure and readout break can be `OSError`; invalid URLs, protocols, and partial response formats can also be thrown `ValueError`. Applications should normally record original anomalies and decide whether to retry by [Connect life cycle](./lifecycle).
