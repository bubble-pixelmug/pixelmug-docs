# 声音播放

MicroPyxel 根据音符、音色和音乐序列合成声音，再把 PCM 送到设备 Audio Service。`play()` 的字符串参数是 MML 乐谱，不是 OGG/WAV 文件路径。

## 先启用 Audio Service

顺序必须是：**Audio Service 初始化输出 → MicroPyxel 首次初始化时启用声音 → 设置资源 → 播放**。

下面是完整的短音阶示例，不需要素材文件。

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

音频渲染在后台任务中运行，不依赖 `pyxel.run()` 或显示刷新。Python 主程序仍需保持运行，退出后清理；上例持续等待 1 秒以便听完音阶。

`init(start_audio=True)` 不是 Audio Service 初始化的替代。它获取已有服务；服务不存在时底层可能不启动音频任务，也不会通过 `init()` 的布尔返回值告知完整音频状态。

不要在已 `init(start_audio=False)` 后再次 `init(True)`：不仅位置参数写法不合法，重复初始化本身也不会把音频补开。

## `play()`

```text
play(channel, snd, sec=None, should_loop=None, should_resume=None, tick=None)
```

前两项为必填位置参数；后四项可用位置或关键字。返回 `None`。

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `channel` | 必填 | 通道整数，0..3 |
| `snd` | 必填 | Sound 资源编号、全局 Sound 对象、同类元素的 list/tuple，或 MML 字符串 |
| `sec` | `None` | 从播放序列中的指定秒数开始；默认从头，非正值按 0 |
| `should_loop` | `None` → False | 是否循环播放当前序列 |
| `should_resume` | `None` → False | 临时播放完成后恢复此通道先前的序列 |
| `tick` | `None` | 已弃用的起始 tick，按 120 tick/s 换算；传入时优先于 `sec` |

```python
pyxel.play(0, 0)
pyxel.play(0, [0, 1, 2], should_loop=True)
pyxel.play(1, "T120 O4 L8 C E G > C")
pyxel.play(0, 3, should_resume=True)  # 插入一个短音效，之后恢复旧序列
```

序列中的编号必须在 0..63 内。列表中不要混合数字与对象。空列表停止该通道。传入全局 `pyxel.sounds(i)` 对象可用；独立 `pyxel.Sound()` 不在全局资源表中，顶层 `play()` 不接受它，应使用全局通道对象的 `.play()`，见[声音资源](./sound)。

同一通道的新播放默认替换旧播放，不会自动排队。`should_resume` 是插播恢复，不是通用的暂停/继续开关；插播序列若无限循环，就不会自然结束恢复。

## `playm()`

```text
playm(msc, sec=None, should_loop=None, tick=None)
```

`msc` 为必填位置参数，音乐编号 0..7；其余支持关键字，默认值与 `play()` 同义，不提供 `should_resume`。返回 `None`。

音乐包含各通道的 Sound 编号序列，最多播放前 4 个通道。各通道按自己的序列运行和循环，不会为了其他通道等待到统一长度。

```python
pyxel.musics(0).set([0, 1], [2], [], [])
pyxel.stop()
pyxel.playm(0, should_loop=True)
```

`playm()` 对没有内容的通道直接跳过，不保证清掉该通道此前正在播放的内容。希望完整切换音乐时，像上例一样先 `stop()`。

## 停止与位置查询

| 接口 | 参数与返回 |
| --- | --- |
| `stop()` | 停止所有通道，返回 `None` |
| `stop(channel)` | 必填有效通道索引，停止一个通道；不能用 `stop(None)` 代替无参形式 |
| `play_pos(channel)` | 必填通道索引，返回 `None` 或 `(sequence_index, elapsed_sec)` |

`sequence_index` 是当前播放列表中从 0 开始的位置，**不是全局 Sound 编号**；`elapsed_sec` 是当前 Sound 内的播放时间，不是整个音乐的累计时间。

```python
pyxel.play(0, [5, 9])
print(pyxel.play_pos(0))  # 例如 (0, 0.12)：正在播放列表第一项，即 Sound 5
pyxel.stop(0)
```

`stop()` 不退出绘图循环、不销毁声音资源，也不关闭合成线程和 Audio Service。退出动画用 `quit()`；结束组件生命周期用 `destroy()`。

## 缓冲、音量与性能

合成器输出 48 kHz 单声道 16-bit PCM，每块 960 点（20 ms），驱动有 3 个块的池，PCM 数据本身共 5760 B；另有混音缓冲、Audio Service 队列、动态复制和两个后台任务栈。3×20 ms 不是端到端播放延迟保证。

音量有不同层级：Sound 的音符音量、Tone 的增益、Channel 的增益，以及 Audio Service 的输出音量。多个通道叠加或增益过大会产生削波，优先保持默认通道增益，逐步调整输出音量。

纯动画不要启用合成音频。启用后即使没有音符，音频任务仍运行，`stop()` 不能省掉这些任务；它们在 `destroy()` 时停止。合成、解码、网络和绘图共享设备资源，不要在播放过程中频繁解析长 MML、替换大型波表或加载资源。

Audio Service 可能也被应用其他功能使用；上面的 `deinit()` 适用于这个独立示例。共享服务的应用应统一管理初始化与关闭，避免一个功能结束时关闭另一功能仍在使用的输出。
