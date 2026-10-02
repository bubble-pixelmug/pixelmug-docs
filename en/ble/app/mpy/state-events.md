# Status and events

Status indicates that the current value is applied; events indicate what is happening. Both are sent on their own initiative through the Standard Message Channel (F150), without waiting for confirmation of client business.

The complete item is shown in the warehouse at `examples/ble-event-state`: the cup is counted from 0 to 99 per second, the current number is shown on the web page; by 10, 20,90, the whole 10 events were received and the replacement event was received when you returned to 0. The project consists of Bot, WebApp and MPY, and the running steps are shown in the project README.

## Provide a state snapshot

```python
state = {"score": 0, "playing": False}

def read_state():
    return dict(state)

ble.set_state_provider(read_state)
```

Status provides a function that does not accept parameters and returns objects that can be serialized by JSON. Use `{}` when no function is provided or empty values are returned. Reading anomalies will report an error return and use an empty state.

Hello is automatically sent once after success; the client can also call `client.requestSnapshot()` for active reading.

## Register state providers

```python
state["score"] += 1
accepted = ble.publish_state()
```

`publish_state()` Default read-state provides a function and adds the current state to the queue. You can also directly import the status object to be sent:

```python
ble.publish_state({"score": state["score"], "playing": state["playing"]})
```

Returns `True` to indicate that the sending queue has been added, and `False` to indicate that it is not possible to encode or exceed the message ceiling. The old state that has not been sent may be replaced by a new state, so it is suitable to synchronize the latest values and does not guarantee that each middleware change will be delivered.

After the `mutates=True` command or application configuration has been successfully implemented, the service has been expanded and released, and no more manual versions need be added for the same change.

## Send an event

```python
ble.send_event("gameOver", {"score": state["score"]})
```

The second parameter is the event-carried data, using an empty object when omitted. Returns `True` only to indicate that the event has been sent in line and does not mean that the opposite end has been received. The operation to confirm the result should use a command, or the application should design the message.

## Receive data on the client

```js
client.on('state', (state) => {
  console.log(state.score, state.rev);
});
client.on('event', (event) => {
  if (event.event === 'gameOver') console.log(event.score);
});
const state = await client.requestSnapshot();
```

SDK expands the status or event data with an item, rev field. Business objects should avoid both fields to avoid overwhelming. See [Custom Terminal Access](/en/ble/custom-client) for the original device protocol format.

SDK tries to request a snapshot when it finds a state version jumping; this is not an event history re-offending. The current status should be retrieved after reconnection.

## Timing and capacity

It is recommended that the status and event be sent after `ble.ready` via the standard message channel. The service itself does not check ready and should not store them as offline messages.

The state and event that is not sent after the breakup is emptied. The single message must be located in `ble.max_message` in its entirety, and the situation should be streamlined to avoid carrying an entire picture or a complete profile.
