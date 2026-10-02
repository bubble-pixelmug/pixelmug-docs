# G-sensor（运动传感器）

`g_sensor` 是 PixelMug S1 Pro/Lite 的运动传感器组件。MPY 应用可以用它读取三轴加速度、三轴角速度、姿态角和四元数，也可以接收晃动、静止、倾斜、敲击等运动事件。

常见应用包括：

- 倾斜水杯控制粒子或游戏角色。
- 检测摇晃、拿起、放下等动作。
- 根据姿态改变画面方向或交互状态。
- 在主循环中响应敲击、显著运动等事件。


## 能力概览

| 能力 | 接口 | 返回内容 |
| --- | --- | --- |
| 三轴加速度 | `get_accel()` | X、Y、Z 三轴加速度，单位为 g |
| 三轴角速度 | `get_gyro()` | X、Y、Z 三轴角速度，单位为 °/s |
| 姿态角 | `get_euler()` | yaw、pitch、roll，单位为度 |
| 姿态四元数 | `get_quaternion()` | qx、qy、qz、qw，适合 3D 旋转与姿态传输 |
| 完整快照 | `get_attitude()` | 姿态角、角速度和加速度共 9 个值 |
| 运动事件轮询 | `poll_events()` | 自上次轮询后累计的事件位掩码 |
| 运动事件回调 | `on()`、`off()` | 订阅或注销指定运动事件 |

调用 `init()` 后，组件持续更新运动数据。读取接口取得最近一次有效的数据快照，不会在每次调用时临时进行一次新的硬件采样。

## 声明组件依赖

在项目的 `mpy/mps.json` 中声明 `g_sensor`：

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

然后在 Python 代码中导入：

```python
import g_sensor
```

## 快速开始

下面的程序等待组件初始化并取得第一份有效数据，然后每 100 ms 打印一次加速度：

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
                # 组件已初始化，但第一份有效样本可能仍在生成。
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

`init()` 返回 `True` 表示组件的启动流程已经建立，不表示第一份传感器数据已经准备好。应用应等待 `STATUS_OK`；紧接初始化完成的第一帧仍可能尚无有效样本，因此上例同时重试第一次读取。

## 初始化状态

### `init()`

```python
ok = g_sensor.init()
```

启动组件，返回布尔值：

- `True`：启动流程已经创建，或组件已经启动。
- `False`：无法启动。

重复调用是幂等的。通常只在应用开始时调用一次。

### `is_ready()`

```python
status = g_sensor.is_ready()
```

返回当前初始化状态：

| 常量 | 值 | 含义 |
| --- | ---: | --- |
| `STATUS_IDE` | `0` | 当前尚未完成初始化，或组件已经释放 |
| `STATUS_INIT_RUNNING` | `1` | 正在初始化 |
| `STATUS_OK` | `2` | 传感器已经完成初始化 |

初始化过程中遇到暂时的通信失败时，组件会继续尝试恢复。应用应设置自己的等待超时，不要无限阻塞在启动页面。

### `deinit()`

```python
g_sensor.deinit()
```

停止组件并释放它持有的资源，返回 `None`。

`deinit()` 还会：

- 清除通过 `on()` 注册的 Python 回调。
- 清除尚未由 `poll_events()` 读取的事件。
- 使之前的数据快照失效。

再次调用 `init()` 后，需要重新注册事件回调。重复 `deinit()` 是安全的。

## 推荐的生命周期

使用 `try/finally` 保证正常结束和 Python 异常时释放组件：

```python
import g_sensor

if not g_sensor.init():
    raise RuntimeError("g_sensor init failed")

try:
    # 等待就绪并运行应用
    pass
finally:
    g_sensor.deinit()
```

如果应用注册了事件回调，建议显式调用 `off()`，再执行 `deinit()`：

```python
def on_motion(events):
    print("motion:", events)


g_sensor.on(g_sensor.EVENT_ANY_MOTION, on_motion)

try:
    # 应用主循环
    pass
finally:
    g_sensor.off(on_motion)
    g_sensor.deinit()
```

即使遗漏 `off()`，`deinit()` 也会清理登记状态。显式注销能让代码的资源关系更清楚。

## 当前数据配置

这些参数由当前组件固定配置，Python API 暂不提供修改接口：

| 项目 | 当前配置 |
| --- | --- |
| 数据更新频率 | 50 Hz，目标更新间隔约 20 ms |
| 加速度量程 | ±8 g |
| 角速度量程 | ±2000 °/s |
| 加速度单位 | g |
| 角速度单位 | °/s |
| 姿态角单位 | 度 |

50 Hz 是组件的目标采样频率，不表示 Python 每次调用读取接口都会得到一份新样本。应用以 30 FPS 更新画面时，每帧读取一次通常已经足够。

## API 速查

| 接口 | 说明 |
| --- | --- |
| `init()` | 启动组件 |
| `is_ready()` | 查询初始化状态 |
| `deinit()` | 停止组件并清理数据、事件和回调 |
| `get_accel()` | 读取三轴加速度 |
| `get_gyro()` | 读取三轴角速度 |
| `get_euler()` | 读取 yaw、pitch、roll |
| `get_quaternion()` | 读取归一化姿态四元数 qx、qy、qz、qw |
| `get_attitude()` | 一次读取全部 9 个运动数据 |
| `poll_events()` | 读取并清除累计的运动事件 |
| `on(mask, callback)` | 注册运动事件回调 |
| `off(callback)` | 注销运动事件回调 |

详细的数据解释见[读取运动数据](./readings)，事件常量和处理方式见[运动事件](./events)。
