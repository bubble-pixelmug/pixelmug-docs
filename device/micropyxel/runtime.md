# 运行与事件

MicroPyxel 提供自动循环和手动刷新两种用法。一个 MPY 应用使用一个全局 MicroPyxel 上下文。

## 初始化与释放

### `init(*, start_audio=False)`

`start_audio` 是可选的**仅关键字参数**，布尔值，决定是否启动音频合成任务。纯绘图保持 `False`；声音应用先初始化 Audio Service，再传 `True`，见[声音播放](./audio)。

返回 `True` 表示新建成功，返回 `False` 表示已经初始化。内存不足、上下文创建失败时抛出 `OSError`。

```python
import micropyxel as pyxel
pyxel.init(start_audio=False)
```

已经以 `False` 初始化后，再调用 `init(start_audio=True)` 不会开启声音，它只会返回 `False`。需要在应用首次初始化时确定是否启用合成音频。

### `destroy()`

释放当前上下文及全局图像、地图、音乐、声音、音色、通道资源，并停止 MicroPyxel 音频任务。存在上下文时返回 `True`，否则返回 `False`。释放前会以索引 `0` 清屏并刷新；如果把颜色 0 改成其他 RGB，它不一定显示黑色。

`destroy()` 不替你退出 `run()`，也不负责反初始化应用使用的 Audio Service、BLE、传感器等组件。退出循环后清理资源；释放后重新 `init()` 必须重新获取资源对象。

## 自动循环

### `run(update, draw, fps=30, on_exit=None, quit_event_type="quit")`

这是 Python 函数，支持位置或关键字参数，阻塞运行直到退出。

| 参数 | 必填 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `update` | 是 | — | `update(rt)`，更新状态，不需要更新时提供空函数 |
| `draw` | 是 | — | `draw(rt)`，绘制当前帧 |
| `fps` | 否 | `30` | 目标帧率，建议正整数 |
| `on_exit` | 否 | `None` | `on_exit(rt, reason, exc)`，退出回调 |
| `quit_event_type` | 否 | `"quit"` | 遇到该类型事件时退出；`None` 禁用此规则 |

每帧依次：取事件 → 分发事件 → `update(rt)` → `draw(rt)` → `render_graphics()` → 帧计数递增 → 等待下一帧。

`rt` 就是 `micropyxel` 模块。`rt.frame_count` 从 0 开始，每次 `run()` 重置；可以用来驱动动画。它不是毫秒时间，也不能用帧数保证实际秒数。需要真实时间时使用 `time.ticks_ms()` 和 `time.ticks_diff()`。

`run()` 不自动调用 `init()` 或 `destroy()`，也不自动 `cls()`。想每帧重画时在 `draw()` 开头清屏；想保留笔迹时可以不清屏。

### 帧率与调度

目标周期按整数毫秒计算，30 fps 对应 33 ms，60 fps 对应 16 ms。处理超时后会让出约 1 ms，严重落后时重新对齐截止时间；不会补算被错过的更新帧。因此 fps 是调度目标，不是精确计时或硬件刷新速率。

此循环使用同步 `time.sleep_ms()`，不会驱动 `asyncio` 事件循环。应用需要并行运行异步网络任务时，应采用下面的手动刷新方式，在自己的协程中 `await asyncio.sleep_ms(...)`。

### `quit()` 与退出原因

`quit()` 设置退出标志，返回 `None`。在 `update()` 内调用时，本帧仍会执行 `draw()` 与刷新，然后退出。默认的 `"quit"` 事件则在绘制前终止该帧。

| `on_exit` 收到的 `reason` | 情况 |
| --- | --- |
| `"stop"` | 通过 `quit()` 退出 |
| `"quit"` | 收到配置的退出事件 |
| `"keyboardinterrupt"` | `KeyboardInterrupt` 被循环捕获，不再向外抛出 |
| `"exception"` | 更新、绘制或事件处理异常；执行退出回调后重新抛出 |

`exc` 为对应异常对象，正常退出时为 `None`。退出回调自身抛出的普通异常会打印 `on_exit err:`，不替代原异常。

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

## 手动刷新

### `render_graphics()`

把屏幕索引缓冲按颜色表转换并写入设备虚拟帧缓冲。没有参数，返回 `None`。它不运行更新回调、不清屏、不休眠，也不限制帧率。需要已初始化的上下文和可用的设备帧缓冲。

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

同一画面由一个绘制流程负责；不要让不同任务同时清屏、加载图像或修改绘图状态。`run()` 已自动刷新，不必在它的 `draw()` 里再次调用本接口。

## 应用事件

这些是 Python 层的应用事件，不会自动订阅触摸、G-sensor 或 BLE。需要在对应组件回调中主动 `emit()`。

| 接口 | 参数与返回值 |
| --- | --- |
| `on(ev_type, handler)` | 两项必填；为事件类型注册处理器，返回 `None` |
| `off(ev_type, handler)` | 两项必填；移除一次匹配的处理器，不存在时忽略 |
| `emit(ev_type, data=None, ts_ms=None)` | `ev_type` 必填；入队，时间默认 `time.ticks_ms()`，返回 `None` |
| `events()` | 返回本帧事件列表，建议只读，不要保留为历史快照 |
| `state()` | 返回共享字典，可放应用状态 |
| `frame_count` | 公开的整数帧计数属性 |

处理器接收 `handler(ev)`，也兼容 `handler(ev, state_dict)`。事件含 `ev.type`、`ev.data`、`ev.ts_ms`。为减少歧义，推荐使用单参数处理器：当前实现先尝试单参数调用，遇到 `TypeError` 后才尝试两参数，处理器内部的 `TypeError` 也可能触发这次重试。

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

队列容量为 **128**，满后新事件挤掉最旧事件；每帧最多取 **64** 个。事件会在后续取队列时处理，不保证就是紧接着的一帧。它不是可靠消息队列，也没有硬中断安全承诺。手动刷新模式不会自动分发这些事件。

`run()` 和 `destroy()` 不清空 Python 的处理器、共享状态及待处理队列。同一解释器内重复运行时，应自行移除处理器、清理应用状态，避免重复注册。

源码：`micropyxel.py`、`mpy-wrapper/mod_pyxel.c`、`pyxel-engine/graphics/pyxel_graphics.c`。
