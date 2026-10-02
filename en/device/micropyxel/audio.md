# Sound Play

MicroPyxel synthesizes sound from notes, tone and music sequences and then sends PCM to the device Audio Service. The string parameter `play()` is the MML score, not the OGG/WAV file path.

## Enable Audio Service first

The order must be: **Audio Service Initial output →MicroPyxel enabled to set resources for sound → play ** at the first initialization.

The following is a full sample of short steps, for which no material files are required.

```python
import time
import audio_service
import micropyxel as pyxel

audio = audio_service.audio
audio.init(enable_input=False, enable_output=True,
           with_opus_encoder=False, with_opus_decoder=False)
audio.configure(output_volume=100)
try:
    pyxel.init(start_audio=True)
    try:
        pyxel.sounds(0).set("c3e3g3c4", "t", "5", "n", 15)
        pyxel.play(0, 0)
        time.sleep_ms(1000)
    finally:
        pyxel.stop()
        pyxel.destroy()
finally:
    audio.deinit()
```

Audio rendering runs in the background, without `pyxel.run()` or displaying refreshing. Python main application still needs to be run and cleaned after exit; the previous example continues to wait for 1 second to complete the sound scale.

`init(start_audio=True)` is not a substitute for the initialization of Audio Service. It acquires an existing service; it may not start an audio task at the bottom when the service does not exist, nor will it inform the full audio state by `init()` Boolean return.

Not now. `init(start_audio=False)` Then again. `init(True)`: Not only is the position parameter writing illegal, but repeated initialization does not in itself add up to the audio.

## `play()`

```text
play(channel, snd, sec=None, should_loop=None, should_resume=None, tick=None)
```

The first two are required position parameters; the last four can be used or keywords. returns `None`.

| Parameters | Default value | Meaning |
| --- | --- | --- |
| `channel` | shall fill | Channel integer, 0.3 |
| `snd` | shall fill | Sound Resource Number, Global Sound Object, list/tuple of the same elements, or MML string |
| `sec` | `None` | Start with the number of seconds specified in the play sequence; default starts at the beginning and is not positive by 0 |
| `should_loop` | `None` → False | Whether to replay the current sequence |
| `should_resume` | `None` → False | Restore previous sequences of this channel after temporary playout is completed |
| `tick` | `None` | Disused start tick, converted to 120 tick/s; has priority over `sec` |

```python
pyxel.play(0, 0)
pyxel.play(0, [0, 1, 2], should_loop=True)
pyxel.play(1, "T120 O4 L8 C E G > C")
pyxel.play(0, 3, should_resume=True)  # Insert a short sound, Then restore the old sequence
```

The serial number must be within 0.63. The list does not mix numbers and objects. The empty list stops the channel. The entry of the global `pyxel.sounds(i)` object is available; the standalone `pyxel.Sound()` does not appear in the global resource table, the top level `play()` does not accept it and the `.play()` of the global channel object is used, see [Sound Resources](./sound).

The new playback in the same channel is replaced by the default old playback, and does not automatically queue. `should_resume` is the clip recovery, not the generic pause/continuation switch; an interpolated sequence will not automatically end the recovery if it is circular.

## `playm()`

```text
playm(msc, sec=None, should_loop=None, tick=None)
```

`msc` is the required position parameter, music number 0.7; the rest supports keywords, the default value is synonymous with `play()` and does not provide `should_resume`. returns `None`.

The music contains the Sound numbering sequence of the channels, with a maximum of four channels before playing. Each channel runs and circulates in its own sequence, and does not wait for the same length for the other channels.

```python
pyxel.musics(0).set([0, 1], [2], [], [])
pyxel.stop()
pyxel.playm(0, should_loop=True)
```

`playm()` If you skip a channel without content, you do not guarantee that it will be cleared before playingback. `stop()`.

## Stop with Location Query

| Interface | Parameters and returns |
| --- | --- |
| `stop()` | Stop all channels and return to `None` |
| `stop(channel)` | A valid channel index must be filled and a channel stopped; no non-participatory form can be replaced by `stop(None)` |
| `play_pos(channel)` | To fill the channel index, return `None` or `(sequence_index, elapsed_sec)` |

`sequence_index` is the current playlist starting from 0,** not the global Sound number**; `elapsed_sec` is the current Sound playtime, not the cumulative time of the entire music.

```python
pyxel.play(0, [5, 9])
print(pyxel.play_pos(0))  # For example: (0, 0.12): Playing list first, 即 Sound 5
pyxel.stop(0)
```

`stop()` Do not exit the Drawing cycle, do not destroy the sound resource, and do not close the synthetic thread and Audio Service. Exit animation `quit()`;end of component lifecycle `destroy()`.

## Buffer, Volume and Performance

Synthetic output 48 kHz monochannel 16-bit PCM, 960 points per block (20 ms), driven by a pool of 3 blocks, PPM data per se totalling 5760 B; there is also mixbuffer, Audio Service queue, dynamic copying and two backstage job booths. 3 x 20 ms are not end-to-end delay assurance.

There are different levels of volume: Sound's voice, Tone's gain, Channel's gain, and Audio Service's output volume. Multiple channels add or add to the size of the assembly, giving priority to the default channel's gain, and gradually adjusting the output volume.

Pure animations do not enable synthetic audio. Audio tasks cannot be saved by `stop()`, even if there are no notes. They stop at `destroy()`. The synthesis, decoding, network and drawing sharing device resource does not allow frequent lysis of MMLs, replacement of large-scale band tables or loading of resources during playtime.

Audio Service may also be used for other functions; the above `deinit()` applies to this independent example. The application of shared services should be centrally managed to initialize and close, avoiding closing the output that is still in use at the end of one function.
