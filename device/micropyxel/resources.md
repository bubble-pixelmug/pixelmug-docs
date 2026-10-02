# 数学与接口索引

## 当前限制

MicroPyxel 内部保留了兼容 Pyxel TOML 资源的加载能力，但这类文件依赖原版 Pyxel Editor 生成和维护，其中包含调色板索引、Sound、Music 等专用资源数据。Studio 当前没有提供配套资源编辑器，因此该能力暂不作为公开开发接口，也不提供使用示例。

当前推荐分别管理各类资源：图片使用 [PNG 与 Image](./images)，字体使用 BDF，Sound 使用 [`sounds().set()`](./sound)，Music 使用 [`musics().set()`](./sound) 或 [MML](./mml)，地图使用 [Tilemap](./tilemap)。
## 数学函数

以下均仅位置参数。除 `noise` 的 y、z 外，表中参数全部必填。

| 接口 | 返回与行为 |
| --- | --- |
| `ceil(x)` | 向上取整，返回 int |
| `floor(x)` | 向下取整，返回 int |
| `sgn(x)` | 负数 -1，0 为 0，正数 1 |
| `sqrt(x)` | 平方根 float；负数当前得到 NaN，不保证 ValueError |
| `sin(deg)`、`cos(deg)` | 使用**角度**，返回 float |
| `atan2(y,x)` | 返回**弧度**，当前底层直接调用 atan2f；不要当作角度 |
| `rseed(seed)` | 设置 32-bit 伪随机种子，0 当作 1，返回 None |
| `rndi(a,b)` | 闭区间整数随机值，包含两端；a>b 时交换 |
| `rndf(a,b)` | 基于 [0,1) 比例生成区间 float，a>b 时交换；浮点舍入需自行考虑 |
| `nseed(seed)` | 设置噪声种子，0 当作 1，返回 None |
| `noise(x,y=0.0,z=0.0)` | 3D value noise，结果约在 -1..1，不是完整的 Perlin/Simplex 实现 |

这些随机函数用于动画或游戏效果，不用于密码、认证或安全随机数。使用有限且合理的数值范围，整数随机的跨度不要接近底层整数溢出边界。

```python
import math

x = 16 + 6 * pyxel.cos(45)
y = 8 + 6 * pyxel.sin(45)
angle_deg = pyxel.atan2(y - 8, x - 16) * 180 / math.pi
pyxel.rseed(42)
color = pyxel.rndi(1, 15)
```

## 常用接口查找

| 想做什么 | 查阅 |
| --- | --- |
| 初始化、退出、手动刷新、帧计数、事件 | [运行与事件](./runtime) |
| 像素、图形、裁剪、颜色、旋转 | [绘图与颜色](./graphics) |
| PNG、Image、字体与文字 | [图片与字体](./images) |
| 地图格子、TMX | [Tilemap](./tilemap) |
| play、playm、stop、play_pos、Audio Service 前置条件 | [声音播放](./audio) |
| Sound / Music / Channel / Tone、可变视图、默认音色和效果常量 | [声音资源](./sound) |
| 乐谱、时值、包络与颤音 | [MML](./mml) |
| 屏幕、图像库和通道数量等常量 | [总览](./) |

