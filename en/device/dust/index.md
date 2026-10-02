# PixelDust Particle Simulation

## Source and implementation status

`pixel_dust` is a 2-dimensional particle simulator provided by the system based on grid-location and discrete collision treatment to simulate the movement of particles such as dust, sand, snow, and other particles in a gravitational, boundary and barrier.

`pixel_dust` Reference and rewritten from
[Adafruit_PixelDust](https://github.com/adafruit/Adafruit_PixelDust). On this basis, the `dust` module of PixelMug re-enables the simulator and Python interface for the device and adjusts the size, memory capacity and mode of operation of PixelMug.

`pixel_dust` is responsible for the maintenance of particles, velocity, barriers and collisions, and is not responsible for drawing or reading G-sensor. The program needs to advance simulations in its `update()` and then read and draw particle snapshots in `draw()`.


```python
from pixel_dust import PixelDust

dust = PixelDust(32, 16, capacity=16, scale=100)
```

The `PixelDust` object in the module uses the original memory to save the particle pool and bitmap. The object should be called `deinit()` in a visible manner when it is used.

## Workflow

A typical application works in the following order:

1. Creates `PixelDust` objects.
2. Sets the static barrier.
3. Creates particles using `spawn()`.
4. On every frame. `update()` Medium Call `iterate()`.
5. Use `alive_snapshot()` to remove active particles.
6. Draws a snapshot to MicroPyxel in `draw()`.
7. Call `deinit()` on exit.

`PixelDust` does not automatically draw particles on the screen, nor does it automatically convert colour values to the MicroPyxel colour palette index.

## Create Object

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

| Parameters | shall fill | Default value | Annotations |
| --- | --- | --- | --- |
| `w` | Yes. | — | Simulate area width, must be greater than 0 |
| `h` | Yes. | — | Simulate area height, must be greater than 0 |
| `capacity` | Yes. | — | Particle pool capacity, currently max. 128 |
| `scale` | Yes. | — | The larger the particles, the lighter the smaller the particles, and the greater the size of the particles, the range is `1..255` |
| `elasticity` | Yes | `128` | The energy retention factor for the rebound is `0..255`, the larger the bullet-like, the greater it is. |
| `sort` | Yes | `False` | Whether to sort active particles in motion direction before each advance |
| `seed` | Yes | `0x12345678` | Random internal torrent count |

`ValueError` will be thrown:

- `w` or `h` do not exceed 0.
- `capacity` less than 0 or more than 128.
- `scale` Not at `1..255`.
- `elasticity` Not at `0..255`.

`w` and `h` The bottom type is an unmarked 16-bit dimension.`alive_snapshot()` Export `x` and `y` It's a single byte, so it's recommended to keep the simulation area in the skyline when using the screen coordinates. `0..255`PixelMug. `32×16` The canvas can be used directly.

## Coordinates and Speed

The upper left corner of the simulated coordinates is `(0, 0)`, `x` to the right and `y` to the bottom. `spawn()` and `set_position()` to the integer pixel coordinates.

The position and velocity inside the particle is determined using the Q8.8 fixed number.

| Value | About equal |
| --- | --- |
| `256` | 1 Pixels / Frame |
| `512` | 2 Pixels/ Frames |
| `2048` | 8 Pixels/ Frame |
| `4096` | 16 Pixels/ Frame |

The internal speed limit is `4096` for Q8.8. Positions can be moved between pixels, but `get_position()` and `alive_snapshot()` return only the position divided by the integer pixel coordinates after 256.

## Particle pool

### `spawn(x, y, vx, vy, color)`

Creates particles at `(x, y)` and returns particles ID.

```python
particle_id = dust.spawn(16, 2, 0, 0, 8)
```

Parameter Meaning:

- `x`, `y`: Integer pixel coordinates, must be in the simulated area.
- `vx`, `vy`: Q8.8 Speed integer.
- `color`: `0..255` particle colour value.

Creating failed:

- The starting point will be dropped `ValueError`.
- The starting point will fail to be occupied by the barrier or other particles.
- The particle ponds are full of failure.
- The bound layer converts the bottom failure to `OSError`, the common error code being `ENOMEM`.

`color` is treated at 0 when less than 0, and at 255 when greater than 255. Speed parameters should use a reasonable Q8.8 range; bound layers do not convert any integer to the desired physical speed for developers.

### `despawn(id)`

Remove an active particle and release its ID:

```python
removed = dust.despawn(particle_id)
```

- Successfully delete returns `True`.
- ID returns `False` when it is moving across borders or particles are inactive.
- The removal of particles only clears the position of the particles and does not remove static barriers.
- Released IIDs may then be allocated again to new particles.

### `alive_count()`

Returns the current active particle number:

```python
count = dust.alive_count()
```

### `deinit()`

Release the primary resource created by the object:

```python
try:
    # Use dust
    pass
finally:
    dust.deinit()
```

The call is marked as an uninitialized object, and the other call will throw out `ValueError`. Do not rely on Python waste recovery to release the particle pool in time.

## Obstacles

The barrier is a static position map of particles.

### `clear_obstacles()`

Removal of all barriers:

```python
dust.clear_obstacles()
```

### `set_obstacle(x, y)`

Set a barrier pixel:

```python
for x in range(32):
    dust.set_obstacle(x, 8)
```

### `clear_obstacle(x, y)`

Clear a barrier pixel:

```python
dust.clear_obstacle(10, 8)
```

### `get_obstacle(x, y)`

Ask if the given location is a barrier:

```python
if dust.get_obstacle(10, 8):
    print("blocked")
```

The current binding will be silent when you set and remove a transboundary location. The query will return to `False`. The barrier will not automatically be drawn on the screen, and you will need to apply the drawing interface you called MicroPyxel.

Collision checks take into account both the barrier layer and the activity particle layer.

## Particle Status

### `set_position(id, x, y)`

Move particles to an integer pixel position:

```python
ok = dust.set_position(particle_id, 12, 6)
```

Return value to a boolean value:

- Successfully moved or targeted is the current position: `True`.
- ID is not valid, is crossed, the target is occupied by the barrier or by other particles: `False`.

### `get_position(id)`

Returns integer pixel coordinates:

```python
x, y = dust.get_position(particle_id)
```

ID when invalid or particles are inactive `ValueError`. Return value does not contain a decimal part of the internal Q8.8 position.

### `set_velocity(id, vx, vy)`

Set Q8.8 Speed:

```python
dust.set_velocity(particle_id, 256, -512)
```

Returns `None` successfully. ID is invalid or when particles are inactive, throw `ValueError`.

### `get_velocity(id)`

Returns the current Q8.8 speed:

```python
vx, vy = dust.get_velocity(particle_id)
```

id is invalid or when particles are inactive, drop `ValueError`.

### `set_color(id, color)` / `get_color(id)`

Set or read particle colour data:

```python
dust.set_color(particle_id, 10)
color = dust.get_color(particle_id)
```

The colour value is the number of unsigned `0..255`. This value is saved only in particles and does not automatically modify the MicroPyxel palette. ID is invalid or when particles are inactive, both interfaces are thrown `ValueError`.

## Advance the simulation with `iterate()`

```python
dust.iterate(ax, ay)
dust.iterate(ax, ay, az)
```

returns `None`. Each call will allow all active particles to advance within a frame, in order:

1. Updates speed based on input acceleration and `scale`.
2. Limit speed cap.
3. Splits the substeps of the move according to the speed size.
4. Deal with the border.
5. Check for barrier and particle collisions.
6. Updates position and particle position maps.

### `ax` and `ay`

`ax`, `ay` are the acceleration inputs for the 2D simulation. They are directed to the simulation coordinates: `x` Right, `y` Down.

The binding layer will multiply the Python float by 256 to Q8.8 and scale it from the core by `scale`. For example:

```python
dust = PixelDust(32, 16, 32, scale=200)
dust.iterate(0.0, 0.05)
```

The vertical velocity increase generated by this call is approximately `0.05 × 200` Q8.8 units.

### `az`

The current realization is not a 3D simulation, and `az` does not produce a third direction:

- This random disturbance is not enabled at `az == 0`.
- At `az != 0`, the core performs internal pre-processing based on the absolute value `az` and allows for random disturbances.
- Non-zero `az` also affects the transfer to 2D simulations `ax`, `ay`.

When a stable, repeatable two-dimensional act is required, it is recommended that it be explicitly introduced `0.0`:

```python
dust.iterate(ax, ay, 0.0)
```

### Substeps and collisions

The core removes each move into multiple substeps to avoid a high-speed particle crossing the barrier at a time. The maximum shift in the inside individual substep is about 1 pixel. The faster the speed, the higher the number of `iterate()` calculations.

Collision involves the treatment of a rebound in a horizontal, vertical or diagonal direction; a converse collision attempts to slide along an axis, and when it is not possible to slide, both directions. Particle collisions use a dynamic position map, and the first-updated particle affects the subsequent particle impact judgement in the same frame.

## Boundary modes and bounce

### Constant

```python
PixelDust.BOUND_CLAMP
PixelDust.BOUND_BOUNCE
```

The constants are `0` and `1`, respectively.

### `set_bound_mode(mode)`

Set boundary mode:

```python
dust.set_bound_mode(PixelDust.BOUND_BOUNCE)
```

### `get_bound_mode()`

Read current boundary mode:

```python
mode = dust.get_bound_mode()
```

The new object is used by default `BOUND_BOUNCE`.

| Mode | Behaviour |
| --- | --- |
| `BOUND_CLAMP` | Limit position to the border, not at a rate of automatic reverse. |
| `BOUND_BOUNCE` | Reverse when you reach the boundary, the reverse velocity is affected by `elasticity` |

The rate of rebound is as follows:

```text
Bounce speed = -Original Speed × elasticity / 256
```

For example:

- `elasticity=0`: The rebound speed in this direction is 0.
- `elasticity=128`: Keep about half the speed.
- `elasticity=255`: Approaching full flexback.

This parameter affects both boundary and barrier collisions.

## Export particles: `alive_snapshot()`

```python
count = dust.alive_snapshot(buffer)
```

It is recommended that buffer zones be created and reused at one-time capacity:

```python
snapshot = bytearray(capacity * 4)
```

Output format is:

```text
[id, x, y, color, id, x, y, color, ...]
```

4 bytes per active particle:

| Offset | Contents |
| --- | --- |
| `+0` | Particle ID |
| `+1` | x Coordinates |
| `+2` | y Coordinates |
| `+3` | Colour Value |

Returns value is the number of active particles written.

`buffer` must be a written buffer, such as `bytearray` or can be written `memoryview`. When the buffer zone space is insufficient, `ValueError("buffer too small")` is dropped.

Example:

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

The fast-sequence order is the order of the current active list, not by particle ID. When the particle is removed, the active list fills the empty slot with the last active ID, and the order may change. `sort=True` The quick-sequence sequence also sorts in the direction of movement before advancing.

The current binding of ID, x and y in the snapshot is a single byte. The construction function allows a larger size, but coordinates above 255 are cut off in the snapshot; the `32×16` screen of PixelMug will not encounter this problem.

## `sort` Behaviour

At `sort=True` the core will sequence the active particle ID list according to the current direction of `ax`, `ay`. It will affect:

- Updates and collision sequences of particles in the same frame.
- `alive_snapshot()` for output order.
- Which of the particles first occupied the target group when the multiple particles collided.

It is not just a drawing layer sort. Use `sort=False` when you need to fix or lower your cost; it only starts when you really need a directional sequence.

## Use with G-sensor and MicroPyxel

`PixelDust` does not automatically read the device sensor. The application requires self-access to sensor data, map to simulated `ax`, `ay`, and call `iterate()`:

```python
ax, ay, az = g_sensor.get_accel()

# The specific exchange or inverse relationship depends on the screen map applied.
dust.iterate(ax * 0.1, ay * 0.1, 0.0)
```

The proposed responsibilities are:

- `update()`: Read the sensors and call `iterate()`.
- `draw()`: Call `alive_snapshot()` to draw barriers and particles.
- `on_exit()`: Call `dust.deinit()` and other components for clean-up interface.

The exchange and reverse of the sensor axis and the screen axis must be based on the actual device coordinates, and `PixelDust` does not automatically correct.

## Performance and limitations

- `capacity` Max.
- The barrier map and the particle position map are assigned one each to `ceil(w / 8) × h`.
- The particle pool, active ID list, free ID bar and activity bitmap will grow with `capacity`.
- The larger the `w`, `h` or `capacity`, the higher the primary memory.
- High speed increases the number of internal steps and the number of impact calculations.
- `sort=True` will increase the cost of sorting each frame.
- Do not create new snapshots `bytearray` on each frame; should be created and used again in advance.
- Inner particle position supports fixed decimals, but the output and drawing coordinates are integer pixels.
- `spawn()` and `set_position()` will not place particles in occupied cells; if particles are first present and obstacles are then placed, the two layers may temporarily overlap, and subsequent collisions will examine two layers simultaneously.
- Colour values do not automatically map to the MicroPyxel palette.
- `alive_snapshot()` for ID, x, y is a single-byte output.
- The withdrawal should be actively called `deinit()` and do not rely on Python waste recycling to release original memory.

## Troubleshooting

### `spawn()` Throw `ENOMEM`

Check `alive_count()`, `capacity` and start position.

### The particles don't move.

Confirms that `spawn()` has been successfully called and that `iterate()` is continuously called. `iterate()` returns directly when there are no active particles.

### The particles are not in the right direction.

Check to pass `iterate()` It's... `ax`, `ay` Whether or not to match the analogue coordinates. The axis of G-sensor may need to be exchanged or reversed.

### There's a random shaking of particles.

Check if non-zeros are in. `az`. Stable 2-D simulation recommended `dust.iterate(ax, ay, 0.0)`.

### The particles are on the edge.

Check if `BOUND_CLAMP` has been used. Select `BOUND_BOUNCE` and adjust `elasticity` if you need to bounce.

### `alive_snapshot()`Report `buffer too small`

The buffer zone requires at least `capacity * 4` bytes and must be written butler.

### Colour display is incorrect

`color` is the data `0..255` carried by particles, which is not an automatic MicroPyxel drawing colour. Application needs to map itself to the palette index.


