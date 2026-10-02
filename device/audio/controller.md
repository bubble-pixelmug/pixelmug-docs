# 初始化与事件

使用 `audio = audio_service.audio`。下列签名中，`*` 后的参数只能通过名称传入，`/` 前的参数只能按位置传入；这些符号用于说明签名，不需要写在调用中。无默认值的参数必填。未特别说明的控制方法返回 `None`。

## init：创建服务

```text
audio.init(*, enable_input, enable_output, with_opus_encoder, with_opus_decoder)
```

四个布尔参数都**必填**，不能直接调用 `audio.init()`。

| 参数 | 含义 |
| --- | --- |
| `enable_input` | 创建音频输入服务；录音需要 `True` |
| `enable_output` | 创建音频输出服务；播放与 MicroPyxel 合成声音需要 `True` |
| `with_opus_encoder` | 录音输出使用 Opus 编码；PCM 录音设为 `False` |
| `with_opus_decoder` | 启用 Opus 播放解码；只播放 PCM 时设为 `False` |

| 场景 | input | output | encoder | decoder |
| --- | --- | --- | --- | --- |
| PCM 播放 / MicroPyxel 合成声音 | False | True | False | False |
| Opus 播放 | False | True | False | True |
| PCM 录音 | True | False | False | False |
| Opus 录音 | True | False | True | False |
| Opus 录音与播放 | True | True | True | True |

输入初始化后还需 `recorder.start()` 才启动录音处理。不要向未启用的输出 / 解码通道写入数据，否则可能出现无声音、队列满或等待不返回。

重复 `init()` 不会按新参数重建已存在的 codec。需要改变服务开关时，先结束当前播放和录音并 `deinit()`，再重新 `init()`。

## configure：音量与输入增益

```text
audio.configure(*, output_volume=None, input_gain=None)
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `output_volume` | `None` | 省略或传 None 时，保持当前音量不变；指定时为 0..100 的整数，越界抛 ValueError |
| `input_gain` | `None` | 省略或传 None 时，保持当前输入增益不变；指定值转为浮点数，当前未做范围校验 |

当前基础 codec 默认音量为 70、输入增益为 25。**如果应用启动后没有听到声音，可先把音量调到最大。** 建议应用显式配置需要的音量。

当前 PDM 麦克风路径的 `input_gain` 是**软件倍数，不是 dB**：正值转成整数后乘到 PCM 样本上，超过 16 位范围时削波；非正值跳过增益处理。因此 `0` 不表示麦克风静音，`0.5` 这样的正小数也不适合作为衰减参数。需要调整时使用合理的正整数并通过实际录音检查失真。

```python
audio.configure(output_volume=70)
```

## deinit：释放服务

```python
audio.deinit()
```

停止并释放服务、硬件和编解码资源，重置 Python 活动会话、事件队列与回调。它不是“等待播放完毕”；想播放尾部声音，应先完成会话。

使用频谱分析时，应先停止 FFT 并关闭已开启的输入 / 输出 dump，再调用 `deinit()`。底层保留 dump 开关、观察缓冲容量配置和 FFT 计算频率，详见[频谱分析的清理说明](./spectrum#选择输入或输出)。

释放后不要继续调用旧的 Player、Recorder、Session 或 SpectrumAnalyzer 对象。重新初始化后重新创建它们。多个模块共享服务时，由应用顶层统一负责初始化和释放。

## 事件与轮询

Audio Service 在后台处理声音，同时用**事件**告诉应用“发生了什么”。事件可以是一条状态通知，例如播放结束、检测到说话；也可以携带一块刚录到的声音。应用拿到这些信息，再决定更新画面、保存数据或开始下一步操作。

**轮询**就是应用在自己的循环中，定期让 Audio Service 检查状态、交付通知和录音数据。完成这一步的方法叫 `audio.poll()`。它处理当前可以处理的内容后就返回，应用可以继续做其他事情，稍后再调用它。

### 使用场景

| 场景 | 应用负责什么 | 轮询与事件负责什么 |
| --- | --- | --- |
| 流式播放 | 持续读取或生成声音，逐块提交；全部提交后声明输入结束 | 检查剩余声音是否满足播放结束条件，更新会话状态并产生 `play_end`，应用据此更新界面或进入下一步 |
| 事件式录音 | 开始录音，并处理接收到的声音数据 | 从录音队列取出数据，通过 `record_frame` 把一块 PCM 数据或一个 Opus 包交给应用 |
| VAD 语音检测 | 开始录音，根据说话状态决定交互行为 | 把底层检测到的说话 / 非说话状态变化，通过 `vad` 事件交给应用 |
| 录音结束 | 停止录音，需要保留尾部时继续读取剩余数据 | 检查结束条件，更新会话状态并产生 `record_end` |

流式播放的数据仍由应用主动提交，轮询不会替应用读取文件，也没有“请提交下一块”的事件。队列模式录音的数据仍由应用主动读取；它不产生 `record_frame`，但同样可以接收 VAD 和结束通知。

```text
开始播放或录音
    ↓
应用循环：提交 / 读取音频、处理画面或按键
    ↓
调用 poll()：检查音频状态、交付事件
    ↓
应用处理事件，继续下一轮
```

不轮询时，已经提交的声音仍可在后台播放，但 Python 侧的结束状态、VAD 通知和事件式录音数据不会及时交付。单独读取 `session.state()` 不能代替轮询。部分等待接口会在内部轮询；自行组织主循环时，应主动定期调用 `poll()`。

### 应用如何接收事件

可以选择两种方式，事件的内容相同：

- **回调方式**：先登记一个处理函数。轮询遇到对应事件时，就调用这个函数。例如收到说话状态变化后，立即更新屏幕上的提示。
- **主动读取方式**：轮询后从事件队列取出通知，由主循环统一判断类型并处理。也可以等待某一种通知，例如等待播放结束。

回调是应用自己的普通 Python 函数，在交付事件时同步执行，不会另开一个 Python 线程。因此回调应尽快返回，耗时的网络请求或复杂处理留给主循环安排。

### 事件类型与含义

| 事件 | 表示什么 | 何时产生 |
| --- | --- | --- |
| `vad` | 检测到说话状态变化 | 开始录音后，从非说话变为说话，或从说话变为非说话；只在状态变化时通知，不是每块录音都通知 |
| `play_end` | 播放会话结束 | 正常完成，或被停止、取消、替换；不表示每块声音已播完，也不是 MicroPyxel 音符结束事件 |
| `record_frame` | 一块录音数据可以交给应用 | 仅事件式录音产生；当前每次轮询最多交付一块 PCM 数据或一个 Opus 包 |
| `record_end` | 录音会话结束 | 停止后相关队列排空并满足结束条件，或应用主动取消；调用 `stop()` 不会立即等同于录音会话结束 |
| `error` | 预留的底层错误通知 | 当前桥接尚无实际产生此通知的入口，不能依赖它捕获全部音频错误；参数错误仍会抛 Python 异常，部分底层错误需要查看设备日志 |

VAD 判断的是有没有说话，不是语音识别或说话人识别，也不会自动停止录音。queue 和 event 两种录音模式都可以接收 `vad`；录音是否使用 event 模式，只决定录音数据的交付方式。

### 事件携带的数据

每条事件是一个字典，例如播放正常完成时：

```python
{
    "type": "play_end",
    "t": 12345,
    "data": {"session_id": 1, "reason": "ended"}
}
```

`type` 是事件名称，`t` 是毫秒时间戳，`data` 是该事件的具体内容。`t` 不是音频时长或日历时间；VAD 使用底层通知产生时刻，会话事件使用 Python 侧生成通知的时刻，应用接收可能更晚。

| 事件 | `event["data"]` 中的字段 |
| --- | --- |
| `vad` | `speaking`：bool，`True` 表示检测到说话，`False` 表示变为非说话状态 |
| `play_end` | `session_id`：播放会话 ID；`reason`：结束原因，见下表 |
| `record_frame` | `session_id`：录音会话 ID；`timestamp`：16 kHz 采样计数；`format`：`"pcm"` / `"opus"`；`payload`：bytes 音频数据 |
| `record_end` | `session_id`：录音会话 ID；`reason`：`"ended"` 表示停止后满足排空条件，`"canceled"` 表示主动取消并丢弃剩余录音 |
| `error` | `code`：整数错误码；当前没有可依赖的完整错误码表 |

`play_end` 的 `reason` 用于区分正常完成和中断：

| 值 | 含义 |
| --- | --- |
| `ended` | 已结束输入，轮询确认队列和播放进度满足结束条件 |
| `replaced` | 新的 `play()` 或 `open_stream()` 使用 replace 模式替换了旧会话 |
| `stopped` | 应用调用了 `player.stop()` |
| `canceled` | 应用调用了 `session.cancel()` |

含 `session_id` 的事件可与对应 `session.id()` 比较，区分新旧会话。录音的 `data.timestamp` 则是**采样计数，不是毫秒**，每个 60 ms 数据块通常增加 960；不能与外层的 `t` 混用。事件式录音不额外提供 `sample_rate`、`frame_ms` 字段，数据格式详见[录音](./recording)。

## 事件接口

选择回调方式时，先登记回调，再开始播放或录音，并持续轮询。选择主动读取方式时，可以不登记回调，在轮询后取出事件处理。下面按这个使用顺序介绍接口。

### on：登记事件回调

```text
audio.on(name, callback, /)
```

| 参数 | 必填 | 含义 |
| --- | --- | --- |
| `name` | 是 | 上面的事件名称，例如 `"vad"`、`"play_end"` |
| `callback` | 是 | 接收一个事件字典的普通函数；传 `None` 取消该类型回调 |

两个参数按位置传入，返回 `None`。同一种事件只保留最后登记的函数，再次登记会替换旧函数。未知事件名称、非可调用且非 `None` 的参数抛 `ValueError`。

```python
def on_vad(event):
    speaking = event["data"]["speaking"]
    print("正在说话" if speaking else "非说话状态")

audio.on("vad", on_vad)  # 传函数本身，不写 on_vad()。
# 不再需要时：
# audio.on("vad", None)
```

`on()` 只是登记处理函数，不会启动麦克风、播放或自动轮询。`deinit()` 会清除回调，重新初始化后需要重新登记。

### poll：推进状态并交付事件

```python
audio.poll()
```

一次调用会取出底层通知、检查播放 / 录音会话，并把产生的事件放入 Python 事件队列；登记了回调时，也会同步调用它。回调执行完后，`poll()` 才继续处理并返回。

主循环可以每 5～20 ms 调用一次，这是应用组织建议，不是硬性实时保证。事件式录音当前每块为 60 ms，每次 `poll()` 最多交付一块，所以应比数据产生更频繁地轮询，避免积压。轮询间隔不会改变音频采样率或数据块时长。

返回值是本次取出的**底层通知数**，不统计全部会话事件，也不是回调调用次数。返回 0 时，仍可能产生播放结束或录音数据事件；普通应用无需依赖该返回值。

### get_event：主动取出事件

```python
event = audio.get_event()
```

返回并移除 Python 事件队列中最早的一条通知；没有事件时返回 `None`，立即返回、不等待。**它自身不轮询**，通常先调用 `poll()`，再逐条取出事件。

下面的片段适合放在已经开始播放的应用主循环中，示范不登记回调、由主循环处理播放结束通知：

```python
audio.poll()
event = audio.get_event()
while event is not None:
    if event["type"] == "play_end":
        print("播放结束：", event["data"]["reason"])
    event = audio.get_event()
```

`get_event()` 读取的是事件队列，`session.read()` 读取的是 queue 模式下的录音数据，两者不要混淆。

### wait_event：等待指定事件

```text
audio.wait_event(type=None, timeout_ms=None, /)
```

| 参数 | 默认 | 含义 |
| --- | --- | --- |
| `type` | `None` | 接受任意事件；指定事件名称时等待该类型 |
| `timeout_ms` | `None` | 等待时长，单位毫秒；`None` / 负数无限等待，0 只检查当前轮询结果，正数限时等待 |

参数按位置传入。内部会持续轮询，取到匹配事件后返回其字典并从队列移除；超时返回 `None`，不匹配类型的事件保留。即使只等待 `play_end`，轮询过程中其他类型的已登记回调也可能执行。

```python
# 在播放已经开始、且应用允许暂时等待时使用。
event = audio.wait_event("play_end", 500)
if event is not None:
    print(event["data"]["reason"])
```

等待期间应用当前执行流程会停在这个调用中。需要持续绘图或响应按键时，优先在自己的循环中使用 `poll()`，而不是长时间等待事件。此接口按类型匹配，不按会话 ID 过滤；返回后可检查 `session_id` 是否属于当前会话。


### 使用边界与排查

- **事件不会因回调执行而自动移出队列。** 执行过回调的事件仍能被 `get_event()` 取到，但取出不会再次自动调用回调。两种方式可以并用，避免对同一通知重复执行业务；不再需要的事件可以取出丢弃，及时释放录音数据引用。
- **并非所有回调都只在显式 `poll()` 中执行。** `wait_event()`、`drain()` 等部分接口会内部轮询；取消、停止、替换播放会直接产生结束事件，回调可能在相应方法返回前执行。
- **回调保持短小。** 不在其中递归轮询、等待同一会话结束或重建音频服务。回调异常会传播给当前调用者；直接登记 `async def` 函数不会自动等待其协程执行。
- **录音尾部需要主动处理。** 当前 event 模式在 `stop()` 后不会继续通过事件排空剩余数据；需要保留尾部时使用 queue 模式，详见[停止、保留尾部与释放](./recording#停止、保留尾部与释放)。
- **播放结束通知不是精确的硬件播放位置。** 当前通过队列和播放进度判断结束，详见[播放的结束与等待](./playback#结束、等待、取消)。
- **事件缓存有限。** 底层通知和 Python 事件队列当前各最多 64 项，满时丢弃最老项。这是排查积压时的实现参考，不应作为无损存储录音的方案。

## stats：观察运行状态

```python
info = audio.stats()
playback_depth, decode_depth = audio.get_playback_queue_depths()
```

`stats()` 返回字典：

| 字段 | 含义 |
| --- | --- |
| `output_volume`、`input_gain` | 当前配置 |
| `idle` | 底层若干工作队列是否为空；不是扬声器已静音的精确证明 |
| `playback_count` | 已输出的 PCM 数据块数，不是样本数或播放毫秒数 |
| `playback_depth` | 普通待播放 PCM 数据块数 |
| `decode_depth` | 待解码 Opus 包数 |
| `event_dropped` | 底层桥接事件队列丢弃计数；不包括 Python 队列的丢弃 |
| `active_play`、`active_record` | 存在对应对象时才有；包含 `id` 和 `state` |

`get_playback_queue_depths()` 返回上述两种深度的二元组。队列长度不包含已经取出、正在解码的音频包或正在输出的 PCM 数据块，也不包含 MicroPyxel 队列，因此不能单独用于判断精确播放结束。
