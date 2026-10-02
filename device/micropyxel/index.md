# MicroPyxel

MicroPyxel 是 PixelMug S1 系列设备端的像素绘图与声音合成组件。MPY 程序通过 `import micropyxel as pyxel` 使用它，绘图、动画和音效都在水杯上执行，不需要让 Bot 逐帧发送画面。

它借鉴了复古游戏引擎 [Pyxel](https://github.com/kitao/pyxel) 的图像库、Tilemap、调色板、Sound、Music 等设计，并针对 MicroPython 与 PixelMug 的显示和音频服务实现了 C/C++ 引擎与 Python 运行框架。**它不是桌面 Pyxel 的完整兼容实现**：导入名、初始化方式、资源容量、部分参数和对象访问方式都有区别。

## 支持什么

| 能力 | 接口入口 |
| --- | --- |
| 像素、线段、矩形、圆、椭圆、三角形、填充 | [绘图与颜色](./graphics) |
| PNG、图像复制、翻转、旋转、缩放、内置字体、BDF 字体 | [图片与字体](./images) |
| 图块地图、CSV 编码的 TMX 地图 | [Tilemap](./tilemap) |
| 更新/绘制循环、手动刷新、应用事件 | [运行与事件](./runtime) |
| 多通道音效、音乐、波表与噪声合成 | [声音播放](./audio)、[声音资源](./sound)、[MML](./mml) |
| 随机数、三角函数、噪声 | [数学与接口索引](./resources) |

MicroPyxel 不负责获取触摸、加速度或 BLE 输入；程序可以把其他组件收到的输入交给自己的更新逻辑。

## 当前配置


| 项目 | 当前值 | 含义 |
| --- | --- | --- |
| `VERSION` | `"1.0.0"` | MicroPyxel 组件版本 |
| `width` / `height` | `32` / `16` | 屏幕逻辑像素，属性而非函数 |
| `NUM_COLORS` | `16` | 初始颜色数量；不代表调色板只能有 16 色 |
| 最大调色板容量 | `255` | 有效颜色索引 `0..254`；此上限未导出为 Python 常量 |
| `NUM_IMAGES` / `IMAGE_SIZE` | `1` / `256` | 图像库只有 `images(0)`，初始为 256×256 像素 |
| `NUM_TILEMAPS` / `TILEMAP_SIZE` | `1` / `256` | 地图库只有 `tilemaps(0)`，初始为 256×256 个图块 |
| `TILE_SIZE` | `8` | 每个图块为 8×8 像素 |
| `DEFAULT_FONT_WIDTH` / `DEFAULT_FONT_HEIGHT` | `4` / `6` | 内置字符占用 4×6 像素 |
| `NUM_CHANNELS` | `4` | 同时混音的通道索引 `0..3` |
| `NUM_TONES` | `4` | 音色索引 `0..3` |
| `NUM_SOUNDS` | `64` | 声音资源索引 `0..63` |
| `NUM_MUSICS` | `8` | 音乐资源索引 `0..7` |
| 默认运行帧率 | `30 fps` | `run()` 的目标帧率，不是硬件刷新率保证 |
| 合成音频 | `48000 Hz`、单声道、16-bit PCM | 每块 960 个采样，约 20 ms |

```python
import micropyxel as pyxel

print(pyxel.VERSION, pyxel.width, pyxel.height)
print(pyxel.NUM_IMAGES, pyxel.IMAGE_SIZE)
print(pyxel.NUM_CHANNELS, pyxel.NUM_SOUNDS)
```

## 最小动画

将下面代码放到 MPY 项目的 `__main__.py`。运行后，一个白色方块从左向右移动。

```python
import micropyxel as pyxel

pyxel.init(start_audio=False)

def update(rt):
    pass

def draw(rt):
    pyxel.cls(0)
    x = (rt.frame_count // 2) % pyxel.width
    pyxel.rect(x, 6, 4, 4, 7)

try:
    pyxel.run(update, draw, fps=30)
finally:
    pyxel.destroy()
```

`init()` 初始化资源。`run()` 启动主循环，每帧先处理事件，再调用 `update()` 更新应用状态，接着调用 `draw()` 将画面绘制到屏幕缓冲区，最后自动刷新屏幕。程序退出时自行调用 `destroy()` 释放资源。关于启动、上传、文件路径和退出，先参阅 [MPY 运行基础](/device/runtime/)。

## 接口阅读约定

本文签名中，没有 `=默认值` 的参数为必填。除明确标注支持关键字的接口外，按参数顺序传入。`self` 不列在实例方法的签名中。设置和绘图接口未另行说明时返回 `None`。

## 设备资源限制

屏幕、图像库和地图库是不同的缓冲区。按当前数据类型计算，像素索引每点 1 字节、图块坐标每格 2 字节：屏幕索引约 512 B，图像库约 64 KiB，地图库约 128 KiB。合计约 192.5 KiB，**还没有包括**调色板、字体、音频资源、对象结构、解码临时缓冲和设备虚拟帧缓冲。

`start_audio=False` 只是不启动合成音频任务；初始化仍会创建图形资源和声音、音乐、通道等结构。

原生图像和声音资源使用宿主固件的内存堆；`gc.mem_free()` 只反映 Python 堆，不能代表组件全部内存。PNG 会整张解码成 RGBA 后再转索引图；BDF 也会整文件读入。

MicroPyxel 内部保留了兼容 Pyxel TOML 资源的加载能力，但这类文件依赖原版 Pyxel Editor 生成和维护，其中包含调色板索引、Sound、Music 等专用资源数据。Studio 当前没有提供配套资源编辑器，因此该能力暂不作为公开开发接口，也不提供使用示例。图片、字体和声音请分别使用本文档介绍的 PNG、BDF、`sounds().set()`、`musics().set()` 或 MML 工作流。

`images()` 等返回底层全局对象的包装，而非副本。`destroy()` 后这些包装不可再使用。独立构造的 `Image`、`Font`、`Tilemap`、`Sound`、`Music`、`Tone`、`Channel` 当前没有向 Python 暴露释放方法或 GC finalizer；不要假定 `del` / `gc.collect()` 会释放它们的原生资源，也不要假定 `destroy()` 会回收独立对象。优先复用全局资源，避免循环构造。

提高 fps、频繁解码或旋转大图会增加 CPU、内存与调度负担。音频合成还会启动后台任务。当前源码没有定义统一的“最大可用 fps”；30 fps 是合理的起点，实际效果取决于绘制复杂度和同时运行的设备功能。
