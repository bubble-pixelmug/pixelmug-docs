# Drawing & Colours

This page interface operates screen buffers. First `pyxel.init()`, then draw and then be automatically refreshed by `run()`, or self `render_graphics()`.

## Coordinates and Return Values

The upper left corner is `(0, 0)`, to the right is x positive and to the right is y-positive. The currently visible area is `x=0..31`, `y=0..15`. Coordinates usually accept integers or floating point numbers, with the bottom turning to the nearest integer pixels; to control pixel position accurately, pass the whole number.

`col` is the colour index, not `0xRRGGBB`. The drawing method is by default returned `None`. Writing across a canvas or cropping area is cut off without having to tailor each point.

## Basic Graphics

All parameters in the following signature must be filled, with no default value.

| Interface | Parameters and roles |
| --- | --- |
| `cls(col)` | Clear the entire canvas by `col`; ignore the cropping and shaking settings and do not reset them |
| `pget(x, y)` | Read colour index, return `int`; return 0 when outside the current cropping area |
| `pset(x, y, col)` | Write a pixel |
| `line(x1, y1, x2, y2, col)` | Line between Ends |
| `rect(x, y, w, h, col)` | Solid rectangle `(x,y)`, wide `w` and high `h` |
| `rectb(x, y, w, h, col)` | Same arguments, draw rectangular borders |
| `circ(x, y, r, col)` | Solid circle of centre `(x,y)` and radius `r` |
| `circb(x, y, r, col)` | Same arguments, draw a circle border |
| `elli(x, y, w, h, col)` | Draw a solid ellipse within a rectangle |
| `ellib(x, y, w, h, col)` | Same arguments, draw ellipse border |
| `tri(x1, y1, x2, y2, x3, y3, col)` | A solid triangle with three vertexes |
| `trib(x1, y1, x2, y2, x3, y3, col)` | Same parameter, draw a triangle border |
| `fill(x, y, col)` | Fill the connected same-colour area from the torrent point |

rectangles, ellipses, and round radiuss are used with non-negative values. The usage of negative widths is `blt/bltm` and is not applied to all graphics.

```python
pyxel.cls(0)
pyxel.rectb(0, 0, 32, 16, 7)
pyxel.line(1, 1, 10, 14, 8)
pyxel.circ(16, 8, 4, 10)
pyxel.tri(24, 4, 21, 11, 29, 11, 11)
pyxel.pset(30, 1, 7)
```

`pget()` Reads the actual index that has been written and does not reverse the color map; it does not subtract the Camera offset. When matching `pset()`, distinguish between the screen coordinates and the drawing coordinates that follow the deviation.

## Crop, Camera and Dither

| Interface | Call and Default Status |
| --- | --- |
| `clip(x, y, w, h)` / `clip()` | Four-part shearing area, intersecting with canvas; unparticipated restoration of full canvas. |
| `camera(x, y)` / `camera()` | Double-parture drawing offset, less `(x,y)`; unparticipated recovery `(0,0)` |
| `dither(alpha)` | `alpha` Required, initial 1; ≤0 without pixels, 像1 in full, using 4x4 in the middle |

`dither` is a regular jump over partial pixels, not a combination of the RGB Alpha. Cropping, cameras and vibrating will continue to affect subsequent drawings, and will not automatically recover in the next frame.

```python
pyxel.clip(0, 0, 16, 16)
pyxel.dither(0.5)
pyxel.rect(0, 0, 32, 16, 8)
pyxel.dither(1)
pyxel.clip()
pyxel.camera()
```

## Palette

### The RGB colour and index map are two things.

`set_color` / `set_palette` sets the RGB values for the screen indexes; `pal` changes the index written in the subsequent drawing. After the RGB changes, the pixels that already use the index will change colour at the next refresh. `pal()` Restores the map and does not restore the default RGB.

| Interface | To Fill with Defaults | Role |
| --- | --- | --- |
| `color_rgb(index)` | `index` Required | returns `(r,g,b)` with 0.255 points each |
| `set_color(index, rgb)` | I'll fill them out. | `index=0..254`, `rgb=0x000000..0xFFFFFF` |
| `set_palette(colors, start_color=0)` | `colors` Required, RGB integer list/tuple; start index default 0 | Set a continuous screen colour that cannot be exceeded 255 by the initial index |
| `pal(col1, col2)` / `pal()` | Both indices are in or out of the box. | `col1` map followed by `col2`; non-sink resuscitation constant map |

```python
pyxel.set_palette([0x000000, 0xFFFFFF, 0xFF0000])
pyxel.cls(0)
pyxel.rect(0, 0, 8, 8, 1)
pyxel.pal(1, 2)
pyxel.rect(10, 0, 8, 8, 1)  # Actual indexing 2
pyxel.pal()
print(pyxel.color_rgb(2))  # (255, 0, 0)
```

Only the screen colour is changed here, and the RGB table of the Gallery is not modified simultaneously. `set_palette()` does not remove the uncovered colour, `set_color()` and restores the map of the index to itself. Do not use Index 255 and do not rely on all drawing functions to check the index range.

### Default colour

Colour name is a constant name, and RGB is based on the current firmware table. For example, `COLOR_RED` Default is not pure `#FF0000`; if pure red is required `set_color()`.

| Index | Constant | RGB | Index | Constant | RGB |
| --- | --- | --- | --- | --- | --- |
| 0 | `COLOR_BLACK` | `000000` | 8 | `COLOR_RED` | `D4186C` |
| 1 | `COLOR_NAVY` | `2B335F` | 9 | `COLOR_ORANGE` | `D38441` |
| 2 | `COLOR_PURPLE` | `7E2072` | 10 | `COLOR_YELLOW` | `E9C35B` |
| 3 | `COLOR_GREEN` | `19959C` | 11 | `COLOR_LIME` | `70C6A9` |
| 4 | `COLOR_BROWN` | `8B4852` | 12 | `COLOR_CYAN` | `7696DE` |
| 5 | `COLOR_DARK_BLUE` | `395C98` | 13 | `COLOR_GRAY` | `A3A3A3` |
| 6 | `COLOR_LIGHT_BLUE` | `A9C1FF` | 14 | `COLOR_PINK` | `FF9798` |
| 7 | `COLOR_WHITE` | `EEEEEE` | 15 | `COLOR_PEACH` | `EDC7B0` |

## Image Copy `blt`

```text
blt(x, y, img, u, v, w, h, colkey=None, rotate=None, scale=None)
```

| Parameters | shall fill | Default value | Meaning |
| --- | --- | --- | --- |
| `x, y` | Yes. | — | Target location |
| `img` | Yes. | — | Image library integer index, currently only 0; top-level functions do not accept Image objects |
| `u, v` | Yes. | — | Source image top left pixel position |
| `w, h` | Yes. | — | Copy size, negative values for horizontal/vertical flip |
| `colkey` | Yes | `None` | Skipping source colour index; `None` for non-index transparency |
| `rotate` | Yes | `None` → 0 | Clockwise rotation angle, unit |
| `scale` | Yes | `None` → 1 | Zoom multiple, using positive; 0 or negative will not draw properly |

Rotate and scale around the center of the copied rectangle, not the center of the screen; `x,y` corresponds to the upper left corner before the transformation, which may then reach out to the original rectangle. Samples are pixels, without smooth anti-saw teeth.

```python
pyxel.images(0).load_from_png(0, 0, "asset.png", True)
pyxel.blt(8, 0, 0, 0, 0, 16, 16)              # Original Size
pyxel.blt(8, 0, 0, 0, 0, 16, 16, None, 45)    # Rotate
pyxel.blt(8, 0, 0, 0, 0, 16, 16, None, 0, 0.5)  # Zoom Out
```

When the source image has a custom RGB table, the copying is followed by the RGB to find or add colours to the target colour table, and the table is full and the latest colour is selected; the index of the target pixel does not guarantee the same source index. The default colour table is taken by the target `pal` map. Do not treat the different image index returned by `pget()` as a fixed RGB.

## Text and Map

- `text(x, y, s, col, font=None)`: The first four mandatory; the default is to include 4x6 ASCII fonts, and to import Font into the BDF custom fonts that support UTF-8/Unicode, as [Pictures and Fonts](./images).
- `bltm(x, y, tm, u, v, w, h, colkey=None, rotate=None, scale=None)`: The first seven mandatory, `tm` is indexed to the Map Library; other parameters correspond to `blt`. The source position and dimensions here remain ** pixels**, as detailed in [Tilemap](./tilemap).
