# 图片与字体

图片资源在设备文件系统中读取。把 PNG、BDF 放入项目 `mpy/`，与代码一同上传；这里接收的是设备文件路径，不是电脑路径或网络 URL。

## 图像库与 Image

### `images(index)`

`index` 必填、仅位置参数，返回图像库的 `Image` 包装。当前仅 `images(0)` 有效，初始大小 256×256。未初始化或索引越界时会报错。

图像库不会自动显示。先把内容写入图像库，再通过 `pyxel.blt()` 复制到屏幕。

### 构造独立图像

```text
Image(width, height)
Image(filename, *, incl_colors=None)
```

| 形式 | 必填参数 | 默认值与结果 |
| --- | --- | --- |
| 空图像 | `width,height`，正整数像素尺寸，仅位置参数 | 创建初始索引为 0 的独立 Image |
| PNG 图像 | `filename`，路径字符串，位置参数 | `incl_colors` 为仅关键字参数；默认 `None` 等效 False |

独立 Image 的大小不是被强制限定为 256×256，但可用内存有限，当前构造函数对异常尺寸的保护不完整。不要传负数、巨大尺寸或每帧创建对象。

顶层 `pyxel.blt()` 只接受图像库编号。需要使用独立 Image 时，可以先复制到图像库：

```python
sprite = pyxel.Image("asset.png", incl_colors=True)
bank = pyxel.images(0)
bank.blt(0, 0, sprite, 0, 0, sprite.width(), sprite.height())
pyxel.blt(0, 0, 0, 0, 0, 32, 16)
```

普通应用更推荐直接 `load_from_png()`，避免额外持有独立原生对象。

## 加载 PNG

### `img.load_from_png(x, y, filename, incl_colors=None)`

前三项必填，全部仅位置参数。`x,y` 是目标 Image 中的整数像素位置；图片按自身完整尺寸复制，超出目标的部分裁剪。默认不导入 PNG 颜色，返回 `None`。

```python
bank = pyxel.images(0)
bank.load_from_png(0, 0, "asset.png", True)
pyxel.blt(0, 0, 0, 0, 0, 32, 16)
```

这里的实际接口名是 `load_from_png`，第四参是位置参数。不要写成 `loadpng()` 或 `load_from_png(..., include_color=True)`。只有 `Image(filename, incl_colors=True)` 的构造形式支持上述关键字。

### 颜色与透明度

| `incl_colors` | 行为 |
| --- | --- |
| 省略、`None`、`False` | 将 PNG RGB 量化到固件默认的 16 色，可能明显变色 |
| `True` | 为解码的图像收集颜色；容量最多 255，索引 0 预留默认背景色，超出后取最近色；复制时再合并到目标 Image 的颜色表 |

PNG 的完全透明像素变成源索引 0；其他 Alpha 值均按不透明 RGB 处理，没有半透明混合。绘制时可以用 `colkey=0` 的位置参数跳过背景，但颜色索引 0 对应的非透明背景也会被跳过。特别是图像之间发生 RGB 重映射后，要以实际源 Image 的颜色索引为准。

```python
pyxel.blt(0, 0, 0, 0, 0, 16, 16, 0)
```

`load_from_png()` 加载时本身不使用透明色，因此透明部分也会覆盖目标区域。颜色表是每个 Image 各自保存的，并非给整个组件替换一套全局 PNG 颜色。

### 内存和失败行为

解码时先读取完整文件，再生成 `宽×高×4` 字节的 RGBA 缓冲和索引图，还有解压缩临时内存。例如 256×256 PNG 仅 RGBA 就需要 256 KiB，不能因为压缩后的文件很小就认为开销很小。

即使只把 32×16 区域画到屏幕，PNG 仍然整张解码。推荐预先裁切到所需尺寸，在初始化时加载一次。

当前 PNG 读取/解析失败可能只打印错误并返回 1×1 空图，而不抛出 Python 异常；`load_from_png()` 也没有成功布尔返回值。请确认文件已上传、路径和尺寸正确，并查看设备日志。不要把“函数正常返回”当作加载成功的保证。

## Image 完整方法

除构造函数的 `incl_colors` 外，以下实例方法均使用位置参数。

| 方法 | 参数、默认值与返回值 |
| --- | --- |
| `width()`、`height()` | 返回像素宽、高整数，是方法而非属性 |
| `data_ptr()` | 返回底层索引缓冲地址整数，异常空对象可为 `None`；普通应用不需要直接操作指针 |
| `set(x, y, data)` | 三项必填，`x,y` 为整数，`data` 是等宽字符串 list/tuple；每个十六进制字符 `0..f` 表示默认 16 色中的一个像素 |
| `load_from_png(x, y, filename, incl_colors=None)` | 见上文 |
| `color_rgb(index)` | 必填颜色索引，返回该 Image 的 `(r,g,b)` |
| `clip(x,y,w,h)` / `clip()` | 设置/恢复这个 Image 的裁剪区 |
| `camera(x,y)` / `camera()` | 设置/恢复这个 Image 的绘图偏移 |
| `pal(col1,col2)` / `pal()` | 设置/恢复这个 Image 的索引映射；实例方法也接受 `pal(None,None)` 重置 |
| `dither(alpha)` | 必填，初始值 1；设置这个 Image 的抖动 |
| `cls(col)`、`pget(x,y)`、`pset(x,y,col)` | 与屏幕接口含义相同，目标为该 Image |
| `line(x1,y1,x2,y2,col)` | 线段 |
| `rect(x,y,w,h,col)`、`rectb(x,y,w,h,col)` | 矩形及边框 |
| `circ(x,y,r,col)`、`circb(x,y,r,col)` | 圆及边框 |
| `elli(x,y,w,h,col)`、`ellib(x,y,w,h,col)` | 椭圆及边框 |
| `tri(x1,y1,x2,y2,x3,y3,col)`、`trib(x1,y1,x2,y2,x3,y3,col)` | 三角形及边框 |
| `fill(x,y,col)` | 连通区域填充 |
| `blt(x,y,img,u,v,w,h,colkey=None,rotate=None,scale=None)` | 前七项必填；源 `img` 可以是图像库整数编号或 Image 对象 |
| `bltm(x,y,tm,u,v,w,h,colkey=None,rotate=None,scale=None)` | 前七项必填；源 `tm` 可以是地图库整数编号或 Tilemap 对象 |
| `text(x,y,s,col,font=None)` | 前四项必填；可选 BDF Font |

图形参数与[绘图接口](./graphics)相同；读取接口返回值如表，其他操作返回 `None`。

```python
pyxel.images(0).set(0, 0, [
    "007700",
    "077770",
    "777777",
    "077770",
    "007700",
])
pyxel.blt(13, 5, 0, 0, 0, 6, 5, 0)
```

## 旋转素材示例

准备一张 32×16 的 `asset.png`：左半是待旋转的 16×16 图案，右半是背景。此例与入门的旋转图片项目采用相同素材布局。

```python
import time
import micropyxel as pyxel

pyxel.init()
pyxel.images(0).load_from_png(0, 0, "asset.png", True)
angle = 0
last_rotate = time.ticks_ms()

def update(rt):
    global angle, last_rotate
    now = time.ticks_ms()
    if time.ticks_diff(now, last_rotate) >= 100:
        angle = (angle + 15) % 360
        last_rotate = now

def draw(rt):
    pyxel.cls(0)
    pyxel.blt(0, 0, 0, 16, 0, 16, 16)
    pyxel.blt(16, 0, 0, 16, 0, 16, 16)
    pyxel.blt(8, 0, 0, 0, 0, 16, 16, None, angle)

try:
    pyxel.run(update, draw, fps=30)
finally:
    pyxel.destroy()
```

## 文字与 Font

### `text(x, y, s, col, font=None)`

前四项必填、仅位置参数。`s` 为字符串。它不会自动换行、排版、滚动或缩放字体；换行需要在字符串中使用 `\n`，滚动可通过逐帧改变 x 坐标实现。

文字处理方式取决于是否传入自定义字体：

| 字体 | 字符处理 | 字形范围 |
| --- | --- | --- |
| 不传 `font` | 内置字体按单字节字符码绘制 | 32..127，适合 ASCII；非 ASCII 文本不能正确显示 |
| 传入 BDF `Font` | 将 UTF-8 字符串解码为 Unicode 码点，再查找 BDF 字形 | 取决于 BDF 中实际包含的 `ENCODING` |

例如，UTF-8 字符 `ü` 的两个字节 `C3 BC` 会被解码成 `U+00FC`，随后查找 BDF 中的 `ENCODING 252`；中文 `你` 会查找 `ENCODING 20320`。因此，自定义字体能够绘制 Unicode，但只有 BDF 包含对应码点时才会显示该字符。内置字体没有这项 Unicode 能力。

### `Font(filename)`

必填一个位置参数，加载 BDF 字体。加载器解析字形的 Unicode 编码、宽度、偏移与 bitmap；每行 bitmap 使用 32-bit 存储，素材字形行宽应不超过 32 像素。读取失败时抛 `OSError`。当前只支持 BDF，不支持直接加载 TTF/OTF。

| 方法 | 调用说明 |
| --- | --- |
| `font.text_width(s)` | 字符串必填；先按 UTF-8 解码，再按找到的字形 `DWIDTH` 求和，返回整数像素宽；换行符忽略，不是多行文本的最大行宽 |
| `font.draw(image,x,y,text,color)` | 五项必填；目标必须为 Image，坐标为整数，颜色为索引，返回 `None`；文字按 UTF-8 解码后绘制 |

一般使用 `pyxel.text(..., font)` 绘制到屏幕，使用 `image.text(..., font)` 绘制到图像；它们会经过 Image 的颜色映射。低层 `font.draw()` 直接对目标画布写颜色索引。

```python
font = pyxel.Font("font.bdf")

labels = (
    "Hello!",
    "Grüß dich!",
    "你好",
    "こんにちは",
    "안녕하세요",
)

for label in labels:
    print(label, font.text_width(label))
```

这段代码要求 `font.bdf` 至少保留这些字符串使用的全部码点。

#### 字库大小与内存

不要直接使用包含数万字形、大小达到数 MB 的完整字库。应在电脑上按应用实际使用的 Unicode 码点裁剪 BDF，再随项目上传。只显示固定文案时，保留文案字符、常用 ASCII 和 `.notdef` 即可。

Font 没有公开销毁方法，不要每帧重新加载字体。应在初始化阶段加载一次并复用。独立对象的生命周期限制见[总览](./)。
