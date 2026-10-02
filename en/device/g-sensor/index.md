# G-sensor (motion sensors)

`g_sensor` is a PixelMug S1 Pro/Lite motion sensor component. MPY applications can be used to read three-axis acceleration, three-axis velocity, attitude angles and four-dollar figures, and can also receive movement events such as shaking, stationary, tilting, and banging.

Common applications include:

- Tilt mugs control particles or game roles.
- We'll be able to see if we can get it.
- Change the direction of the picture or the interactive state by attitude.
- In the main cycle, respond to incidents such as banging, visible movement, etc.


## Capabilities

| Capacity | Interface | Return Contents |
| --- | --- | --- |
| Three-axis acceleration. | `get_accel()` | X, Y, Z, a three-axis acceleration in g |
| Three-axis velocity. | `get_gyro()` | X, Y, Z, three-axis velocity in °/s |
| Post angle | `get_euler()` | yaw, pitch, roll, in degrees |
| Four-Date Postures | `get_quaternion()` | qx, qy, qz, qw, suitable for 3D rotation and attitude transfer |
| Full Snapshot | `get_attitude()` | Attitude angles, angle velocity and acceleration to 9 values |
| Campaign event round of inquiry | `poll_events()` | Event-level mask accumulated since the last interview |
| Back to Sports Events | `on()`, `off()` | Subscriptions to or cancels specified sports events |

After `init()` calls, the component updates the movement data on a continuous basis. Read the interface to obtain the latest valid data snapshot and not temporarily take a new hardware sample at each call.

## Declare the component dependency

Under project `mpy/mps.json` Statement `g_sensor`: 

```json
{
  "dependencies": [
    {
      "name": "g_sensor",
      "version": ">=1.0.0"
    }
  ]
}
```

Import in Python code:

```python
import g_sensor
```

## Quick Start

The following program waits for the component to be initialized and the first valid data obtained, and then the acceleration is printed every 100 ms:

```python
import time
import g_sensor


def wait_for_g_sensor(timeout_ms=5000):
    if not g_sensor.init():
        raise RuntimeError("g_sensor init failed")

    deadline = time.ticks_add(time.ticks_ms(), timeout_ms)

    while time.ticks_diff(deadline, time.ticks_ms()) > 0:
        if g_sensor.is_ready() == g_sensor.STATUS_OK:
            try:
                return g_sensor.get_accel()
            except RuntimeError:
                # Component Initialized, But the first active sample may still be in production..
                pass
        time.sleep_ms(20)

    raise RuntimeError("g_sensor not ready")


def main():
    try:
        ax, ay, az = wait_for_g_sensor()
        print("first sample:", ax, ay, az)

        while True:
            ax, ay, az = g_sensor.get_accel()
            print("accel:", ax, ay, az)
            time.sleep_ms(100)
    finally:
        g_sensor.deinit()


main()
```

`init()` returns `True` that the start-up process of the component has been established and does not mean that the first sensor data is ready. Application should wait `STATUS_OK`; the first frame immediately completed for initialization may not yet have a valid sample, so the first reading is retrying.

## Initialization State

### `init()`

```python
ok = g_sensor.init()
```

Start component, return boolean value:

- `True`: The start-up process has been created or the component has been activated.
- `False`: Cannot start.

Repeated calls are made in the same manner as tha.

### `is_ready()`

```python
status = g_sensor.is_ready()
```

Return to current initialization state:

| Constant | Value | Meaning |
| --- | ---: | --- |
| `STATUS_IDE` | `0` | Not yet completed or components released |
| `STATUS_INIT_RUNNING` | `1` | Initializing |
| `STATUS_OK` | `2` | Sensor has been initialized. |

When a temporary communication fails during initialization, the component continues to try to recover. The application should set its own waiting time out and not block the startup page indefinitely.

### `deinit()`

```python
g_sensor.deinit()
```

Stop the components and release the resources it holds and return to `None`.

`deinit()` will also:

- Clears the Python callback registered through `on()`.
- Clears events not yet read `poll_events()`.
- Invalids previous data snapshots.

Re-registration calls are required after calling `init()` again. Repeat `deinit()` is secure.

## Recommended life cycle

Use `try/finally` to ensure the release of components during normal end and Python anomalies:

```python
import g_sensor

if not g_sensor.init():
    raise RuntimeError("g_sensor init failed")

try:
    # Waiting for ready and running applications
    pass
finally:
    g_sensor.deinit()
```

If a registered event callback is applied, it is recommended that a visible call `off()` be made, followed by `deinit()`:

```python
def on_motion(events):
    print("motion:", events)


g_sensor.on(g_sensor.EVENT_ANY_MOTION, on_motion)

try:
    # Apply main cycle
    pass
finally:
    g_sensor.off(on_motion)
    g_sensor.deinit()
```

Even the omission of `off()`, `deinit()` cleans up the status of registration.

## Current Data Configuration

These parameters are configured by the current component and Python API does not provide a modified interface:

| Item | Current Configuration |
| --- | --- |
| Data update frequency | 50 Hz, target update approximately 20 ms |
| Speed Scale | ±8 g |
| Angular velocity range | ±2000 °/s |
| Speed units | g |
| Angular velocity units | °/s |
| Post angle units | degrees |

50 Hz is the target sampling frequency of the component, which does not mean that Python receives a new sample every time he calls the reading interface. When the image is updated with 30 FPS, it is usually enough to read it once in each frame.

## API, quick check.

| Interface | Annotations |
| --- | --- |
| `init()` | Start Component |
| `is_ready()` | Query Initialization State |
| `deinit()` | Stop the components and clean up the data, events and echoes |
| `get_accel()` | Read three-axis acceleration |
| `get_gyro()` | Read three-axis speed |
| `get_euler()` | Read yaw, pitch, roll |
| `get_quaternion()` | Read the four-digit qx, qy, qz, qw |
| `get_attitude()` | Read all 9 motor data at once |
| `poll_events()` | Read and clear cumulative sporting events |
| `on(mask, callback)` | Registered campaign events back |
| `off(callback)` | Revert to unregister campaign events |

Detailed data explanations are given at [Read Sports Data](./readings) and the event constant and the manner in which it was handled are at [Sport events](./events).
