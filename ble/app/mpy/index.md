# 设备端 MPY BLE 接口

PixelMug 上的 MPY 应用使用固件内置的 `maopaoBleApp.BleAppService`。本节以连接冒泡 App 为例，开放连接也使用同样的接口，只需在启动时显式选择 `AUTH_MODE_NONE`。自定义中心设备如何发送数据见[开放协议](/ble/custom-client)。一个 MPY 应用使用一个 `BleAppService` 实例，同时提供标准消息通道（F150）和高速数据通道（F160，Simple）。PixelMug 只作为外设广播并接受连接。

如果还没有运行过完整项目，先阅读[总体框架与最小示例](../)。

## 创建服务

```python
from maopaoBleApp import BleAppService

ble = BleAppService("MyApp")
```

`app_id` 是应用标识，必须与 WebApp 创建 `BleAppClient` 时使用的 `appId` 一致。大多数应用只需要传入这个参数。

`app_version` 是可选的版本描述，默认为 `"1.0"`，随 hello 响应返回。需要自定义时可以写成：

```python
ble = BleAppService("MyApp", app_version="1.1")
```

其余构造参数用于消息大小、配置传输或队列容量调优，通常保留默认值。相关参数分别在[命令与响应](./commands#消息大小与失败)、[配置传输](./config#传输参数)和[高速数据通道](./simple#接收队列)中说明。

## 启动与选择模式

```python
from maopaoBleApp import AUTH_MODE_NONE, AUTH_MODE_RESPONDER

ble.start(auth_mode=AUTH_MODE_RESPONDER)  # 冒泡 App，默认模式
# 开放模式改为：ble.start(auth_mode=AUTH_MODE_NONE)
```

模式选项关键字参数是 `auth_mode`。`AUTH_MODE_NONE = 0`，`AUTH_MODE_RESPONDER = 2`。`start()` 返回当前实例，启动后自动广播，断开后由后续 `poll()` 恢复广播。



已启动时再次调用 `start()` 直接返回，不会切换模式。应用应事先决定模式；如需改变配置，应结束当前连接与服务后重新初始化，不在现有会话中切换。

## 三个状态

| 属性 | 意义 |
| --- | --- |
| `connected` | 应用层已处理连接事件 |
| `authenticated` | 底层允许业务通信；无鉴权模式连接后也会为 True，不代表验证过身份 |
| `ready` | 已通过 F150 完成应用握手并建立应用会话 |

连接成功不等于鉴权完成，鉴权完成也不等于标准消息通道已经可以处理业务。

### hello 是什么

`hello` 是 `maopaoBleApp` 标准消息通道内部使用的应用握手消息，不是 BLE 配对或身份鉴权。它用于检查协议版本和 `appId`，并建立本次应用会话。

使用冒泡 App 时，WebApp 调用 `await client.connect(device)` 会自动发送 `hello`，设备端的 `BleAppService` 也会自动处理。开发者不需要自行发送 `hello`，也不需要为它注册处理函数；只需等待 `connect()` 完成，或在设备端观察 `ready` / `on_ready()`。

只有开发自定义 BLE 中心设备并使用标准消息通道时，才需要实现 `hello` 消息。具体格式见[自定义终端的 hello 与会话](/ble/custom-client#hello-与会话)。

### 传输时机与生命周期

标准消息通道的命令、状态、事件和配置需要等待 `ready`。需要在会话建立时启动业务流程，可以用生命周期回调设置标志，并在主循环中处理业务：

```python
session_ready = False

def connected(conn):
    print("BLE connected")

def ready(conn, session_id):
    global session_ready
    session_ready = True

def disconnected(conn, reason):
    global session_ready
    session_ready = False

def failed(error):
    print("BLE error:", error)

ble.on_connect(connected)
ble.on_ready(ready)
ble.on_disconnect(disconnected)
ble.on_error(failed)

def update(rt):
    ble.poll()
    if session_ready:
        update_connected_business()
```

回调中只更新标志或记录错误，把绘图、音频、文件和网络等工作留在主循环。同类回调再次注册会替换前一个；断开原因和错误对象不应假定为固定结构。

WebApp 应先等待连接完成，再调用业务接口：

```js
await client.connect(device);
await client.command('echo', { text: 'echo' });
```

Simple 的底层收发不要求应用握手，只要求连接已被当前模式放行。冒泡 SDK 会先完成应用握手再发送 Simple，因此配合冒泡 WebApp 时仍建议设备主动发送前等待 `ble.ready`。开放模式的自定义中心设备如果只使用 Simple，可以在 `authenticated` 为 `True` 后传输，不需要发送 `hello`。

`on_ready` 表示设备已经建立会话并排队 hello 响应，不保证客户端已经处理该响应。需要业务确认的操作仍应使用 `command()`，不能把 `on_ready` 当作对端已执行某项业务的确认。应用层没有公开的 `on_auth()`；通常等待 `on_ready()` 即可开始标准消息通道的业务。

## 驱动消息处理

```python
ble.poll()
```

定期调用 `poll()` 才会推进鉴权、收发消息和应用回调。大多数应用使用默认参数即可；主循环长时间不调用它会导致积压、丢弃和客户端超时。只有确实需要限制单次处理时间或消息数量时，才调整 `budget_ms`、`max_messages` 和 `max_simple_messages`。配置的实际应用需要另调 `process_pending_config()`。

## 主动断开

调用 `ble.disconnect()` 请求断开当前物理 BLE 连接，返回当前服务实例；没有当前连接时不执行操作。服务仍保留，断开事件处理后由后续 `poll()` 恢复广播，客户端可以重新连接。

断开是异步过程，应以 `on_disconnect(conn, reason)` 确认完成。不要在需要返回响应的命令回调中立即断开；先返回响应，再在主循环中发起断开。此方法需要包含该接口的更新固件。

## 断开、休眠与清理

断开连接后，当前 session、待处理标准消息通道消息、Simple 队列、发送队列和响应缓存会清空；未提交配置会中止。已提交、等待应用的配置仍保留，后续处理可能在断开后发生。

系统休眠时会停止广播并请求断开连接；恢复后需要主循环继续调用 `poll()` 才能推进广播恢复。客户端重新连接后必须重新鉴权（冒泡模式）并重新 hello，不能复用旧 session。

应用退出时调用 `ble.deinit()`。它清理应用会话、配置临时文件和服务状态，并停止广播。当前实现不保证此方法立即断开物理链路；客户端应在退出通信时主动断开，不将它当作远端断连确认。

## 统计信息

`ble.stats()` 返回字典快照，可用于诊断。下面仅列出本节公开接口相关的常用字段：

| 字段 | 含义 |
| --- | --- |
| `ready` | 当前是否已建立应用会话 |
| `rx`、`tx` | 标准消息通道的应用消息接收数、提交成功数 |
| `decode_errors` | 标准消息通道消息解码错误数 |
| `queue_drops`、`outbox_drops` | 普通接收／发送队列丢弃数 |
| `simple_rx`、`simple_tx`、`simple_drops` | Simple 接收、发送成功和丢弃数 |

需要排查连接后没有数据或连续数据出现丢失时，可以按需打印：

```python
def print_ble_stats():
    stats = ble.stats()
    print("ready:", stats["ready"])
    print("message rx/tx:", stats["rx"], stats["tx"])
    print("message errors:", stats["decode_errors"])
    print("message drops:", stats["queue_drops"], stats["outbox_drops"])
    print("simple rx/tx/drops:",
          stats["simple_rx"], stats["simple_tx"], stats["simple_drops"])
```

例如在调试按键被按下或发现通信异常时调用一次 `print_ble_stats()`。不要在每一帧持续打印，否则日志输出本身可能拖慢主循环。

`tx` 和 `simple_tx` 不代表对端已处理业务。附带的 `transport` 字典是内部诊断信息，字段不作为稳定接口。
