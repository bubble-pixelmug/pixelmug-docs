# Play Audio

## What data can be played?

### PCM

The current Python play path requires **48 kHz, one channel, 16 bits with a symbol small PCM**. The length of each sample 2 bytes must be even.

- Readable buffers can be called `bytes`, `bytearray`, `memoryview` etc.
- Data does not contain WAV file headers; neither MP3, AAC, or Floating Point PCM can be passed.
- Stereo PCM must be converted to a mono-channel first. Direct transmission of the right- and right-channel staggered data will be used as a continuous mono-channel sample.
- `sample_rate=16000` does not trigger PCM re-sampling. 16 kHz recordings cannot be delivered to 48 kHz PCM playway as they are, otherwise the speed and sound will change.

### Opus

Requires each writing** of a complete Opus audio package**. A package can contain multiple frames inside of Opus, but multiple individual packages cannot be spelled directly or can not be cut at will by reading block by file.

Decoding output is fixed to 48 kHz single channel. General single stream Opus is available, normal two-channel flow is mixed down by a single channel decoder; no multi-channel multiistream is supported. Original sampling rate in source file head is not an output configuration.

`frame_ms` The time used to allocate the decoded output capacity should be no less than the actual total time of the package; too small to decode. The bound layer only checks the positive integer and does not verify the package content. The open-door application recommends that a fixed 20/40/ 60 ms package be used; the warehouse musicPlayer's breaker also accepts only the first three types of packages for a long period. Do not misperceive the restriction of this example as a complete verification of all Opus packages.

### OGG/ WAV files

`player.play(open("test_audio.ogg", "rb").read())` **Not a valid fileplayback method**. OGG is a container that needs to be removed first and removed `OpusHead` / `OpusTags`, then package in; OGG Vorbis is not applicable. WAV needs to parse the actual chunk structure, remove the PCM that meets the format requirements, and cannot assume that all WAVs have fixed 44 bytes.


## Create Player and Play Sessions

```text
player = audio.player(format, /, sample_rate=48000, frame_ms=60)
```

| Parameters | Default | Annotations |
| --- | --- | --- |
| `format` | shall fill | `"pcm"` or `"opus"`, by location |
| `sample_rate` | `48000` | PCM: The split calculation for play() only does not change the output of the fixed 48 kHz or re-samp; flowwrite() does not use this parameter. Default values should be maintained and 48 kHz PCM data provided. Opus: must be 48000, other values are misreported |
| `frame_ms` | `60` | Positive milliseconds; `play()` of PCM |

Enable output before creating object; playing Opus must also enable decoder. Create Player does not itself enable service.

### Two modes: one-shot and streaming

When you create Player, you can submit your sound in two ways. Both support PCM and Opus, and use the same backstage line; the difference is that** data are ready and who controls the submission process**. Here, both methods are not `mode` parameters in the interface, `mode="replace"` indicating how to handle old play.

| Submission mode | Apply scene | How the data is handed to the player | Enter how to end |
| --- | --- | --- | --- |
| One submission `play()` | Short alert, short sound, or small audio set in memory | Apply all data to go at once; player automatically split PCM, or submit Opus packages one by one | Auto-end input after all data is submitted, no further calls `end()` |
| Fluid Submission `open_stream()` + `write()` / `writev()` | Longer files, audio received on the network, continuous sound generation, or playback also require drawing and reponsebutton | Application reads or generates data by block, then submits the full audio to memory without loading it | Application calls on its own after submission of the last piece `end()`, or use `drain()` End input and wait |

** One submission process:**

```text
Prepare all of them. PCM Data or completeness Opus Package List
    → Call player.play(data)
    → Inside, block by block., It's playing backstage.; Wait for empty slots when line is full
    → Auto-end input after all submissions
    → Keep on the line., Confirm the end of the remaining sound play
```

`blocking=False` indicates only that it does not wait for the final play to be finished,** it does not mean that the process of submitting all data will not wait**. If you set `blocking=True`, `play()` will continue the process internally and will not return until the session is over.

**Flow-type submission process:**

```text
Call player.open_stream() Create Session
    → Read or generate a piece PCM / Split a whole Opus 包
    → Call session.write() Submit
    → Handling of queries, Draw or press key, I'll give you another one.
    → Call upon data submission session.end()
    → Keep on the line., Confirm the end of the remaining sound play
```

Fluid submission allows the application to control its own submission rhythm, but does not automatically turn a file reading or web request into a non-blocking operation. `write(..., wait=False)` is used when an interface is needed; the current data is kept when the queue is full, and other things are handled before retrying. The PPM section size is determined by application, and Opus must keep the full package boundary.

Both ways return `PlaySession` for query status, waiting to end or cancel play.** Data submitted do not mean sound is finished**; for specific parameters and waiting behaviour, see the following two interface subsections.

## One submission: Play

```text
session = player.play(data, /, *, mode="replace", blocking=False)
```

`data` Requiring: PPM is a buffer; Opus is a package, or a package buffer consisting of `list`/ `tuple`. The generator should use a current interface after the package.

`mode` Currently only `"replace"` and other values `NotImplementedError` are supported. The new playout will empty the data to play and replace the old session. `blocking=True` There will be a round of queries until the end, with no timeout parameters.

**`blocking=False` I'm not sure I'll be back.**: This method will submit all data by waiting for writing and return to session; the PCM will press `sample_rate × frame_ms / 1000` A sample segment. When the data is larger, the submission process will wait for the queue slot. `open_stream()`.

## stream / write /writev

```text
session = player.open_stream(*, mode="replace")
session.write(chunk, /, *, wait=True)
session.writev(chunks, /, *, wait=True)
```

`open_stream()` returns the `playing` status session; only voluntary input ends will be transferred to the end process. `chunk` will be filled, PPM buffers for even-numbered sections and Opus complete packages.

| Call | Return and Wait |
| --- | --- |
| `write(chunk, wait=True)` | Waiting teams are empty and returned to `True`; not waiting for sound to be heard |
| `write(chunk, wait=False)` | Successfully returned `True`; temporarily unable to cast `OSError(EAGAIN)` |
| `writev(chunks, wait=True)` | `chunks` must be list / tuple; returns the number of blocks successfully written |
| `writev(chunks, wait=False)` | Returns the number of blocks received, which may be 0 or only part of the receipt; only retry the remainder |

`write()` does not automatically split the PCM large buffer. It is recommended that each block 20-60 ms, or 1,,920-5,760 bytes, avoid a single data block taking over the output channel for too long. The buffer is copied to the solid memory queue, not a zero copy.

`wait=True` There is no timeout; writing failure may throw `RuntimeError`. `EAGAIN` is used only as a back-to-back test when the service is correctly enabled.

Unable to continue writing after `end()` calls; finished/ cancelled/ miswritten session writing will throw `RuntimeError`.

## Finish, wait, and cancel

| Interface | Behaviour and Return |
| --- | --- |
| `session.end()` | Declaration no longer written, converted to `draining`; return immediately `None` |
| `session.drain(timeout_ms=None, /)` | Also finish input and wait round; `None` / Negative infinite waiting time, positive time, 0 advance only once; return `None` |
| `session.join()` | `drain()` equivalent to unlimited waiting, also closes input |
| `session.cancel()` | Empty shared playlist, marked, sent `play_end`/ `canceled` |
| `player.stop()` | Stops the current active play and sends `play_end`/ `stopped` |
| `player.drain()` | Enter and wait indefinitely for the end of the current active session; return directly if no active session |
| `session.state()` | returns `playing`/ `draining`/ `ended`/ `canceled`/ `error` |
| `session.id()` | Returns session integer ID |
| `session.error()` | Non-error state `None`;eror status `code`, `message` Dictionary |

Timeout `drain()` does not automatically cancel and does not return the finished boolean value. The `state()` should be checked again. Do not continue with `drain()`/ `cancel()` for cancelled, replaced or completed old sessions; they share a bottom queue that may interfere with the new play.

The play is shared by the normal player with MicroPyxel. When new play replaces the old session, `session.cancel()`, and `player.stop()` stops the active play, cleanup operations also discard the PCM data that MicroPyxel has not yet exported. These operations do not stop the MicroPyxel synthesis itself; subsequent sound may continue as synthesis is still running.

The conclusion judgement is an inspirational judgement that is now being achieved: completed input, associated team is empty, service idle, and at least 120 ms is not advanced. It is not a hardware playspace query, especially for precision synchronization in large PCMs, simultaneous audio recording or other shared audio activity. Fluid input continues `audio.poll()` after it has been sent and sets a reasonable timeout for application.

The bottom Opus decoder failed to primarily write the system log, and the Python session was not guaranteed as `error`; `error()` as `None` does not prove that each package was decoded successfully. Check the format, initializing the switch and the device logs while silent.
