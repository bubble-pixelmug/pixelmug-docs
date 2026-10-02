# 命令与响应

命令适合需要明确结果的操作，例如读取信息、修改亮度或切换场景。它通过标准消息通道（F150）传输，需要应用会话已经就绪。

## 注册命令

```python
state = {"brightness": 50}

def set_brightness(params, context):
    value = int(params.get("value", 50))
    if not 0 <= value <= 100:
        raise ValueError("brightness must be 0..100")
    state["brightness"] = value
    return {"brightness": value}

ble.set_state_provider(lambda: dict(state))
ble.command("setBrightness", set_brightness)
```

`command()` 注册命令名和处理函数，同名注册会替换旧处理函数。

处理函数签名为 `handler(params, context)`。`params` 是 WebApp 传入的参数，缺省时为 `{}`；大多数应用不需要读取 `context`。返回值必须能序列化为 JSON，WebApp 从 `response.result` 读取它。处理函数抛出异常时，WebApp 的 `command()` 会失败并抛出错误。

`mutates=True` 时，处理函数成功返回后状态版本加一，并自动排队状态通知；只读命令应使用 `mutates=False`。

## 客户端调用

以下片段假定已创建并连接 `BleAppClient`：

```js
const response = await client.command('setBrightness', { value: 80 });
console.log(response.result.brightness);
```

## 重试与重复请求

SDK 超时后可能自动重试同一请求，设备会在当前连接中尽量避免重复执行。重连或设备重启后不能依靠这一机制去重。有副作用的命令应使用“设置目标值”的形式，例如 `setBrightness(80)`，避免设计成 `increaseBrightness(10)`；确实需要跨连接去重时，由应用在参数中加入业务 ID。

## 消息大小与失败

命令参数和返回结果经过 JSON 编码后都受 `ble.max_message` 限制，协议字段也会占用空间。默认上限为 384 字节，协商 MTU 较小时还会降低。

返回结果过大时会变成 `response too large; use config transfer` 错误。如果处理函数已经执行，这不会回滚操作。应根据数据方向选择接口：

| 数据方向和用途 | 建议接口 |
| --- | --- |
| WebApp 向设备下发歌曲列表、游戏地图等较大配置 | `setConfig()` |
| WebApp 从设备读取播放列表、历史记录等较大数据 | 用 `command()` 分页读取 |
| 设备连续上传二进制或大块数据，不要求每页都有命令响应 | Simple，并由应用设计分块和确认 |

配置传输目前只支持 WebApp 向设备上传，不能用于设备向 WebApp 返回大响应。状态、事件和 `requestSnapshot()` 也使用标准消息通道，具有相同的消息大小限制。

### 示例：下发歌曲列表

例如 WebApp 要把 10 首歌曲的名称和 URL 保存到设备，不要把整个列表作为 `command()` 参数发送。使用 `setConfig()` 分块上传：

```js
client.on('event', (event) => {
  if (event.event === 'configApplied' && event.name === 'playlist') {
    console.log('播放列表已保存，共', event.result.count, '首');
  }
});

await client.setConfig('playlist', {
  songs: [
    { name: 'Song 1', url: 'https://example.com/1.ogg' },
    { name: 'Song 2', url: 'https://example.com/2.ogg' },
    // 其余歌曲……
  ],
});
```

设备注册同名配置处理函数：

```python
import json

playlist = []

def apply_playlist(path, meta):
    global playlist
    with open(path, "r") as source:
        value = json.load(source)
    songs = value.get("songs")
    if not isinstance(songs, list):
        raise ValueError("songs must be a list")
    playlist = songs
    return {"count": len(playlist)}

ble.config("playlist", apply_playlist)
```

主循环仍需调用 `ble.poll()` 和 `ble.process_pending_config()`。上传完成只表示配置已经提交；收到 `configApplied` 才表示处理函数执行成功。临时文件、容量和错误处理见[配置传输](./config)。

### 示例：分页读取设备播放列表

设备向 WebApp 返回播放列表时，配置传输不能反向使用。推荐注册只读分页命令，每次只返回一首歌曲：

```python
def get_playlist_item(params, context):
    index = max(0, int(params.get("index", 0)))
    if index >= len(playlist):
        return {"item": None, "next": None, "total": len(playlist)}

    next_index = index + 1
    if next_index >= len(playlist):
        next_index = None

    return {
        "item": playlist[index],
        "next": next_index,
        "total": len(playlist),
    }

ble.command("getPlaylistItem", get_playlist_item, mutates=False)
```

WebApp 连续读取，直到 `next` 为 `null`：

```js
const playlist = [];
let index = 0;

while (index !== null) {
  const response = await client.command('getPlaylistItem', { index });
  if (response.result.item) playlist.push(response.result.item);
  index = response.result.next;
}
```

分页后每个完整响应仍必须小于 `max_message`。如果单首歌曲的信息本身就过大，应缩短字段、只返回设备端 ID 后按需查询，或改用 [Simple](./simple) 传输并自行加入传输编号、分块序号和确认机制。不要把完整播放列表放进 state、event 或 snapshot，它们不会绕过消息上限。

处理函数应先验证参数，再执行修改，避免返回失败前已经产生部分副作用。
