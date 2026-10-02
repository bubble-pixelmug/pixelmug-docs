# MML 乐谱

MML 用一段字符串描述音符和合成参数。可传给 `sounds(i).mml(code)` 预先解析，或传给 `play(channel, code)` 临时播放。这里介绍当前解析器实现的语法，不承诺兼容其他 MML 方言。

```python
pyxel.sounds(0).mml("T120 O4 L8 @0 V80 C D E G > C")
pyxel.play(0, 0)
```

先完成[声音播放](./audio)中的初始化。经常重复播放的曲子，推荐初始化时解析一次到 Sound，再按编号播放。

## 基本命令

命令大小写不敏感，可在命令间加入空白。默认参数为 `T120 Q80 V100 O4 L4 @0`；移调与微调默认 0，包络/颤音/滑音默认关闭。

| 语法 | 参数与含义 | 示例 |
| --- | --- | --- |
| `Tn` | 必填正整数 BPM，默认 120 | `T150` |
| `Qn` | 发声占音符时长的百分比，0..100，默认 80 | `Q90` |
| `Vn` | 音量 0..127，默认 100；不同于 Sound 轨道的 0..7 | `V80` |
| `@n` | 音色编号，当前使用 0..3，默认 0 | `@1` |
| `On` | 八度 -1..9，默认 4 | `O3` |
| `>` / `<` | 升/降一个八度 | `C > C < C` |
| `Ln` | 默认音长分母，默认 4，即四分音符 | `L8` |
| `C D E F G A B` | 音名，使用当前八度与默认音长 | `C E G` |
| 音名后 `#` / `+` / `-` | 升/升/降半音 | `C# D-` |
| 音名后数字 | 本音符时值分母，不是八度 | `C8 D16` |
| `R` 或 `Rn` | 休止，使用默认或指定时值 | `R4` |
| `.` | 附点，增加此前时值的一半；可继续附点，但必须能用整数 tick 表示 | `C4.` |
| `&` | 连接同音高的音符或附加时值 | `C4&C8`、`C4&8` |
| `Kn` | 整数半音移调，可为负，默认 0 | `K12` |
| `Yn` | 整数 cents 微调，可为负，默认 0 | `Y-10` |
| `[ ... ]n` | 一段重复播放 n 次，n≥1 | `[C D E]2` |
| `[ ... ]` | 不带次数表示无限重复 | `[C E G]` |

一个四分音符为 48 tick，全音符 192 tick。时值分母范围 1..192，并且必须整除 192，例如 1、2、3、4、6、8、12、16、24、32、48、64、96、192。不要填不能整除的数或 0。

无限重复的 Sound 没有有限总时长，`total_sec()` 可返回 `None`；它也不会自然结束后切换到播放列表下一项。

## 包络、颤音、滑音

三类效果分别通过编号槽位保存定义。槽位 0 保留为关闭效果；定义用正整数编号。带花括号的定义命令会保存并立即应用效果；以后可用不带花括号的 `@ENVn`、`@VIBn` 或 `@GLIn` 再次选用。

| 语法 | 参数 |
| --- | --- |
| `@ENVn{initial,duration,volume,...}` | `initial/volume` 为 0..127；每对 `duration,volume` 是用非负 tick 时长过渡到目标音量，可有多段 |
| `@ENVn` / `@ENV0` | 选用包络 n / 关闭 |
| `@VIBn{delay,period,depth}` | 非负延迟 tick、周期 tick、深度 cents（可为负）；有意义的周期应大于 0 |
| `@VIBn` / `@VIB0` | 选用颤音 n / 关闭 |
| `@GLIn{offset,duration}` | 音高偏移 cents 与非负时长 tick；两项各可用 `*` 表示不显式指定 |
| `@GLIn` / `@GLI0` | 选用滑音 n / 关闭 |

```python
pyxel.sounds(1).mml(
    "T120 O4 L4 @0 V80 "
    "@ENV1{0,4,127,20,0} @ENV1 C E G "
    "@ENV0 @VIB1{8,16,25} @VIB1 C2"
)
pyxel.play(0, 1)
```

每个 Channel 对包络、颤音、滑音分别保留 **8 个定义缓存**。这是可同时缓存的定义数量，不要求编号必须连续；超过容量时实现会覆盖第一项，旧定义可能失效，建议使用 1..8 的少量固定编号。

包络段、音符与重复结构还会生成动态命令和状态。`total_sec()` 的重复嵌套栈最多 32 层，超过时无法计算并返回 None；这不是建议的乐谱复杂度。使用短小乐句，不要不断生成新定义来承载流式数据。

## 使用边界

- `Sound.set()` 的旧轨道格式与 MML 不同；切换时参见 [Sound 命令优先级](./sound#轨道与-mml-命令的优先级)。
- `sound.mml()` 或 `sound.mml(None)` 清除命令，`sound.mml(code)` 写入新命令；设置方法返回 `None`，不是成功标志。
- 当前绑定不会把所有解析失败转换为 Python 异常，失败后也不能假定旧内容已清空。只把受控、格式正确的乐谱传入；出现不符预期时查看日志和 `total_sec()`。
- 包含旧语法 `x/X/~` 时绑定会打印弃用提示，但仍送入当前解析器；不要把提示理解为完整支持旧方言。
- 不在绘制回调里每帧解析同一乐谱。停止声音用 `stop()`，无需重新创建整个组件。

## 完整示例：播放一段双声部乐曲

将下面代码保存为 MPY 项目的 `__main__.py`，在 Studio 中加载并运行设备代码。无需 PNG、音频文件或其他素材：旋律和伴奏都由 MML 实时合成，播放一次后自动结束。

```python
import time
import audio_service
import micropyxel as pyxel

# 通道 0：三角波旋律，包含八度切换、重复和不同音长。
MELODY = (
    "T120 O4 L8 @0 V90 Q90 "
    "C E G E D F A F "
    "E G > C < G F A > D < A "
    "[G E D C]2 "
    "D4 G4 C2"
)

# 通道 1：较轻的低音伴奏，与旋律时长相同。
BASS = "T120 O2 L2 @0 V55 Q75 [C G F C]2"

audio = audio_service.audio
audio.init(enable_input=False, enable_output=True,
           with_opus_encoder=False, with_opus_decoder=False)
try:
    audio.configure(output_volume=100)
    pyxel.init(start_audio=True)
    try:
        pyxel.sounds(0).mml(MELODY)
        pyxel.sounds(1).mml(BASS)
        pyxel.musics(0).set([0], [1])

        print("开始播放")
        pyxel.playm(0)
        while (pyxel.play_pos(0) is not None or
               pyxel.play_pos(1) is not None):
            time.sleep_ms(50)

        # 合成结束后稍作等待，让已送入音频队列的尾音播出。
        time.sleep_ms(300)
        print("播放结束")
    finally:
        pyxel.stop()
        pyxel.destroy()
finally:
    audio.deinit()
```

这段代码的执行过程是：

1. 开启 Audio Service 输出，再通过 `start_audio=True` 启动 MicroPyxel 合成任务。
2. 将旋律和伴奏分别解析到 Sound 0、Sound 1。`T120` 表示每分钟 120 拍；旋律的 `L8` 是默认八分音符，伴奏的 `L2` 是默认二分音符。
3. `musics(0).set([0], [1])` 把两个 Sound 分别安排到通道 0 和通道 1，`playm(0)` 启动双声部播放。
4. 主程序等待两个通道都结束，再停止并释放 MicroPyxel，最后关闭 Audio Service。最后的 300 ms 是给音频队列留的尾音等待，不是对设备播放延迟的保证。

可以先把两段 MML 的 `T120` 都改为 `T160`，听听速度变化；或者把旋律的 `@0` 改为 `@1`，比较三角波与方波音色。伴奏的 `V55` 控制这个声部的音量，`output_volume` 则控制设备整体输出音量。

本例只播放声音，不需要 `run()` 或 `render_graphics()`。因此也不需要调用 `quit()`：等待循环自然结束后，依次执行资源清理即可。
