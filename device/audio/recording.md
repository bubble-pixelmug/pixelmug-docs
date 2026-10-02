# 录音

## 录音管线与格式

先启用 `enable_input=True`，再通过 `recorder.start()` 开始采集。当前管线将麦克风数据转换为 16 kHz 单声道，经过 AFE 后输出 60 ms 一帧。默认启用 AFE 语音前处理，语音活动检测 VAD 和降噪 NS。因此不应把录音结果当作完全未经处理的麦克风原始数据。VAD 是状态通知，不是“只有说话时才输出 PCM”的开关。Opus 编码另外开启了 DTX，安静时包可能很小。

## 创建 Recorder

```text
recorder = audio.recorder(format, /, *, sample_rate=16000, frame_ms=60)
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `format` | 必填 | `"pcm"` / `"opus"`，按位置传入 |
| `sample_rate` | `16000` | 当前仅保存在对象中，不重新配置底层录音采样率 |
| `frame_ms` | `60` | 当前仅保存在对象中，不重新配置 AFE / 编码帧长 |

保留默认参数。创建 `recorder("pcm")` 时，初始化必须使用 `with_opus_encoder=False`；创建 `recorder("opus")` 时必须使用 `True`。**实际录音输出队列由初始化开关决定，Recorder 的格式不会自动切换它。** 两者不匹配可能读不到数据，或与编码处理争用队列。

## start：开始录音，创建录音会话

```text
session = recorder.start(*, sink="queue")
```

返回 `RecordSession`。`sink` 只支持以下两种值，其他值抛 `ValueError`：

### 两种模式：主动读取和事件接收

两种模式都在后台持续录音，也都支持 PCM 和 Opus。区别是**应用如何拿到每块录音数据**，不会改变采样率、音频格式或 AFE 处理，也不是“录完一次性返回”和“边录边返回”的区别。

| 模式 | 适用场景 | 数据如何交给应用 | 应用需要做什么 |
| --- | --- | --- | --- |
| `"queue"`（默认，主动读取） | 保存录音文件、分块传输，或希望在主循环中自行安排数据处理 | 应用调用 `session.read()`，每次取出一块 PCM 数据或一个 Opus 包 | 及时读取数据，同时调用 `audio.poll()` 推进状态和分发 VAD 等通知 |
| `"event"`（事件接收） | 已采用事件回调组织应用，希望收到数据后进行轻量处理 | `audio.poll()` 取出录音数据，生成 `record_frame`，通过回调或事件队列交给应用 | 持续轮询，通过 `on("record_frame", ...)` 注册回调，或主动读取事件队列；不调用 `session.read()` |

**queue 模式流程：**

```text
调用 recorder.start(sink="queue")
    → 后台持续采集并处理声音
    → 应用循环调用 session.read() 获取数据
    → 保存、传输或处理，同时调用 audio.poll()
    → 结束时 stop()，继续读取剩余数据并轮询至会话结束
```

`read(0)` 没有数据时立即返回 `None`，适合与绘图、按键等处理放在同一个循环中；也可以指定有限的等待时间。队列模式不会产生 `record_frame` 事件，但仍能接收 VAD、录音结束等通知。

**event 模式流程：**

```text
先登记 record_frame 回调（或选择主动读取事件队列）
    → 调用 recorder.start(sink="event")
    → 应用循环调用 audio.poll()
    → 生成 record_frame，并同步调用已登记的回调
    → 在回调中轻量处理，或从事件队列取出数据处理
    → 不需要保留尾部数据时，调用 cancel() 结束录音
```

登记回调不会自动启动轮询，也不会另开一个 Python 线程。当前每次 `poll()` 最多交付一块录音数据，回调应尽快返回，避免耗时处理使后续数据积压。回调处理过的事件仍保留在事件队列中，取出后不要重复处理同一份数据。

**需要保存停止后的尾部数据时，优先使用 queue 模式。** 当前 event 模式在 `stop()` 后不会继续通过事件排空剩余录音；不需要尾部时可用 `cancel()` 丢弃剩余数据。两种模式的详细结束流程见本页“停止、保留尾部与释放”。

两者都会返回 `RecordSession`，用于查询状态和停止录音。`sink` 只决定录音数据的获取方式，**不决定是否启用 VAD**；两种模式都可以登记 `"vad"` 回调。

启动会清空之前的录音输出队列；尚有 `recording` 状态会话时再次启动抛 `RuntimeError`。即使旧会话已处于 `stopping`，也应等它结束或取消后再创建新会话。

若同时使用录音和播放，建议先启动录音，再提交播放数据。初始化时启用了 `with_opus_decoder=True` 的情况下，`start()` 会重置 Opus 解码器，并清空已有的待解码 Opus 包和普通 PCM 播放数据；即使当前播放的是 PCM，也会受影响。后续仍可继续提交播放数据。

输入有启动预热和 AFE 缓冲延迟，`start()` 后立即读取返回 `None` 是正常情况。

## read：队列模式读取

```text
frame = session.read(timeout_ms=0, /)
```

`timeout_ms` 只能按位置传入。0 不等待，正整数为最多等待毫秒数，负数无限等待。没有数据 / 到时 / 会话取消或错误时返回 `None`。event 模式调用会抛 `RuntimeError`。

PCM 返回：

```python
{"timestamp": 0, "payload": b"..."}
```

Opus 返回：

```python
{"timestamp": 0, "sample_rate": 16000, "frame_ms": 60, "payload": b"..."}
```

`payload` 为 bytes。PCM 是无文件头的 16 位小端单声道数据，通常每帧 1,920 字节；Opus 是一个包，长度可变，不是完整 OGG 文件。

`timestamp` 是 16 kHz 采样计数，不是毫秒，也不是时间戳字符串。常规相邻帧增加 960，换算时间为 `timestamp / 16000` 秒。底层在初始化时重置该计数，不保证每次 `start()` 都从 0 开始。

`read()` 不会因状态变成 `ended` 就主动终止无限等待。不要用 `read(-1)` 探测文件结束；有限时长读取配合 `state()`、`poll()` 更合适。立即读到数据的路径也不会自动推进全部事件，主循环仍需显式轮询。

### 当前桥接缓冲上限

每次读取 / event 分发使用最多 **1,024 个 PCM 样本**或 **512 字节 Opus 包**的缓冲。桥接取出整帧后只复制能放入的部分，超出部分被丢弃，不会留到下次读取。

当前 960 样本 PCM 帧在此范围内；Opus 包长取决于编码输出，不能凭格式名称保证永不超过 512 字节。需要更高码率或改变固件帧长时，必须同时检查这一限制，截断的 Opus 包不能作为正常音频使用。

## event 模式与 VAD

```python
def on_frame(event):
    data = event["data"]
    # 这里只做轻量处理，不打印完整音频 bytes。
    print(data["format"], len(data["payload"]))

def on_vad(event):
    print("正在说话：", event["data"]["speaking"])

audio.on("record_frame", on_frame)
audio.on("vad", on_vad)
session = audio.recorder("pcm").start(sink="event")
```

此片段需要先按 PCM 录音模式初始化服务，并持续调用 `audio.poll()`。

每次 `poll()` 最多分发一帧录音数据。当前每秒约 16.7 帧，因此轮询需要比帧产生更频繁；耗时回调会让队列积压。event 中的 `data` 包含 `session_id`、`timestamp`、`format`、`payload`，不包含队列模式 Opus 结果中的 `sample_rate` / `frame_ms`。

## 停止、保留尾部与释放

| 接口 | 含义 |
| --- | --- |
| `session.stop()` | 停止继续录音，状态变为 `stopping`；不清空已经产生的数据 |
| `session.drain(timeout_ms=None, /)` | 必要时先 stop，然后轮询等待结束；自身不取走录音队列数据 |
| `session.cancel()` | 停止并清空录音队列，状态变为 `canceled`，发送 `record_end` |
| `session.close()` | 仅解除 Python 控制器对该活动会话的引用，**不停止硬件录音** |
| `session.state()` | `recording` / `stopping` / `ended` / `canceled` / `error` |
| `session.id()` | 会话整数 ID |

`stop()`、`drain()`、`cancel()` 和 `close()` 返回 `None`；`state()` 返回状态字符串，`id()` 返回会话整数 ID。`drain()` 的 `None` / 负超时表示无限等待，0 仅检查，正数限时；到时不会自动取消，应再检查状态。

队列模式要保留尾部：先 `stop()`，继续 `read(0)` 消费剩余帧并 `poll()`，直到 `ended`。目前结束需要相应队列为空且距最近一次读出帧至少 120 ms。直接 `stop(); drain()` 可能因为无人读取队列而一直等待。

event 模式当前只在 `recording` 状态分发帧；`stop()` 后不会继续通过事件排空剩余数据。若不需要尾部，使用 `cancel()`；需要保留尾部则选择 queue 模式。不要承诺 `stop()` 会自动派发所有尾帧，AFE 内尚未组成完整帧的样本也不保证保留。

最终在 `finally` 中取消尚未结束的会话，再 `close()`、`audio.deinit()`。