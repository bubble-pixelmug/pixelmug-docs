# Motion events

`g_sensor` can report a motion event identified by the sensor. Application can be called `poll_events()` in the main cycle, or registered by `on()` for Python.

Events only indicate that a certain type of situation has occurred. They do not replace continuous motion data provided by `get_accel()`, `get_gyro()` and `get_euler()`.

## Event bitmask

Events are expressed in integer-digit masks. A round or a callback may contain multiple events:

```python
events = g_sensor.poll_events()

if events & g_sensor.EVENT_ANY_MOTION:
    print("Motion detected")

if events & g_sensor.EVENT_TILT:
    print("Slash detected")
```

Do not judge individual events using the equivalent comparison:

```python
# Not recommended: There are no conditions in case of other incidents.
if events == g_sensor.EVENT_TILT:
    print("tilt")
```

Place to `&` should be used. This allows the target event to be identified even if other events are included in the same value.

## Supported events

The current Python module displays the following constants:

| Constant | Value | Information expressed in the current interface |
| --- | ---: | --- |
| `EVENT_NO_MOTION` | `0x0001` | Sensor creates a motionless event |
| `EVENT_ANY_MOTION` | `0x0002` | Any enabled axle creates a motion event |
| `EVENT_FLAT` | `0x0004` | Sensors generate flat-detection events |
| `EVENT_ORIENTATION` | `0x0008` | Sensors produce directional change events |
| `EVENT_STEP_DETECTOR` | `0x0010` | Sensors generate step detection events |
| `EVENT_STEP_COUNTER` | `0x0020` | Step function creates events |
| `EVENT_SIG_MOTION` | `0x0040` | Sensors produce significant motion events |
| `EVENT_TILT` | `0x0080` | Sensors generate tilt events |
| `EVENT_TAP` | `0x0100` | Sensor creates a knock event. |
| `EVENT_ALL` | `0x01FF` | Combination mask for all the above events |

The current interface returns only to the event location and does not provide detailed results for the corresponding function:

- `EVENT_ORIENTATION` does not contain specific directions.
- `EVENT_STEP_COUNTER` does not include cumulative steps.
- `EVENT_TAP` does not contain the type of click, double click or three clicks.
- The event does not include a time stamp, acceleration range or rotation direction.

When these movement values are required, the data snapshot should be read when dealing with the event:

```python
events = g_sensor.poll_events()

if events & g_sensor.EVENT_SIG_MOTION:
    try:
        ax, ay, az = g_sensor.get_accel()
    except RuntimeError:
        # Retry on the next loop if the first snapshot is not ready.
        pass
    else:
        print("significant motion:", ax, ay, az)
```

The event can rotate after initialization, but if the event processing code is to read the movement data, the first snapshot may not have been generated and the anomaly `RuntimeError` will need to be captured and retried in the next round

Currently, any-motion and no-motion detections on the three axes X, Y, Z have been enabled, as well as significant motion, tilt, knock, level, direction and step functions. Python API does not provide a configuration interface for threshold, duration, delay or detection mode.

## `poll_events()`: Round of queries

```python
events = g_sensor.poll_events()
```

Do not receive parameters, return an integer number:

- When incidents occur, the cumulative incident location mask is returned.
- returns `0` if no incidents occur.

The call will clear the current cumulative value at the same time. The next call will only be for events that arrive after returning.

### Normal cycle

```python
import time
import g_sensor


def wait_until_ready(timeout_ms=5000):
    deadline = time.ticks_add(time.ticks_ms(), timeout_ms)

    while g_sensor.is_ready() != g_sensor.STATUS_OK:
        if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
            raise RuntimeError("g_sensor not ready")
        time.sleep_ms(20)


if not g_sensor.init():
    raise RuntimeError("g_sensor init failed")

try:
    wait_until_ready()
    print("G-sensor event polling started")

    while True:
        events = g_sensor.poll_events()

        if events & g_sensor.EVENT_ANY_MOTION:
            print("motion")

        if events & g_sensor.EVENT_TAP:
            print("tap")

        time.sleep_ms(20)
finally:
    g_sensor.deinit()
```

### MicroPyxel Update Cycle

```python
def update(rt):
    events = g_sensor.poll_events()

    if events & g_sensor.EVENT_TILT:
        change_scene()

    if events & g_sensor.EVENT_TAP:
        trigger_effect()
```

The round of inquiry is suitable for applications that already have a fixed primary cycle, allowing for the handling of sporting events in the same place as touch, physical computing and image updating.

### Cumulatively not equal to count

`poll_events()` Cumulative number of events used:

- Different types of events can be retained at the same time.
- The same incident occurred repeatedly between the two rounds of questioning, and only one event remained.
- Read and clear atom operations between arrival and arrival of new events, without the simple “read-in-zero” cover and dispatch of new events.

Even so, `poll_events()` is not a statistical interface. Do not use it to accurately measure the number of hits or steps.

## `on()`: Recall to registration event

```python
ok = g_sensor.on(event_mask, callback)
```

| Parameters | Type | Annotations |
| --- | --- | --- |
| `event_mask` | `int` | Watch the event. `|` Group |
| `callback` | callable | Function to receive an event-bit mask |

Return value and anomaly:

| Result | Meaning |
| --- | --- |
| `True` | Python, check-in was successful. |
| `False` | Could not close temporary folder: %s |
| `TypeError("callback must be callable")` | The second parameter cannot be called |
| `RuntimeError("max callbacks reached")` | 5 registered Python |

Up to 5 Python calls back at the same time.

### Listening to an incident

```python
def on_tilt(events):
    print("tilt:", events)


g_sensor.on(g_sensor.EVENT_TILT, on_tilt)
```

### Listen for multiple events

```python
MOTION_EVENTS = (
    g_sensor.EVENT_ANY_MOTION
    | g_sensor.EVENT_SIG_MOTION
    | g_sensor.EVENT_TILT
)


def on_motion(events):
    if events & g_sensor.EVENT_SIG_MOTION:
        print("significant motion")

    if events & g_sensor.EVENT_TILT:
        print("tilt")

    if events & g_sensor.EVENT_ANY_MOTION:
        print("any motion")


g_sensor.on(MOTION_EVENTS, on_motion)
```

The value passed to the callback has been placed with `event_mask` of the callback register, but may still contain multiple matching events.

### Where callbacks run

The bottom does not call the Python function directly from the context of the sensor processing. When the event arrives, the callback is moved to the MicroPython virtual circuit.

This means:

- Python is delaying the callback while it is running a longer sync operation.
- Reconciling and applying other Python codes runs in the same virtual environment.
- Reactions should be kept brief.

The callback is recommended to record only the status of the pending:

```python
motion_pending = 0


def on_motion(events):
    global motion_pending
    motion_pending |= events
```

Main cycle re-execut drawing, file access or network operation:

```python
def update(rt):
    global motion_pending

    if motion_pending:
        events = motion_pending
        motion_pending = 0
        handle_motion(events)
```

Do not wait, read, or execute blocking web requests for long periods of time in the response.

## `off()`: unregister recall

```python
removed = g_sensor.off(callback)
```

The same function object must be entered at the time of registration:

```python
def on_tap(events):
    print("tap")


g_sensor.on(g_sensor.EVENT_TAP, on_tap)

# Cancel the same function object
g_sensor.off(on_tap)
```

Return value:

- `True`: The first matching registration was found and cancelled.
- `False`: No callback found.

`on()` does not prevent the same function from being duplicated. After a duplicate, a single `off()` removes only one of them, so normally no duplicate of the same function is registered.

Could not easily keep the object when using an anonymous function:

```python
# You can register., But then I can't write it off alone.
g_sensor.on(g_sensor.EVENT_TAP, lambda events: print(events))
```

Applies a pre-exit recommendation for explicit unregister. `deinit()` also clears all Python calls; re-registration is required after re- `init()`.

## Polling and callbacks

When the event arrives, the component will:

1. Merges the event slot to `poll_events()` to be taken.
2. Schedule a Python callback matching the event.

The two ways of seeing events from the same source are therefore not two separate corridors.

| Apply Structure | Recommended |
| --- | --- |
| There is a normal cycle or MicroPyxel `update()` | `poll_events()` |
| Multiple modules focus on different events | `on()` |
| Wants to process input, physics and image in the same frame | `poll_events()` |
| Only one status mark is required after the event has arrived | `on()` |

Do not let the callback and the round-trip exercise perform the same business action separately, or the same campaign may allow the application to respond twice.

## Full life cycle examples

```python
import time
import g_sensor


motion_pending = 0


def on_motion(events):
    global motion_pending
    motion_pending |= events


def wait_until_ready(timeout_ms=5000):
    deadline = time.ticks_add(time.ticks_ms(), timeout_ms)

    while g_sensor.is_ready() != g_sensor.STATUS_OK:
        if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
            raise RuntimeError("g_sensor not ready")
        time.sleep_ms(20)


if not g_sensor.init():
    raise RuntimeError("g_sensor init failed")

try:
    wait_until_ready()

    mask = (
        g_sensor.EVENT_ANY_MOTION
        | g_sensor.EVENT_TILT
        | g_sensor.EVENT_TAP
    )

    if not g_sensor.on(mask, on_motion):
        raise RuntimeError("g_sensor callback registration failed")

    while True:
        if motion_pending:
            events = motion_pending
            motion_pending = 0

            if events & g_sensor.EVENT_ANY_MOTION:
                print("motion")
            if events & g_sensor.EVENT_TILT:
                print("tilt")
            if events & g_sensor.EVENT_TAP:
                print("tap")

        time.sleep_ms(20)
finally:
    g_sensor.off(on_motion)
    g_sensor.deinit()
```

This example only uses the echo and no longer calls `poll_events()` for the same action.

## Usage limitations

- The event is a notification and does not include range, direction, frequency or detailed sign type.
- `poll_events()` will merge the same event and cannot be used as a precise counting source.
- When Python is denied an enforcement opportunity for a long period of time, the callback is delayed.
- Incident management capacity and movement space are limited; it cannot be assumed that each HF repeat action will result in an independent Python back-up.
- The event threshold, duration and delay parameters cannot be modified from Python at this time.
- `deinit()` will clear up pending events and all Python echoes.
- Re-initiation requires a new call `on()`.
