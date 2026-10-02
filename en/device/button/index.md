# Touch

Touch is the touch area at the bottom of PixelMug S1 Pro/Lite. The system is responsible for detecting touch, shaking and identifying operations, and MPY applies to read identified clicks and double-clicks from the bottom queue.

::: information module name
PixelMug provides a bottom touch area, not a mechanical button. The functional name for the developers is **Touch**. The Python module and `mps.json` depend on `mpy_button`.
:::

![PixelMug 底部触摸区域](./touch-area.jpg)

♪ PixelMug bottom touch area ♪

## How touch input works

MPY applies no direct rotation of touch GPIO. GPIO status changes first awaken system tasks, and then perform dithering and operational recognition, and then place the application-usable events in a fixed length queue:

```text
PixelMug Bottom Touch Area
        ↓
System Touch Task
        ↓ Wrestle and Operation Recognition
click / double → Touch Event queue → mpy_button
long press     → System exit process
```

Touch recognition takes place in a system mission, without relying on the speed of execution of the Python main cycle. Even if the application is temporarily busy with mapping, audio, BLE or file operations, the system task will continue to recognize the touch; however, the queue may spill when the application does not read the event for a long time.

## Get started

Declares components in the item `mps.json`:

```json
{
  "dependencies": [
    {
      "name": "mpy_button",
      "version": ">=1.0.0"
    }
  ]
}
```

The module does not need to be initialized. The application starts with the removal of the event that may have been left behind during the previous operational phase and then calls `get()` on a regular basis:

```python
import time
import mpy_button as touch

touch.clear()

print("Touch the area at the bottom of the screen, Try clicking and double-clicking operations")

while True:
    event = touch.get()
    if event == "click":
        print("Click")
    elif event == "double":
        print("Double click")
    time.sleep_ms(10)
```

`get()` returns `None` immediately in the absence of incident, without hindrance.

## Supported touch gestures

| Operation | MPY Results | Current Identification Rule |
| --- | --- | --- |
| Click | `"click"` | No second effective touch has been found in 250 ms since the release of the effective short touch. |
| Double click | `"double"` | The second touch begins within 250 ms after the first release and completes the second effective short touch. |
| Touch State | `is_pressed()` | Returns the touch state currently recorded in the system without a click or double-click determination |

A touch lasts at least 50 ms until it is recognized as a valid short touch. It continues to reach 1,000 ms and then press long and does not produce a click or double-click event.

### Why is there a short delay on the click?

When the first short touch is released, the system does not know whether it is a click or a double-click first touch. So it continues to wait for 250 ms:

- A second effective touch occurs in the window, producing `"double"`.
- The window ends without a second touch, producing `"click"`.

So `"click"` usually enters the queue after the release of about 250 ms by the finger. This is the wait required to distinguish between clicks and double clicks, not the delay caused by `get()` or Python speed.

## Click events and immediate pressed state

Apply only a single touch action, and want to press to respond immediately, so you can test `is_pressed()` upswing. It clicks and double-clicks, so the response is faster than waiting for `"click"`:

```python
import time
import mpy_button as touch

print("Touch the area at the bottom of the screen, Try Quick Click")

last_pressed = touch.is_pressed()

while True:
    pressed = touch.is_pressed()
    if pressed and not last_pressed:
        print("Touch area just been pressed.")
        # Do a single touch action with a low delay here.
    last_pressed = pressed
    time.sleep_ms(10)
```

Here you must detect `False → True` changes. Write `if touch.is_pressed()` to repeat the action while the finger is pressed.

`is_pressed()` returns the current hold-down, not a " click " with full sign recognition:

- Double-click will occur twice to press the lower side.
- A long press will also appear on the lower edge and reach 1 second before entering the system exit process.
- It does not provide a complete, short touch-and-shiver result of the system.
- If the first and second strokes may have triggered the instant action, if applied simultaneously `"double"`, then received `"double"`, creating duplication or conflict.

One should therefore be chosen in two ways:

| Application needs | Recommended |
| --- | --- |
| It's only a low-delayed touch action, with no distinction between double-clicks, such as the firing of bullets in the game, control of the elves' jump, etc. | Test `is_pressed()` for ascending line |
| Also need to click and double-click, or need to systematically confirm the complete short touch, such as a music transmitter, click to pause or continue playback, double-click to switch to the next track | Use `get()` Returned `"click"` / `"double"` |

Do not allow the same business action to respond to `is_pressed()` uplink and `"click"` at the same time. If you need to click and double click, do not execute the action with `is_pressed()` in advance.

### Compare response timing

The following example code prints `is_pressed()` the press and release status and the system identification results, and calculates the time from release to receipt `click`. It is used only for observation and should not receive the same business action at the same time:

```python
import time
import mpy_button

mpy_button.clear()
last_pressed = mpy_button.is_pressed()
released_at = None

while True:
    now = time.ticks_ms()
    pressed = mpy_button.is_pressed()

    if pressed and not last_pressed:
        released_at = None
        
    if not pressed and last_pressed:
        released_at = now
        print("is pressed")

    event = mpy_button.get()
    if event == "click":
        if released_at is None:
            print("get: Recognized click")
        else:
            elapsed = time.ticks_diff(now, released_at)
            print("get: Recognized click, 距 is pressed 约", elapsed, "ms")
    elif event == "double":
        print("get: Recognized double")

    last_pressed = pressed
    time.sleep_ms(10)
```

Click to finish to see `is pressed` and then double-click to the window about 250 ms to receive `click`. Double-click to see `is pressed` twice and eventually only one `double`.

## Event reading model

Touch uses the draw queue, which does not call Python back directly from the system task. The application should read the event in its own main cycle or MicroPyxel `update()`.

If the application of a cycle may result in a backlog of multiple events, multiple entries can be read at a time:

```python
def update():
    for _ in range(4):
        event = mpy_button.get()
        if event is None:
            break
        handle_touch(event)
```

`get()` and `get_event()` consume the same queue. After any interface successfully returns the event, the event is removed from the queue.

## API Reference

All interfaces do not accept parameters.

### `get()`

Take out and remove the earliest event in the queue.

- `"click"`: Click.
- `"double"`: Double-click.
- `None`: Team is empty.

This interface is preferred for ordinary applications.

### `get_event()`

Take out and remove an event with diagnostic information:

```python
event = mpy_button.get_event()
if event is not None:
    event_type, tick_ms, seq = event
```

Returns values `("click", tick_ms, seq)`, `("double", tick_ms, seq)` or `None`.

| Value | Meaning |
| --- | --- |
| `event_type` | `"click"` or `"double"` |
| `tick_ms` | System recognition of system tick milliseconds when completed and events are queued |
| `seq` | Serial number of events continuously increasing during system operation |

`tick_ms` is not date time, nor is it the first time that a finger touches the screen. It comes from the bottom firmware system tick, which is rounded in 32-bit numbers, and is suitable for the order and approximate spacing of the diagnostic events. `clear()` does not reset `seq` to 0.

### `clear()`

Emptys all unread events and returns `None`. It is recommended to call on MPY application start, switch or switch interactive mode.

`clear()` Emptys only the current queue and does not reset event serial numbers, cumulative discards, recent events or current holddown status.

### `available()`

Returns the number of incidents in the current queue in the range `0..16`.

This value is only a snapshot of the call. Usually, no first call `available()` is required and can be called `get()` directly and again until you return `None`.

### `is_pressed()`

returns the boolean value, which indicates the touch area status currently recorded in the system.

It is suitable for immediate feedback and diagnosis, and can also be used for an application that requires only one low-delayed touch action. It does not replace system click, double-click, and long-click recognition, with [Click on Event & & & Press Status](#单击事件与即时按下状态) use limits.

### `stats()`

Returns the current Touch Queue and Touch Dictionary:

```python
print(mpy_button.stats())
```

| Fields | Meaning |
| --- | --- |
| `queued` | Number of incidents in the current queue |
| `seq` | Last assigned event serial number; 0 at no event |
| `dropped` | Cumulative number of old events covered when queued |
| `last` | `"click"` or `"double"` for recent entries; `None` for no incidents |
| `last_tick` | Solids of recent entry events |
| `pressed` | Current Touch State |

`stats()` Read only state, no consumption event. `clear()` will not reset this cumulative information.

## Long press and exit MPY

Long by the system, does not return `"long"` and MPY applications cannot use it.

In the current MPS run mode:

1. Continuous touch reached 1 second, the system shows exit confirmation.
2. Long press again, confirm exit MPY application.
3. The exit is cancelled by clicking or double-clicking during the confirmation display.
4. Click or double-click to cancel exit does not enter the application queue.

When `is_pressed()` is used, the application may already be active at the start of the moment at long intervals; then the touch reaches one second, and the system will still enter the exit process. Therefore, do not design the operation that has to be held down for long periods of time on this touch area.

## Queue Capacity and Performance

Touch queues to house 16 events without dynamic memory distribution.

The queue is full to discard the oldest event, keep the latest event and add `stats()["dropped"]` one.

The system recognizes touches that do not depend on the Python main cycle, but the queue capacity is limited. Applications should read events regularly; when drawings or other tasks are heavy, a limited number of backlogs can be addressed in each update.

## Use with MicroPyxel

Full example in PixelMug Studio at:

```text
examples/mpy-tutorial/examples/upyxel-events
```

This example allows the screen counter to be added every 500 ms. Clicking on Touch, `mpy_button.get()` to get `"click"` and then to suspend or restore the counter by `emit()`, `on()` and `state()` in MicroPyxel.

```text
Touch click
    ↓
mpy_button.get()
    ↓
micropyxel.emit("toggle_pause")
    ↓
MicroPyxel Organisation
```

## Use recommendations

- Apply `clear()` to start with to avoid the event left over from the previous operational phase.
- Only `"click"` and `"double"` are used when clicking and double-clicking are also required.
- If only one low delay operation is required, `is_pressed()` can be tested for the ascending line.
- Do not use `get()` and `get_event()` as a two-way stand-alone input.
- Do not reread GPIO, or re-establish the full click and double-click status machine in Python.
- Do not rely on long-by-incidents, long-by-system.
- Use `stats()` to screen for backlogs and queue spills.
