# 连接生命周期

MPY 应用使用的是固件已经建立的 Wi-Fi 连接。应用在运行期间可以建立 HTTP、WebSocket、TCP 或 UDP 通信，但不能假定这些连接在设备的整个运行周期内一直有效。

## 应用启动时

固件负责保存 Wi-Fi 配置、连接接入点并维护设备自身的云连接。MPY 应用不需要也不应调用 `network.WLAN` 重新配置 Wi-Fi。

网络刚恢复时，应用层服务可能还未立即可用。第一次请求失败时，应按应用需求延迟后重试，而不是反复重启 Wi-Fi。

## 息屏和恢复

设备进入息屏状态时，系统进入低功耗待机模式，网络会被暂停：

1. 停止固件自身的网络连接；
2. 断开 Wi-Fi，但保留已保存的网络配置；
3. 停止 Wi-Fi 射频；
4. 在恢复时重新启动 Wi-Fi 并尝试快速重连。

MPY 虚拟机在这一阶段可以保留内存状态，但内存中的 Socket、TLS 会话和 WebSocket 对象不因此自动恢复。屏幕重新唤醒后：

- 旧连接可能已经被路由器、服务器或本机协议栈关闭；
- 第一次读写可能返回空数据、超时或抛出异常；
- WebSocket 需要重新握手；
- 应用层认证和订阅通常也需要重新执行。

因此，应把“Python 对象仍然存在”和“网络连接仍然可用”视为两件不同的事。

## 短请求的处理方式

HTTP 请求本身使用短连接。为每次请求设置超时、捕获异常，并在 `finally` 中关闭响应：

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

## 长连接的处理方式

WebSocket 和 TCP 应把一次连接的完整生命周期包在一个函数中：

1. 建立连接；
2. 完成认证和订阅；
3. 读写消息；
4. 连接关闭或异常时清理资源；
5. 等待一段时间后重新开始。

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

这个示例使用有上限的递增等待，避免网络不可用时快速循环连接服务器。实际应用还可以在成功稳定通信一段时间后重置等待时间。

## 超时建议

- 建立连接和普通 API 请求都设置有限超时。
- WebSocket `receive_timeout` 应大于服务端正常消息间隔；如果服务端长期无消息，可使用应用层心跳。
- 超时后不要继续复用接收到一半的 WebSocket 消息所在连接，重新连接更安全。
- 重试之间保留延迟，并设置最大等待时间。

## 资源清理

- `requests` 响应使用后调用 `response.close()`。
- WebSocket 正常退出时调用 `await ws.close()`，异常损坏时由上下文管理器清理，必要时使用 `abort()`。
- 原始 Socket 在 `finally` 中调用 `close()`。
- 每次重连都重新创建连接对象，不要把已经失败的对象放回连接循环。

## 不要由应用管理 Wi-Fi

应用层重连只重建自己的 HTTP、WebSocket、TLS 或 Socket 连接。不要通过 `network.WLAN` 断开、重连或修改 Wi-Fi，因为这会同时影响：

- 固件自身的云连接；
- Bot、TAL 和设备状态同步；
- Studio 调试连接；
- 同一设备上的其他网络功能。
