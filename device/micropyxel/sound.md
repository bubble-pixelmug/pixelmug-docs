# Sound、Music、Channel 与 Tone

声音资源描述“播放什么”，通道描述“在哪里播放”，音色描述“如何合成”。实际发声前请先完成[音频初始化](./audio)。

## 资源入口

| 接口 | 参数 | 返回 |
| --- | --- | --- |
| `sounds(index)` | 必填位置参数，0..63 | 全局 Sound |
| `musics(index)` | 必填位置参数，0..7 | 全局 Music |
| `channels(index)` | 必填位置参数，0..3 | 参与实际混音的 Channel |
| `tones(index)` | 必填位置参数，0..3 | 全局 Tone |

这些对象共享底层资源，修改会影响后续使用它们的播放。优先修改未播放的资源，或者停止对应通道后再编辑，避免与后台合成并发修改同一数据。

`Sound()`、`Music()`、`Channel()`、`Tone()` 无参数构造函数也已导出，但它们创建的是独立对象，不会自动加入全局资源表。尤其独立 Channel 不会自动成为第 5 个混音通道，独立 Music 也不能直接传给只接收编号的 `playm()`。普通应用使用表中的资源入口即可。

## Sound：短音效与乐句

### `sound.set(notes, tones, volumes, effects, speed)`

五个参数全部必填，且只接受位置参数，返回 `None`。

| 参数 | 类型与格式 |
| --- | --- |
| `notes` | 字符串。音名 `a..g`，可接 `#` 或 `-`，然后必须接八度数字 `0..4`；`r` 为休止符。例如 `"c3d3e3r"` |
| `tones` | 字符串。`t/s/p/n` 分别三角、方波、脉冲、噪声，也可用 `0..3` 表示当前音色编号 |
| `volumes` | 字符串。每字符为音量 `0..7`，0 静音 |
| `effects` | 字符串。`n` 无、`s` 滑音、`v` 颤音、`f` 淡出、`h` 在音符最后一半时长淡出、`q` 在最后四分之一时长淡出 |
| `speed` | 正整数，每个音符占用的 tick 数；120 tick/s，因此 15 对应每音约 0.125 秒 |

字符串会去空白并转小写。`tones/volumes/effects` 比 `notes` 短时循环使用，不需要把相同值重复写很多次；空轨道分别按三角波、音量 7、无效果处理。

```python
sound = pyxel.sounds(0)
sound.set("c3 e3 g3 c4", "t", "5", "n", 15)
pyxel.play(0, 0)
```

这里 `c3` 中的数字是八度；[MML](./mml) 里的 `C4` 表示四分音符，八度另用 `O` 设置，不能混用两种语法。

底层 `speed` 存为 16-bit 无符号整数，建议使用 `1..65535`，不要传 0、负数或依赖溢出转换。字符串解析失败通常只返回底层失败状态，而绑定未把它统一转换为 Python 异常；参数格式应由应用保证。

### Sound 全部方法

| 方法 | 参数、默认值与返回 |
| --- | --- |
| `set(notes,tones,volumes,effects,speed)` | 见上文 |
| `set_notes(notes)` | 必填上述音符字符串，替换音符轨道 |
| `set_tones(tones)` | 必填上述音色字符串，替换音色轨道 |
| `set_volumes(volumes)` | 必填上述音量字符串，替换音量轨道 |
| `set_effects(effects)` | 必填上述效果字符串，替换效果轨道 |
| `get_speed()` | 返回整数，初建 Sound 默认 30 |
| `set_speed(speed)` | 必填整数，同时根据轨道重新生成播放命令 |
| `get_notes()` | 返回 Notes 可变视图，值为音符编码；休止符为 -1 |
| `get_tones()` | 返回 Tones 可变视图，值为音色整数编号 |
| `get_volumes()` | 返回 Volumes 可变视图，值为 0..7 |
| `get_effects()` | 返回 Effects 可变视图，值为 0..5 |
| `mml(code=None)` | 位置参数可省略；字符串解析成 MML 命令；省略或 None 清空命令 |
| `total_sec()` | 返回秒数 float；无法计算有限时长时返回 None |

上述方法全部仅位置参数，设置操作返回 `None`。

### 轨道与 MML 命令的优先级

Sound 既有 notes 等轨道，也有预生成的命令。播放时已有命令优先，否则按轨道即时生成。当前 `set()` 和四个 `set_*` 字符串方法不会自动清掉旧命令；`set_speed()` 与视图单项赋值则会重新生成轨道命令。

因此复用一个曾经写入 MML 的 Sound 时，明确切回轨道：

```python
sound = pyxel.sounds(0)
sound.mml()  # 清掉旧命令，后续按轨道播放
sound.set("c3e3g3", "t", "5", "n", 15)
pyxel.play(0, 0)
```

`mml()` 不会清除 notes 轨道，所以它不是“清空整个 Sound”或“停止通道”；停止正在播放的声音用 `stop()`。

### Notes / Tones / Volumes / Effects 视图

这些视图由 `get_*()` 返回，不通过模块级构造函数创建。支持 `len(view)`、整数索引读取和赋值、`view.to_list()`。支持有效的负索引，不支持切片、删除或 append；需要改变长度时使用对应字符串设置方法。

```python
notes = pyxel.sounds(0).get_notes()
print(notes.to_list())
notes[0] = 36  # c3，C0=0；赋值会重新生成轨道命令
```

它们不是副本，赋值会改变 Sound。`to_list()` 才返回复制的 Python 列表。底层单项赋值不完整校验语义范围，保持 notes 为有效编码/休止符，tones 为 0..3，volumes 为 0..7，effects 为 0..5。

## Music：为各通道组织序列

### `music.set(*seqs)`

每个位置参数是一个 Sound 编号 list/tuple，依次对应通道 0、1、2、3。返回 `None`。无参数清空 Music 的通道序列。即使创建更多序列，当前播放器也只使用前 4 条。

```python
pyxel.sounds(0).set("c3e3g3", "t", "5", "n", 20)
pyxel.sounds(1).set("c2r", "s", "3", "n", 30)
pyxel.musics(0).set([0, 0], [1, 1], [], [])
pyxel.playm(0, should_loop=True)
```

### 序列视图

`music.seqs()` 返回 Seqs 视图：

| 操作 | 含义 |
| --- | --- |
| `len(seqs)` | 通道序列数量 |
| `seqs[i]` | 返回该通道的 Seq 视图 |
| `seqs[i] = [0,1]` | 替换已有通道的编号序列 |
| `seqs.to_list()` | 复制为二维 Python list |
| `len(seq)`、`seq[j]`、`seq[j] = n` | 访问和修改某个 Sound 编号 |
| `seq.set([0,1,2])` | 替换整个 Seq，可改变长度 |
| `seq.to_list()` | 复制为一维 Python list |

索引必须为整数，可使用有效负索引，不支持切片或删除。不能通过赋值越界扩展通道数量，应重新 `music.set(...)`。重新设置 Music 后重新取得 Seq，不要继续使用指向旧序列的包装。

`music.snds_list()` 是已弃用别名，返回与 `seqs()` 相同的视图并打印一次提示。它不是公开属性数组。

## Channel：通道控制

| 方法 | 参数、默认值与返回 |
| --- | --- |
| `gain()` | 返回线性增益 float，默认 0.125 |
| `set_gain(value)` | 必填数值，返回 None；当前绑定未限制上限，建议使用非负且较小值 |
| `detune()` | 返回整数微调量，单位 cents，默认 0，100 cents 为一个半音 |
| `set_detune(value)` | 必填 32-bit 有符号整数，单位 cents，返回 None |
| `play(snd,sec=None,should_loop=None,should_resume=None,tick=None)` | 与顶层 play 同义，但无 channel 参数；支持独立 Sound 对象，返回 None |
| `stop()` | 停止本通道，返回 None |
| `play_pos()` | None 或 `(sequence_index,elapsed_sec)`，语义同顶层接口 |

除了 `play()` 的可选关键字参数外，其余方法按位置传参。

```python
channel = pyxel.channels(0)
channel.set_gain(0.125)
channel.set_detune(10)
channel.play(0, should_loop=True)
```

## Tone：波表与噪声

音色编号常量为 `TONE_TRIANGLE=0`、`TONE_SQUARE=1`、`TONE_PULSE=2`、`TONE_NOISE=3`。它们是**全局音色编号**，不要当成下面的生成模式。

当前默认音色：

| 编号 | 模式 | 波表长度 | 有效位数 | gain |
| --- | --- | --- | --- | --- |
| 0 | 波表，三角形 | 32 | 4 | 1.0 |
| 1 | 波表，方波 | 2 | 4 | 0.8 |
| 2 | 波表，窄脉冲 | 4 | 4 | 0.8 |
| 3 | 长噪声 | 0 | 不靠波表发声 | 0.6 |

| 方法 | 参数、默认值与返回 |
| --- | --- |
| `get_mode()` / `set_mode(value)` | 模式整数：0 波表、1 短噪声、2 长噪声；独立 Tone 默认 0 |
| `get_sample_bits()` / `set_sample_bits(bits)` | 波表采样有效位数，独立 Tone 默认 4；传正整数 1..32；底层把 0 调整为 1，大于 32 调整为 32 |
| `get_gain()` / `set_gain(value)` | 线性增益，独立 Tone 默认 1；负数归零，过大可能削波 |
| `get_wavetable()` | 返回 Wavetable 可变视图 |
| `get_noise()` / `set_noise(value)` | 已弃用，分别对应 get_mode / set_mode |
| `get_waveform()` | 已弃用，等同 get_wavetable，不是 PCM 输出数据 |

所有 setter 参数必填、仅位置参数，返回 `None`。

Wavetable 支持 `len()`、整数索引读取/赋值、`to_list()`、`from_list(values)`。后者接收 list/tuple，替换完整波表，可改变长度。默认位数 4 时每个采样应为 `0..15`；一般范围是 `0..2**bits-1`。无切片、删除或 append。

```python
tone = pyxel.tones(0)
tone.set_mode(0)
tone.set_sample_bits(4)
tone.get_wavetable().from_list([0, 4, 8, 12, 15, 12, 8, 4])
tone.set_gain(0.5)
```

32 是默认三角波的表长，不是 `from_list()` 强制限制。原始表、缓存表与归一化波形都会占用内存；不要用它加载整首 PCM，也不要逐帧创建或替换长表。修改全局 Tone 会影响所有引用该编号的音符。

效果常量还包括 `EFFECT_NONE=0`、`EFFECT_SLIDE=1`、`EFFECT_VIBRATO=2`、`EFFECT_FADEOUT=3`、`EFFECT_HALF_FADEOUT=4`、`EFFECT_QUARTER_FADEOUT=5`。

