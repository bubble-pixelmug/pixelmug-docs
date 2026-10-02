# Initialization and events

Use `audio = audio_service.audio` for the following signatures, the parameters after `*` can only be entered by name, and the parameters before `/` can only be entered by location; these symbols are used to describe the signature and need not be written in the call. Parameters without default values must be filled. Control methods not specified return `None`.

## init: Create service

```text
audio.init(*, enable_input, enable_output, with_opus_encoder, with_opus_decoder)
```

All four Boolean parameters** have to be filled** and cannot be called `audio.init()` directly.

| Parameters | Meaning |
| --- | --- |
| `enable_input` | Create audio input service; audio recording requires `True` |
| `enable_output` | Create audio output service; playing a synthesis with MicroPyxel requires `True` |
| `with_opus_encoder` | Audio output using Opus encoding; PCM recording set to `False` |
| `with_opus_decoder` | Enables the Opus play decoded; only PCM is played at `False` |

| scene | input | output | encoder | decoder |
| --- | --- | --- | --- | --- |
| PCM Play / MicroPyxel | False | True | False | False |
| Opus Play | False | True | False | True |
| PCM Sound Recording | True | False | False | False |
| Opus Sound | True | False | True | False |
| Opus Sound and Play | True | True | True | True |

Enter `recorder.start()` to start the audio processing only after initialization. Do not write data to an unused output / decoding channel, otherwise there may be no sound, queue or wait until you do not return.

Repeat `init()` does not recreate existing codec by new parameters. When a service switch needs to be changed, finish the current play and recording and `deinit()`, and reset `init()`.

## Configure: volume and input gain

```text
audio.configure(*, output_volume=None, input_gain=None)
```

| Parameters | Default | Annotations |
| --- | --- | --- |
| `output_volume` | `None` | Keeps the current volume constant when None is omitted or passed; integers of 0.100 are assigned, crossing the value Error |
| `input_gain` | `None` | Keeps the current input gain unchanged when None is omitted or passed; specified values are converted to floating points and no range verification is currently performed |

The current base codec default volume is 70 and the input gain is 25.** If no sound is heard after the application is started, you can first maximize the volume.** It is recommended to apply the volume required for the graphic configuration.

Current PDF microphone path `input_gain` Yes.**Multiply software, not dB**: The positive value is converted to an integer and multiplied on the PCM sample, and is reduced when above the 16-bit range; the non-remunerative value skips the gain processing. `0` It doesn't mean the microphone is silent.`0.5` This is also not a valid decimal number for decay. Use a reasonable positive integer when adjusting and check for distortion through actual recording.

```python
audio.configure(output_volume=70)
```

## Deinit: Release Services

```python
audio.deinit()
```

Stop and release the service, hardware and decoding resources, and reset Python event sessions, event queues and backshows. It is not "waiting to finish playing " ; if you want to play a tail sound, finish the session.

Use spectrum analysis to stop FFT and close the open input/ output dump and then call `deinit()`. Underground retention of the dump switch, observation buffer capacity configuration and FFT calculation frequency, as detailed in [Cleanup description for spectrum analysis](./spectrum#选择输入或输出).

Do not continue to call old Player, Resorder, Session or SpectrumAnalyzer objects after release. Re-initiate them and recreate them. When multiple modules are shared, application top level integration is responsible for initialization and release.

## Events and polling

Audio Service handles the sound in the backstage, and uses** event** to tell the application what happened. The event can be a status announcement, such as an end of play, a sound detected, or a voice that has just been recorded. Use this to get this information and then decide to update the image, save the data or start the next operation.

** Roundabout** is to apply it in its own cycle, regularly allowing AutoService to check the status, deliver the notice and audio data. The way to complete this step is `audio.poll()`. It handles what can be handled at the moment and returns, and the application can continue to do other things and call it later.

### When to use events

| scene | Apply what? | What's in charge of the interview? |
| --- | --- | --- |
| Fluent Play | Reading or generating sound on an ongoing basis, submitting sound by block; declaring end of all post-submission statement | Check if the remaining sound meets the play-end condition, update the session status and generate `play_end`, apply this to update the interface or enter the next step |
| Event recording | Start recording and processing incoming audio data | Extract data from the audio queue and hand over a PCM data or an Opus package to the application `record_frame` |
| VAD Voice Testing | Start recording, and we're going to use the voice to determine how to interact. | / Non-speak state changes detected at the bottom to apply by `vad` event |
| The recording's over. | Stop recording and continue reading the remaining data when keeping the tail | Check the end condition, update the session status and generate `record_end` |

The data that are streamed is still submitted by application, and the round does not read the file for application, nor is there an event “please submit the next piece”. The data recorded in the queue mode is still actively read by application; it does not produce `record_frame`, but can also receive VAD and closing notifications.

```text
Start playing or recording
    ↓
Apply Loop: Submit / Read Audio, Process images or buttons
    ↓
Call poll(): Check audio status, Delivery event
    ↓
Apply to deal with events, Next round.
```

The voices that have been submitted can still be played backstage if the questions are not repeated, but the end state, VAD notifications and event audio data on the Python side will not be delivered in time. Read `session.state()` alone cannot replace the call. Part of the waiting for the interface will be rotated internally; the `poll()` will be called regularly when you organize the main cycle.

### How the application receives events

You can choose two ways. The event is the same:

- ** Callback**: A processing function is registered first. When a corresponding event is asked, the function is called. For example, a hint on the screen is updated as soon as a change in the speaking status is received.
- ** Active reading method**: A round of questions takes the notification from the event queue and the main cycle is used to determine the type and process it.

The callback is the application of your normal Python function, which is performed simultaneously when the event is delivered, without opening another Python line. The callback should therefore return as soon as possible, with time-consuming network requests or complex processing left to the main cycle.

### Event types and meanings

| Events | Meaning what? | When does it come in? |
| --- | --- | --- |
| `vad` | Changes in speech status detected | When recording starts, from non-spoken to spoken or from speech to non-spoken; only when the state changes, not every tape is notified |
| `play_end` | Play Session End | Normally completed, or stopped, cancelled, replaced; does not mean that every piece of sound has been played or that the MicroPyxel notes have ended the event |
| `record_frame` | A piece of audio data can be handed over to the app. | Only event audio generated; currently delivering up to one PCM data or one Opus package per query |
| `record_end` | End of recording session | Queue the relevant queue after cessation and meet the end condition, or apply the active cancellation; call `stop()` does not immediately equal the end of the audio session |
| `error` | Preset Bottom Error Notification | The current bridge does not have an entry point that actually produces this notification and cannot rely on it to capture all audio errors; parameter errors still throw Python anomalies, and some bottom errors require a view of the device log |

VAD determines whether or not to speak, not to speak or to speak, or to automatically stop the recording. Que and event can receive `vad` in both recording modes; the recording is done using the event mode and only determines how the recorded data is delivered.

### Event payloads

Each event is a dictionary, such as when playing normal completion:

```python
{
    "type": "play_end",
    "t": 12345,
    "data": {"session_id": 1, "reason": "ended"}
}
```

`type` is the name of the event, `t` is the msms time stamp, `data` is the specific content of the event. `t` is not the sound time or calendar time; VAD uses the lower-level notification at the time when the session event is generated by the Python side, the reception may be later.

| Events | Fields in `event["data"]` |
| --- | --- |
| `vad` | `speaking`:bool, `True` indicates that a speech is detected, `False` means a non-speaker state |
| `play_end` | `session_id`: Play Session ID; `reason`: End reason, see table below |
| `record_frame` | `session_id`: audio session ID; `timestamp`: 16 kHz sampling count; `format`: `"pcm"`/ `"opus"`; `payload`:bytes audio data |
| `record_end` | `session_id`: audio session ID; `reason`: `"ended"` indicates that after the stop, the condition for the emptying is fulfilled, `"canceled"` indicates that the remaining recordings are voluntarily cancelled and discarded |
| `error` | `code`: Integer error code; no complete error list available to rely on |

`play_end` It's... `reason` To distinguish between normal completion and interruption:

| Value | Meaning |
| --- | --- |
| `ended` | Completed input, Query confirmation of Queue and playtime meeting end conditions |
| `replaced` | New `play()` or `open_stream()` replaces old session with replace |
| `stopped` | Apply to `player.stop()` |
| `canceled` | Apply to `session.cancel()` |

Events with `session_id` can be compared to the corresponding `session.id()` to distinguish between old and new conversations. The `data.timestamp` audio is ** sample count, not milliseconds**, and each 60 ms data block is usually added 960; it cannot be mixed with the outer `t`. Event audio recordings do not add `sample_rate`, `frame_ms` fields, and data formats are detailed at [Sound recordings](./recording).

## Event Interface

When you select a callback, you register the callback, then you start playing or recording and you keep on the rotation. When you choose the active readout, you do not register the callback, and you remove the event processing after the call. Below is an interface in this order.

### on: register an event callback

```text
audio.on(name, callback, /)
```

| Parameters | shall fill | Meaning |
| --- | --- | --- |
| `name` | Yes. | Event name above, e.g. `"vad"`, `"play_end"` |
| `callback` | Yes. | normal function to receive an event dictionary; pass `None` to cancel the callback for this type |

Two parameters are entered by location and returned `None`. The same event only retains the last registered function, and re-registration replaces the old function. Unknown event name, non-callable and non-`None` arguments throw `ValueError`.

```python
def on_vad(event):
    speaking = event["data"]["speaking"]
    print("Speaking." if speaking else "Non-speak status")

audio.on("vad", on_vad)  # Pass function itself, Do Not Write on_vad().
# When no longer needed: 
# audio.on("vad", None)
```

`on()` is only a registration processing function, which does not activate microphones, play or automatically rotate. `deinit()` will clear the callback and re-register once re-introduced.

### poll: advance state and dispatch events

```python
audio.poll()
```

A call takes out a lower-level notification, checks play/ audio sessions, and puts the event in the Python event queue; when you register a callback, you will also call it in sync. When the callback is finished, `poll()` will continue and return.

The main cycle can be called every 5-20 ms, which is an application organization proposal, not a hard real-time guarantee. The current event audio recording is 60 ms per piece, with a maximum of one `poll()` per piece delivered, so it should be more frequently repeated than the data generated to avoid backlogs. The time interval does not change the audio sampling rate or the time of the data block.

Return values are ** lower-level notifications** taken from this time, not counting all session events or calling back. Returning 0 may still result in an end-of-play or audio-recording event; normal applications need not rely on the return value.

### get_event: read events explicitly

```python
event = audio.get_event()
```

Returns and removes the earliest notification in the Python Queue of Events; returns `None` when there is no incident, and does not wait.** It does not question itself** and usually calls `poll()` and then picks up the incident by article.

The following clips are suitable for the application main cycle that has already started playing, demonstrating that no return calls are registered, and that the main loop is processing the end notice:

```python
audio.poll()
event = audio.get_event()
while event is not None:
    if event["type"] == "play_end":
        print("Play End: ", event["data"]["reason"])
    event = audio.get_event()
```

`get_event()` Reads the event queue, `session.read()` reads the audio data in queue mode, and do not confuse the two.

### wait_event: wait for a specific event

```text
audio.wait_event(type=None, timeout_ms=None, /)
```

| Parameters | Default | Meaning |
| --- | --- | --- |
| `type` | `None` | Accept arbitrary events; waiting for this type to specify the name of events |
| `timeout_ms` | `None` | long, in milliseconds; `None` / negative infinity, 0 only check the results of the current round of inquiry, positive number waiting |

Parameter enters by location. The internals will continue to poll and return to the dictionary after matching events and remove them from queue; timeout returns `None`, does not match typeevent. Even if only waiting `play_end`Other types of registered callback in the Poll process may also be enforced.

```python
# Start playing, And apply to allow temporary waiting.
event = audio.wait_event("play_end", 500)
if event is not None:
    print(event["data"]["reason"])
```

Applying the current execution process during the waiting period will stop at this call. When you need to draw or respond to a button on a continuous basis, use `poll()` in your own cycle, instead of waiting for events for a long time. This interface matches by type and does not filter by session ID; on return you can check if `session_id` is a current session.


### Boundaries and event routing

- ** Incidents will not automatically move out of line as a result of a callback execution. ** Incidents that perform a callback can still be retrieved `get_event()`, but will not be automatically called back again. Both ways can be used to avoid duplicates of business with the same notification; events that are no longer required can be removed and audio data references released in a timely manner.
- ** Not all calls are performed only in the visible `poll()`.** Some interfaces such as `wait_event()`, `drain()` will rotate internally; cancellations, stops, and replacements will directly result in an end event, which may be performed before the corresponding method returns.
- ** The callback is kept short.** The callback does not return to the questioner, waits for the end of the same session or re-establishes the audio service. The callback anomaly is transmitted to the current caller; the direct registration `async def` function does not automatically wait for its co-operation to execute.
- ** The end of the recording needs to be handled proactively. ** The current event mode will not continue to empty the remaining data from the event after `stop()`; the queue mode needs to be used when retaining the end, as detailed in [Stop, keep the tail and release](./recording#停止、保留尾部与释放).
- ** The end-of-play notice is not an exact hardware play location.** The current completion is judged by queue and play progress, as detailed at [End of play and wait](./playback#结束、等待、取消).
- ** Incident cache is limited. ** The list of lower-level notifications and Python events currently stands at a maximum of 64 each, discarding the oldest item at full time. This is a reference for checking the backlog and should not be used as a non-destructive storage option.

## stats: inspect runtime state

```python
info = audio.stats()
playback_depth, decode_depth = audio.get_playback_queue_depths()
```

`stats()` returns the dictionary:

| Fields | Meaning |
| --- | --- |
| `output_volume`, `input_gain` | Current Configuration |
| `idle` | Whether several task force columns at the bottom are empty; not accurate proof that the speaker is silent |
| `playback_count` | Number of PCM blocks exported, not sample numbers or milliseconds played |
| `playback_depth` | Number of normal PCM data blocks to play |
| `decode_depth` | To decode Opus packages |
| `event_dropped` | Discards in the bottom bridge event queue; excluding Python queues |
| `active_play`, `active_record` | Only when there is a corresponding object; contains `id` and `state` |

`get_playback_queue_depths()` returns the binary group at the above two depths. The queue length does not contain audio packages that have been removed, are being decoded, or PCM data blocks that are being exported, nor does it contain the MicroPyxel queue, and therefore cannot be used separately to determine the exact playout end.
