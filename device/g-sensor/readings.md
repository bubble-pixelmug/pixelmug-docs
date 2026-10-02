# 读取运动数据

G-sensor 提供加速度、角速度、欧拉姿态角和姿态四元数。组件持续采样并保存最近一次完整结果，Python 读取的是这份快照。

## 数据快照如何更新

当前组件使用 50 Hz 配置，目标更新间隔约 20 ms。一次有效快照包含：

```text
qx, qy, qz, qw
yaw, pitch, roll
gx, gy, gz
ax, ay, az
```

这些值在底层作为一个整体更新。为保持已有应用兼容，`get_attitude()` 仍只返回原有的 9 个欧拉角、角速度和加速度值；四元数通过 `get_quaternion()` 单独读取。

连续两次读取的间隔短于约 20 ms 时，很可能取得相同快照。这是正常行为，不表示传感器停止工作。

初始化完成但第一份有效样本尚未生成时，读取接口会抛出：

```text
RuntimeError: get_attitude failed
```

应用应先等待 `STATUS_OK`，并允许第一次读取短暂重试。完整初始化写法见[G-sensor 快速开始](./#快速开始)。

## 坐标轴

`get_accel()` 和 `get_gyro()` 返回传感器 X、Y、Z 三轴数据换算后的物理量。当前实现只进行单位换算，没有在 G-sensor 组件中调用轴重映射接口，也没有在 Python 层交换或反转轴。

在用户面对水杯正面、杯体竖直的情况下，PixelMug S1 实机标定结果如下：

![PixelMug G-sensor 坐标系：+X 向左、+Y 朝向用户、+Z 向上](./coordinate-axes.png)

*PixelMug G-sensor 坐标系（正对水杯观察）*

![PixelMug G-sensor 坐标系俯视图，屏幕侧朝向用户](./coordinate-axes-top-view.png)

*PixelMug G-sensor 坐标系俯视图（Display Side 为屏幕所在一面）*

| G-sensor 方向 | 水杯方向 |
| --- | --- |
| `+X` | 向用户左侧 |
| `-X` | 向用户右侧 |
| `+Y` | 向前，即靠近用户 |
| `-Y` | 向后，即远离用户 |
| `+Z` | 向上，指向杯口方向 |
| `-Z` | 向下，指向杯底方向 |


需要重新验证硬件版本或安装方向时，可以运行 Studio 示例：

```text
examples/mpy-tutorial/examples/motion-axis-calibration
```

测试时保持杯体朝向不变，只做直线平移。程序会减去静止基线，并用相反方向互相校验。


## `get_accel()`：三轴加速度

```python
ax, ay, az = g_sensor.get_accel()
```

不接收参数，返回 3 元组：

| 返回值 | 含义 | 单位 |
| --- | --- | --- |
| `ax` | X 轴加速度 | g |
| `ay` | Y 轴加速度 | g |
| `az` | Z 轴加速度 | g |

当前量程是 ±8 g。底层按以下关系把传感器原始整数转换为 g：

```text
加速度（g）= 原始值 / 32768 × 8
```

### 返回值包含重力

加速度数据同时包含：

- 重力在三个轴上的分量。
- 移动、摇晃、碰撞等运动产生的加速度。

水杯静止时，三个轴不一定为 0。取决于放置方向，重力主要落在其中一个或多个轴上。静止状态下的合加速度通常接近 1 g：

```python
import math
import time
import g_sensor


if not g_sensor.init():
    raise RuntimeError("g_sensor init failed")

try:
    deadline = time.ticks_add(time.ticks_ms(), 5000)

    while True:
        if time.ticks_diff(deadline, time.ticks_ms()) <= 0:
            raise RuntimeError("g_sensor not ready")

        if g_sensor.is_ready() == g_sensor.STATUS_OK:
            try:
                ax, ay, az = g_sensor.get_accel()
                break

            except RuntimeError:
                pass

        time.sleep_ms(20)

    magnitude = math.sqrt(ax * ax + ay * ay + az * az)

    print("accel:", ax, ay, az)
    print("acceleration magnitude:", magnitude)
finally:
    g_sensor.deinit()
```

传感器误差、振动和采样波动会让结果偏离理想值。

### 使用初始值作为应用基准

应用关心相对变化时，可以记录启动时的加速度：

```python
base_x, base_y, base_z = g_sensor.get_accel()

while True:
    ax, ay, az = g_sensor.get_accel()

    dx = ax - base_x
    dy = ay - base_y
    dz = az - base_z

    handle_motion(dx, dy, dz)
```

这只是应用层基准，不会校准传感器。长时间运行时，可在确认设备静止后缓慢更新基准，避免把一次采样永久当成零点。

## `get_gyro()`：三轴角速度

```python
gx, gy, gz = g_sensor.get_gyro()
```

不接收参数，返回 3 元组：

| 返回值 | 含义 | 单位 |
| --- | --- | --- |
| `gx` | X 轴角速度 | °/s |
| `gy` | Y 轴角速度 | °/s |
| `gz` | Z 轴角速度 | °/s |

当前默认量程是 ±2000 °/s。传感器底层接口返回有符号 16 位原始值，G-sensor 组件按照配置量程使用 `原始值 / 32768 × 量程` 换算为 °/s；`get_gyro()` 返回的是换算后的角速度。

角速度适合检测快速旋转、甩动和旋转方向。水杯保持静止时，数值应接近 0，但可能存在零点偏移和噪声。

```python
gx, gy, gz = g_sensor.get_gyro()

if abs(gz) >= 120:
    print("fast rotation on Z:", gz)
```

`120` 只是应用阈值示例，不是固件内置的手势阈值。

## `get_euler()`：姿态角

```python
yaw, pitch, roll = g_sensor.get_euler()
```

不接收参数，返回 3 元组，单位为度：

| 返回值 | 当前计算范围 | 含义 |
| --- | --- | --- |
| `yaw` | 约 0～360° | 偏航角 |
| `pitch` | 约 -90～90° | 俯仰角 |
| `roll` | 约 -180～180° | 横滚角 |

姿态角不是传感器直接输出的数据。当前实现先把陀螺仪原始值换算为 °/s，再将三轴角速度和三轴加速度交给 Mahony IMU 算法。Mahony 使用与采样配置一致的时间步长；当前默认采样率是 50 Hz。

当前计算没有使用磁力计，因此：

- pitch 和 roll 可以利用重力方向进行修正。
- yaw 没有绝对方位参考，会随陀螺仪误差逐渐漂移。
- yaw 不能当作指南针方向。
- 组件重新初始化后，姿态融合状态会重置。

快速线性运动会改变加速度方向，因此也可能暂时影响融合姿态。

## `get_quaternion()`：姿态四元数

```python
qx, qy, qz, qw = g_sensor.get_quaternion()
```

不接收参数，返回 Mahony 姿态融合器当前的归一化四元数：

| 返回值 | 含义 |
| --- | --- |
| `qx` | X 轴方向的向量分量 |
| `qy` | Y 轴方向的向量分量 |
| `qz` | Z 轴方向的向量分量 |
| `qw` | 标量分量 |

返回顺序是 `(x, y, z, w)`，与 Three.js 的 `Quaternion` 参数顺序一致，无需重排分量。底层融合器内部按 `(w, x, y, z)` 保存；Python 接口已经调整了顺序。把姿态用于 3D 模型时，仍需根据传感器安装方向和模型坐标系进行一次固定坐标变换。

四元数适合连续组合三轴旋转、向 3D 查看器传输姿态，以及在两个姿态之间做球面线性插值。它避免了欧拉角在接近特定姿态时的万向节锁和角度跨越问题。`q` 与 `-q` 表示同一个旋转；连续处理数据时，可根据前后两个四元数的点积统一符号，再进行插值。

四元数和欧拉角来自同一个 Mahony 融合状态，因此同样有以下限制：当前没有磁力计，绕重力方向的绝对朝向会逐渐漂移；快速线性运动也可能短暂影响融合结果。

```python
import math

qx, qy, qz, qw = g_sensor.get_quaternion()
norm = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw)
print("quaternion:", qx, qy, qz, qw)
print("norm:", norm)
```

正常数据的模长应接近 `1`。应用通常无需再次归一化；跨网络传输或参与多步浮点计算后，可以在接收端再次归一化。

## `get_attitude()`：完整快照

```python
data = g_sensor.get_attitude()

(
    yaw, pitch, roll,
    gx, gy, gz,
    ax, ay, az,
) = data
```

不接收参数，返回值顺序固定为：

| 位置 | 值 | 单位 |
| ---: | --- | --- |
| 0 | `yaw` | 度 |
| 1 | `pitch` | 度 |
| 2 | `roll` | 度 |
| 3 | `gx` | °/s |
| 4 | `gy` | °/s |
| 5 | `gz` | °/s |
| 6 | `ax` | g |
| 7 | `ay` | g |
| 8 | `az` | g |

需要在同一次应用更新中同时使用多类数据时，优先调用 `get_attitude()`：

```python
yaw, pitch, roll, gx, gy, gz, ax, ay, az = (
    g_sensor.get_attitude()
)
```

分别调用 `get_euler()`、`get_gyro()` 和 `get_accel()` 时，每次都会取得当时的最新快照；后台可能恰好在两次调用之间完成更新。需要所有数值严格来自同一快照时，使用 `get_attitude()`。

## 在主循环中读取

### 普通循环

```python
import time

while True:
    ax, ay, az = g_sensor.get_accel()
    update_physics(ax, ay, az)
    time.sleep_ms(20)
```

### MicroPyxel 更新循环

```python
def update(rt):
    ax, ay, az = g_sensor.get_accel()
    update_scene(ax, ay, az)
```

MicroPyxel 以 30 FPS 运行时，每帧读取一次即可。不要在同一帧内无间隔重复读取几十次；这些调用通常只会取得同一份缓存数据。

## 平滑与阈值

传感器数据存在正常波动。不要用 `value == 0` 判断静止，应使用应用阈值：

```python
gx, gy, gz = g_sensor.get_gyro()

still = (
    abs(gx) < 3
    and abs(gy) < 3
    and abs(gz) < 3
)
```

上面的 `3°/s` 是演示值，需要按设备和使用场景测试。

需要让画面变化更平滑时，可以在应用层做简单低通处理：

```python
smooth_x = 0.0
smooth_z = 0.0

def update_motion():
    global smooth_x, smooth_z

    ax, ay, az = g_sensor.get_accel()

    smooth_x = smooth_x * 0.8 + ax * 0.2
    smooth_z = smooth_z * 0.8 + az * 0.2

    return smooth_x, smooth_z
```

滤波会降低抖动，也会增加响应延迟。系数应根据游戏、动画或姿态控制的实际体验调整。

## 错误与限制

五个读取接口都可能在没有有效快照时抛出：

```text
RuntimeError: get_attitude failed
```

这包括尚未取得第一份有效样本的情况。当前接口不会为四种读取方式提供不同的错误文本。

其他限制：

- Python API 不能修改量程、采样频率或 Mahony 参数。
- 读取接口返回最近快照，不保证每次调用都是新样本。
- 加速度包含重力和运动分量。
- 姿态计算没有磁力计，yaw 以及四元数中的绝对偏航会漂移。
- 四元数表示完整旋转，不能把 qx、qy、qz 当作分别独立的三个角度使用。
- 快速移动、碰撞和振动可能暂时影响姿态稳定性。
- 源码没有提供硬件安装方向定义，应用应实测坐标轴。
- 不要用高频 `print()` 验证每一个样本；日志输出会降低应用循环速度。