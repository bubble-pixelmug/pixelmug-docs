# PixelDust 粒子模拟

## 来源与实现说明

`pixel_dust` 是系统提供的一个基于网格占位和离散碰撞处理的二维粒子模拟器，用于模拟尘埃、沙粒、雪花等颗粒在重力、边界和障碍物作用下的运动。

`pixel_dust` 参考并改写自
[Adafruit_PixelDust](https://github.com/adafruit/Adafruit_PixelDust)。PixelMug 的 `dust` 模块在此基础上重新实现了适用于设备的模拟器和 Python 接口，并针对 PixelMug 的屏幕尺寸、内存容量和运行方式进行了调整。

`pixel_dust` 负责维护粒子、速度、障碍物和碰撞状态，不负责绘制，也不读取 G-sensor。程序需要在自己的 `update()` 中推进模拟，再在 `draw()` 中读取粒子快照并绘制。


```python
from pixel_dust import PixelDust

dust = PixelDust(32, 16, capacity=16, scale=100)
```

模块中的 `PixelDust` 对象使用原生内存保存粒子池和位图。对象使用完毕后应显式调用 `deinit()`。

## 工作流程

一个典型的应用按下面的顺序工作：

1. 创建 `PixelDust` 对象。
2. 设置静态障碍物。
3. 使用 `spawn()` 创建粒子。
4. 在每一帧的 `update()` 中调用 `iterate()`。
5. 使用 `alive_snapshot()` 取出活动粒子。
6. 在 `draw()` 中把快照绘制到 MicroPyxel 画布。
7. 程序退出时调用 `deinit()`。

`PixelDust` 不会自动把粒子画到屏幕上，也不会自动把颜色值转换成 MicroPyxel 调色板索引。

## 创建对象

```python
PixelDust(
    w,
    h,
    capacity,
    scale,
    elasticity=128,
    sort=False,
    seed=0x12345678,
)
```

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `w` | 是 | — | 模拟区域宽度，必须大于 0 |
| `h` | 是 | — | 模拟区域高度，必须大于 0 |
| `capacity` | 是 | — | 粒子池容量，当前最大为 128 |
| `scale` | 是 | — | 加速度缩放，越大粒子越重，越小粒子越轻，范围为 `1..255` |
| `elasticity` | 否 | `128` | 反弹时的能量保留系数，越大粒子弹性越强，范围为 `0..255` |
| `sort` | 否 | `False` | 是否在每次推进前按运动方向排序活动粒子 |
| `seed` | 否 | `0x12345678` | 内部随机数种子 |

以下情况会抛出 `ValueError`：

- `w` 或 `h` 不大于 0。
- `capacity` 小于 0 或大于 128。
- `scale` 不在 `1..255`。
- `elasticity` 不在 `0..255`。

`w` 和 `h` 的底层类型是无符号 16 位尺寸。`alive_snapshot()` 导出的 `x` 和 `y` 是单字节，因此使用屏幕坐标时建议让模拟区域保持在 `0..255`，PixelMug 的 `32×16` 画布可以直接使用。

## 坐标和速度

模拟坐标的左上角是 `(0, 0)`，`x` 向右增加，`y` 向下增加。`spawn()` 和 `set_position()` 使用整数像素坐标。

粒子内部的位置和速度使用 Q8.8 定点数。速度中：

| 数值 | 约等于 |
| --- | --- |
| `256` | 1 像素 / 帧 |
| `512` | 2 像素 / 帧 |
| `2048` | 8 像素 / 帧 |
| `4096` | 16 像素 / 帧 |

内部速度上限为 Q8.8 的 `4096`。位置可以在像素之间移动，但 `get_position()` 和 `alive_snapshot()` 只返回位置除以 256 后的整数像素坐标。

## 粒子池

### `spawn(x, y, vx, vy, color)`

在 `(x, y)` 创建粒子，返回粒子 ID。

```python
particle_id = dust.spawn(16, 2, 0, 0, 8)
```

参数含义：

- `x`、`y`：整数像素坐标，必须在模拟区域内。
- `vx`、`vy`：Q8.8 速度整数。
- `color`：`0..255` 的粒子颜色值。

创建失败时：

- 起点越界会抛出 `ValueError`。
- 起点被障碍物或其他粒子占用会失败。
- 粒子池已满会失败。
- 绑定层把底层失败统一转换为 `OSError`，常见错误码是 `ENOMEM`。

`color` 小于 0 时按 0 处理，大于 255 时按 255 处理。速度参数应使用合理的 Q8.8 范围；绑定层不会替开发者把任意整数转换成期望的物理速度。

### `despawn(id)`

删除一个活动粒子并释放它的 ID：

```python
removed = dust.despawn(particle_id)
```

- 成功删除返回 `True`。
- ID 越界或粒子已经不活动时返回 `False`。
- 删除粒子只清理粒子占位，不会清除静态障碍物。
- 释放的 ID 之后可能再次分配给新粒子。

### `alive_count()`

返回当前活动粒子数量：

```python
count = dust.alive_count()
```

### `deinit()`

释放对象创建的原生资源：

```python
try:
    # 使用 dust
    pass
finally:
    dust.deinit()
```

调用后对象标记为未初始化，再调用其他方法会抛出 `ValueError`。不要依赖 Python 垃圾回收及时释放粒子池。

## 障碍物

障碍物是独立于粒子的一层静态占位图。

### `clear_obstacles()`

清除所有障碍物：

```python
dust.clear_obstacles()
```

### `set_obstacle(x, y)`

设置一个障碍物像素：

```python
for x in range(32):
    dust.set_obstacle(x, 8)
```

### `clear_obstacle(x, y)`

清除一个障碍物像素：

```python
dust.clear_obstacle(10, 8)
```

### `get_obstacle(x, y)`

查询指定位置是否为障碍物：

```python
if dust.get_obstacle(10, 8):
    print("blocked")
```

设置和清除越界位置时，当前绑定会静默忽略。查询越界位置返回 `False`。障碍物不会自动绘制到屏幕上，需要应用自己调用 MicroPyxel 的绘图接口。

碰撞检查同时考虑障碍物层和活动粒子层。设置障碍物不会自动移除已经位于该位置的粒子。

## 粒子状态

### `set_position(id, x, y)`

把粒子移动到一个整数像素位置：

```python
ok = dust.set_position(particle_id, 12, 6)
```

返回值为布尔值：

- 成功移动或目标就是当前位置：`True`。
- ID 无效、位置越界、目标被障碍物占用或被其他粒子占用：`False`。

### `get_position(id)`

返回整数像素坐标：

```python
x, y = dust.get_position(particle_id)
```

ID 无效或粒子不活动时抛出 `ValueError`。返回值不包含内部 Q8.8 位置的小数部分。

### `set_velocity(id, vx, vy)`

设置 Q8.8 速度：

```python
dust.set_velocity(particle_id, 256, -512)
```

成功返回 `None`。ID 无效或粒子不活动时抛出 `ValueError`。

### `get_velocity(id)`

返回当前 Q8.8 速度：

```python
vx, vy = dust.get_velocity(particle_id)
```

ID 无效或粒子不活动时抛出 `ValueError`。

### `set_color(id, color)` / `get_color(id)`

设置或读取粒子颜色数据：

```python
dust.set_color(particle_id, 10)
color = dust.get_color(particle_id)
```

颜色值是 `0..255` 的无符号数。这个值只保存在粒子中，不会自动修改 MicroPyxel 调色板。ID 无效或粒子不活动时，两个接口都会抛出 `ValueError`。

## 推进模拟：`iterate()`

```python
dust.iterate(ax, ay)
dust.iterate(ax, ay, az)
```

返回 `None`。每次调用会让所有活动粒子推进一帧，内部依次进行：

1. 根据输入加速度和 `scale` 更新速度。
2. 限制速度上限。
3. 根据速度大小拆分移动子步。
4. 处理边界。
5. 检查障碍物和粒子碰撞。
6. 更新位置和粒子占位图。

### `ax` 和 `ay`

`ax`、`ay` 是二维模拟的加速度输入。它们的方向对应模拟坐标：`x` 向右，`y` 向下。

绑定层会把 Python 浮点数乘以 256 转成 Q8.8，再由核心按 `scale` 缩放。例如：

```python
dust = PixelDust(32, 16, 32, scale=200)
dust.iterate(0.0, 0.05)
```

这次调用产生的垂直速度增量约为 `0.05 × 200` 个 Q8.8 单位。

### `az`

当前实现不是三维模拟，`az` 不会产生第三个移动方向：

- `az == 0` 时，不启用这部分随机扰动。
- `az != 0` 时，核心会根据 `az` 的绝对值执行内部预处理，并启用随机扰动。
- 非零 `az` 还会影响传给二维模拟的 `ax`、`ay`。

需要稳定、可重复的二维行为时，建议显式传入 `0.0`：

```python
dust.iterate(ax, ay, 0.0)
```

### 子步和碰撞

核心把每次移动拆成多个子步，避免高速粒子一次跨过障碍物。内部单个子步的最大位移约为 1 像素。速度越大，单次 `iterate()` 的计算量越高。

碰撞时会根据水平、垂直或对角移动方向处理反弹；对角碰撞会尝试沿一个轴滑动，无法滑动时同时反弹两个方向。粒子碰撞使用动态占位图，先更新的粒子会影响同一帧中后续粒子的碰撞判断。

## 边界模式和反弹

### 常量

```python
PixelDust.BOUND_CLAMP
PixelDust.BOUND_BOUNCE
```

常量值分别为 `0` 和 `1`。

### `set_bound_mode(mode)`

设置边界模式：

```python
dust.set_bound_mode(PixelDust.BOUND_BOUNCE)
```

### `get_bound_mode()`

读取当前边界模式：

```python
mode = dust.get_bound_mode()
```

新对象默认使用 `BOUND_BOUNCE`。

| 模式 | 行为 |
| --- | --- |
| `BOUND_CLAMP` | 把位置限制在边界，速度不因边界自动反向 |
| `BOUND_BOUNCE` | 到达边界后反向，反向速度受 `elasticity` 影响 |

反弹速度使用下面的比例：

```text
反弹速度 = -原速度 × elasticity / 256
```

例如：

- `elasticity=0`：该方向反弹速度为 0。
- `elasticity=128`：保留约一半速度。
- `elasticity=255`：接近完全弹性反弹。

这个参数同时影响边界碰撞和障碍物碰撞。

## 导出粒子：`alive_snapshot()`

```python
count = dust.alive_snapshot(buffer)
```

建议按照容量一次性创建缓冲区并重复使用：

```python
snapshot = bytearray(capacity * 4)
```

输出格式是：

```text
[id, x, y, color, id, x, y, color, ...]
```

每个活动粒子占 4 字节：

| 偏移 | 内容 |
| --- | --- |
| `+0` | 粒子 ID |
| `+1` | x 坐标 |
| `+2` | y 坐标 |
| `+3` | 颜色值 |

返回值是写入的活动粒子数量。

`buffer` 必须是可写的 buffer，例如 `bytearray` 或可写 `memoryview`。缓冲区空间不足时抛出 `ValueError("buffer too small")`。活动粒子为 0 时，不需要读取缓冲区内容。

示例：

```python
n = dust.alive_snapshot(snapshot)
for index in range(n):
    offset = index * 4
    particle_id = snapshot[offset]
    x = snapshot[offset + 1]
    y = snapshot[offset + 2]
    color = snapshot[offset + 3]
    pyxel.pset(x, y, color & 0x0F)
```

快照顺序是当前活动列表顺序，不是按粒子 ID 排序。删除粒子时，活动列表会用最后一个活动 ID 填补空位，因此顺序可能变化。`sort=True` 时，快照顺序还会在推进前按运动方向排序。

当前绑定把快照中的 ID、x 和 y 写成单字节。构造函数虽然允许更大的尺寸，但超过 255 的坐标在快照中会被截断；PixelMug 的 `32×16` 屏幕不会遇到这个问题。

## `sort` 的行为

`sort=True` 时，核心会根据当前 `ax`、`ay` 的方向，对活动粒子 ID 列表执行排序。它会影响：

- 同一帧中粒子的更新和碰撞处理顺序。
- `alive_snapshot()` 的输出顺序。
- 多粒子相互碰撞时哪个粒子先占据目标格。

它不是单纯的绘制层排序。需要固定处理顺序或降低开销时使用 `sort=False`；只有确实需要方向相关处理顺序时才开启。

## 与 G-sensor、MicroPyxel 配合

`PixelDust` 不会自动读取设备传感器。应用需要自行获取传感器数据，按照设备坐标系映射到模拟的 `ax`、`ay`，再调用 `iterate()`：

```python
ax, ay, az = g_sensor.get_accel()

# 具体交换或取反关系取决于应用采用的屏幕坐标映射。
dust.iterate(ax * 0.1, ay * 0.1, 0.0)
```

推荐的职责分工是：

- `update()`：读取传感器并调用 `iterate()`。
- `draw()`：调用 `alive_snapshot()`，绘制障碍物和粒子。
- `on_exit()`：调用 `dust.deinit()` 和其他组件的清理接口。

传感器轴与屏幕轴的交换、取反必须根据实际设备坐标标定，`PixelDust` 不会自动纠正。

## 性能和限制

- `capacity` 最大为 128。
- 障碍物位图和粒子占位图按 `ceil(w / 8) × h` 分配各一份。
- 粒子池、活动 ID 列表、空闲 ID 栈和活动位图会随 `capacity` 增长。
- `w`、`h` 或 `capacity` 越大，原生内存占用越高。
- 高速度会增加内部子步数量和碰撞计算量。
- `sort=True` 会增加每帧排序开销。
- 不要在每帧创建新的快照 `bytearray`；应预先创建并重复使用。
- 粒子位置内部支持定点小数，但导出和绘制坐标是整数像素。
- `spawn()` 和 `set_position()` 不会把粒子放入已占用格；如果先有粒子、再设置障碍物，两个层可能暂时重叠，后续碰撞会同时检查两层。
- 颜色值不会自动映射到 MicroPyxel 调色板。
- `alive_snapshot()` 的 ID、x、y 是单字节输出。
- 退出时应主动调用 `deinit()`，不要依赖 Python 垃圾回收释放原生内存。

## 常见问题

### `spawn()` 抛出 `ENOMEM`

通常表示粒子池已满，或者起点已经被障碍物或其他粒子占用。检查 `alive_count()`、`capacity` 和起始位置。

### 粒子不移动

确认已经成功调用 `spawn()`，并且在持续调用 `iterate()`。没有活动粒子时，`iterate()` 会直接返回。

### 粒子方向不对

检查传给 `iterate()` 的 `ax`、`ay` 是否与模拟坐标一致。G-sensor 的轴可能需要交换或取反。

### 粒子出现随机抖动

检查是否传入了非零 `az`。稳定二维模拟建议使用 `dust.iterate(ax, ay, 0.0)`。

### 粒子停在边缘

检查是否使用了 `BOUND_CLAMP`。需要反弹时选择 `BOUND_BOUNCE`，并调整 `elasticity`。

### `alive_snapshot()` 报 `buffer too small`

缓冲区至少需要 `capacity * 4` 字节，并且必须是可写 buffer。

### 颜色显示不正确

`color` 是粒子携带的 `0..255` 数据，不是自动完成的 MicroPyxel 绘图颜色。应用需要自行映射到调色板索引。


