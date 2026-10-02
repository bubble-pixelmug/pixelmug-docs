# 运动事件

`g_sensor` 可以报告传感器识别到的运动事件。应用可以在主循环中调用 `poll_events()`，也可以通过 `on()` 注册 Python 回调。

事件只表示某类情况已经发生。它们不替代 `get_accel()`、`get_gyro()` 和 `get_euler()` 提供的连续运动数据。

## 事件位掩码

事件使用整数位掩码表示。一次轮询或一次回调可能同时包含多个事件：

```python
events = g_sensor.poll_events()

if events & g_sensor.EVENT_ANY_MOTION:
    print("检测到运动")

if events & g_sensor.EVENT_TILT:
    print("检测到倾斜")
```

不要使用相等比较判断单个事件：

```python
# 不推荐：同时出现其他事件时条件不成立
if events == g_sensor.EVENT_TILT:
    print("tilt")
```

应使用按位与 `&`。这样即使同一数值中还包含其他事件，目标事件仍能被识别。

## 支持的事件

当前 Python 模块公开以下常量：

| 常量 | 值 | 当前接口表达的信息 |
| --- | ---: | --- |
| `EVENT_NO_MOTION` | `0x0001` | 传感器产生无运动事件 |
| `EVENT_ANY_MOTION` | `0x0002` | 任一启用轴产生运动事件 |
| `EVENT_FLAT` | `0x0004` | 传感器产生平放检测事件 |
| `EVENT_ORIENTATION` | `0x0008` | 传感器产生方向变化事件 |
| `EVENT_STEP_DETECTOR` | `0x0010` | 传感器产生步态检测事件 |
| `EVENT_STEP_COUNTER` | `0x0020` | 计步功能产生事件 |
| `EVENT_SIG_MOTION` | `0x0040` | 传感器产生显著运动事件 |
| `EVENT_TILT` | `0x0080` | 传感器产生倾斜事件 |
| `EVENT_TAP` | `0x0100` | 传感器产生敲击事件 |
| `EVENT_ALL` | `0x01FF` | 上述全部事件的组合掩码 |

当前接口只返回事件位，不提供对应功能的详细结果：

- `EVENT_ORIENTATION` 不包含具体朝向。
- `EVENT_STEP_COUNTER` 不包含累计步数。
- `EVENT_TAP` 不包含单击、双击或三击类型。
- 事件不包含时间戳、加速度幅度或旋转方向。

需要这些运动数值时，应在处理事件时再读取数据快照：

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

事件可以在初始化完成后轮询，但如果事件处理代码还要读取运动数据，第一份快照可能尚未生成，需要捕获异常 `RuntimeError` 并在下一轮重试

当前实现启用了 X、Y、Z 三个轴上的 any-motion 和 no-motion 检测，并启用了显著运动、倾斜、敲击、平放、方向和计步功能。Python API 不提供阈值、持续时间、迟滞或检测模式的配置接口。

## `poll_events()`：轮询事件

```python
events = g_sensor.poll_events()
```

不接收参数，返回一个整数：

- 有事件时，返回累计的事件位掩码。
- 没有事件时，返回 `0`。

调用会同时清除当前累计值。下一次调用只返回之后到达的事件。

### 普通循环

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

### MicroPyxel 更新循环

```python
def update(rt):
    events = g_sensor.poll_events()

    if events & g_sensor.EVENT_TILT:
        change_scene()

    if events & g_sensor.EVENT_TAP:
        trigger_effect()
```

轮询适合已经有固定主循环的应用，可以让运动事件与触摸、物理计算和画面更新在同一处处理。

### 累计不等于计数

`poll_events()` 使用事件位累计：

- 不同类型的事件可以同时保留。
- 同一种事件在两次轮询之间发生多次，仍只保留一个事件位。
- 读取并清除与新事件到达之间使用原子操作，不会因为简单的“先读后清零”覆盖并发到达的新事件。

即使如此，`poll_events()` 仍然不是次数统计接口。不要用它精确统计敲击次数或步数。

## `on()`：注册事件回调

```python
ok = g_sensor.on(event_mask, callback)
```

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `event_mask` | `int` | 关注的事件位，可以用 `|` 组合 |
| `callback` | callable | 接收一个事件位掩码的函数 |

返回值和异常：

| 结果 | 含义 |
| --- | --- |
| `True` | Python 回调登记成功 |
| `False` | 无法建立底层事件转发 |
| `TypeError("callback must be callable")` | 第二个参数不可调用 |
| `RuntimeError("max callbacks reached")` | 已登记 5 个 Python 回调 |

最多同时登记 5 个 Python 回调。

### 监听一个事件

```python
def on_tilt(events):
    print("tilt:", events)


g_sensor.on(g_sensor.EVENT_TILT, on_tilt)
```

### 监听多个事件

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

传给回调的数值已经与该回调登记的 `event_mask` 做过按位与，但仍可能同时包含多个匹配事件。

### 回调在哪里执行

底层不会直接从传感器处理上下文调用 Python 函数。事件到达后，回调会被调度到 MicroPython 虚拟机线程执行。

这意味着：

- Python 正在执行较长的同步操作时，回调会延后。
- 回调与应用其他 Python 代码运行在同一个虚拟机环境中。
- 回调应该保持简短。

推荐让回调只记录待处理状态：

```python
motion_pending = 0


def on_motion(events):
    global motion_pending
    motion_pending |= events
```

主循环再执行绘图、文件访问或网络操作：

```python
def update(rt):
    global motion_pending

    if motion_pending:
        events = motion_pending
        motion_pending = 0
        handle_motion(events)
```

不要在回调中长时间等待、读取大文件或执行阻塞式网络请求。

## `off()`：注销回调

```python
removed = g_sensor.off(callback)
```

必须传入注册时的同一个函数对象：

```python
def on_tap(events):
    print("tap")


g_sensor.on(g_sensor.EVENT_TAP, on_tap)

# 注销同一个函数对象
g_sensor.off(on_tap)
```

返回值：

- `True`：找到并注销了第一项匹配登记。
- `False`：没有找到该回调。

`on()` 不会阻止同一个函数被重复登记。重复登记后，单次 `off()` 只移除其中一项，因此通常不要重复登记同一个函数。

使用匿名函数时无法方便地保留原对象：

```python
# 可以注册，但之后不便单独注销
g_sensor.on(g_sensor.EVENT_TAP, lambda events: print(events))
```

应用退出前建议显式注销。`deinit()` 也会清除全部 Python 回调；重新 `init()` 后需要重新登记。

## 轮询和回调的关系

事件到达时，组件会：

1. 将事件位合并到 `poll_events()` 的待取值。
2. 调度与该事件匹配的 Python 回调。

因此两种方式会看到同一来源的事件，不是互不相关的两条通道。

| 应用结构 | 推荐方式 |
| --- | --- |
| 已有普通循环或 MicroPyxel `update()` | `poll_events()` |
| 多个模块分别关注不同事件 | `on()` |
| 希望输入、物理和画面在同一帧处理 | `poll_events()` |
| 事件到达后只需设置一个状态标志 | `on()` |

不要让回调和轮询分别执行同一个业务动作，否则同一次运动可能让应用响应两次。

## 完整生命周期示例

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

这个示例只使用回调，不再调用 `poll_events()` 处理相同动作。

## 使用限制

- 事件是通知，不包含幅度、方向、次数或详细手势类型。
- `poll_events()` 会合并同一种事件，不能作为精确计数来源。
- Python 长时间不让出执行机会时，回调会延迟。
- 事件处理能力和调度空间有限；不能假定每一次高频重复动作都会形成独立 Python 回调。
- 当前不能从 Python 修改事件阈值、持续时间和迟滞参数。
- `deinit()` 会清除待处理事件和全部 Python 回调。
- 重新初始化后需要重新调用 `on()`。