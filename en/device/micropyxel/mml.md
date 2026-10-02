# MML score

MML describes the sound notes and composite parameters in a string. You can send them to `sounds(i).mml(code)` pre-resolution, or to `play(channel, code)` ad hoc play. This is the syntax of the current solver and does not promise to be compatible with other MML dialects.

```python
pyxel.sounds(0).mml("T120 O4 L8 @0 V80 C D E G > C")
pyxel.play(0, 0)
```

Finish the initialization in [Sound Play](./audio). Repeats the songs and recommends that they be analysed once in Sound and then played by number.

## Basic Command

command case writing is not sensitive and you can add a blank between commands. Default parameter is `T120 Q80 V100 O4 L4 @0`; transfer and fine-tweet default 0; envelope/fibrill/glide default closes.

| Syntax: | Parameters and meanings | Example: |
| --- | --- | --- |
| `Tn` | Positive integer BPM, default 120 | `T150` |
| `Qn` | Sound as a percentage of the length of the note, 0.100, default 80 | `Q90` |
| `Vn` | Volume 0.127, default 100; different from the Sound orbit 0.7 | `V80` |
| `@n` | Sound numbering, currently using 0.3, default 0 | `@1` |
| `On` | Eight degrees - 1.9, default 4 | `O3` |
| `>` / `<` | Raise/Decrease 1 8 degrees | `C > C < C` |
| `Ln` | Default sound long denominator, default 4, or quartile | `L8` |
| `C D E F G A B` | sound, with current eight degrees and default long | `C E G` |
| `#` / `+` / `-` | L/L/Square | `C# D-` |
| Numbers after a name | This note is the denominator of value, not eight degrees | `C8 D16` |
| `R` or `Rn` | Stop, use default or specify time values | `R4` |
| `.` | Attach points, increasing by half the previous time value; can continue to add points, but must be expressed in integer tick | `C4.` |
| `&` | Connects a high note or an additional time value | `C4&C8`, `C4&8` |
| `Kn` | Integer semi-tonic, negative, default 0 | `K12` |
| `Yn` | Integer cents fined, negative, default 0 | `Y-10` |
| `[ ... ]n` | One repeat play, n. 1 | `[C D E]2` |
| `[ ... ]` | No number means no limit | `[C E G]` |

A four-point note is 48 tick, hologram 192 tick. The time value is divided by 1.192, and must be divided by 192, e.g. 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 192. Do not fill in the number or zero that cannot be divided.

Sound has no limited total time, `total_sec()` returns `None`; it will not switch to the next item on the playlist after the natural end.

## Package, tremors, slips.

Three types of effects are defined separately by the numbering slot. Slot 0 is reserved for the closing effect; the definition is numbered in positive integers. A definition command with brackets saves and immediately applies the effect; it can later be selected again without brackets `@ENVn`, `@VIBn` or `@GLIn`.

| Syntax: | Parameters |
| --- | --- |
| `@ENVn{initial,duration,volume,...}` | `initial/volume` is 0.127; each pair `duration,volume` is a non-negative tick-long transition to target volume, which can be multiple periods |
| `@ENVn` / `@ENV0` | Select package n/ close |
| `@VIBn{delay,period,depth}` | Non-negative delay tick, cycle tick, depth cents (can be negative); meaningful cycle should be greater than 0 |
| `@VIBn` / `@VIB0` | Select the tremors n/ off |
| `@GLIn{offset,duration}` | High-cents offsets and non-negative time length tick; each can be `*` to indicate no-notic |
| `@GLIn` / `@GLI0` | Select a slider n/ close |

```python
pyxel.sounds(1).mml(
    "T120 O4 L4 @0 V80 "
    "@ENV1{0,4,127,20,0} @ENV1 C E G "
    "@ENV0 @VIB1{8,16,25} @VIB1 C2"
)
pyxel.play(0, 1)
```

Each Channel keeps the envelopes, the tremors, the slips. **8 Define Cache**. This is the number of definitions that can be cached at the same time and does not require the numbering to be continuous; the first one may be covered if it is achieved beyond the capacity, and the old definition may expire, and it is recommended that a small number of fixed numbers be used.

The grid segment, notes and duplicate structures also generate dynamic commands and states. The `total_sec()` repeat nestings have a maximum of 32 layers, which cannot be calculated and returned to None when beyond; this is not the recommended musical complexity. Use short music sentences and do not constantly generate new definitions to carry current data.

## Use boundary

- The old orbital format of `Sound.set()` is different from that of MML; toggle at [Sound Command Priority](./sound#轨道与-mml-命令的优先级).
- `sound.mml()` or `sound.mml(None)` clearance command,`sound.mml(code)` writes in the new command; setting a way back to `None` is not a successful sign.
- The current binding does not convert all the solvency failures to Python anomalies, nor does it assume that the old content has been emptied after failure. Only the controlled and formatted music spectrum is passed in; look at logs and `total_sec()` if it does not meet expectations.
- Binds containing old syntax `x/X/~` will print discards, but still send them to the current solver; do not understand the hint as complete support for the old dialect.
- Do not parse the same score for each frame in the drawing back. Stop the sound with `stop()` and do not have to recreate the whole component.

## Full Example: Play a two-sounding song

Saves the following code as `__main__.py` for MPY items, loads and runs the device code in Studio. No PNG, audio files or other material: both melody and accompanion are synthesized in real time by MML and automatically ends once played.

```python
import time
import audio_service
import micropyxel as pyxel

# Channel 0: Triangular rhythm, Contains an eight-degree switch, Repeat & Different Sound.
MELODY = (
    "T120 O4 L8 @0 V90 Q90 "
    "C E G E D F A F "
    "E G > C < G F A > D < A "
    "[G E D C]2 "
    "D4 G4 C2"
)

# Channel 1: Lighter bass accompanion, Same as the melody..
BASS = "T120 O2 L2 @0 V55 Q75 [C G F C]2"

audio = audio_service.audio
audio.init(enable_input=False, enable_output=True,
           with_opus_encoder=False, with_opus_decoder=False)
try:
    audio.configure(output_volume=100)
    pyxel.init(start_audio=True)
    try:
        pyxel.sounds(0).mml(MELODY)
        pyxel.sounds(1).mml(BASS)
        pyxel.musics(0).set([0], [1])

        print("Start Play")
        pyxel.playm(0)
        while (pyxel.play_pos(0) is not None or
               pyxel.play_pos(1) is not None):
            time.sleep_ms(50)

        # Waiting after the synthesis, Lets the tails of the audio queues sent to broadcast.
        time.sleep_ms(300)
        print("Play End")
    finally:
        pyxel.stop()
        pyxel.destroy()
finally:
    audio.deinit()
```

This code is implemented by:

1. Starts the Audio Service output and starts the MicroPyxel synthesis task by `start_audio=True`.
2. The melody and the accompanion are deciphered to Sound 0, Sound 1. `T120` means 120 beats per minute; the melody `L8` is the default eight-point note and the accompaniment `L2` is the default half note.
3. `musics(0).set([0], [1])` Arrange two Sounds for channel 0 and channel 1, `playm(0)` to start double-sounding.
4. The main program waits for the end of both corridors, then stops and releases MicroPyxel, and finally closes Auto Service. The last 300 ms is a voice waiting for the audio queue, not a guarantee of delay in the play of the device.

You can first change `T120` for both MMLs to `T160` to listen to velocity changes; or replace `@0` for melody with `@1` to compare the triangular wave with the square sound. The acoustic `V55` controls the sound of this sound, `output_volume` controls the overall output of the device.

This example only plays the sound, and does not require `run()` or `render_graphics()`. Therefore, there is no need to call `quit()`: when the cycle is over, then the resource is cleared.
