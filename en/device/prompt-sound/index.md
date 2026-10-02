# Prompt sound player

<code>pyxel prompt sund</code> is a light-heat player based on [Audio Service](/en/device/audio/). It reads the Ogg Opus file, submitting the Opus audio package to AutoService in batches, suitable for shorter sounds such as key-based feedback, state switching, success or error alarms.

Although the module name is <code>pyxel</code>, the source code does not itself depend on MicroPyxel. The normal MPY program is also available; in the MicroPyxel application, only <code>update()</code> from the player is required to enter the video update cycle.

~~~text
Ogg Opus Documentation
      ↓
Parsing Ogg Page and Full Opus 包
      ↓
Pre-submit small audio packages at start
      ↓
Apply loops for continuous call update()
      ↓
Audio Service Decode and output to speaker
~~~

This module is for file reading, Ogg unpacking, cacheing and batching. Opus decoded, output queues and speakers are still performed by AutoService. It is not a universal music player, nor is it a complete Ogg media framework.

## Prepare to use the component

### Declare the component dependency

In <code>mpy/mps.json</code>, declare <code>audio service</code>:

~~~json
{
  "dependencies": [
    {
      "name": "audio_service",
      "version": ">=1.0.0"
    }
  ]
}
~~~

<code>pyxel_prompt_sound</code> Python module in the system, not required <code>mps.json</code> is a separate declaration.

### Prepare audio assets

It is suggested that the sound be placed in <code>py/assets/</code>:

~~~text
mpy/
├── __main__.py
├── mps.json
└── assets/
    ├── click.ogg
    ├── success.ogg
    └── error.ogg
~~~

The current player accepts **Opus audio** in Ogg container. The file must contain <code>Opushead</code>, <code>OpusTags</code> and the complete Opus audio package. It does not support Ogg Vorbis, nor can it play MP3, WAV or the original PCM as a sound file.

The default configuration creates a playstream for each Opus package 60 ms. It is recommended to convert the tone to 48 kHz, one channel, fixed 60 ms package:

~~~bash
ffmpeg -i input.wav -ar 48000 -ac 1 -c:a libopus -frame_duration 60 output.ogg
~~~

The following commands can be used to check the resources:

~~~bash
ffprobe -hide_banner output.ogg
~~~

The current input sampling rate in <code>Opushead</code> is read and passed to Audio Service; the Opus player interface for Audio Service requires 48000. Therefore, the current tone resource <code>Opushead</code> should also enter the sample rate field 48000, otherwise <code>play()</code> returns <code>False</code> because it cannot create the player.

## Minimal Example

~~~python
import time
import audio_service
from pyxel_prompt_sound import PromptSoundPlayer


audio = audio_service.audio
audio.init(
    enable_input=False,
    enable_output=True,
    with_opus_encoder=False,
    with_opus_decoder=True,
)
audio.configure(output_volume=100)

sound = PromptSoundPlayer(
    audio=audio,
    asset_root="assets",
    stop_handler=lambda player: player.cancel(),
)

try:
    if not sound.play("success.ogg"):
        print("The beep failed: ", sound.last_error)

    while sound.is_playing():
        sound.update()
        time.sleep_ms(10)
finally:
    sound.deinit()
    audio.deinit()
~~~

When using MicroPyxel, place <code> sound.update()</code> in the applicable <code>update()</code>. When applying only Audio Service, it is recommended to close the missing MicroPyxel synthesis:

~~~python
pyxel.init(start_audio=False)

def update(rt):
    sound.update()
~~~

## Create Player

~~~python
PromptSoundPlayer(
    audio=None,
    asset_root="assets",
    debug=False,
    log_prefix="[PromptSound]",
    prime_packets=8,
    packets_per_update=4,
    drain_timeout_ms=8000,
    eagain_sleep_ms=3,
    eagain_retries_per_packet=3,
    stop_handler=None,
    frame_duration_ms=60,
)
~~~

| Parameters | Default value | Annotations |
| --- | --- | --- |
| <code>audio</code> | <code>None</code> | Audio Service controller; import and use <code>udio service.udio</code> when omitted |
| <code>asset_root</code> | <code>"assets"</code> | resource root directory for simple filenames; setting empty strings to close automatic fusion |
| <code>debug</code> | <code>False</code> | Whether or not to output debugging logs for reading, submitting, retrying and ending processes |
| <code>log_prefix</code> | <code>"[PromptSound]"</code> | Debug Log Prefix |
| <code>prime_packets</code> | <code>8</code> | <code>play()</code> Number of audio packages pre-submitted at start |
| <code>packets_per_update</code> | <code>4</code> | Default maximum number of audio packages submitted per <code>update()</code> |
| <code>drain_timeout_ms</code> | <code>8000</code> | The maximum time after the document has been read and the sound has been submitted for play |
| <code>eagain_sleep_ms</code> | <code>3</code> | Waiting time between two attempts when the output queue is temporarily unwritten |
| <code>eagain_retries_per_packet</code> | <code>3</code> | Maximum number of attempts of an audio package in the same update |
| <code>stop_handler</code> | <code>None</code> | <code>stop()</code> and interrupt the call on playtime to receive the current player as parameter |
| <code>frame_duration_ms</code> | <code>60</code> | Length of the package to the Audio Service Opus player |

Only <code>audio</code>, <code>asset root</code> and <code>stop handler</code> are generally required. The rest of the parameters are used to facilitate delay, memory and image update times.

Create <code>PromptSundPlayer</code> does not initialize Audio Service. Apply the audio output and Opus decodator before the first play.

## Play a prompt sound

### <code>play(path, interrupt=False)</code>

Starts playing an Ogg Opus file, returns <code>True</code> or <code>False</code>.

~~~python
ok = sound.play("success.ogg")
~~~

The path is handled according to the following rules:

- <code> "subsession.ogg"</code>, which does not contain a catalog separator, will be interpreted as <code>assets/subaccess.ogg</code>.
- <code>sounds/subaccess.ogg"</code> or absolute path contains a directory separator, which will be used as the original path.
- <code>asset root</code> is empty and all paths are used at original values.

<code>play()</code> will do the following simultaneously:

1. Opens the file and finds the first Opus audio package.
2. Creates <code>mode= "replace"</code> an Audio Service streaming session.
3. The pre-submission of up to <code> package packets</code> is 8 by default.

So <code>play()</code> is not completely unstoppable, but does not read the entire document into memory at once. returns <code>True</code> to indicate that the play has been successfully started and does not mean that the sound has been played.

Current instance playing:

- <code>interrupt=False</code>: do not interrupt the current sound, return <code>False</code>.
- <code>interrupt=True</code>: First call <code>stop()</code>; only if <code>stop handler</code> exists and returns the true value will a new sound begin.

The simplest strategy for interrupting is to cancel the current session immediately:

~~~python
sound = PromptSoundPlayer(
    audio=audio,
    stop_handler=lambda player: player.cancel(),
)

sound.play("error.ogg", interrupt=True)
~~~

The method returns <code>False</code> when the file does not exist, no Opus audio package is found, resource parameters are incompatible or cannot be created for the Audio Service session, with the specific anomaly saved at <code>last error</code>.

### <code>play_theme(theme, kind, pattern="%s-%s.ogg", interrupt=False)</code>

Collapse file names by theme and type and call <code>play() </code>:

~~~python
sound.play_theme("game", "success")
# Equivalent sound.play("game-success.ogg")

sound.play_theme("game", "success", pattern="%s/%s.ogg")
# Play game/success.ogg
~~~

The second path consists of <code>/ </code>, so it will no longer be adhesived <code>asset root</code>. This method is only a quick file name and does not check the validity of the subject or type.

## Play with <code>update()</code>

### <code>update(budget_packets=None)</code>

The call must be made on a continuous basis during the playtime <code>update() </code>. It is responsible for:

- Call <code>udio.polll()</code> to advance the Audio Service status.
- Get a follow-up Opus package from the file or cache.
- A maximum of a specified number of packages per submission.
- Keeps the current package when the output queue is temporarily full and continues with the next submission.
- After the document is read, call the session <code>end() </code>.
- Waits for the submitted data to be played and then the player will be marked free.

<code>budget packets</code> use the construction parameter <code>packets per update</code> when omitted. Default is 4.

~~~python
def update(rt):
    sound.update()
~~~

Too long or too few packages are submitted, which may not be able to add to the playback data, resulting in sound disruptions. Overbudgeting may take longer for an application to be updated. For a short tone, it is suggested that the default value be used before adjustments are made to the actual frame rate and to the sound continuity.

Playback is empty after the file is read. <code>is_playing()</code> Still return <code>True</code>, until Audio Service report session is <code>ended</code>, <code>canceled</code> or <code>error</code>. Empty more than <code>drain_timeout_ms</code> , the component cancels the playback.

## State, stop, and cleanup

### <code>is_playing()</code>

The current player has not yet returned <code>True</code> at the end. It covers the file reading, audio package submission and emptying phases.

### <code>stop()</code>

Call <code>stop handler(sulf)</code> for transfer to construct player and return the return to a boolean value.

- No <code>stop handler</code> returns <code>False</code>, will not stop playing.
- Return to <code>False</code> when the deviation is out, save the anomaly to <code>last error</code>.
- The component does not specify how the callback must stop; the application can be called directly by <code>cancer()</code> or can process its own play state.

### <code>cancel()</code>

Call <code>cancel()</code> for the current session immediately, close the file and empty this playback and return <code>True</code>. The voice already written to Audio Service will be canceled and no longer waits for natural emptiness.

### <code>deinit()</code>

Cancel and clean the current player and return <code>None</code>. It will not be called <code>audio.deinit()</code>; Audio Service remains responsible for its creation and initialization.

Recommended order of exit:

~~~python
sound.deinit()
audio.deinit()
~~~

If MicroPyxel is used simultaneously, it should stop the sound and destroy MicroPyxel and release Audio Service.

## Preloading and cache

The default plays are read step by step from the file, and the whole sound is not required to be loaded into the memory of the stack. The often-repeated little sound is preloaded:

~~~python
sound.preload("click.ogg")
sound.preload_many(("success.ogg", "error.ogg"))
~~~

Preloads the decompressed ** Opus package** to Python stack, without cacheing the decoding PCM. It reduces the cost of reading files and Ogg unpacking packages while playing, but continues to occupy memory.

### <code>preload(path)</code>

Read and cache a file. Returns <code>True</code> when successful or already cached; returns <code>False</code> when failed. The anomaly is recorded at <code>last error</code>.

### <code>preload_many(paths)</code>

Preload multiple paths in turn. The method will try to process all paths; if one fails, it will eventually return to <code>False</code>. The previously successfully loaded cache will not roll back.

### <code>is_cached(path)</code>

The path returns <code>True</code> when it is cached. The path is parsed by the same rules as <code>play()</code>.

### <code>unload(path)</code>

Deletes the specified cache. The path returns <code>True</code> when indeed deleted, and the path returns <code>False</code> when it was not in the cache.

### <code>clear_cache()</code>

Emptys all caches of the current instance and returns <code>None</code>. The caches that are being played are already held by the current reader; cleaning the cache primarily affects subsequent playouts.

### <code>cache_info()</code>

Returns the number of Opus packages per cache file and the number of compressed data bytes:

~~~python
print(sound.cache_info())

# {
#     "assets/click.ogg": {
#         "packets": 8,
#         "bytes": 1254,
#     }
# }
~~~

<code>bytes</code> only accumulates the data length of the Opus package, does not contain the memory costs of lists, metagroups, path strings and Python objects themselves, and is therefore not the exact total of the cache occupied memory.

## Error handling and debugging

The player reports success mainly through the return value, with the most recently captured anomalies being stored in the open attribute <code>last error</code>:

~~~python
if not sound.play("click.ogg"):
    print("The beep failed: ", sound.last_error)
~~~

The development phase opens the log:

~~~python
sound = PromptSoundPlayer(
    audio=audio,
    debug=True,
    log_prefix="[MySound]",
)
~~~

The log displays the file path, the first package length, the sampling rate, the number of submissions, the queuing that is temporarily unwritten, the emptiness and the end result.

- File does not exist or path error.
- The file is not Ogg Opus.
- There are no <code>Opushead</code>, <code>OpusTags</code> or audio packages.
- The input sample rate field in <code>Openhead</code> is not 48000.
- Audio Service has not been initialized or the Opus decoder is not enabled.
- Recalling <code>play() </code>, but no interruption or configuration <code>stop handler</code> is allowed.

<code>last error</code> is not a complete history of events. <code>play()</code> will be emptied at the beginning; some other successful operations will not proactively remove anomalies that were saved before, and the result should therefore be judged in relation to the return value of the current method.

## Performance and limitations

- The <code>update() </code> must be called on a continuous basis in the application cycle; this module does not create a stand-alone Python backstage task.
- <code>play()</code> Default sync to submit 8 packages. The pre-submission is pending writing to reduce the probability of missing data at the start of the play, and may also temporarily take on the call route.
- The following submission is not to wait for writing. When the queue is temporarily unwritten, each package is defaulted on a maximum of three attempts, with 3 ms each; it is still not available until the next <code>update()</code>.
- Preload caches are compressed packages that reduce storage access, but increase the memory occupancy of the MicroPython stack. Only short and frequently used sound is preloaded.
- Light Ogg Reader handles audio packages that are in between pages and pages, but does not verify Ogg CRC and does not achieve time axial positioning, random jump, chain Ogg or multi-logic flow selection.
- Plays the session <code> Mode= "replace"</code>. Audio Service manages only one active session at the same time. New sessions replace older sessions.
- This component is suitable for short alerts and short sound effects. Long music, large audio recordings, progress jump and playlists should be self-managed using the Audio Service flow interface.
- Normal PCM/Opus plays the output resource with MicroPyxel, but no two-way mix is currently being made. It is best to use only one sound at the same time.

## Relationship to Audio Service

The beeper simplifys the play of Ogg Opus files, but does not replace Audio Service. Use the corresponding interface when playing PCM, managing the Opus package, recording, VAD or spectrum analysis:

- [Audio Service 总览](/en/device/audio/)
- [播放音频](/en/device/audio/playback)
- [初始化与事件](/en/device/audio/controller)
