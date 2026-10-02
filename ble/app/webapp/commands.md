# 控制命令

例如，给设备发出一个 `echo` 命令，并附带命令参数：

```js
const response = await client.command('echo', { text: 'echo' });
console.log(response.result.text); // "echo"
```

第一个参数是命令名，第二个参数是传给设备的数据。设备必须注册同名处理函数，例如 `ble.command("echo", echo, mutates=False)`。处理函数返回的内容放在 `response.result` 中。

`await` 等待设备的处理结果。若设备返回失败，或等待响应最终超时，调用会抛出异常，页面可以用 `try / catch` 显示失败提示。设备端写法见[命令与响应](../mpy/commands)。

## 大消息处理

命令参数和返回结果都需要放入一条标准消息中。数据过大时，可能出现 `response too large; use config transfer`，此时不要继续扩大命令内容：

- WebApp 向设备下发歌曲列表、地图等较大数据时，使用 [`setConfig()`](./config)。
- WebApp 从设备读取播放列表、历史记录等较大数据时，设计分页命令，每次只返回一页。
- 连续传输二进制或实时数据时，使用 [Simple](./simple)，并由应用约定数据格式。

分页读取和配置下发的完整代码见设备端文档的[消息大小与失败](../mpy/commands#消息大小与失败)。