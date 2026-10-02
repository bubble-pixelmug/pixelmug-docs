# 提示音播放器

<code>pyxel_prompt_sound</code> 是建立在 [Audio Service](/device/audio/) 之上的轻量提示音播放器。它读取 Ogg Opus 文件，将其中的 Opus 音频包分批提交给 Audio Service，适合按键反馈、状态切换、成功或错误提醒等较短的声音。

虽然模块名带有 <code>pyxel</code>，源码本身并不依赖 MicroPyxel。普通 MPY 程序也可以使用；在 MicroPyxel 应用中，只需把播放器的 <code>update()</code> 放进画面更新循环。

~~~text
Ogg Opus 文件
      ↓
解析 Ogg 页面并还原完整 Opus 包
      ↓
开始时预提交少量音频包
      ↓
应用循环持续调用 update()
      ↓
Audio Service 解码并输出到扬声器
~~~

该模块负责文件读取、Ogg 拆包、缓存和分批提交。Opus 解码、输出队列和扬声器播放仍由 Audio Service 完成。它不是通用音乐播放器，也不是完整的 Ogg 媒体框架。

## 使用前的准备

### 声明组件依赖

在 <code>mpy/mps.json</code> 中声明 <code>audio_service</code>：

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

<code>pyxel_prompt_sound</code> 是系统内置的 Python 模块，无需在 <code>mps.json</code> 中单独声明。

### 准备声音资源

建议把声音放在 <code>mpy/assets/</code> 中：

~~~text
mpy/
├── __main__.py
├── mps.json
└── assets/
    ├── click.ogg
    ├── success.ogg
    └── error.ogg
~~~

当前播放器接受 **Ogg 容器中的 Opus 音频**。文件必须包含 <code>OpusHead</code>、<code>OpusTags</code> 和完整的 Opus 音频包。它不支持 Ogg Vorbis，也不能把 MP3、WAV 或原始 PCM 当作提示音文件播放。

默认配置按每个 Opus 包 60 ms 创建播放流。建议把提示音转换为 48 kHz、单声道、固定 60 ms 包：

~~~bash
ffmpeg -i input.wav -ar 48000 -ac 1 -c:a libopus -frame_duration 60 output.ogg
~~~

可以使用以下命令检查资源：

~~~bash
ffprobe -hide_banner output.ogg
~~~

当前实现读取 <code>OpusHead</code> 中的输入采样率，并把它传给 Audio Service；Audio Service 的 Opus 播放接口要求该参数为 48000。因此当前提示音资源的 <code>OpusHead</code> 输入采样率字段也应为 48000，否则 <code>play()</code> 会因为无法创建播放器而返回 <code>False</code>。

## 最小示例

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
        print("提示音播放失败：", sound.last_error)

    while sound.is_playing():
        sound.update()
        time.sleep_ms(10)
finally:
    sound.deinit()
    audio.deinit()
~~~

使用 MicroPyxel 时，把 <code>sound.update()</code> 放在应用的 <code>update()</code> 中。应用只用 Audio Service 播放提示音时，建议关闭不需要的 MicroPyxel 合成声音：

~~~python
pyxel.init(start_audio=False)

def update(rt):
    sound.update()
~~~

## 创建播放器

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

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| <code>audio</code> | <code>None</code> | Audio Service 控制器；省略时导入并使用 <code>audio_service.audio</code> |
| <code>asset_root</code> | <code>"assets"</code> | 简单文件名的资源根目录；设为空字符串可关闭自动拼接 |
| <code>debug</code> | <code>False</code> | 是否输出读取、提交、重试和结束过程的调试日志 |
| <code>log_prefix</code> | <code>"[PromptSound]"</code> | 调试日志前缀 |
| <code>prime_packets</code> | <code>8</code> | <code>play()</code> 开始时预提交的音频包数量 |
| <code>packets_per_update</code> | <code>4</code> | 每次 <code>update()</code> 默认最多提交的音频包数量 |
| <code>drain_timeout_ms</code> | <code>8000</code> | 文件读完后等待已提交声音播放完毕的最长时间 |
| <code>eagain_sleep_ms</code> | <code>3</code> | 输出队列暂时不可写时，两次尝试之间的等待时间 |
| <code>eagain_retries_per_packet</code> | <code>3</code> | 一个音频包在同一次更新中的最多尝试次数 |
| <code>stop_handler</code> | <code>None</code> | <code>stop()</code> 和打断播放时调用的函数，接收当前播放器作为参数 |
| <code>frame_duration_ms</code> | <code>60</code> | 传给 Audio Service Opus 播放器的包时长 |

一般只需要设置 <code>audio</code>、<code>asset_root</code> 和 <code>stop_handler</code>。其余参数用于延迟、内存和画面更新时间的调优。

创建 <code>PromptSoundPlayer</code> 不会初始化 Audio Service。第一次播放前，应用必须开启音频输出和 Opus 解码器。

## 播放提示音

### <code>play(path, interrupt=False)</code>

开始播放一个 Ogg Opus 文件，返回 <code>True</code> 或 <code>False</code>。

~~~python
ok = sound.play("success.ogg")
~~~

路径的处理规则如下：

- <code>"success.ogg"</code> 不含目录分隔符，会解析为 <code>assets/success.ogg</code>。
- <code>"sounds/success.ogg"</code> 或绝对路径包含目录分隔符，将按原路径使用。
- <code>asset_root</code> 为空时，所有路径都按原值使用。

<code>play()</code> 会同步完成以下工作：

1. 打开文件并找到第一个 Opus 音频包。
2. 创建 <code>mode="replace"</code> 的 Audio Service 流式播放会话。
3. 预提交最多 <code>prime_packets</code> 个包，默认是 8 个。

因此 <code>play()</code> 不是完全无阻塞的，但不会把整个文件一次读进内存。返回 <code>True</code> 表示播放已经成功启动，不表示声音已经播放完成。

当前实例正在播放时：

- <code>interrupt=False</code>：不打断当前声音，返回 <code>False</code>。
- <code>interrupt=True</code>：先调用 <code>stop()</code>；只有 <code>stop_handler</code> 存在且返回真值，才开始新声音。

最简单的打断策略是立即取消当前会话：

~~~python
sound = PromptSoundPlayer(
    audio=audio,
    stop_handler=lambda player: player.cancel(),
)

sound.play("error.ogg", interrupt=True)
~~~

文件不存在、找不到 Opus 音频包、资源参数不兼容或无法创建 Audio Service 会话时，方法返回 <code>False</code>，具体异常保存在 <code>last_error</code>。

### <code>play_theme(theme, kind, pattern="%s-%s.ogg", interrupt=False)</code>

按主题和类型拼接文件名，再调用 <code>play()</code>：

~~~python
sound.play_theme("game", "success")
# 等价于 sound.play("game-success.ogg")

sound.play_theme("game", "success", pattern="%s/%s.ogg")
# 播放 game/success.ogg
~~~

第二个路径中包含 <code>/</code>，因此不会再拼接 <code>asset_root</code>。该方法只是文件名快捷方式，不会检查主题或类型是否合法。

## 用 <code>update()</code> 驱动播放

### <code>update(budget_packets=None)</code>

播放期间必须持续调用 <code>update()</code>。它负责：

- 调用 <code>audio.poll()</code> 推进 Audio Service 状态。
- 从文件或缓存取得后续 Opus 包。
- 每次最多提交指定数量的包。
- 输出队列暂时已满时保留当前包，下一次继续提交。
- 文件读完后调用会话的 <code>end()</code>。
- 等待已提交的数据播放完毕，再把播放器标记为空闲。

<code>budget_packets</code> 省略时使用构造参数 <code>packets_per_update</code>，默认是 4。

~~~python
def update(rt):
    sound.update()
~~~

调用间隔过长或每次提交的包太少，可能来不及补充播放数据，造成声音断续。预算过大则可能让一次应用更新花费更长时间。对短提示音，建议先使用默认值，再根据实际帧率和声音连续性调整。

文件读取结束后，播放器进入排空阶段。此时 <code>is_playing()</code> 仍然返回 <code>True</code>，直到 Audio Service 报告会话为 <code>ended</code>、<code>canceled</code> 或 <code>error</code>。排空超过 <code>drain_timeout_ms</code> 时，组件会取消播放。

## 状态、停止与清理

### <code>is_playing()</code>

当前播放器尚未结束时返回 <code>True</code>。它涵盖文件读取、音频包提交和排空阶段。

### <code>stop()</code>

调用构造播放器时传入的 <code>stop_handler(self)</code>，并把回调结果转换为布尔值返回。

- 没有 <code>stop_handler</code> 时返回 <code>False</code>，不会停止播放。
- 回调抛出异常时返回 <code>False</code>，异常保存到 <code>last_error</code>。
- 组件不规定回调必须如何停止；应用可以直接调用 <code>cancel()</code>，也可以先处理自己的播放状态。

### <code>cancel()</code>

立即调用当前会话的 <code>cancel()</code>，关闭文件并清空本次播放状态，返回 <code>True</code>。已经写入 Audio Service 的声音会被取消，不再等待自然排空。

### <code>deinit()</code>

取消并清理当前播放器，返回 <code>None</code>。它不会调用 <code>audio.deinit()</code>；Audio Service 仍由创建和初始化它的应用负责释放。

推荐退出顺序：

~~~python
sound.deinit()
audio.deinit()
~~~

如果同时使用 MicroPyxel，应先停止声音并销毁 MicroPyxel，再释放 Audio Service。

## 预加载与缓存

默认播放从文件中逐步读取，不需要把整个声音加载到堆内存。经常重复使用的小提示音可以预加载：

~~~python
sound.preload("click.ogg")
sound.preload_many(("success.ogg", "error.ogg"))
~~~

预加载会把解析后的**压缩 Opus 包**保存到 Python 堆中，不会缓存解码后的 PCM。它减少播放时的文件读取和 Ogg 拆包开销，但会持续占用内存。

### <code>preload(path)</code>

读取并缓存一个文件。成功或已经缓存时返回 <code>True</code>；失败时返回 <code>False</code>，异常记录在 <code>last_error</code>。

### <code>preload_many(paths)</code>

依次预加载多个路径。方法会尝试处理全部路径；只要其中一个失败，最终返回 <code>False</code>。之前成功加载的缓存不会回滚。

### <code>is_cached(path)</code>

路径已经缓存时返回 <code>True</code>。路径会按与 <code>play()</code> 相同的规则解析。

### <code>unload(path)</code>

删除指定缓存。确实删除时返回 <code>True</code>，路径原本不在缓存中时返回 <code>False</code>。

### <code>clear_cache()</code>

清空当前实例的全部缓存，返回 <code>None</code>。正在播放的缓存已经由当前读取器持有；清理缓存主要影响后续播放。

### <code>cache_info()</code>

返回每个缓存文件的 Opus 包数量和压缩数据字节数：

~~~python
print(sound.cache_info())

# {
#     "assets/click.ogg": {
#         "packets": 8,
#         "bytes": 1254,
#     }
# }
~~~

<code>bytes</code> 只累计 Opus 包的数据长度，不包含列表、元组、路径字符串和 Python 对象本身的内存开销，因此不是缓存占用堆内存的精确总量。

## 错误处理与调试

播放器主要通过返回值报告操作是否成功，最近一次捕获的异常保存在公开属性 <code>last_error</code>：

~~~python
if not sound.play("click.ogg"):
    print("提示音播放失败：", sound.last_error)
~~~

开发阶段可以开启日志：

~~~python
sound = PromptSoundPlayer(
    audio=audio,
    debug=True,
    log_prefix="[MySound]",
)
~~~

日志会显示文件路径、首包长度、采样率、提交数量、队列暂时不可写、排空状态和最终结果。常见失败原因包括：

- 文件不存在或路径错误。
- 文件不是 Ogg Opus。
- 文件中没有 <code>OpusHead</code>、<code>OpusTags</code> 或音频包。
- <code>OpusHead</code> 中的输入采样率字段不是 48000。
- Audio Service 尚未初始化，或没有启用 Opus 解码器。
- 播放中再次调用 <code>play()</code>，但没有允许打断或没有配置 <code>stop_handler</code>。

<code>last_error</code> 不是完整的事件历史。<code>play()</code> 开始时会清空它；部分其他成功操作不会主动清除之前保存的异常，因此应结合当前方法的返回值判断结果。

## 性能与当前限制

- 必须在应用循环中持续调用 <code>update()</code>；该模块不会创建独立的 Python 后台任务。
- <code>play()</code> 默认同步预提交 8 个包。预提交使用等待写入，以降低刚开始播放时缺少数据的概率，也可能短暂占用调用线程。
- 后续提交采用非等待写入。队列暂时不可写时，每个包默认最多尝试 3 次，每次相隔 3 ms；仍不可写时留到下一次 <code>update()</code>。
- 预加载缓存的是压缩包，可以减少存储访问，但会增加 MicroPython 堆内存占用。只预加载短小且频繁使用的声音。
- 轻量 Ogg 读取器会处理页面分段和跨页延续的音频包，但不校验 Ogg CRC，也不实现时间轴定位、随机跳转、链式 Ogg 或多逻辑流选择。
- 播放会话固定使用 <code>mode="replace"</code>。Audio Service 同一时刻只管理一个活动播放会话，新会话会替换旧会话。
- 该组件适合短提示音和短音效。长音乐、大型录音、进度跳转和播放列表应由应用使用 Audio Service 流式接口自行管理。
- 普通 PCM／Opus 播放与 MicroPyxel 合成声音共享输出资源，但当前不进行两路混音。应用同一时间最好只采用一种声音播放方式。

## 与 Audio Service 的关系

提示音播放器简化了 Ogg Opus 文件的播放，但不会替代 Audio Service。需要播放 PCM、自己管理 Opus 包、录音、VAD 或频谱分析时，请直接使用对应接口：

- [Audio Service 总览](/device/audio/)
- [播放音频](/device/audio/playback)
- [初始化与事件](/device/audio/controller)