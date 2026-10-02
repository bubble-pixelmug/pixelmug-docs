# Tilemap 图块地图

Tilemap 保存“每一格要显示图像库中的哪一个 8×8 图块”，适合重复背景或较大的场景。它存储的是图块坐标，不是 RGB 或像素颜色。

## 当前限制

Studio 当前不提供可视化 Tilemap 编辑器。小型地图或程序生成的布局可以使用 `set()`、`pset()` 等接口创建；较复杂的地图可以使用独立的开源工具 [Tiled Map Editor](https://www.mapeditor.org/) 制作，再通过 `Tilemap.from_tmx()` 加载导出的 TMX 文件。

MicroPyxel 的图块固定为 `8×8` 像素。TMX 文件只描述地图中每一格使用哪个图块，不会自动加载 Tileset 图片；程序仍需把对应的 PNG 素材加载到 Image，并让 Tilemap 引用该 Image。

当前 TMX 加载器只支持 Tiled 格式的有限子集。制作地图时应使用正交 Tile Layer、内嵌 Tileset 和 CSV 编码，避免外部 TSX、Base64 或压缩数据、多 Tileset、对象层、无限地图及图块翻转。完整范围见本文末尾的 [TMX 范围](#tmx-范围)。

`bltm()` 只负责把已经创建或加载的 Tilemap 绘制到屏幕，不依赖特定编辑器。

## 图块值与坐标单位

当前组件用一个整数表示图块：**低 8 位是 u，高 8 位是 v**。`u,v` 是图块在图像库中的列、行，不是像素坐标。

```python
tile = (v << 8) | u
u = tile & 0xFF
v = (tile >> 8) & 0xFF
```

初始 256×256 图像库可容纳 32×32 个 8×8 图块，因此实际源图块坐标通常为 `u,v=0..31`。

| 操作 | 坐标单位 |
| --- | --- |
| Tilemap 的 `width/height`、`pset`、图形绘制、`blt` | 图块格数 |
| 屏幕/图像上的 `bltm` | 像素，包括源 `u,v,w,h` |

## 获取与创建

| 接口 | 必填参数与返回值 |
| --- | --- |
| `tilemaps(index)` | 必填整数，当前只能 0；返回全局 Tilemap |
| `Tilemap(width,height,img)` | 三项必填，前两项为正整数图块数；`img` 为图像库索引或 Image；返回独立 Tilemap |
| `Tilemap.from_tmx(filename,layer)` | 两项必填，设备文件路径与从 0 开始的层序号；返回独立 Tilemap，失败抛 `OSError` |

以上均仅位置参数。优先复用 `tilemaps(0)`；独立对象的原生内存释放限制见[总览](./)。

## 显示地图 `bltm`

```text
pyxel.bltm(x,y,tm,u,v,w,h,colkey=None,rotate=None,scale=None)
```

前七项必填，仅位置参数。顶层 `tm` 是地图库索引，当前只能 0。`colkey` 是要跳过的**像素颜色索引**，不是图块值；默认 `None`。`rotate=None` 等效 0 度，顺时针；`scale=None` 等效 1，使用正值。负 `w/h` 分别翻转。

```python
import time
import micropyxel as pyxel

pyxel.init()
try:
    image = pyxel.images(0)
    image.rect(0, 0, 8, 8, 8)   # 图块 (0,0)
    image.rect(8, 0, 8, 8, 10)  # 图块 (1,0)
    tm = pyxel.tilemaps(0)
    tm.pset(0, 0, 0)           # u=0, v=0
    tm.pset(1, 0, 1)           # u=1, v=0
    tm.pset(0, 1, 1)
    tm.pset(1, 1, 0)
    pyxel.cls(0)
    pyxel.bltm(8, 0, 0, 0, 0, 16, 16)
    pyxel.render_graphics()
    time.sleep_ms(3000)
finally:
    pyxel.destroy()
```

旋转/缩放地图时，引擎先创建 `abs(w)×abs(h)` 像素的临时 Image，再进行变换。只绘制需要的视口，不要为了显示 32×16 屏幕而每帧变换整个地图。

当前 `bltm` 的普通绘制路径按图块图像里的索引取色，再使用目标映射，不采用 `blt` 完整的 RGB 合并路径。地图素材优先使用一致的默认调色板，不要假定带自定义 PNG 调色板的地图与 `blt` 显色完全一致。

## Tilemap 方法

所有参数均为位置参数。下表未标默认值的参数均必填。

| 方法 | 作用与返回值 |
| --- | --- |
| `width()`、`height()` | 返回图块列数、行数 |
| `imgsrc()` | 返回图像库整数索引或 Image 包装；无有效图像时可为 `None` |
| `set_imgsrc(value)` | 图像库索引或 Image；`None` 重置为图像库 0，不是解绑 |
| `data_ptr()` | 返回底层图块缓冲地址整数或 `None`，通常无需使用 |
| `set(x,y,data)` | 整数图块位置，等宽字符串 list/tuple，格式见下文 |
| `clip(x,y,w,h)` / `clip()` | 图块坐标裁剪，或无参恢复 |
| `camera(x,y)` / `camera()` | 图块坐标偏移，或无参恢复 |
| `cls(tile)` | 全图填充同一个图块 |
| `pget(x,y)` | 返回打包的图块整数 |
| `pset(x,y,tile)` | 设置一个图块 |
| `line(x1,y1,x2,y2,tile)` | 用同一个图块画线 |
| `rect(x,y,w,h,tile)`、`rectb(x,y,w,h,tile)` | 图块矩形与边框 |
| `circ(x,y,r,tile)`、`circb(x,y,r,tile)` | 图块圆与边框 |
| `elli(x,y,w,h,tile)`、`ellib(x,y,w,h,tile)` | 图块椭圆与边框 |
| `tri(x1,y1,x2,y2,x3,y3,tile)`、`trib(x1,y1,x2,y2,x3,y3,tile)` | 图块三角形与边框 |
| `fill(x,y,tile)` | 从种子点填充连通的相同图块 |
| `blt(x,y,tm,u,v,w,h,tilekey=None,rotate=None,scale=None)` | 复制地图格子；源可为地图库编号或 Tilemap；默认不透明、0 度、1 倍 |

设置、绘图和复制操作返回 `None`。`Tilemap.blt()` 的透明参数是打包的**图块值**，与显示接口 `bltm()` 的颜色透明参数不同。它复制图块网格，并不替目标换图像来源。

### `set()` 字符串顺序与整数顺序不同

每个图块用四个十六进制字符 `uuvv` 表示。比如字符串 `"0100"` 表示 `(u=1,v=0)`，而 `pset()` 对应的整数是 `0x0001`，不是 `0x0100`。

```python
tm = pyxel.tilemaps(0)
tm.set(0, 0, ["00000100", "01000000"])
print(tm.pget(1, 0))  # 1
```

行长度应相同且为 4 的倍数，可用空白分隔。当前非法行不会统一抛异常，应预先保证素材格式正确。

## TMX 范围

当前加载器支持 Tiled 风格 TMX 的有限子集：

- 图块大小必须为 8×8。
- 图层数据采用 CSV 编码，不支持 Base64/压缩数据。
- 读取第一个 tileset，要求嵌入式定义并含 `columns`，不支持依赖外部 TSX 的通用导入。
- 不自动读取或加载 tileset 的图片，需要应用自己准备图像库。
- 不提供完整的 Tiled 翻转标志、多 tileset、对象层或无限地图支持；不要按完整 TMX 兼容性制作素材。
- 当前空 GID 与第一个图块都映射到 `(0,0)`；需要空白时将该图块制作为空白。

加载独立地图后，可复制所需区域进全局地图库，再使用顶层 `bltm`：

```python
source = pyxel.Tilemap.from_tmx("map.tmx", 0)
pyxel.tilemaps(0).blt(0, 0, source, 0, 0, 4, 2)
pyxel.bltm(0, 0, 0, 0, 0, 32, 16)
```

