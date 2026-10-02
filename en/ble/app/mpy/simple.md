# High-speed data channel (Simple)

The high-speed data channel uses F160 services, code and protocol called Simple. It supports the light-volume distribution and subcontracting of binary and UTF-8 texts, suitable for compact data, such as the continuous roller coordinates, sensor sampling values, and a BLE connection with the standard message channel (F150).

Direct sub-contract notifications are submitted at the time the device is sent, reducing the queue of the standard message channel; the application for reception is still distributed `BleAppService.poll()`. The “high speed” does not represent a fixed rate or real-time guarantee, and the actual performance depends on MTU, connecting parameters and application processing speed.

The bubble mode requires access to a security device, which is connected in open mode and released. The Simple load in both modes is not encrypted through the application layer; it is not used to transmit a certificate or other data that is confidential.

This channel does not contain command response, automatic retest, message validity check, or the rules for combining up-to-date values by business type. `command()` for the standard message channel when the results of the operation are specified; the frequency of transmission, message serial numbers, obsolete discards, and up-to-date value processing entered consecutively is designed by application.

## Receiving data

```python
from maopaoBleApp import DATA_TYPE_RAW, DATA_TYPE_TEXT

def receive(data_type, payload, context):
    if data_type == DATA_TYPE_RAW:
        print("binary:", payload)
    elif data_type == DATA_TYPE_TEXT:
        text = payload.decode("utf-8")
        print("text:", text)

ble.on_simple(receive)
```

`on_simple(handler)` returns handler, the same type of registration replaces the old function. The callback signature is `handler(data_type, payload, context)`:

| Parameters | Contents |
| --- | --- |
| data_type | `DATA_TYPE_RAW = 0` or `DATA_TYPE_TEXT = 1` |
| payload | bytes reorganized and copied |
| context | `conn` Connection Object and `received_ms` Device Receiving Time |

Type 1 is UTF-8 text, and the recipient needs to call `payload.decode("utf-8")` itself.

## Receive with a queue

When data are received on the ground floor, they are placed in the queue and you apply a callback to `ble.poll()`. When the queue is filled, the oldest data is discarded, so successive input should control the frequency of transmission and ensure that the main cycle of the device is called `poll()` in a timely manner.

The default queue saves up to eight entries. If you really need to host short-term flash data, you can set `simple_queue_limit` when you create the service; an increased queue can only be delayed and discarded and cannot increase BLE transmission speed.

## Send data

| Methodology | Enter |
| --- | --- |
| `send_simple_raw(data)` | RAW data, recommended bytes |
| `send_simple_text(text)` | st, use type 1 |

```python
ble.send_simple_raw(b"\x01\x20\x30")
ble.send_simple_text("ready")
```

Returns `True` means that the entire package has been submitted to the bottom notice for call, and does not represent receipt or completion of the business. Unconnected, unacknowledged, empty data, type invalid, message too big or notification failed may return to `False`. Text type error may directly release an anomaly.

Returns `False` which indicates that this delivery is incomplete and that part of the subcontract may have been sent. Retry and confirmation is determined by the operational agreement.

## Client API

```js
await client.sendSimpleRaw(new Uint8Array([1, 32, 48]));
await client.sendSimpleText('ready');

client.on('simpleData', (event) => {
  console.log(event.dataType, event.bytes);
  if (event.dataType === 1) console.log(event.text);
});
```

`client` is the initialized BleAppClitt, which sends it first to ensure that the application is handshaked. Receiver type 1 provides `text`. If the agreed text is JSON, the application is self-sequenced and decomposed.

## Message size

Simple will automatically subcontract the current MTU with the current maximum of 4024 bytes for a single message; the actual size of the message will be subject to mutual agreement MTU. Application should not assume that all terminals can use the maximum value, and large data should be split and serial numbers should be carried.

Simple does not provide business confirmation, automatic re-transmitting, or simultaneous message numbers. Application should limit the frequency of transmission and avoid competition for access to standard message channel notification.[Access protocol](/en/ble/custom-client#simple-分包协议).
