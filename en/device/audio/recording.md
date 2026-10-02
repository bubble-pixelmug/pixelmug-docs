# Recording

## Recording pipeline and formats

Enable `enable_input=True` first, then start collecting by `recorder.start()`. The current pipe converts the microphone data to 16 kHz monochannel, and after AFE output 60 ms frame. Defaultly enable AFE pre-speech processing, voice action detection VAD and noise reduction NS. Therefore, the recorded results should not be used as raw data for completely unprocessed microphones. VAD is a status notification, not "Exact PCM only when speaking" switch. Opus code opens a separate DTX, which may be small when silent.

## Create Recorder

```text
recorder = audio.recorder(format, /, *, sample_rate=16000, frame_ms=60)
```

| Parameters | Default | Annotations |
| --- | --- | --- |
| `format` | shall fill | `"pcm"`/ `"opus"`, in place |
| `sample_rate` | `16000` | Currently save only in objects without reconfiguring the bottom audio sampling rate |
| `frame_ms` | `60` | Currently saves only in objects without reconfiguring AFE/ encoding frames |

Saves the default parameter. When creating `recorder("pcm")`, initialization must use `with_opus_encoder=False`; when creating `recorder("opus")` it must use `True`. ** The actual audio output queue is determined by the initialization switch, and recorder will not automatically switch it.** The mismatch may not read the data or compete with the code processing.

## Start: Start recording, create audio session

```text
session = recorder.start(*, sink="queue")
```

returns `RecordSession`. `sink` Only the following two values are supported, and the other values `ValueError` are thrown:

### Two modes: explicit reads and event delivery

Both models are recorded backstage and support PCM and Opus. The difference is that** application of how to get every piece of recorded data** does not change the sampling rate, audio format or AFE processing, nor is it a difference between “one-off-time return” and “one-time return” on a side record.

| Mode | Apply scene | How the data is handed over to the application | What do you need to apply? |
| --- | --- | --- | --- |
| `"queue"` (default, active reading) | Save audio files, transfer segments, or wish to arrange data processing in the main cycle | Apply `session.read()` call to remove one PCM data or one Opus package each | Read data in a timely manner, with `audio.poll()` propulsion and distribution of VAD notifications |
| `"event"` (incident reception) | Incident Retrieval Organization application is used, with light processing expected upon receipt of data | `audio.poll()` Take out the recorded data, generate `record_frame` and hand it over to the application by turning back or in the event queue | Repeated round of inquiries, register callbacks through `on("record_frame", ...)` or proactively read the event queue; no call `session.read()` |

**queue Mode Process:**

```text
Call recorder.start(sink="queue")
    → Sound is collected and processed from backstage
    → Apply Loop Call session.read() Access data
    → Save, Transfer or processing, Also Call audio.poll()
    → End stop(), Continue to read the remaining data and rotate to end of session
```

`read(0)` returns `None` immediately if data is not available, suitable for the same cycle as drawings, buttons, etc.; you can also specify a limited waiting time. The queue mode does not produce `record_frame` events, but still receives VAD, audio-recording, etc.

**event Mode Process:**

```text
- Registration first. record_frame Rewind (Or choose the active reading event queue)
    → Call recorder.start(sink="event")
    → Apply Loop Call audio.poll()
    → Generate record_frame, & Synchronize callbacks registered
    → Lightly processed in back, Or take data from the event queue.
    → Other Organiser, Call cancel() End recording
```

The registration callback does not automatically start the round of inquiries, nor does it open a Python line. The current `poll()` is to deliver up to one record data at a time, and the callback should return as soon as possible, so as to avoid a backlog of follow-up data due to time-consuming processing. The return callback events remain in the event queue and do not duplicate the same data after removal.

** When the end of the post-stop data needs to be saved, preference is given to the Queue mode.** The current event mode does not continue to empty the remaining recordings of the event after `stop()`; the remaining data can be discarded at `cancel()` when the end is not required. The detailed end process for both modes is shown on this page, “Stop, keep the end and release”.

Both returns `RecordSession`, which is used to query status and to stop recording. `sink` only determines how the audio data is obtained,** not whether VAD** is enabled; both modes can be registered `"vad"` back.

Starts the audio output queue before it is emptied; yet `recording` status session starts `RuntimeError` again. Even if the old session is already `stopping`, the creation of a new session should wait until it is finished or cancelled.

If you use both audio and play, it is recommended to start the audio and then submit the play data. When `with_opus_decoder=True` is enabled, `start()` resets the Opus decoder and emptys the existing open-code Opus package and the normal PCM playback; even if it is currently played, it will be affected.

Enter a preheating and AFE buffer delay.`start()` Read Return Now `None` It's normal.

## read: read from the queue

```text
frame = session.read(timeout_ms=0, /)
```

`timeout_ms` Only enters by location. 0 does not wait, positive integers are up to milliseconds and negative numbers are unlimited. Data is not available. / When /session cancels or error returns `None`Could not close temporary folder: %s `RuntimeError`.

PCM returns:

```python
{"timestamp": 0, "payload": b"..."}
```

Opus returns:

```python
{"timestamp": 0, "sample_rate": 16000, "frame_ms": 60, "payload": b"..."}
```

`payload` is bytes. The PCM is a 16-bit one-dimensional mono-channel data with no header, usually 1,920 bytes per frame; Opus is a package, variable in length, not a complete OGG file.

`timestamp` is the 16 kHz sample count, not milliseconds, or time-stamp string. The conventional adjacent frame is added to 960 and converted at `timestamp / 16000` seconds. The bottom is reset at initialization, without any guarantee that `start()` will start at 0 at each time.

`read()` Not because of the state. `ended` Just stop waiting indefinitely. Don't use it. `read(-1)` End of detection file; limited duration of read co-operation `state()`, `poll()` More appropriate. The path to immediately read data does not automatically drive all the events, and the main cycle still needs a visible poll.

### Current bridge buffer ceiling

A buffer of up to ** 1,024 PCM samples** or **512 byte Opus packages** is used each time you read / events distribute. The bridge removes the frame and reproduces only those parts that can be put in. The excess is discarded and will not be left for next reading.

The current 960 sample PCM frame is within this range; the Opus package long is dependent on the code output and cannot be guaranteed by format name for no longer than 512 bytes. When a higher number rate is required or the solid frame length is changed, this limit must be checked at the same time, and the cut-off Opus package cannot be used as a normal audio.

## Register state providers

```python
def on_frame(event):
    data = event["data"]
    # It's only light., Do not print full audio bytes.
    print(data["format"], len(data["payload"]))

def on_vad(event):
    print("Speaking.: ", event["data"]["speaking"])

audio.on("record_frame", on_frame)
audio.on("vad", on_vad)
session = audio.recorder("pcm").start(sink="event")
```

This clip needs to be initialized using PCM audio mode and called `audio.poll()` on an ongoing basis.

Every time `poll()` Distribution of up to one frame of recording data. Currently about 16.7 frames per second, Poll needs to be generated more frequently than frames; time-consuming callback can create a backlog in queue. `data` Organisation `session_id`, `timestamp`, `format`, `payload`, does not contain queue mode Opus results `sample_rate` / `frame_ms`.

## Stop, preserve trailing data, and release resources

| Interface | Meaning |
| --- | --- |
| `session.stop()` | Stop recording and turn to `stopping`; undefined data generated |
| `session.drain(timeout_ms=None, /)` | Stop, and then rotate until the end, if necessary; do not take the recording queue data from yourself |
| `session.cancel()` | Stop and empty the recording queue, turn to `canceled` and send `record_end` |
| `session.close()` | Undo only the Python controller 's reference to the active session,** do not stop the hardware recording** |
| `session.state()` | `recording` / `stopping` / `ended` / `canceled` / `error` |
| `session.id()` | Session integer ID |

`stop()`, `drain()`, `cancel()` and `close()` Back `None`; `state()` returns the state string,`id()` returns the entire number of session IDs.`drain()` It's... `None` / Negativetimeout means unlimited waiting, 0 only check, positive number time; no automatic cancellation at that time, and then check the state.

The Queue mode should be kept at the end: first `stop()`, continue `read(0)` the remaining consumption frame and `poll()` until `ended`. At the end of the period, the corresponding group is required to be empty and at least 120 ms from the last readout frame. Direct `stop(); drain()` may be waiting because the queue is not read.

The event mode is currently distributed only at `recording`; `stop()` will not continue to empty the remaining data through the event after. If no tail is required, use `cancel()`; if the tail is required, select Queue. Do not commit `stop()` to automatically send all tail frames, and the sample that does not yet form the full frame is not guaranteed.

Finally cancel the open session in `finally`, then `close()`, `audio.deinit()`.
