# Connection lifecycle

MPY applications use Wi-Fi connections that have already been established for solids. Application can create HTTP, WebSocket, TCP or UDP communications during run-time, but cannot be assumed to have been valid throughout the life of the device.

## Application startup

Solids are responsible for preserving Wi-Fi configuration, connecting access points and maintaining the device's own cloud connection. MPY applications do not need and should not call `network.WLAN` to reconfigure Wi-Fi.

The application layer may not be immediately available when the network is restored. When the first request fails, it should be retried after application needs have been delayed, rather than restarting Wi-Fi repeatedly.

## Callback context

When the device enters a syllable state, the system enters a low-capacity stand-by mode and the network is suspended:

1. Stop the firmware itself of network connections;
2. Disconnect Wi-Fi, but keep saved network configurations;
3. Stop Wi-Fi frequency;
4. Reactivate Wi-Fi on recovery and try to reconnect quickly.

The MPY virtual machine can retain the memory at this stage, but the memory Socket, TLS Session and WebSocket objects do not automatically recover as a result. Once the screen wakes up:

- Old connections may have been closed by routers, servers or in-house agreements;
- First reading and writing may return empty data, time overruns or throw anomalies;
- WebSocket needs to shake hands again;
- Application layer authentication and subscriptions are usually also required for re-implementation.

Therefore, “Python objects still exist” and “network connections still exist” should be considered two different things.

## Short-lived requests

HTTP requests use short connections for themselves. Set timeout, capture anomalies for each request and close the response in `finally`:

```python
import requests
import time


def fetch_status():
    response = None
    try:
        response = requests.get(
            "https://example.com/status",
            timeout=10,
        )
        if response.status_code == 200:
            return response.json()
        print("HTTP status:", response.status_code)
    except Exception as exc:
        print("request failed:", exc)
    finally:
        if response is not None:
            response.close()

    return None


while True:
    value = fetch_status()
    if value is not None:
        print(value)
    time.sleep(30)
```

## Long-lived connections

WebSocket and TCP should wrap the full life cycle of a connection in a function:

1. (b) Establishing connectivity;
2. Complete authentication and subscription;
3. Read and write news;
4. Clean-up of resources when the connection is closed or unusual;
5. Waiting for some time to start over.

```python
import asyncio
import mps_websocket


async def connected_session():
    async with mps_websocket.ws_connect(
        "wss://example.com/events",
        receive_timeout=45,
    ) as ws:
        await ws.send_json({"type": "login", "token": "..."})
        await ws.send_json({"type": "subscribe", "topic": "device"})

        async for message in ws:
            if message.type == mps_websocket.WSMsgType.TEXT:
                print(message.data)


async def main():
    retry_seconds = 2

    while True:
        try:
            await connected_session()
            retry_seconds = 2
        except Exception as exc:
            print("connection lost:", exc)

        await asyncio.sleep(retry_seconds)
        retry_seconds = min(retry_seconds * 2, 30)


asyncio.run(main())
```

This example uses a maximum incremental waiting period to avoid a fast cycle connection server when the network is not available. The practical application can also reset the waiting time after a period of success in stabilizing communications.

## Timeout Recommendations

- Creates a connection and a normal API request setting a limited timeout.
- WebSocket `receive_timeout` should be greater than normal service-end news interval; if service-end is long-term no news, the application level heartbeat can be used.
- Do not re-repeat half of the WebSocket message connection after time has passed, and reconnecting is safer.
- Keep delay between retests and set maximum waiting time.

## Resource cleanup

- `requests` Call `response.close()` when used.
- WebSocket calls `await ws.close()` when it is normally out, and the context manager cleans up for abnormal damage, using `abort()` if necessary.
- Original Socket in `finally` Medium Call `close()`.
- Recreates the connect object every time you reconnect, and does not put the failed object back into the connect cycle.

## Do not manage Wi-Fi from the application

The application layer reconnecting only to recreate its own HTTP, WebSocket, TLS or Socket connection. Do not disconnect, reconnect or modify Wi-Fi by `network.WLAN` because this affects:

- (a) Solid elements of their own cloud connections;
- Bot, TAL and device status synchronization;
- Studio debugging connections;
- Other network functions on the same device.
