# Device-side MPY BLE API

The MPY application on PixelMug uses the `maopaoBleApp.BleAppService` embedded in the firmware. This section uses the same interface for open access, for example, to Bubble App, with only the obvious selection `AUTH_MODE_NONE` at startup. See [Open Agreement](/en/ble/custom-client) for customised central device how to send data. An MPY application uses an example `BleAppService` with a standard message channel (F150) and a high-speed data channel (F160,Simple). PixelMug only provides outside broadcast and accepts connection.

Read [Overarching framework and minimum example](../) if it has not been fully run.

## Create Service

```python
from maopaoBleApp import BleAppService

ble = BleAppService("MyApp")
```

`app_id` Application identifier must be created with WebApp `BleAppClient` used during `appId` Same. Most applications just need to get in this parameter.

`app_version` is an optional version description, defaulted `"1.0"` with hello returning. If you need to customize it, you can write:

```python
ble = BleAppService("MyApp", app_version="1.1")
```

The remaining construction parameters are used for message size, configuration transfer, or queue capacity adjustments, and the default values are usually retained. The parameters are specified in [Commands and Responses](./commands#消息大小与失败), [Configure Transfer](./config#传输参数) and [High-speed data channels](./simple#接收队列), respectively.

## Start the service and choose an access mode

```python
from maopaoBleApp import AUTH_MODE_NONE, AUTH_MODE_RESPONDER

ble.start(auth_mode=AUTH_MODE_RESPONDER)  # Bubble App, Default Mode
# The open model should read: ble.start(auth_mode=AUTH_MODE_NONE)
```

The mode option keyword parameter is `auth_mode`. `AUTH_MODE_NONE = 0`, `AUTH_MODE_RESPONDER = 2`. `start()` returns the current instance, automatically broadcast after startup, and then resumes broadcasting after `poll()`.



Call `start()` directly back on start-up and do not switch mode. Application should be pre-determined; if you need to change configuration, you should re-initiate the current connection and service and not switch with the existing session.

## Three service states

| Properties | Meaning |
| --- | --- |
| `connected` | Application Layer Processed Connection Event |
| `authenticated` | Bottom level allows business communications; unacknowledged mode connections can also be True, which does not mean that identification has been verified |
| `ready` | The application handshake was completed and the application session was established through F150 |

Successful connectivity does not amount to completion of the knowledge, nor does completion of the knowledge amount to a standard message channel that can already handle the business.

### When is hello required?

`hello` is the application handshake message used inside the `maopaoBleApp` standard message channel, not BLE pairing or identification rights. It is used to check the protocol version and `appId` and create this application session.

WebApp calls when using Bubble App `await client.connect(device)` It's automatic. `hello`It's a beautiful side. `BleAppService` It's also automatic. Developer doesn't have to send itself. `hello`, and do not process functions for it; just wait `connect()` Completed, or observed by device side `ready` / `on_ready()`.

The `hello` message is only required if a custom BLE center device is developed and a standard message channel is used. See [Custom terminal hello session](/en/ble/custom-client#hello-与会话) for the format.

### When to send data and its lifecycle

The command, status, event and configuration of the standard message channel needs to wait at `ready`.

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

Reactions only update the logo or record errors, leaving tasks such as drawings, audio, files and networks in the main cycle. Similar calls re-registers replace the previous one; the cause of disconnection and the wrong object should not be assumed to be a fixed structure.

WebApp should wait for the connection to be completed and then call the business interface:

```js
await client.connect(device);
await client.command('echo', { text: 'echo' });
```

Simple does not require a handshake to be applied, but only that the connection is released in the current mode. Flowing SDK completes the application handshake before sending Simple, so co-opting WebApp suggests that the device waits `ble.ready` before sending it. Open mode customised center devices can be transmitted `authenticated` after `True` without sending `hello`.

`on_ready` indicates that the device has been set up and lined up for a response, and does not guarantee that the client has processed the response. Operations requiring business confirmation should still be `command()` and `on_ready` should not be considered as confirmation that a business has been performed on the other side. The application layer has no public `on_auth()`; normally, a standard message channel operation can start when waiting `on_ready()`.

## Drive message processing

```python
ble.poll()
```

Call regularly `poll()` Most applications use default parmeter; failure to call the main cycle for long periods leads to backlogs, discards and client timeout. Adjustments are made only when there is a real need to limit the number of single processes or messages. `budget_ms`, `max_messages` and `max_simple_messages`. actual application of configuration needs to be modified `process_pending_config()`.

## Active Disconnect

Call `ble.disconnect()` ReQuest disconnects the current physical BLE connection and returns the current service example; no operation is performed without the current connection. The service remains, after the event is separated `poll()` Reactivate the broadcast so that the client can reconnect.

Disconnection is an anecdotal process, which should be confirmed by `on_disconnect(conn, reason)`. Do not immediately interrupt the command call requiring a return response; return the response before initiating the break in the main cycle. This method needs to include an updated solid of the interface.

## Disconnect, suspend, and clean up

The current session, standard message channel messages, Simple queues, sending queues and response caches will be emptied after the connection is disconnected; the unsubmitted configuration will be aborted. The configuration of the submitted, awaiting application, remains in place, and subsequent processing may occur after the break.

When the system is dormant, it stops broadcasting and requests a disconnection; the recovery requires the main cycle to continue to call `poll()` in order to boost the radio recovery. The client must re-assembly (blow mode) and rehello, not re-starting the old session.

Apply `ble.deinit()` to call on exit. It cleans up the session, configures the temporary file and service state, and stops broadcasting. The current realization does not guarantee that the method will immediately break the physical link; the client should be actively disconnected at the time of exit and not confirm it as a remote break.

## Runtime statistics

`ble.stats()` returns a dictionary snapshot that can be used for diagnostic purposes. Only the common fields associated with the public interface in this section are listed below:

| Fields | Meaning |
| --- | --- |
| `ready` | Is an application session currently being created |
| `rx`, `tx` | Applications received, submitted successful in standard message channels |
| `decode_errors` | Error decoding standard message channel |
| `queue_drops`, `outbox_drops` | General Queue Discard |
| `simple_rx`, `simple_tx`, `simple_drops` | Simple Received, sent and discarded |

If there is no data after the connection is checked or the data is lost, the following can be printed as required:

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

For example, `print_ble_stats()` is called once when debug buttons are pressed or communication abnormalities are detected. Do not print continuously on each frame, otherwise the log output itself may slow the main cycle.

`tx` and `simple_tx` do not represent the transaction of the opposite end. The accompanying `transport` dictionary is an internal diagnostic information and the field does not act as a stable interface.
