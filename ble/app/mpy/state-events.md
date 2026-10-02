# 状态与事件

状态表示应用当前值；事件表示刚发生的事情。两者通过标准消息通道（F150）主动发送，不等待客户端业务确认。

完整项目见仓库中的 `examples/ble-event-state`：杯子每秒从 0 计数到 99，网页显示当前计数；到 10、20…90 时收到整十事件，99 回到 0 时收到重置事件。项目包含 Bot、WebApp 和 MPY，运行步骤见项目 README。

## 提供状态快照

```python
state = {"score": 0, "playing": False}

def read_state():
    return dict(state)

ble.set_state_provider(read_state)
```

状态提供函数不接收参数，返回可 JSON 序列化的对象。没有提供函数或返回空值时使用 `{}`。读取异常会报告给错误回调，并使用空状态。

hello 成功后会自动发送一次状态；客户端也可以调用 `client.requestSnapshot()` 主动读取。

## 发布状态

```python
state["score"] += 1
accepted = ble.publish_state()
```

`publish_state()` 默认读取状态提供函数，并把当前状态加入发送队列。也可以直接传入要发送的状态对象：

```python
ble.publish_state({"score": state["score"], "playing": state["playing"]})
```

返回 `True` 表示状态已加入发送队列，`False` 表示无法编码或超过消息上限。尚未发送的旧状态可能被新状态替换，因此它适合同步最新值，不保证每一次中间变化都送达。

成功执行 `mutates=True` 的命令或应用配置后，服务已经增加版本并发布状态，无需再为同一次修改手动增加版本。

## 发送事件

```python
ble.send_event("gameOver", {"score": state["score"]})
```

第二个参数是事件携带的数据，省略时使用空对象。返回 `True` 只表示事件已加入发送队列，不表示对端已经收到。需要确认结果的操作应使用命令，或由应用自行设计确认消息。

## 客户端接收

```js
client.on('state', (state) => {
  console.log(state.score, state.rev);
});
client.on('event', (event) => {
  if (event.event === 'gameOver') console.log(event.score);
});
const state = await client.requestSnapshot();
```

SDK 将状态或事件数据展开，同时附加 event、rev 字段。业务对象应避开这两个字段名，以免被覆盖。设备原始协议格式见[自定义终端接入](/ble/custom-client)。

SDK 发现状态版本跳跃时会尝试请求快照；这不是事件历史补发。应用重新连接后应重新获取当前状态。

## 发送时机与容量

建议在 `ble.ready` 后通过标准消息通道发送状态和事件。服务本身的入队方法不检查 ready，不应把它们当作离线消息存储。

断开后未发送的状态和事件会被清空。单条消息必须完整落在 `ble.max_message` 内，状态应精简，避免携带整张图片或完整配置文件。
