# Pictures and Fonts

Photo resources are read in the device file system. Put PNG, BDF in item `mpy/`, which is transmitted to code; this is the device file path, not the computer path or the network URL.

## Gallery and Image

### `images(index)`

`index` Revert to the image library `Image` package, which will be filled with position only parameters. Currently only `images(0)` valid, initial size 256 x 256. Errors are reported when not initialized or indexed across borders.

The Gallery does not automatically display. Write the contents to the Gallery and copy them to the screen by `pyxel.blt()`.

### Construct an independent image

```text
Image(width, height)
Image(filename, *, incl_colors=None)
```

| Form | Required arguments | Defaults and Results |
| --- | --- | --- |
| Empty Image | `width,height`, positive integer pixel size, position only parameters | Create an independent Image with an initial index of 0 |
| PNG Image | `filename`, path string, position parameters | `incl_colors` is a keyword parameter only; default `None` equivalent False |

The size of the independent Image is not forced to be 256 x 256, but the memory is limited and the current construction function is incomplete for the protection of abnormal dimensions. Do not pass a number, large size or frame to create objects.

The top layer `pyxel.blt()` accepts only the image library number. When using an independent Image, you can copy to the image library:

```python
sprite = pyxel.Image("asset.png", incl_colors=True)
bank = pyxel.images(0)
bank.blt(0, 0, sprite, 0, 0, sprite.width(), sprite.height())
pyxel.blt(0, 0, 0, 0, 0, 32, 16)
```

Common applications are more recommended directly `load_from_png()` to avoid additional independent original objects.

## Loading PNG

### `img.load_from_png(x, y, filename, incl_colors=None)`

The first three must be filled, all of which are position only. `x,y` is the integer pixel position of the target Image; the picture is copied to its full size, and the parts cut above the target are cut. The default does not import PNG colours and returns `None`.

```python
bank = pyxel.images(0)
bank.load_from_png(0, 0, "asset.png", True)
pyxel.blt(0, 0, 0, 0, 0, 32, 16)
```

The actual interface here is `load_from_png`, with a fourth referencing position parameter. Do not write `loadpng()` or `load_from_png(..., include_color=True)`. Only the `Image(filename, incl_colors=True)` configuration supports the key.

### Colour and Transparency

| `incl_colors` | Behaviour |
| --- | --- |
| omission, `None`, `False` | Quantify PNG RGB to the default 16 colour of the solid, which may change significantly |
| `True` | Colours collected for decoded images; up to 255, index 0 presets the default background colour, after which the latest colour is taken; merges to the colour table of the target Image when copying |

PNG's fully transparent pixels become source index 0; all other alpha values are treated as opacity RGB, without translucency mixed. You can use `colkey=0` position parameters to skip the background, but colour index 0 will also skip the non-transparent background. Especially when RGB is remagnified between images, the colour index of the actual source Image is used.

```python
pyxel.blt(0, 0, 0, 0, 0, 16, 16, 0)
```

`load_from_png()` does not use a transparent colour in itself, so that the transparency section also covers the target area. The colour table is saved by each Image and does not replace a global PNG colour for the entire component.

### Memory and failure

When decoded, read the full file, then generate a byte byte RGBA buffer and index chart `宽×高×4`, and decompress the temporary memory. For example, 256 x 256 PNG needs 256 KiB for RGBA alone, which cannot be considered to have a small cost because the file is very small.

PNG is decoded as a whole, even if it only draws 32x16 areas to the screen. It is recommended to predegrate to the required size and load it once at the initialization.

The current PNG reading/ parsing failure may only print errors and return 1x1 empty maps without dropping Python anomaly; `load_from_png()` does not have a successful boolean return value. Please confirm that the file has been uploaded, path and size correctly, and view the device log. Do not use Function Return normally as a guarantee of success.

## Image Complete Method

The position parameter is used for the following example methods except for `incl_colors` for the construction function.

| Methodology | Parameters, Defaults and Returns |
| --- | --- |
| `width()`, `height()` | Returns pixel width, high integer, method, not attribute |
| `data_ptr()` | Returns the whole number of the base index buffer address, with an abnormally empty object `None`; no direct operation pointer is required for normal applications |
| `set(x, y, data)` | Three mandatory, `x,y` is the integer, `data` is a wide string list/tuple; each hexadecimal character `0..f` indicates a pixel in 16 colours by default |
| `load_from_png(x, y, filename, incl_colors=None)` | See above |
| `color_rgb(index)` | To fill the colour index, return the Image `(r,g,b)` |
| `clip(x,y,w,h)` / `clip()` | Set/recover this Image cropping area |
| `camera(x,y)` / `camera()` | Sets/recovers the drawing offset for this Image |
| `pal(col1,col2)` / `pal()` | Sets/restores the index map for this Image; the example method accepts `pal(None,None)` reset |
| `dither(alpha)` | Required, initial value 1; setting the dithering of this Image |
| `cls(col)`, `pget(x,y)`, `pset(x,y,col)` | The same meaning as the screen interface, the target is the Image |
| `line(x1,y1,x2,y2,col)` | Segment |
| `rect(x,y,w,h,col)`, `rectb(x,y,w,h,col)` | Rectangle and Borders |
| `circ(x,y,r,col)`, `circb(x,y,r,col)` | Circles and Borders |
| `elli(x,y,w,h,col)`, `ellib(x,y,w,h,col)` | Ellipse and Borders |
| `tri(x1,y1,x2,y2,x3,y3,col)`, `trib(x1,y1,x2,y2,x3,y3,col)` | Triangles and Borders |
| `fill(x,y,col)` | Connect Area Filling |
| `blt(x,y,img,u,v,w,h,colkey=None,rotate=None,scale=None)` | mandatory for the first seven; source `img` may be the image library integer number or Image object |
| `bltm(x,y,tm,u,v,w,h,colkey=None,rotate=None,scale=None)` | mandatory for the first seven; source `tm` may be the whole number of the map library or the Tilemap object |
| `text(x,y,s,col,font=None)` | First four mandatory; optional BDF Font |

Graphical parameters are the same as [Drawing Interface](./graphics); reading the interface returns values as table and other operations returns `None`.

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

## Example of rotation material

Prepare a 32x16 `asset.png`: The left half is a 16x16 pattern to rotate, and the right half is a background. This example is based on the same text layout as the introductory rotation project.

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

## Text and Font

### `text(x, y, s, col, font=None)`

The first four must be filled with position-only parameters. `s` is a string. It does not automatically change lines, layout, scroll or zoom in fonts; a line break requires `\n` in a string, and a scroll can be achieved by changing x-coordinates on a frame-by-frame basis.

Text processing depends on whether a custom font is imported:

| Fonts | Character Processing | Font Range |
| --- | --- | --- |
| Do not call `font` | Inline fonts draw by single byte character code | 32.127, suitable for ASCII; non-ASCII text not correctly displayed |
| Into BDF `Font` | Decoding the UTF-8 string to Unicode point, then searching for BDF fonts | Depending on `ENCODING` actually included in BDF |

For example, the two bytes of the UTF-8 character `ü` `C3 BC` will be decoded to `U+00FC`, followed by `ENCODING 252` in BDF; the Chinese `你` will find `ENCODING 20320`. As a result, custom fonts can draw Unicode, but only when BDF contains a corresponding code point. The inner font does not have this Unicode capability.

### `Font(filename)`

A position parameter is to be filled to load the BDF font. The loader resolves the font's Unicode, width, offset and bitmap; the 32-bit storage for each line of bitmap should not exceed 32 pixels by the width of the font line. Throw `OSError` when reading failed. The current only BDF is supported, and the TTF/OTF is not supported by directly loading.

| Methodology | Call description |
| --- | --- |
| `font.text_width(s)` | Strings must be filled; decode first and then press the found font `DWIDTH` to sum and return integer pixel width; line breaks ignored, not the maximum line width of multiple lines |
| `font.draw(image,x,y,text,color)` | Five mandatory; target must be Image, coordinates integer, colours index, returns `None`; text is decoded by UTF-8 |

Draws to the screen `pyxel.text(..., font)` and to the image `image.text(..., font)`; they pass through the Image colour map. The lower layer `font.draw()` directly writes colour indexes to the target canvas.

```python
font = pyxel.Font("font.bdf")

labels = (
    "Hello!",
    "Grüß dich!",
    "Hello.",
    "こんにちは",
    "안녕하세요",
)

for label in labels:
    print(label, font.text_width(label))
```

This code requires `font.bdf` to keep at least all the code points used for these strings.

#### Library Size & Memory

Do not directly use the complete vocabulary containing tens of thousands of fonts, sizes up to the MB. The BDF should be cut on the computer by the application of the Unicode code point, then uploaded with the item. Only if you display a fixed text file, keep the text characters, the usual ASCII and `.notdef`.

Font does not publicly destroy method, do not reload font per frame. Load and reuse at the initialization stage.[Overview](./).
