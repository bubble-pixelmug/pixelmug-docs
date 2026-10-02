# Audio Service

Audio Service is a bottom audio service for PixelMug S1 Pro. PixelMug S1 Lite version does not have an audio system. If you want to develop sound-related applications, confirm the use of Pro products. Use loudspeakers, microphones, Opus decoding and spectrum analysis through `audio_service` components. It also provides an output channel for [MicroPyxel sound synthesis](/en/device/micropyxel/audio).


## Core object and its relationship

```python
import audio_service
audio = audio_service.audio
```

`audio` is a single case. `audio.player(...)`, `audio.recorder(...)` and `audio.spectrum_analyzer(...)` create objects using the same bottom-up service, not independent audio devices.

- `Player` Defined format; `play()` or `open_stream()` returns `PlaySession` for one play.
- `Recorder` Defines the read format; `start()` returns `RecordSession` for one recording.
- `SpectrumAnalyzer` Configure shared PCM observation buffer and spectrum analysis.

At the same time, only one event is managed to play a session and one audio session of the event. The new play is `replace`, which replaces the old play; the recording needs to finish the old session before beginning. Do not mix multiple tracks by creating multiple objects.

## How audio flows through the service

```text
The microphone. → 16 kHz PCM → AFE Voice processing → PCM 帧 → Python Sound recordings
                                           └→ Opus Encode → Python Sound recordings

Python PCM ───────────────────────→ Play Queue → Speaker
Python Opus 包 → 48 kHz Mono-channel decode ────┘
MicroPyxel Synth 48 kHz PCM Sound → Independent queue ───────┘

Enter PCM / Output PCM → Optional observation buffer → FFT → Python Spectrum Snapshot
```

MicroPyxel uses different queues for regular PCM/Opus, and two-way audio processing can run simultaneously, but shares the same audio output channel, which currently does not support two-way mix. MicroPyxel is taken first from the normal audio queue when the normal group is listed as empty; the data block that has already started is played out. The MicroPyxel queue may fill the normal audio out of the output, so that the subsequent synthesis data can be submitted in an empty slot; and the voice of MicroPyxel may be inserted in the general column when there is a gap, causing delay or interruption.

** It is strongly recommended that only one play should be used at the same time.** When playing PCM/Opus, if MicroPyxel is used only for drawing, use `pyxel.init(start_audio=False)` to avoid the need to start a synthesis of voices.

## Built-in AFE for recording preprocessing

AFE (Audio Front End, front end of audio) is a process that follows the microphone and before the audio is used to read the audio. The current component uses the AFE of ESP-SR for voice-to-people processing, which opens the VAD and NS models:

| Capacity | Role | How to Apply |
| --- | --- | --- |
| VAD (Voice Activity Development, Voice Action Testing) | To judge whether the input is speaking state; to judge only if there is a voice, not what is said, who is talking, not a wake-up call. | Use `audio.on("vad", callback)` Read in Callback when the voice changes `event["data"]["speaking"]`: `True` I'm not sure if I'm talking to you.`False` denotes a non-speak state. Callback triggers by calling audio.poll() on a continuous basis |
| NS (Noise Superression, Noise Repression) | Minimize background noise in the recording and make it clearer; not ensure that all noise is completely eliminated | The current solid contains the NSNet2 model, which automatically reduces noise after the start of the recording; the data is read as processed, without additional opening or block-by-block call and without a separate NS event |


**VAD notification does not automatically stop recording or automatically discard data from non-spoken periods.** Currently, it is achieved that speaking-state notifications and audio-data output are separated: even if `speaking=False` the audio data should be read in time.


### Usage notes
- The DTX for Opus is the coding device that reduces the amount of coded data when it is quiet, and the VAD status notification, the NS noise-mitigation, are different functions and cannot replace one another.
- The current Python interface does not have a single switch VAD/ NS, changes the VAD mode, or adjusts the method of non-spoken determination of the length or switching of the model. The volume and input gain of `audio.configure()` do not change these settings.
- VAD only reports when the state changes are detected, not once for every block of recorded data; failure to return when the silence continues may not be unusual.
- NS for voice, which may change the sound details of sound recordings; do not treat sound recordings exported through AFE as raw microphone data that are completely unprocessed.
- Starting preheating, AFE buffers, data segment and Python rounds affect the timing of data or notification; 60 ms data block, 100 ms non-speak determination configuration does not equal the end-to-end delay.
- Only VAD is concerned with the timely consumption of recorded data, so that the recording line is not filled to keep the front collection and processing waiting.

## Support format and resource allocation

| Item | Current Achieved |
| --- | --- |
| Play PCM | The output is fixed to **48 kHz**, requiring data for mono-channels, marked 16 bits, small-ends, without file headers.** The PCM does not automatically repeat sampling**, changes `sample_rate` for Player, and does not change the hardware output sampling rate. The PCM that directly plays other sampling rates changes the speed and tone of the play: Accelerating, acoustics higher than 48 kHz, and absing and acoustics lower; the sample should be retested first to 48 kHz |
| Audio PCM | Sampling rate 16 KHz, monochannel, symbol 16 bits, small end; currently 60 ms data per frame are collected for application, i.e. 960 samples / 1,920 bytes |
| Audio Opus | Sample rate 16 kHz, mono-channel, 60 ms per package; use human-oriented coding model, use minimum coding complexity to reduce CPU costs and lower encoded data volume (DTX) when silent |
| Playback Opus | General Single Stream Received Opus**Full Audio Package**, which supports mono- and ordinary bi-channels (mixed into mono-channels when decoded) and which does not support multi-channel multiistreams. Opus of different source sampling rates (e.g. by 16 kHz or 48 kHz audio encoding) is directly decoded **48 kHz MonoPCM**, no application self-resulting is required, and no playback speed or tone is changed depending on the source sample rate; Player `sample_rate` You must have 48000 (default) and the other values will be misreported. Each time you write a complete package, you have to write a full package.`frame_ms` It should not be less than the actual total length of the package; it is recommended to use a fixed 20/40/60 ms package. OGG files must first remove the Opus audio package, not be able to directly transmit the entire file or any part of the file or support the OGG Vorbis |
| Spectrum Default | 512 points FFT, 16 kHz frequency ruler, 50 fps; for speaker analysis read 48 kHz |
| PCM Observation Buffer | Default 64,000 samples per road, approximately 128 KB; distributed as needed when corresponding dump is opened |

Opus lines retain a branch “resampling when the decoded sampling rate does not match the hardware output sampling rate”; both are currently 48 kHz, so they usually directly output decoded results without additional re-samping. This is different from the path of the original PCM, which does not automatically retrace the sample. More package formats and frame length limits are [Play Audio](./playback).

## Background playback and Python polling

I2S, decode and FFT are executed backstage. The Python side still needs to call `audio.poll()` on a regular basis to distribute events and update session end state. Read `session.state()` only.

The main cycle can be rotated every 5-20 ms; this is an application organization proposal, not a hard real-time guarantee. Use `asyncio` with `await asyncio.sleep_ms(...)` to give it up. Do not ask for a long time in the audio loop or wait for the end of the same session.

The program was in the program when it exited. `finally` Medium `audio.deinit()`. If MicroPyxel is used to synthesize the sound, stop the sound and `pyxel.destroy()`Audio Service was finally released.

## Performance and Limits

### Behavior to account for

Plays the audio in bits, continues writing, and avoids loading the entire song at a time. 48 kHz, mono-channel, and 16-bit PCMs are about 96,000 bytes per second.

When the playlist is full, `session.write(..., wait=True)` will wait for an empty slot; `wait=False` will throw `EAGAIN` and the application should keep the current data and try again later. Writing success only means that the data is in line and not that the play has been played. Sound recordings will also need to be read in time, and time-consuming or back-to-back may cause the sound line to wait, causing a karton or delay.

### Built-in queue capacity reference

These values need not be relied upon for ordinary applications; they can be referenced in the screening of Cardon, memory occupancy and delay.

| Internal forces | Current capacity and meaning |
| --- | --- |
| Normal PCM Play Queue | A maximum of 4 pieces of PCM data to be played; each size is determined by the submitted data, so total bytes and audio are not fixed |
| MicroPyxel Queue | A maximum of 4 pieces of synthetic PCM data to be played cached; possible backlog of ordinary audio continuously occupied output |
| Opus to decode queue | Up to 40 complete packages; approximately 2.4 seconds for each package of 60 ms, with the corresponding cache times for other packages |
| Sound PCM Output Queue | Cache PCM data processed prior to voice, supply direct reading or handing over to the Opus encoder; currently up to 2 data blocks caches. Later reading or encoding will keep the production line waiting |
| Audio Opus Output Queue | Up to 40 packages; coding and upstream line waiting when application is slow to read |

The capacity is based on a queued data block or package, which does not contain the data that has been removed and is being processed. The queue depth does not directly represent total memory occupancy or end-to-end delay, nor can it be used separately to judge that the sound has been played. The playout status check can be combined with [Stats() & Depth with queue](./controller), and the memory and calculation costs of the spectrum can be [Spectrum analysis](./spectrum#计算量与刷新限制).


## Where to start

| Document | Contents |
| --- | --- |
| [初始化与事件](./controller) | Service Switches, Volume, Rotation, Retrieval, Operation |
| [播放音频](./playback) | Legitimate audio format, PCM, Opus, flow writing, closing and cancellation |
| [录音](./recording) | PCM / Opus Collection, Frame Data, VAD, Stop and Clear |
| [频谱分析](./spectrum) | Input / Output spectral, 16-part column diagram, FFT, PPM observation buffer |
