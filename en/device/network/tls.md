# TLS and certificates

Solids provide a `ssl` module with a standard name. The bottom is achieved by mbedTLS. Applications do not normally require direct operation of TLS:

- `requests` I met him. `https://` .
- `mps_websocket` I met him. `wss://` .
- Only private CAs, client certificates or original TLS Socket are required to create `ssl.SSLContext`.

```python
import ssl
```

## Default verification behavior

Client TLS context default used:

```python
ssl.PROTOCOL_TLS_CLIENT
ssl.CERT_REQUIRED
```

The system enabled the CA certificate package for the ESP. When the custom context is not provided, HTTPS and WSS validate server certificates and access host names.

Certificate authentication depends on the current UTC time of the device. When the time is clearly wrong, even a network connection may fail because the certificate is not yet valid or expired. The device time sync is processed by solids, and MPY applications should not rework the time synchronisation process for Wi-Fi or solids.

## Create Context

```python
context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
```

| Constant | Purpose |
| --- | --- |
| `ssl.PROTOCOL_TLS_CLIENT` | Create client TLS context |
| `ssl.PROTOCOL_TLS_SERVER` | Create Service TLS Context |

Client connection should be `PROTOCOL_TLS_CLIENT`. `mps_websocket` Checks the custom context for `wss://`, `verify_mode` not `CERT_REQUIRED` will reject the connection.

### `verify_mode`

```python
context.verify_mode = ssl.CERT_REQUIRED
```

| Constant | Meaning |
| --- | --- |
| `ssl.CERT_REQUIRED` | The peer certificate must be validated; the client connection should use this value |
| `ssl.CERT_OPTIONAL` | Request certificate but not mandatory, mainly for specific service-end scenes |
| `ssl.CERT_NONE` | Could not close temporary folder: %s |

Do not change the production connection to `CERT_NONE` to bypass a handshake error. Check whether the domain name, the device time, the certificate chain and the custom CA are correct.

## Load a private CA

### `load_verify_locations()`

```python
context.load_verify_locations(cafile="private-ca.pem")
```

or directly enter PEM/DER data:

```python
with open("private-ca.pem", "rb") as file:
    ca_data = file.read()

context.load_verify_locations(cadata=ca_data)
```

Interface signature:

```python
context.load_verify_locations(cafile=None, cadata=None)
```

`cafile` and `cadata` must and can only be provided. When the CA is loaded in a visible format, this group of CAs is used in the context instead of the firmware system CA packages; when the same context is called again, new CA data will be used to replace the previous data.

If an application is to access both public and private CA services, two contexts are to be made clearer: the public network requests a default context, and private services use a private CA context.

## Load a client certificate

### `load_cert_chain()`

```python
context.load_cert_chain(
    certfile="client-cert.pem",
    keyfile="client-key.pem",
)
```

It is used for services that require a two-way TLS (mTLS). Certificates and private key files are read into memory, so file size should be controlled and context created only when needed.

## Use with HTTPS

`requests.request()` It's... `ssl_context` Parameter can receive custom context:

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

## Use with WSS

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

## Wrap a raw socket

```python
tls_socket = context.wrap_socket(
    raw_socket,
    server_hostname="example.com",
)
```

Interface signature:

```python
context.wrap_socket(
    sock,
    server_side=False,
    do_handshake_on_connect=True,
    server_hostname=None,
)
```

Client certificate authentication requires the correct `server_hostname` for host name verification. When using a domain name, the domain name is also given to `server_hostname`.

The module also provides a compatible function `ssl.wrap_socket()`, but the new code gives preference to `SSLContext` to allow for a centralized configuration of certificates and validation policies.

## Resources and lifecycle

- TLS handshakes and certificate chain authentications the extra memory. Avoid creating a large number of HTTPS/ WSS connections at the same time.
- The response to the request, WebSocket and the bottom Socket should be closed visibly after their use.
- Private keys and access documents do not write to logs.
- The network may be suspended after the symlink. The TLS connection should be re-established, and the old session cannot be assumed to remain valid.
