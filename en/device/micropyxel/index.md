# MicroPyxel

MicroPyxel is a pixel mapping and sound synthesis component for the end of the PixelMug S1 series. MPY programs use it `import micropyxel as pyxel`, drawing, animation and sound are executed on the mug, and Bot is not required to send the image one by one.

It draws on the design of the image library, Tilemap, palette, Sound, Music, etc. of the retroplay engine [Pyxel](https://github.com/kitao/pyxel) and achieves the C/C++ engine and the Python operating framework for the MicroPython and PixelMug display and audio services.** It is not fully compatible with the desktop Pyxel **: import name, initialization method, resource capacity, partial parameters and object access.

## For what?

| Capacity | Interface entrance |
| --- | --- |
| Pixels, segment, rectangle, circle, ellipse, triangle, fill | [绘图与颜色](./graphics) |
| PNG, image copying, flipping, rotation, scaling, inline font, BDF font | [图片与字体](./images) |
| Chart Map, TMX Encoding for CSV | [Tilemap](./tilemap) |
| Update/draw cycle, manually refresh, apply events | [运行与事件](./runtime) |
| Multichannel sound, music, wave watch and noise synthesis | [声音播放](./audio), [声音资源](./sound), [MML](./mml) |
| Random number, triangle function, noise | [数学与接口索引](./resources) |

MicroPyxel does not take touch, acceleration or BLE input; the program can hand over input received from other components to its own updated logic.

## Current Configuration


| Item | Current value [p] | Meaning |
| --- | --- | --- |
| `VERSION` | `"1.0.0"` | MicroPyxel component version |
| `width` / `height` | `32` / `16` | Screen Logical Pixels, Properties, Not Functions |
| `NUM_COLORS` | `16` | Number of initial colours; does not mean that the palette can only have 16 colours |
| Maximum palette capacity | `255` | A valid colour index `0..254`; not exported to Python constant |
| `NUM_IMAGES` / `IMAGE_SIZE` | `1` / `256` | Image library only `images(0)` with initial 256 x 256 pixels |
| `NUM_TILEMAPS` / `TILEMAP_SIZE` | `1` / `256` | Map library with only `tilemaps(0)` with initial 256 x 256 pieces |
| `TILE_SIZE` | `8` | Each piece is 8x8 pixels |
| `DEFAULT_FONT_WIDTH` / `DEFAULT_FONT_HEIGHT` | `4` / `6` | Inline characters in 4x6 pixels |
| `NUM_CHANNELS` | `4` | Channel index of simultaneous mixer `0..3` |
| `NUM_TONES` | `4` | Sound Index `0..3` |
| `NUM_SOUNDS` | `64` | Sound resource index `0..63` |
| `NUM_MUSICS` | `8` | Musical resource index `0..7` |
| Default Run Frame Rate | `30 fps` | `run()` target frame rate, not a guarantee for hardware updating rate |
| Synthetic Audio | `48000 Hz`, Mono, 16-bit PCM | 960 samples per block, approximately 20 ms |

```python
import micropyxel as pyxel

print(pyxel.VERSION, pyxel.width, pyxel.height)
print(pyxel.NUM_IMAGES, pyxel.IMAGE_SIZE)
print(pyxel.NUM_CHANNELS, pyxel.NUM_SOUNDS)
```

## Minimum Animation

Places the following code on the MPY item `__main__.py`. After running, a white square moves from left to right.

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

`init()` Initializing Resources. `run()` Starts the main cycle, first dealing with events per frame, then calls `update()` to update the application, then calls `draw()` to draw the image to the screen buffer and then automatically refreshs the screen. The program exits by calling `destroy()` release resources. See [MPY operating base](/en/device/runtime/) for start-up, uploading, file path and exit.

## Interface reading engagements

This text is signed without the parameters `=默认值`. In the order of the parameters, except for the interface where the key is clearly marked. `self` is not included in the signature of the instance method. Setup and drawing interface returns `None` if not otherwise specified.

## Resource limitations on device

The screen, image library and map library are different buffer zones. Based on the current data type, pixel index 1 byte per point, pixel coordinates per 2 byte: screen index about 512 B, image library about 64 KiB, map library about 128 KiB. Totalling about 192.5 KiB,** does not include ** palettes, fonts, audio resources, object structure, decoded temporary buffers and virtual frame buffers.

`start_audio=False` except not starting a synthetic audio mission; initialization will still create graphic resources and sound, music, channel, etc.

Original image and sound resources use the memory stack of the host solid; `gc.mem_free()` reflects only the Python stack and does not represent the entire memory of the components. PNG decodes the entire image into RGBA and then re-references it; BDF also reads the entire file.

MicroPyxel maintains a load capacity compatible with the Pyxel TOML resource, but relies on the original Pyxel Editor to generate and maintain it, which contains data from dedicated resources such as palette indexes, Sound, Music. Studio does not currently provide a resource editor, and therefore does not use this capability as an open development interface or an example of its use. Pictures, fonts and sound are presented in this document as PNG, BDF, `sounds().set()`, `musics().set()` or MML work streams.

`images()` Waits for the return of the package of the bottom global object instead of a copy.`destroy()` After these packagings are no longer usable. `Image`, `Font`, `Tilemap`, `Sound`, `Music`, `Tone`, `Channel` No current release method or GC exposure to Python; no assumption `del` / `gc.collect()` They'll release their originals, and don't assume. `destroy()` Recycles independent objects. Prefer to global resource, avoiding cycling.

Increases fps, frequent decoding or rotations increase the CPU, memory, and movement load. Audio synthesis also starts backstage tasks. Current source code does not define a uniform " maximum available fps " ; 30 fps is a reasonable starting point, and the actual effect depends on mapping complexity and running device functions.
