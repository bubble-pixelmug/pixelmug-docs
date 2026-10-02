# Runtime and events

MicroPyxel offers both automatic cycle and manual refreshing. An MPY application uses a global MicroPyxel context.

## Initialization and release

### `init(*, start_audio=False)`

`start_audio` is optional ** Keyword only**, boolean value, to decide whether to start a sound synthesis mission. Pure drawing is maintained at `False`; sound should be initialized by AutoService and then uploaded at `True`, see [Sound Play](./audio).

Returns `True` for new success, returns `False` for initialization. `OSError` for memory deficiency and context failure to create.

```python
import micropyxel as pyxel
pyxel.init(start_audio=False)
```

Already `False` Call after initialization `init(start_audio=True)` It won't turn on the sound. It just returns. `False`. The use of synthetic audio is to be determined at the initial initialization of application.

### `destroy()`

Releases the current context and global image, map, music, sound, sound, channel resources and stops the MicroPyxel audio task. Returns `True` when context exists, or returns `False`. The index `0` is cleared and refreshed before release; if the colour 0 is changed to other RGB, it does not necessarily show black.

`destroy()` does not quit for you `run()`, nor does it cover components such as Auto Service, BLE, Sensors, etc., for anti-initialization applications. Cleans up resources after exiting the cycle; re-establish `init()` once released must regain access to the subject.

## Automatic loop

### `run(update, draw, fps=30, on_exit=None, quit_event_type="quit")`

This is the Python function, which supports position or keyword parameters, blocking running until you exit.

| Parameters | shall fill | Default value | Meaning |
| --- | --- | --- | --- |
| `update` | Yes. | — | `update(rt)`, status update, provide empty functions if no update is required |
| `draw` | Yes. | — | `draw(rt)`, draw current frame |
| `fps` | Yes | `30` | Target frame rate, recommended positive integer |
| `on_exit` | Yes | `None` | `on_exit(rt, reason, exc)`, exit callback |
| `quit_event_type` | Yes | `"quit"` | Exit when encountering this type of event;`None` Disable |

Each frame in descending order takes the event `update(rt)` `draw(rt)` `render_graphics()` frame number increasing → waiting for the next frame.

`rt` is the module `micropyxel`. `rt.frame_count` Resets `run()` each time from 0; can be used to drive animated. It is not millisecond time, nor can it be guaranteed by frame. Use `time.ticks_ms()` and `time.ticks_diff()` when real time is required.

`run()` does not automatically call `init()` or `destroy()`, nor does it automatically `cls()`. Think of a screen opening at `draw()` for each frame redraw; you can leave a screen unobserved if you want to keep a handwriting.

### Frame rate and scheduling

The target cycle is calculated in integer milliseconds, 30 fps corresponds to 33 ms, 60 fps corresponds to 16 ms. Processing time over time gives about 1 ms and re-matches the deadline when it is seriously behind; it does not compensate for missed renewal frames. Therefore, fps are scheduling targets and are not precise timing or hardware refreshing rates.

This cycle uses sync `time.sleep_ms()`, which does not drive `asyncio` event cycle. When application requires a walk-in network task to run in parallel, the following manual refreshing method should be used to `await asyncio.sleep_ms(...)` in your own programme.

### `quit()` and the reason for withdrawal

`quit()` Sets the exit sign and returns `None`. When called in `update()` the frame will still execute `draw()` and refresh and then exit. The default event `"quit"` will terminate the frame before drawing.

| `on_exit` Received `reason` | Situation |
| --- | --- |
| `"stop"` | Exit by `quit()` |
| `"quit"` | Received configured exit event |
| `"keyboardinterrupt"` | `KeyboardInterrupt` Circulated, no longer thrown out |
| `"exception"` | Update, draw or handle events abnormal; repause after exit |

`exc` corresponds to an abnormal object and is `None` at normal exit. The normal anomaly that exits is thrown back to itself will be printed `on_exit err:` instead of the original anomaly.

```python
import micropyxel as pyxel

pyxel.init()

def update(rt):
    if rt.frame_count >= 90:
        rt.quit()

def draw(rt):
    pyxel.cls(0)
    pyxel.text(0, 5, "HELLO", 7)

try:
    pyxel.run(update, draw)
finally:
    pyxel.destroy()
```

## Manual Refresh

### `render_graphics()`

Converts the screen index buffer by colour table and writes in the device's virtual frame buffer. Without parameters, returns `None`. It does not run a newer, unclear screen, sleepless, or limit frame buffers.

```python
import time
import micropyxel as pyxel

pyxel.init()
try:
    for x in range(pyxel.width):
        pyxel.cls(0)
        pyxel.pset(x, 8, 7)
        pyxel.render_graphics()
        time.sleep_ms(50)
finally:
    pyxel.destroy()
```

The same image is the responsibility of a drawing process; do not allow different tasks to be screened, loaded with images or modified for drawing status. `run()` has been automatically refreshed and does not need to be called again in `draw()`.

## Application events

These are Python-level applications that do not automatically subscribe to touch, G-sensor or BLE. You need to take the initiative `emit()` in the corresponding component's return.

| Interface | Parameters and Return Values |
| --- | --- |
| `on(ev_type, handler)` | Two mandatory; registration handler for event type returns `None` |
| `off(ev_type, handler)` | 2 mandatory; remove a matching handler once and ignore it when it does not exist |
| `emit(ev_type, data=None, ts_ms=None)` | `ev_type` Required; in group, time default `time.ticks_ms()` returns `None` |
| `events()` | Return to this frame list of events, suggest read-only and not keep as a history snapshot |
| `state()` | Return shared dictionary, to apply status |
| `frame_count` | Open Integer Frame Count Properties |

Handler. `handler(ev)`It's compatible. `handler(ev, state_dict)`.event contains `ev.type`, `ev.data`, `ev.ts_ms`. To reduce ambiguity, use single parameterhandler: currently try single parameter calls, encountered `TypeError` I'll try two parameter, inside of Handler. `TypeError` Or trigger this retry.

```python
import micropyxel as pyxel

pyxel.init()
pyxel.state()["color"] = 7

def change_color(ev):
    pyxel.state()["color"] = ev.data

pyxel.on("color", change_color)
pyxel.emit("color", 8)

def update(rt):
    pass

def draw(rt):
    pyxel.cls(0)
    pyxel.rect(12, 4, 8, 8, rt.state()["color"])

try:
    pyxel.run(update, draw)
finally:
    pyxel.off("color", change_color)
    pyxel.destroy()
```

Queue capacity is **128**, with new events squeezing out the oldest; a maximum of **64** for each frame. Incidents are handled in subsequent queues, which do not guarantee or follow. It is not a reliable news queue, and there is no hard break in security commitments. Manual refreshing mode does not automatically distribute these events.

`run()` and `destroy()` empty Python handlers, shared status and queues to be processed. When running again in the same interpreter, you should remove the handler, clean up the application state and avoid repeating registrations.

Source: `micropyxel.py`, `mpy-wrapper/mod_pyxel.c`, `pyxel-engine/graphics/pyxel_graphics.c`.
