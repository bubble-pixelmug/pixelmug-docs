# 频谱分析

频谱分析读取输入或输出 PCM 的观察缓冲，在后台计算 FFT。Python 获取最近一次结果用于绘图；它不是播放、录音或完整音频存储接口。

## 创建分析器

```text
analyzer = audio.spectrum_analyzer(
    *, fft_size=None, sample_rate=None, pcm_ringbuf_cap=None
)
```

参数都可省略，且只能按名称传入。表内为省略或 `None` 时的有效值。

| 参数 | 有效默认值 | 要求与用途 |
| --- | --- | --- |
| `fft_size` | `512` | 2 的幂，最小 8，最大有效值 32768；非正数抛 `ValueError`，其他非法 FFT 配置抛 `RuntimeError` |
| `sample_rate` | `16000.0` | 正数，作为频率计算标尺；不进行采样或重采样 |
| `pcm_ringbuf_cap` | 不重新设置容量 | 单位为样本；底层初始容量为每路 64000；显式值必须大于 0，小于 1024 时提升到 1024 |

输入分析使用 16000，输出分析使用 **48000**。使用错误的采样率会导致主频、频段归属错误，即使柱状图仍会动。

```python
analyzer = audio.spectrum_analyzer(
    fft_size=1024, sample_rate=48000, pcm_ringbuf_cap=4096
)
```

容量至少应能容纳一个 FFT 窗口。只有输入 / 输出 dump 都关闭时，底层才允许改变容量；否则记录拒绝日志，但工厂方法不因此抛异常。显式配置容量会重建两路 ring，各占 `容量 × 2` 字节。

所有分析器共享同一套配置、缓冲和后台分析流程。修改 FFT 配置前先 `disable()`，避免运行中的 FFT 访问被调整的资源；不要同时创建多个分析器分析两路声音。

## 选择输入或输出

下面参数均按位置传入。

| 接口 | 返回与行为 |
| --- | --- |
| `enable_dump_input(enabled)` | `True`：按需创建输入 PCM 环形观察缓冲，并清空其中已有数据，允许采集流程向其写入 PCM；`False`：停止向该缓冲写入新数据。不创建新的后台处理，也不启动录音或 FFT；返回 `None` |
| `enable_dump_output(enabled)` | `True`：按需创建输出 PCM 环形观察缓冲，并清空其中已有数据，允许播放流程向其写入 PCM；`False`：停止向该缓冲写入新数据。不创建新的后台处理，也不启动播放或 FFT；返回 `None` |
| `input_dump_enabled()` / `output_dump_enabled()` | 返回 bool |
| `enable_on_pcm(src)` | `1` 为输入、`2` 为输出；其他值抛 ValueError；返回 bool |
| `disable()` | 停止频谱分析，返回 bool；不关闭 dump |
| `set_fps(fps)` | 设置 FFT 计算频率，整数限制到 5～60，底层初始值为 50；返回 None |

### 观察缓冲与 FFT

这两个开关操作的是 **PCM 环形观察缓冲（`PcmRing`）**，不是前面介绍的播放队列或录音 PCM 输出队列。它用于暂存一份音频数据，供 FFT 或应用观察，不改变正常录音 / 播放的数据去向。

`enable_dump_input()` / `enable_dump_output()` 只设置开关、分配和清空缓冲，PCM 由已有的采集 / 播放流程写入。传 `True` 时，对应缓冲不存在才创建；已经存在则复用。每次传 `True` 都清空已有数据。传 `False` 只关闭该路观察，不释放或清空缓冲，也不销毁已经运行的 FFT 后台处理。

FFT 使用观察缓冲中缓存的 PCM：调用 `enable_on_pcm(1)` 或 `enable_on_pcm(2)` 选择已开启的输入 / 输出观察后，底层按需创建后台 FFT 处理，已经运行时复用。每次计算从所选缓冲取出 `fft_size` 个样本到计算缓冲，再执行 FFT；不是直接对 Opus 编码包计算，也不是在 Python 调用 dump 开关时立即计算。

```text
采集流程 → 16 kHz PCM（AFE 处理前）→ 输入观察缓冲 ─┐
                                                 ├→ 选择一路 → 取出 PCM 窗口 → FFT → 频谱结果
播放流程 → 提交输出的 48 kHz PCM → 输出观察缓冲 ──┘
```

输入观察缓冲记录的是送入 AFE 之前的采集 PCM，不能把输入频谱当作 NS 降噪后的录音频谱。输出观察缓冲在一次 PCM 输出调用完成后写入数据；Opus 已先解码为 PCM，MicroPyxel 合成声音实际获得输出时也经过这一路观察。

样本不足一个 FFT 窗口时，等待后续数据再计算；超过一个窗口时，保留最新的 `fft_size` 个样本，丢弃更旧的数据。FFT 读取会消费观察缓冲，所以应用手动读取同一缓冲时会与 FFT 共享数据，不能把它当作无损录音缓存。

先启用对应 dump，再选择来源并启动 FFT：

```python
analyzer.enable_dump_output(True)
analyzer.enable_on_pcm(2)
```

`enable_on_pcm()` 返回 True 不等于已经获得频谱。对应 dump 未启用时不会启动分析；没有音频数据时也不会产生结果。输入分析还需要启动录音，并及时消费录音数据，否则录音队列背压会让采集停滞。

重复 `enable_dump_...(True)` 会清空该观察缓冲，不要每帧调用。结束时先 `disable()`，再关闭已开启的输入 / 输出 dump，最后释放服务。

当前 `audio.deinit()` 会释放频谱分析器和观察缓冲，但不会把 dump 开关、观察缓冲容量配置和 FFT 计算频率恢复为初始值。若未关闭 dump 就释放服务，重新初始化后改变缓冲容量可能被拒绝。因此应在释放前显式关闭 dump；重新初始化后创建新的分析器，并按应用需要调用 `set_fps()`。50 fps 是底层初始值，不保证每次重新初始化后恢复为 50。

## 16 段柱状数据

```text
analyzer.get_bands_u8(max_height, noise=0.8, amplitude=1.5, /)
analyzer.get_bands_u8_into(out_buf, max_height, noise=0.8, amplitude=1.5, /)
```

| 参数 | 说明 |
| --- | --- |
| `out_buf` | into 版本必填，可写缓冲，至少 16 字节；推荐复用 `bytearray(16)` |
| `max_height` | 必填，整数 1～255；屏幕绘图通常设 16 |
| `noise` | 默认 0.8，FFT 幅值阈值，低于或等于阈值的 bin 不累加 |
| `amplitude` | 默认 1.5，必须大于 0；是高度的除数，**越大柱子越矮** |

普通版本返回 16 字节 bytearray，无结果返回 `None`；into 版本成功写入前 16 字节并返回 16，无结果返回 0。返回 0 时不要把缓冲中的旧值当成新一帧。

每段从低频到高频排列，覆盖约 46.875 Hz 到小于 8 kHz；输出采样率虽为 48 kHz，16 段显示仍只覆盖这段范围。各段上边界为：

```text
78.125, 109.375, 140.625, 203.125, 265.625,
390.625, 515.625, 703.125, 984.375, 1359.375,
1890.625, 2609.375, 3609.375, 4984.375, 6890.625 Hz
最后一段延伸到 8000 Hz（不含）
```

高度按 bin 幅值乘 `512 / fft_size` 后做阈值过滤、按段累加，再除以 `amplitude`，截取整数并限制在 `0..max_height`。这些参数只改变显示，不改变扬声器音量，也不是校准的响度单位。

## 原始幅度、dB 与主频

| 接口 | 返回 |
| --- | --- |
| `get_spectrum_magnitude(cap=0, /)` | float32 幅度数组，以 bytearray 返回 |
| `get_spectrum_magnitude_db(cap=0, /)` | float32 的 `20 × log10(幅度)`，以 bytearray 返回 |
| `get_spectrum_major_peak_hz()` | 主峰频率 float，单位 Hz |

尚无结果返回 `None`。`cap` 是最多取多少个 float，非负整数；0 表示取全部。完整幅度结果有 `fft_size / 2` 项，字节数为项数乘 4，不是 Python float 列表。

```python
import struct
raw = analyzer.get_spectrum_magnitude(8)
if raw is not None:
    values = [struct.unpack_from("<f", raw, i)[0]
              for i in range(0, len(raw), 4)]
    print(values)
```

第 k 项对应 `k × sample_rate / fft_size` Hz，包含 DC 项但不包含 Nyquist 端点。输入 PCM 先除以 32768 归一化，并使用 Hamming 窗；FFT 幅度没有转换为标准声压级，dB 输出也不是测声仪的 dB SPL。

这些方法读取最近一次快照。停止播放或停止 FFT 后可能仍返回上一帧结果，并不会自动归零；应用可依据播放状态清空画面。

## 读取 PCM 观察缓冲

| 接口 | 返回 |
| --- | --- |
| `audio_input_available()` / `audio_output_available()` | 当前可读的样本数，不是字节数 |
| `read_audio_input(n_samples)` / `read_audio_output(n_samples)` | 读取指定正整数个样本，返回长度 `n_samples × 2` 的 bytearray；不足整批时返回 None |

读操作按位置传参，且会消费 ring 中的数据。这里读的是输入前处理前的观察数据或已提交输出的 PCM，不是 `RecordSession.read()` 的同一个队列。输出观察值也不是扬声器经过硬件音量控制后的实测声压。

ring 满时丢弃旧数据、保留最新数据。FFT 自身也会消费同一个 ring，并在数据积压时只保留最新窗口。因此不要一边要求 FFT 实时分析，一边用同一路 dump 期望完整无损录音；保存录音使用 Recorder。

## 计算量与刷新限制

- 默认 512 点在输入端的频率分辨率为 31.25 Hz，输出端为 93.75 Hz。48 kHz 下提高 FFT 点数可改善低频分辨率，但会增加内存、计算与窗口时长。
- `set_fps(60)` 是期望的计算频率，不保证每秒得到 60 个新结果。数据不足一个窗口时跳过计算，解码、绘图和其他处理也会争用 CPU。
- 默认单路 dump 约占 128 KB，FFT 还需实部、虚部、PCM 窗口及多份结果缓冲。不要直接把最大合法 FFT 点数当成设备上推荐值。
- 每次获取完整幅度都会新建 bytearray；绘制 16 段频谱优先复用 `get_bands_u8_into()`，减少 GC 压力。
