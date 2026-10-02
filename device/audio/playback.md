# 播放音频

## 什么数据可以播放

### PCM

当前 Python 播放路径要求 **48 kHz、单声道、16 位有符号小端 PCM**。每个样本 2 字节，每个 buffer 的长度必须是偶数。

- 可以传 `bytes`、`bytearray`、`memoryview` 等可读缓冲。
- 数据不包含 WAV 文件头；也不能传 MP3、AAC 或浮点 PCM。
- 立体声 PCM 必须先转成单声道。直接传左右声道交错数据会被当作连续单声道样本。
- `sample_rate=16000` 不会触发 PCM 重采样。16 kHz 录音不能原样送到 48 kHz PCM 播放通道，否则速度与音高都会改变。

### Opus

要求每次写入**一个完整 Opus 音频包**。一个包可以包含 Opus 内部的多个帧，但不能把多个独立包直接拼接，也不能按文件读取块随意切包。

解码输出固定为 48 kHz 单声道。常规单流 Opus 可以使用，普通双声道流由单声道 decoder 下混；没有多声道 multistream 映射支持。源文件头中的原始采样率不是输出配置。

`frame_ms` 用于分配解码输出容量，应不小于包的实际总时长；过小会解码失败。绑定层只检查正整数，并不验证包内容。入门应用建议使用固定 20 / 40 / 60 ms 包；仓库 musicPlayer 的拆包器也只接受这三类首包时长。不要把该示例的限制误认为底层对所有 Opus 包的完整验证。

### OGG / WAV 文件

`player.play(open("test_audio.ogg", "rb").read())` **不是合法的文件播放方式**。OGG 是容器，需要先拆出 Opus 包、排除 `OpusHead` / `OpusTags`，再逐包送入；OGG Vorbis 不适用。WAV 则需解析实际 chunk 结构，取出符合格式要求的 PCM，不能假设所有 WAV 都只有固定 44 字节头。


## 创建 Player 和 播放会话

```text
player = audio.player(format, /, sample_rate=48000, frame_ms=60)
```

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `format` | 必填 | `"pcm"` 或 `"opus"`，按位置传入 |
| `sample_rate` | `48000` | PCM：仅用于 play() 的分块计算，不改变固定 48 kHz 的硬件输出，也不执行重采样；流式 write() 不使用此参数。应保持默认值，并提供 48 kHz PCM 数据。Opus：必须为 48000，其他值报错 |
| `frame_ms` | `60` | 正整数毫秒；PCM 的 `play()` 据此分块，Opus 据此配置解码容量 |

创建对象前先启用输出；播放 Opus 还必须启用 decoder。创建 Player 本身不启用服务。

### 两种模式：一次提交和流式提交

创建 Player 后，可以用两种方式提交播放声音。两者都支持 PCM 和 Opus，也都使用同一条后台播放管线；区别在于**数据是否已经准备完整，以及由谁控制分块提交的过程**。这里的两种方式不是接口中的 `mode` 参数，`mode="replace"` 表示如何处理旧播放。

| 提交方式 | 适用场景 | 数据如何交给播放器 | 输入如何结束 |
| --- | --- | --- | --- |
| 一次提交 `play()` | 短提示音、短音效，或已在内存中准备好的小段音频 | 应用一次传入全部数据；播放器自动切分 PCM，或逐个提交 Opus 包 | 全部数据提交后自动结束输入，无需再调用 `end()` |
| 流式提交 `open_stream()` + `write()` / `writev()` | 较长文件、网络接收的音频、持续生成的声音，或播放时还需绘图和响应按键 | 应用逐块读取或生成数据，再逐块提交，不必把完整音频加载到内存 | 应用提交完最后一块后主动调用 `end()`，或用 `drain()` 结束输入并等待 |

**一次提交流程：**

```text
准备全部 PCM 数据或完整 Opus 包列表
    → 调用 player.play(data)
    → 内部逐块入队，后台同时播放；队列满时等待空位
    → 全部提交后自动结束输入
    → 继续轮询，确认剩余声音播放结束
```

`blocking=False` 只表示不等待最后的播放结束，**不表示提交全部数据的过程不会等待**。如果设置 `blocking=True`，`play()` 会在内部继续轮询，直到会话结束才返回。因此一次提交适合数据量较小、允许调用过程占用一段时间的场景。

**流式提交流程：**

```text
调用 player.open_stream() 创建会话
    → 读取或生成一块 PCM / 拆出一个完整 Opus 包
    → 调用 session.write() 提交
    → 处理轮询、绘图或按键，再提交下一块
    → 数据提交完毕后调用 session.end()
    → 继续轮询，确认剩余声音播放结束
```

流式提交让应用自己控制提交节奏，但不会自动把文件读取或网络请求变成非阻塞操作。需要保持界面响应时，可使用 `write(..., wait=False)`；队列满时保留当前数据，处理其他事情后再重试。PCM 的分块大小由应用决定，Opus 则必须保持完整包边界。

两种方式都会返回 `PlaySession`，用于查询状态、等待结束或取消播放。**数据已提交不等于声音已播完**；具体参数和等待行为见下面两个接口小节。

## 一次提交：play

```text
session = player.play(data, /, *, mode="replace", blocking=False)
```

`data` 必填：PCM 为一个缓冲；Opus 为一个包，或包缓冲组成的 `list` / `tuple`。生成器请逐个取包后使用流式接口。

`mode` 目前只支持 `"replace"`，其他值抛 `NotImplementedError`。新播放会清空待播放数据并替换旧会话。`blocking=True` 会轮询直到结束，没有超时参数。

**`blocking=False` 也不保证立即返回**：此方法先把全部数据通过等待式写入提交，再返回会话；PCM 会按 `sample_rate × frame_ms / 1000` 个样本分块。数据较大时，提交过程会等待队列空位。需要绘图、按键响应或协程并发时使用 `open_stream()`。

## 流式提交：open_stream / write / writev

```text
session = player.open_stream(*, mode="replace")
session.write(chunk, /, *, wait=True)
session.writev(chunks, /, *, wait=True)
```

`open_stream()` 返回 `playing` 状态会话；只有主动结束输入才会转入结束流程。`chunk` 必填，PCM 为偶数字节缓冲，Opus 为完整包。

| 调用 | 返回与等待 |
| --- | --- |
| `write(chunk, wait=True)` | 等待队列有空位，成功返回 `True`；不是等待声音播完 |
| `write(chunk, wait=False)` | 成功返回 `True`；暂时无法入队抛 `OSError(EAGAIN)` |
| `writev(chunks, wait=True)` | `chunks` 必须为 list / tuple；返回成功写入的块数 |
| `writev(chunks, wait=False)` | 返回已接收的块数，可能为 0 或只接收一部分；仅重试剩余部分 |

`write()` 不会自动拆分 PCM 大缓冲。建议每块 20～60 ms，即 1,920～5,760 字节，避免单个数据块占用输出通道过久。缓冲会复制到固件内存队列，不是零拷贝。

`wait=True` 没有超时；写入失败可能抛 `RuntimeError`。只有服务已经正确启用时，才把 `EAGAIN` 作为队列背压重试。每次重试之间应轮询并让出执行，不丢弃当前包。

调用 `end()` 后不能继续写入；已结束 / 取消 / 错误会话写入会抛 `RuntimeError`。

## 结束、等待、取消

| 接口 | 行为与返回 |
| --- | --- |
| `session.end()` | 声明不再写入，转为 `draining`；立即返回 `None` |
| `session.drain(timeout_ms=None, /)` | 同时结束输入并轮询等待；`None` / 负数无限等待，正数限时，0 仅推进一次检查；返回 `None` |
| `session.join()` | 相当于无限等待的 `drain()`，也会关闭输入 |
| `session.cancel()` | 清空共享播放队列，标记 canceled，发送 `play_end` / `canceled` |
| `player.stop()` | 停止当前活动播放，发送 `play_end` / `stopped` |
| `player.drain()` | 对当前活动会话结束输入并无限等待；没有活动会话时直接返回 |
| `session.state()` | 返回 `playing` / `draining` / `ended` / `canceled` / `error` |
| `session.id()` | 返回会话整数 ID |
| `session.error()` | 非 error 状态为 `None`；error 状态为 `code`、`message` 字典 |

带超时的 `drain()` 到时不会自动取消，也不会返回完成布尔值。应再检查 `state()`。不要对取消、被替换或已完成的旧会话继续 `drain()` / `cancel()`；它们共享底层队列，可能干扰新播放。

播放资源由普通播放器与 MicroPyxel 共享。新播放替换旧会话、`session.cancel()`，以及 `player.stop()` 停止活动播放时，清理操作也会丢弃 MicroPyxel 尚未输出的 PCM 数据。这些操作不会停止 MicroPyxel 合成本身；合成仍在运行时，后续可能继续产生声音。

结束判断是当前实现的启发式判断：已结束输入、相关队列为空、服务 idle，且播放计数至少 120 ms 未推进。它不是硬件播放位置查询，尤其不适合大块 PCM、同时录音或其他共享音频活动下的精确同步。流式输入已送完后继续 `audio.poll()`，并为应用设置合理的超时。

底层 Opus 解码失败主要写系统日志，并不保证把 Python 会话设为 `error`；`error()` 为 `None` 不能证明每个包都解码成功。无声时同时检查格式、初始化开关和设备日志。
