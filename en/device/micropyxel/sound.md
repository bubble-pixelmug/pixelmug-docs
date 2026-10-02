# Sound, Music, Channel and Tone

Sound resources describe “what to play”, channel describes “where to play” and sound describes “how to synthesize”. Please complete [Audio Initialization](./audio) before actually speaking.

## Resource portal

| Interface | Parameters | Back |
| --- | --- | --- |
| `sounds(index)` | Required position parameter, 0.63 | Global Sound |
| `musics(index)` | Required position parameter, 0.7 | Global Music |
| `channels(index)` | Required position parameter, 0.3 | Channel involved in actual mix |
| `tones(index)` | Required position parameter, 0.3 | Global Tone |

These objects share the bottom resources, and the changes affect their subsequent use. Prioritize changes to unplayed resources or stop the corresponding channel and then edit them, so as to avoid synthesizing with the backstage and modifying the same data.

`Sound()`, `Music()`, `Channel()`, `Tone()` non-parameter tectonic functions are also exported, but they create independent objects and do not automatically join the global resource list. Independent Channel in particular does not automatically become the 5th Mixer channel, and independent Music does not directly pass to `playm()` a number only.

## Sound: short sound and music

### `sound.set(notes, tones, volumes, effects, speed)`

All five parameters must be filled and only position parameters accepted, returning `None`.

| Parameters | Type & Format |
| --- | --- |
| `notes` | String. The sound `a..g` may be followed by `#` or `-` and must then be followed by eight degrees `0..4`; `r` by rest. For example `"c3d3e3r"` |
| `tones` | String. `t/s/p/n` Triangular, Square Wave, Pulse, Noise, which can also be used `0..3` to indicate the current sound number |
| `volumes` | String. Each character is `0..7`, 0 silent |
| `effects` | String. `n` None, `s` Slide, `v` Treasure, `f` Fade, `h` Fade at the last half of the notes, `q` Fade at the last quarter |
| `speed` | positive integer, number of ticks per note; 120 tick/s, therefore 15 corresponds to an approximate of 0.125 seconds per sound |

Strings go blank and lowercase. `tones/volumes/effects` Recycles in shorter time than `notes` and do not need to repeat the same values many times; an empty orbit is processed by triangulation, volume 7, no effect.

```python
sound = pyxel.sounds(0)
sound.set("c3 e3 g3 c4", "t", "5", "n", 15)
pyxel.play(0, 0)
```

The figure in `c3` here is eight degrees; the `C4` in [MML](./mml) indicates a four-point note, with `O` setting for eight degrees, which cannot be combined with two syntaxes.

Bottom `speed` is saved to 16-bit unsigned integers. It is recommended to use `1..65535` not to pass 0, negative number or rely on spill conversions. String resolution failure usually returns only to bottom failure, while binding does not convert it to Python anomaly; parameter formats should be guaranteed by application.

### Sound playback methods

| Methodology | Parameters, Defaults and Returns |
| --- | --- |
| `set(notes,tones,volumes,effects,speed)` | See above |
| `set_notes(notes)` | To fill the above note string, replace the note track |
| `set_tones(tones)` | You will fill the above-mentioned sound string and replace the sound track |
| `set_volumes(volumes)` | You must fill the above volume string and replace the volume track |
| `set_effects(effects)` | You must fill the above effect string and replace the effect track |
| `get_speed()` | Returns integer number, start-up Sound Default 30 |
| `set_speed(speed)` | It is necessary to fill in the integer number and recreate the play command according to orbit |
| `get_notes()` | returns Notes Variable View, value is audio encoding; rest is -1 |
| `get_tones()` | returns the Tones variable view, with a number of integers of the sound |
| `get_volumes()` | returns the Volumes variable view with a value of 0.7 |
| `get_effects()` | returns Effects variable view, value 0.5 |
| `mml(code=None)` | Location parameters can be omitted; string resolution to MML command; omitted or None empty command |
| `total_sec()` | returns seconds float; unable to calculate a limited number of hours back |

All the above methods are position-only parameters, and the setting operation returns `None`.

### Track and MML command priority

Sound has both notes and pre-generated commands. Commands are given priority when playing, otherwise they are generated as soon as they are in orbit. The current `set()` and four `set_*` string methods do not automatically clear old commands; `set_speed()` and view individual grant values recreate orbital commands.

So, when reusing a Sound that used to write MML, cut back to orbit:

```python
sound = pyxel.sounds(0)
sound.mml()  # Clear the old order., Follow-up on track
sound.set("c3e3g3", "t", "5", "n", 15)
pyxel.play(0, 0)
```

`mml()` will not clear the notes orbit, so it is not "empting the whole Sound" or "stop the channel"; stop the sound playing with `stop()`.

### Notes, tones, volumes, and effects

These views are returned by `get_*()` and are not created by a modular-level tectonic function. Support `len(view)`, integer index reading and giving, `view.to_list()`. Supports a valid negative index, does not support slices, deletes or append; uses a corresponding string setting method when length changes are needed.

```python
notes = pyxel.sounds(0).get_notes()
print(notes.to_list())
notes[0] = 36  # c3, C0=0; The value will recreate the orbital command.
```

They are not copies, the grant changes the Sound. `to_list()` returns the Python list for copying. The lower individual grant is incompletely validated semantic range, keeping notes as valid code/terminator, tones 0.3, volumes 0.7 and effects 0.5.

## Music: organize a sequence for each channel

### `music.set(*seqs)`

Each position parameter is a Sound number list/tuple that corresponds in turn to the channel 0, 1, 2 and 3. returns `None`. No parameter emptys the channel sequence of Music. Even if more sequences are created, the current player only uses the first four.

```python
pyxel.sounds(0).set("c3e3g3", "t", "5", "n", 20)
pyxel.sounds(1).set("c2r", "s", "3", "n", 30)
pyxel.musics(0).set([0, 0], [1, 1], [], [])
pyxel.playm(0, should_loop=True)
```

### Sequence View

`music.seqs()` returns the Seqs view:

| Operation | Meaning |
| --- | --- |
| `len(seqs)` | Number of channel sequences |
| `seqs[i]` | Return Seq view of the channel |
| `seqs[i] = [0,1]` | Replace the serial numbering of existing channels |
| `seqs.to_list()` | Copy to 2D Python list |
| `len(seq)`, `seq[j]`, `seq[j] = n` | Access and modify a Sound number |
| `seq.set([0,1,2])` | Replace the whole Seq, change the length |
| `seq.to_list()` | Copy to 1D Python list |

The index must be integer, with a valid negative index, without support for slices or deletions. The number of corridors extended across borders by an assigned value should be re `music.set(...)`. The Music is reset and retakes Seq and does not continue to use packagings that point to the old sequence.

`music.snds_list()` is the defaulted aliases return the same view and print a hint as `seqs()`. It is not an open attribute array.

## Channel control

| Methodology | Parameters, Defaults and Returns |
| --- | --- |
| `gain()` | Return linear gain float, default 0.125 |
| `set_gain(value)` | Number to be filled, returns Noone; current bound limit is unlimited, not negative and smaller recommended |
| `detune()` | Returns integer fine tunes, in cents, default 0,100 cents for a half |
| `set_detune(value)` | To fill 32-bit with symbol integer, in cents, returns None |
| `play(snd,sec=None,should_loop=None,should_resume=None,tick=None)` | Symmetrical to top level play, but no channel parameters; support independent Sound object, return None |
| `stop()` | Stop this tunnel and return to None |
| `play_pos()` | None or `(sequence_index,elapsed_sec)`, semantic penthouse interface |

Except for the optional keyword parameter `play()`, the other method is transposed by location.

```python
channel = pyxel.channels(0)
channel.set_gain(0.125)
channel.set_detune(10)
channel.play(0, should_loop=True)
```

## Tone: waveforms and noise

Sound numbering constants are `TONE_TRIANGLE=0`, `TONE_SQUARE=1`, `TONE_PULSE=2`, `TONE_NOISE=3`. They are ** global sound number** and are not used as the following mode of generation.

Current tone:

| Numbering | Mode | Wave watch length | Number of active places | gain |
| --- | --- | --- | --- | --- |
| 0 | Wave watch, triangle | 32 | 4 | 1.0 |
| 1 | Wave watch, square. | 2 | 4 | 0.8 |
| 2 | Wave watch, narrow pulse. | 4 | 4 | 0.8 |
| 3 | Long noise | 0 | It doesn't sound like a wave. | 0.6 |

| Methodology | Parameters, Defaults and Returns |
| --- | --- |
| `get_mode()` / `set_mode(value)` | Mode Integer: 0 wave watch, 1 short noise, 2 long noise; independent Tone default 0 |
| `get_sample_bits()` / `set_sample_bits(bits)` | Wave-sampling active bits, independent Tone default 4; positive integer 1.32; bottom adjustment 0 to 1 + 32 |
| `get_gain()` / `set_gain(value)` | Linear gain, stand-alone Tone default 1; negative number zero, too high potential to rip |
| `get_wavetable()` | Return Wavetable Variable View |
| `get_noise()` / `set_noise(value)` | Disabled, corresponding to get mode / set mode |
| `get_waveform()` | disabled, equal to get wavetable, not PCM output data |

All setter parameters must be filled, only position parameters returned `None`.

Wavetable supports `len()`, integer index reading/entrusting, `to_list()`, `from_list(values)`. The latter receives list/tuple, replacing the full wavewatch, which can change the length. The default number of bits 4 should be `0..15` for each sample; the general range is `0..2**bits-1`. No slice, delete, or append.

```python
tone = pyxel.tones(0)
tone.set_mode(0)
tone.set_sample_bits(4)
tone.get_wavetable().from_list([0, 4, 8, 12, 15, 12, 8, 4])
tone.set_gain(0.5)
```

32 is the default surface length of a triangulation wave, not the `from_list()` mandatory limit. Original tables, cache tables and accompaniment waveforms take over memory; do not load the entire PCM, and do not create or replace long tables on a frame-by-frame basis. Modifying the global Tone will affect all references to this number.

Effect constants also include `EFFECT_NONE=0`, `EFFECT_SLIDE=1`, `EFFECT_VIBRATO=2`, `EFFECT_FADEOUT=3`, `EFFECT_HALF_FADEOUT=4`, and `EFFECT_QUARTER_FADEOUT=5`.

