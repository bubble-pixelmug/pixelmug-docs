# MPY runtime fundamentals

MPY is a MicroPython application that runs at the end of the PixelMug device. It draws images, handles touch and movement input, play or record audio, and interacts with other programs via Wi-Fi or BLE.

This section starts with a description of how the program is organized, started and exited, and how documents, memory and tasks are managed. Specific mapping, audio and communication interfaces are presented in the component documents.

## Supported devices and runtime

Device end-of-pipe MPY applies to **PixelMug S1 Series (Pro / Lite), excluding PixelMug P1**.

The current kernel source code is based on **MicroPython 1.27.0-preview** and incorporates PixelMug 's device component.

You can print the operating environment in the device program:

```python
import sys
import os

print(sys.implementation)
print(sys.version)
print(os.uname())
```

MicroPython supports the common Python syntax, but not the complete CPython environment on the computer. Desktop Python packages, primary extensions and standard library interfaces cannot be used directly by default. The components used by the device program are not on the npm of Studio.

## Where the program runs

| Component | Run Location | Relationship to MPY |
| --- | --- | --- |
| Studio | Computer development | Edit, upload and start the device, display the log |
| Bot | Node.js on a computer or server | Process messages and application logic, start operations through the device interface |
| WebApp | Web Environment in Bubble App | Provides an operating page that can interact with the device through the device interface or BLE |
| MPY | MicroPython packaging for PixelMug | Execute device end Python code, using display, audio and sensor capabilities |

Boot start and MPY start are two steps. Only Bot starts, not because the device end code is loaded; application of the logic determines whether MPY relies on a continuous network or mobile phone connection.

## Project directory and entry point

In the Studio project, the end code of the device is placed at `mpy/`:

```text
my-app/
├─ bot/
│  └─ index.js
└─ mpy/
   ├─ __main__.py      Program portal
   ├─ mps.json         Apply Description
   ├─ drawing.py      Self-generated modules
   └─ assets/
      └─ image.png    Resources used for the process
```

Studio is currently asking for an application `bot/`. If contains `mpy/`, of which must `__main__.py` And legal. `mps.json`. Pure device viewapplication can also be completed and loaded with a simple Bot, reference[Experience more MPY application](/en/getting-started/04-more-mpy).

### `__main__.py`

From `__main__.py` Start implementation. Suggests that the main process be put in `main()`: 

```python
def main():
    print("Hello, PixelMug!")


if __name__ == "__main__":
    main()
```

This program ends when you print a line of logs. This is a normal completion, not a running failure. The program that needs to show or respond to the operation on a continuous basis should keep its own running cycle.

### `mps.json`

Below are examples of applications that include MicroPyxel:

```json
{
  "name": "my-pixelmug-app",
  "version": "1.0.0",
  "description": "My first device application.",
  "dependencies": [
    { "name": "micropyxel", "version": ">=1.0.0" }
  ]
}
```

| Fields | Purpose |
| --- | --- |
| `name` | Apply Name |
| `version` | Apply Version |
| `description` | Introduction to application |
| `dependencies` | Declaration of device components and version requirements for application |

** The relying statement does not automatically download or install the component. ** The current Studio opens the project to check whether the file is a valid JSON object and does not install the library or complete the component version accordingly. The string above is an example of the declaration format, which does not represent a solid text that provides a search interface for the same name. The actual available interface is checked with the target solid.

Device built-in components are provided by solids; self-generated Python modules and application resources are uploaded with `mpy/`.

## From loading to execution

There are two common ways of doing this in Studio:

- **Auto Load**: check for " Auto-device code running after startup " . Start angent and recognize it to amotive data, load and run by Studio `mpy/`.
- ** Manual loading**: turn off automatic running, with a installation order provided by Bot. Example 4 Launching device loading using `/installMPY`.

Details can be found at [Install and run MPY on PixelMug](/en/getting-started/03-ble-play) and [Experience more MPY applications](/en/getting-started/04-more-mpy).

Saves a file on a computer does not automatically update the mug. The modification requires reloading the device code; when you load it automatically, you can save it and restart it.

“Process has begun to run” means that it is in the process of entering the portal, and not equal to the network, bluetooth, or all components already in place. The application should not begin until the initialization has been completed, e.g., waiting for the sensor to be ready or waiting for the BLE connection to be completed.

## File paths and module imports

### How the local `mpy/` directory maps to the device

Studio, upload. `mpy/` **What's in it?**. For example:

| Computer file. | Device path after Tudio load |
| --- | --- |
| `mpy/__main__.py` | `/__main__.py` |
| `mpy/drawing.py` | `/drawing.py` |
| `mpy/assets/image.png` | `/assets/image.png` |

Studio sets the work directory to `/` when starting the entry. Therefore, the following is used for reading the resource:

```python
with open("assets/image.png", "rb") as source:
    header = source.read(8)
```

Do not write `mpy/assets/image.png`, or use `D:\...` path on the computer. The binary resource is read at `rb` and the text file at `r`.

The relative path is based on the current working directory and not on the directory where the current Python module is located. If the program is called `os.chdir()`, the relative path will change.

### Import your own module

If `drawing.py` is in the same directory as the entry:

```python
import drawing
```

Multiple files can also be organized into packages with `__init__.py`. The built-in components can be imported directly, e.g.:

```python
import micropyxel as pyxel
import mpy_button
```

Avoid naming your files as already existing module names `time.py`, `json.py`, `micropyxel.py` etc. to avoid import conflicts.

### Edits and redeployment

The program may use `open()` and `os` operating device files, but** it is not assumed that the application data will be installed or redeployed for retention**.

The current Studio cleans up the application file before uploading. Only the REPL start-up file is required; the firmware installation process also clears the MPY partition when re-installing the application is required. The settings, caches or recordings written in the program run may be deleted from the next load. The contents that need to be saved should be removed before reloading or sent to an external service to save them.

Do not place the name of the document in the root directory `mpy/` in the Studio file: `boot.py`, `webrepl_cfg.py`, `__studio_bootstrap__.py`. These documents are managed by the operating environment.

## Choose a runtime loop

### Regular loop for simple tasks

```python
import time


def main():
    while True:
        print("MPY is running")
        time.sleep_ms(1000)


if __name__ == "__main__":
    main()
```

Keep waiting time in the cycle to avoid searching the device or the output log without any interval.

When measured over time, `time.ticks_ms()` and `time.ticks_diff()` are used; values are calculated in a reverse manner and do not depend on direct reductions for long periods:

```python
started = time.ticks_ms()
# Execute Operation
elapsed = time.ticks_diff(time.ticks_ms(), started)
```

### MicroPyxel loop for continuous drawing and interaction

The complete entry below displays a light point on the screen and clicks the bottom touch button to exit:

```python
import micropyxel as pyxel
import mpy_button


def update(rt):
    if mpy_button.get() == "click":
        pyxel.quit()


def draw(rt):
    pyxel.cls(0)
    pyxel.pset(16, 8, 10)


def main():
    pyxel.init(start_audio=False)
    try:
        mpy_button.clear()
        pyxel.run(update, draw, fps=30)
    finally:
        pyxel.destroy()


if __name__ == "__main__":
    main()
```

- `update()` handles input and updates.
- `draw()` Drawing by status.
- `run()` Call both functions and refresh the screen after drawing each frame.
- `rt` is a back-to-back run-time module object; this example is directly `pyxel` and does not need to be used.
- `quit()` requests to end the drawing cycle, control flow returns `main()` and then clean up.

`fps=30` is the target frame rate, not a real-time guarantee. Do not execute a long blocked HTTP request, file reading or waiting on each frame back. Otherwise, the image and input response will stop.

### `asyncio` for asynchronous networking and concurrent tasks

```python
import asyncio


async def main():
    while True:
        print("async task is running")
        await asyncio.sleep_ms(1000)


asyncio.run(main())
```

`asyncio` Make the task alternated by `await`. Synchronization of the network request, `time.sleep_ms()` and long-term calculations do not become a walk-in operation by `async def`; a corresponding walk-in interface is required.

If the main function requires parameters, the parameters are passed to the main function:

```python
# Suppose you defined it. async def main(proxy=None)
asyncio.run(main(proxy="http://192.168.0.10:7890"))
```

Here `proxy` is the parameter for the application function, not the parameter for `asyncio.run()`, and does not automatically configure the entire network connection. The application needs to return it to the network interface that supports the agent.

`pyxel.run()` and `asyncio.run()` will take over the call process until it is withdrawn. Do not simply call them back and forth and expect both cycles to work simultaneously; select the main cycle and then design the collaboration between components according to the application needs.

The current solid is also enabled `_thread`, but the thread involves a shared state, exit and competition for device resources. Base application prioritizes individual loops or different tasks; only the thread is introduced when it is clearly required.

## Exit and resource cleanup

The application can be executed automatically or exited by the end of the loop. Failure to process anomalies will terminate the current execution process and output the wrong information.

For resources to be released, the exit echo provided by `try/finally` or components is used:

| Resources | Common Cleanup Method |
| --- | --- |
| Documentation | `with open(...)` AutoClose |
| MicroPyxel | `pyxel.destroy()` |
| BLE Application Service | Client `deinit()` |
| G-sensor | `g_sensor.deinit()` |
| PixelDust | Particle object `deinit()` |
| HTTP, WebSocket, Audio Session | Close or cancel the corresponding component interface |

Only the resources that are initialized or held by the current application should be cleaned. When multiple components share audio, display, etc. capabilities, arrangements for initialization and clean-up should be harmonized, with specific rules set out in the component document.

`pyxel.run()` also supports `on_exit(rt, reason, error)` by concentrating the clean-up of the drawing cycle in that turn. The example above selects `finally` and does not need to repeat the same destruction action.

`finally` can handle normal Python exit and abnormal expansion,** and cannot be guaranteed in case of power outages, hardware restarts or forced terminations of VM**. Stadio ' s suspension or redeployment may involve the restart of device, so that important data are not saved only at exit.

## Common built-in modules and memory

| Modules | Common uses |
| --- | --- |
| `time` | Wait, time, time to read |
| `asyncio` | Offset tasks and network collaboration |
| `json` | JSON decode |
| `struct` | Binary message packs and resolves. |
| `os` | Files, directories and work paths |
| `sys` | Operating environment, modular path, abnormal output |
| `gc` | Garbage recycling and Python Memory Observation |
| `math`, `random` | Mathematical calculations and random numbers |

These modules should be used on an interface supported by MicroPython.

Device memory is limited and photographic, audio and network data should be processed as far as possible by block; frequent cycles should be repeated as much as possible to avoid creating a large number of temporary objects per frame.

```python
import gc

print("Python heap free:", gc.mem_free())
gc.collect()
print("After collection:", gc.mem_free())
```


These values reflect the Python pile and do not represent the entire system. `gc.collect()` cannot replace the resource release of display, audio and network components themselves.

## Logs and next steps

Use `print()` to output critical state to view the device debug page in Studio. It is recommended to record the initialization completed, the connection changes and the results of the operation, and to avoid printing a large amount of content per frame.

If you need to capture the anomaly and keep the stack, you can use `sys.print_exception(error)`. Do not ignore all the anomalies quietly, otherwise the program has failed and the interface may remain in the previous image.

```python
import sys

try:
    1 / 0
except Exception as error:
    # Print complete abnormal stack information to Studio
    sys.print_exception(error)
```

When you are ready to recycle, you can access components [MicroPyxel](/en/device/micropyxel/), [Touch key](/en/device/button/), and [G-sensor](/en/device/g-sensor/). If you want to run the full project, you can return [Now.](/en/getting-started/).
