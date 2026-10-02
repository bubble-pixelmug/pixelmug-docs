# 绘图与颜色

本页接口操作屏幕缓冲。先 `pyxel.init()`，绘制后由 `run()` 自动刷新，或自行 `render_graphics()`。

## 坐标与返回值

左上角为 `(0, 0)`，向右为 x 正方向，向下为 y 正方向。当前可见区域是 `x=0..31`、`y=0..15`。坐标通常接受整数或浮点数，底层转成最近的整数像素；要精确控制像素位置，请传整数。

`col` 是颜色索引，不是 `0xRRGGBB`。绘图方法默认返回 `None`。越过画布或裁剪区的写入被裁掉，不需要自行裁剪每个点。

## 基本图形

以下签名中所有参数必填，无默认值。

| 接口 | 参数与作用 |
| --- | --- |
| `cls(col)` | 以 `col` 清除整个画布；忽略裁剪和抖动设置，不重置它们 |
| `pget(x, y)` | 读取颜色索引，返回 `int`；位于当前裁剪区外时返回 0 |
| `pset(x, y, col)` | 写一个像素 |
| `line(x1, y1, x2, y2, col)` | 两端点之间的线段 |
| `rect(x, y, w, h, col)` | 左上角 `(x,y)`、宽 `w`、高 `h` 的实心矩形 |
| `rectb(x, y, w, h, col)` | 同样参数，绘制矩形边框 |
| `circ(x, y, r, col)` | 圆心 `(x,y)`、半径 `r` 的实心圆 |
| `circb(x, y, r, col)` | 同样参数，绘制圆边框 |
| `elli(x, y, w, h, col)` | 在矩形范围内绘制实心椭圆 |
| `ellib(x, y, w, h, col)` | 同样参数，绘制椭圆边框 |
| `tri(x1, y1, x2, y2, x3, y3, col)` | 三顶点的实心三角形 |
| `trib(x1, y1, x2, y2, x3, y3, col)` | 同样参数，绘制三角形边框 |
| `fill(x, y, col)` | 从种子点开始，对相连的同色区域进行填充 |

矩形、椭圆的宽高及圆半径使用非负值。负宽高翻转的用法属于 `blt/bltm`，不要套到所有图形。

```python
pyxel.cls(0)
pyxel.rectb(0, 0, 32, 16, 7)
pyxel.line(1, 1, 10, 14, 8)
pyxel.circ(16, 8, 4, 10)
pyxel.tri(24, 4, 21, 11, 29, 11, 11)
pyxel.pset(30, 1, 7)
```

`pget()` 读取已写入的实际索引，不反向还原颜色映射；它不减去 camera 偏移。与 `pset()` 配合时，要区分屏幕坐标与偏移后的绘图坐标。

## 裁剪、相机与抖动

| 接口 | 调用与默认状态 |
| --- | --- |
| `clip(x, y, w, h)` / `clip()` | 四参设置裁剪区，与画布取交集；无参恢复全画布。不能只传部分参数 |
| `camera(x, y)` / `camera()` | 两参设置绘图偏移，绘图位置减去 `(x,y)`；无参恢复 `(0,0)` |
| `dither(alpha)` | `alpha` 必填，初始 1；≤0 不写像素，≥1 全写，中间值使用 4×4 有序抖动 |

`dither` 是有规律地跳过部分像素，不是 RGB 的 Alpha 混合。裁剪、相机和抖动会持续影响后续绘图，不会在下一帧自动恢复。

```python
pyxel.clip(0, 0, 16, 16)
pyxel.dither(0.5)
pyxel.rect(0, 0, 32, 16, 8)
pyxel.dither(1)
pyxel.clip()
pyxel.camera()
```

## 调色板

### RGB 颜色与索引映射是两件事

`set_color` / `set_palette` 设置屏幕各索引的 RGB 值；`pal` 改变后续绘图写入的索引。改变 RGB 后，已经使用该索引的像素会在下次刷新时一起变色。`pal()` 恢复映射，不恢复默认 RGB。

| 接口 | 必填与默认值 | 作用 |
| --- | --- | --- |
| `color_rgb(index)` | `index` 必填 | 返回 `(r,g,b)`，各分量 0..255 |
| `set_color(index, rgb)` | 两项必填 | `index=0..254`，`rgb=0x000000..0xFFFFFF` |
| `set_palette(colors, start_color=0)` | `colors` 必填，RGB 整数 list/tuple；起始索引默认 0 | 连续设置一段屏幕颜色，起始索引加数量不能超过 255 |
| `pal(col1, col2)` / `pal()` | 两个索引同时传入，或无参 | 将后续绘制的 `col1` 映射为 `col2`；无参恢复恒等映射 |

```python
pyxel.set_palette([0x000000, 0xFFFFFF, 0xFF0000])
pyxel.cls(0)
pyxel.rect(0, 0, 8, 8, 1)
pyxel.pal(1, 2)
pyxel.rect(10, 0, 8, 8, 1)  # 实际写入索引 2
pyxel.pal()
print(pyxel.color_rgb(2))  # (255, 0, 0)
```

这里只修改屏幕颜色，不会同步修改图像库的 RGB 表。`set_palette()` 不删除未覆盖的颜色，`set_color()` 同时把该索引的绘制映射恢复为自身。不要使用索引 255，也不要依赖所有绘图函数都会检查索引范围。

### 默认颜色

颜色名称是常量名，RGB 以当前固件表为准。例如 `COLOR_RED` 默认并非纯 `#FF0000`；需要纯红时用 `set_color()`。

| 索引 | 常量 | RGB | 索引 | 常量 | RGB |
| --- | --- | --- | --- | --- | --- |
| 0 | `COLOR_BLACK` | `000000` | 8 | `COLOR_RED` | `D4186C` |
| 1 | `COLOR_NAVY` | `2B335F` | 9 | `COLOR_ORANGE` | `D38441` |
| 2 | `COLOR_PURPLE` | `7E2072` | 10 | `COLOR_YELLOW` | `E9C35B` |
| 3 | `COLOR_GREEN` | `19959C` | 11 | `COLOR_LIME` | `70C6A9` |
| 4 | `COLOR_BROWN` | `8B4852` | 12 | `COLOR_CYAN` | `7696DE` |
| 5 | `COLOR_DARK_BLUE` | `395C98` | 13 | `COLOR_GRAY` | `A3A3A3` |
| 6 | `COLOR_LIGHT_BLUE` | `A9C1FF` | 14 | `COLOR_PINK` | `FF9798` |
| 7 | `COLOR_WHITE` | `EEEEEE` | 15 | `COLOR_PEACH` | `EDC7B0` |

## 图像复制 `blt`

```text
blt(x, y, img, u, v, w, h, colkey=None, rotate=None, scale=None)
```

| 参数 | 必填 | 默认值 | 含义 |
| --- | --- | --- | --- |
| `x, y` | 是 | — | 目标位置 |
| `img` | 是 | — | 图像库整数索引，当前只能是 0；顶层函数不接受 Image 对象 |
| `u, v` | 是 | — | 源图像左上角像素位置 |
| `w, h` | 是 | — | 复制尺寸，负值分别水平/垂直翻转 |
| `colkey` | 否 | `None` | 跳过的源颜色索引；`None` 表示不按索引透明 |
| `rotate` | 否 | `None` → 0 | 顺时针旋转角度，单位度 |
| `scale` | 否 | `None` → 1 | 缩放倍数，使用正值；0 或负值不会正常绘制 |

旋转与缩放围绕所复制矩形的中心，不是屏幕中心；`x,y` 对应变换前的左上角，变换后可能伸出原矩形。采用像素采样，不做平滑抗锯齿。

```python
pyxel.images(0).load_from_png(0, 0, "asset.png", True)
pyxel.blt(8, 0, 0, 0, 0, 16, 16)              # 原尺寸
pyxel.blt(8, 0, 0, 0, 0, 16, 16, None, 45)    # 旋转
pyxel.blt(8, 0, 0, 0, 0, 16, 16, None, 0, 0.5)  # 缩小
```

源图像有自定义 RGB 表时，复制会按 RGB 向目标颜色表查找或追加颜色，表满后选最近色；目标像素的索引不保证与源索引相同。默认颜色表的图像走目标 `pal` 映射。不要把 `pget()` 返回的不同图像索引当作固定 RGB。

## 文字与地图

- `text(x, y, s, col, font=None)`：前四项必填；默认内置 4×6 ASCII 字体，传入 Font 使用支持 UTF-8/Unicode 的 BDF 自定义字体，详见[图片与字体](./images)。
- `bltm(x, y, tm, u, v, w, h, colkey=None, rotate=None, scale=None)`：前七项必填，`tm` 为地图库索引；其他参数与 `blt` 对应。这里源位置和尺寸仍是**像素**，详见 [Tilemap](./tilemap)。
