# Status, Events

## Read the current MPY application state

`requestSnapshot()` means **MPY application for a current set of values returned during reading**.

For example, MPY can provide the status of a game using the hope web page to show whether the current score and the game are in progress:

```python
state = {"score": 0, "playing": False}

ble.set_state_provider(lambda: dict(state))
```

With the logical update of the game `state`, the web page is readily available for active reading:

```js
const state = await client.requestSnapshot();
console.log(state.score);   // Current Score
console.log(state.playing); // Is this a game now?
```

This returns the status object directly and does not need to take `result` again. It is suitable to update the interface to the current state of the device when the page is opened, reconnected or click on Refresher.

The device returns only what is given in the state to provide the function. When `set_state_provider()` is not called, the default is `{}` an empty object.

## Receive MPY state changes and events

`client.on(type, handler)` Registered Receiving Function, SDK automatically calls `handler` when message arrives. This distinguishes between two business notifications:

| Message Type | Meaning what? | Examples |
| --- | --- | --- |
| `state` | Apply current value changes | Current score is 10, play state is paused |
| `event` | Something happened in the application. | Game end, configuration application complete |

Web pages registered first:

```js
function showState(state) {
  console.log('Current Score: ', state.score);
}
client.on('state', showState);

client.on('event', (event) => {
  if (event.event === 'gameOver') {
    console.log('Game over., Score: ', event.score);
  }
});
```

Corresponds to MPY code by sending a notification at the end of a fraction change or game:

```python
state["score"] = 10
ble.publish_state()  # Send state provides the current value returned by function

ble.send_event("gameOver", {"score": state["score"]})
```

When a listening is no longer required, the original function is cancelled:

```js
client.off('state', showState);
```

`requestSnapshot()` is a page that is actively read; `on('state', ...)` is used for receiving status updates. Events are not automatically saved for re-linking and re-reading of historical records. The automatic status of end-of-device rules and more information are available at [Status and events](../mpy/state-events).

## Example: use state and events

`examples/ble-event-state` MPY counts every second from 0 to 99. WebApp shows "Current Count" and "Recent Event":

| Count changes | State: Current value | event: what happened |
| --- | --- | --- |
| 8 → 9 | `{ count: 9 }` | None |
| 9 → 10 | `{ count: 10 }` | `multipleOfTen`, count to 10 |
| 10 → 11 | `{ count: 11 }` | None, page keep last event hint |
| 99 → 0 | `{ count: 0 }` | `counterReset`, start new round |

### MPY: define state and send events

Device end first creates service and specifies the function to read state:

```python
from maopaoBleApp import BleAppService

ble = BleAppService("BleEventState")
count = 0

def read_state():
    return {"count": count}

ble.set_state_provider(read_state)
ble.start()
```

`set_state_provider()` Register function, no continuous surveillance `count` . The web page is active, or data calls `publish_state()` , the service calls `read_state()` Gets the current value.

The following are the count and notification sections per second of the examples, with the omission of time and drawing codes:

```python
count = (count + 1) % 100

if ble.ready:
    ble.publish_state()

    if count == 0:
        ble.send_event("counterReset", {"count": count})
    elif count % 10 == 0:
        ble.send_event("multipleOfTen", {"count": count})
```

- `publish_state()` Use the function just registered to publish the current `{"count": count}` . The state listening for WebApp.
- `send_event()` The first parameter is a custom event name, and the second parameter is data sent with the event.
- `ble.ready` indicates that the application session has been set up and this example is delivered only at this time; the number of unconnected hours continues.
- 0 Sends `counterReset`, 10, 20, 90 to `multipleOfTen` only. The reset event is not sent when display 0 is started.

The main cycle still needs to be called `ble.poll()` on a continuous basis to process requests for reading and sending queues of status and events.

### WebApp: update counters and event messages

The following codes assume that `webapp` and `device` have been obtained at the beginning of this page, with two display elements: `#count` and `#event`.

```js
const client = new BleAppClient(webapp.ble, { appId: 'BleEventState' });

function showCount(state) {
  document.querySelector('#count').textContent = state.count;
}

client.on('state', showCount);

client.on('event', (event) => {
  if (event.event === 'multipleOfTen') {
    document.querySelector('#event').textContent = `Count it in. ${event.count}`;
  } else if (event.event === 'counterReset') {
    document.querySelector('#event').textContent = 'Count to zero., Start a new round';
  }
});

// First you sign up for the wiretaps., Connect and read the current value.
await client.connect(device);
showCount(await client.requestSnapshot());
```

`on('state', ...)` Medium `state.count` From MPY `read_state()`.`on('event', ...)` Receive all kinds of events, pass. `event.event` distinguishing names;from MPY `{"count": count}` Directly from `event.count` Read.

`requestSnapshot()` is called after connection to obtain the current count immediately. For example, when the cups are counted to 37, the page is shown to be 37; then the MPY `publish_state` push continues to update, without the need for a web page to search for the active number of seconds. The Read Current Value button is also only called again for the same interface and does not reset the count.

Counts to 10, the number and event tips are updated together; at 11, only numbers are updated, and the event hint is still " Count to 10. Reconnecting can read the current state, but does not replace events that occurred during the breakup.
