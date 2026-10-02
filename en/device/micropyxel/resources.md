# Math and API index

## Current limitations

MicroPyxel retains a load capacity compatible with the Pyxel TOML resource, but relies on the original Pyxel Editor to generate and maintain it, which contains data on dedicated resources such as palette indexes, Sound, Music. Studio currently does not provide a resource editor, and therefore does not act as an open development interface or provide examples of its use.

It is currently recommended to manage resources separately: [PNG and Image](./images) for pictures, < BDF, > x1/> for fonts, [`sounds().set()`](./sound) for Music, [`musics().set()`](./sound) or [MML](./mml) for maps, [Tilemap](./tilemap).
## Math Functions

The following are only position parameters. Except for y and z of `noise`, all table parameters must be filled.

| Interface | Return and Behaviour |
| --- | --- |
| `ceil(x)` | Lift Up, return int |
| `floor(x)` | Takedown, return int |
| `sgn(x)` | Negative -1 0, positive 1 |
| `sqrt(x)` | square root float; negative numbers currently obtained NAN, not guaranteed |
| `sin(deg)`, `cos(deg)` | Use** angle**, returns float |
| `atan2(y,x)` | returns ** radians**, current bottom direct call attan2f; not as angle |
| `rseed(seed)` | Set 32-bit pseudo-random feed, 0 as 1, returns None |
| `rndi(a,b)` | Integer random values in the closed interval, with two ends; exchange when a>b |
| `rndf(a,b)` | Based on [0,1] ratio generation of float, a>b exchange; floating point rounding needs to be self-considered |
| `nseed(seed)` | Set noise seed, 0 as 1, return None |
| `noise(x,y=0.0,z=0.0)` | 3D value noise, the result is -1.1. |

These random functions are used for animation or game effects, not for passwords, authentications, or secure random numbers. Using a limited and reasonable range of values, the random width of an integer is not close to the bottom integer spills over the border.

```python
import math

x = 16 + 6 * pyxel.cos(45)
y = 8 + 6 * pyxel.sin(45)
angle_deg = pyxel.atan2(y - 8, x - 16) * 180 / math.pi
pyxel.rseed(42)
color = pyxel.rndi(1, 15)
```

## API index

| What do you want? | Access |
| --- | --- |
| Initialization, exit, manual refreshing, frame count, events | [运行与事件](./runtime) |
| Pixels, Graphics, Cropping, Colours, Rotation | [绘图与颜色](./graphics) |
| PNG, Image, Fonts and Text | [图片与字体](./images) |
| Map grid, TMX | [Tilemap](./tilemap) |
| Play, Playm, Stop, Play pos, Auto Service Prefix | [声音播放](./audio) |
| Sound / Music / Channel / Tone, Variable View, Default Sound and Effect Constant | [声音资源](./sound) |
| Musical, time-time, wrapping and tremors | [MML](./mml) |
| Constant of the number of screens, libraries and channels | [总览](./) |

