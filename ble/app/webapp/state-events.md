# 状态、事件

## 读取 MPY 应用的当前状态

`requestSnapshot()` 中的“快照”，指的是 **MPY 应用在读取时返回的一组当前值**。具体有哪些字段，由开发者在设备端定义。

例如，游戏应用希望网页显示当前分数和游戏是否进行中，MPY 可以这样提供状态：

```python
state = {"score": 0, "playing": False}

ble.set_state_provider(lambda: dict(state))
```

游戏逻辑更新 `state` 后，网页随时可以主动读取：

```js
const state = await client.requestSnapshot();
console.log(state.score);   // 当前分数
console.log(state.playing); // 当前是否正在游戏
```

这里直接返回状态对象，不需要再取 `result`。它适合在页面打开、重新连接或点击“刷新”时，把界面更新为设备当前状态。

设备只返回状态提供函数给出的内容。没有调用 `set_state_provider()` 时，默认得到空对象 `{}`。

## 接收 MPY 状态变化和事件通知

`client.on(type, handler)` 注册接收函数，消息到达时 SDK 自动调用 `handler`。这里先区分两种业务通知：

| 消息类型 | 表示什么 | 例子 |
| --- | --- | --- |
| `state` | 应用当前值发生变化 | 当前分数变成 10、播放状态变为暂停 |
| `event` | 应用中发生了一件事 | 游戏结束、配置应用完成 |

网页先注册监听：

```js
function showState(state) {
  console.log('当前分数：', state.score);
}
client.on('state', showState);

client.on('event', (event) => {
  if (event.event === 'gameOver') {
    console.log('游戏结束，得分：', event.score);
  }
});
```

对应的 MPY 代码，在分数变化或游戏结束时发送通知：

```python
state["score"] = 10
ble.publish_state()  # 发送状态提供函数返回的当前值

ble.send_event("gameOver", {"score": state["score"]})
```

不再需要某个监听时，传入原来的函数取消：

```js
client.off('state', showState);
```

`requestSnapshot()` 是网页主动读取；`on('state', ...)` 用于接收状态更新。事件不会自动保存为历史记录供重连后补读。设备端的自动状态推送规则及更多说明见[状态与事件](../mpy/state-events)。

## 示例：使用 state 和 event

`examples/ble-event-state` 中，MPY 从 0 开始每秒计数，到 99 后回到 0。WebApp 显示“当前计数”和“最近一次事件”：

| 计数变化 | state：当前值 | event：发生的事情 |
| --- | --- | --- |
| 8 → 9 | `{ count: 9 }` | 无 |
| 9 → 10 | `{ count: 10 }` | `multipleOfTen`，计数到达 10 |
| 10 → 11 | `{ count: 11 }` | 无，页面保留上次事件提示 |
| 99 → 0 | `{ count: 0 }` | `counterReset`，开始新一轮 |

### MPY：定义状态并发送通知

设备端先创建服务，并指定读取状态的函数：

```python
from maopaoBleApp import BleAppService

ble = BleAppService("BleEventState")
count = 0

def read_state():
    return {"count": count}

ble.set_state_provider(read_state)
ble.start()
```

`set_state_provider()` 注册函数，不会持续监视 `count` 的变化。网页主动读取状态，或设备调用 `publish_state()` 时，服务才调用 `read_state()` 取得当前值。

下面是示例每秒执行的计数与通知部分，省略了计时和绘图代码：

```python
count = (count + 1) % 100

if ble.ready:
    ble.publish_state()

    if count == 0:
        ble.send_event("counterReset", {"count": count})
    elif count % 10 == 0:
        ble.send_event("multipleOfTen", {"count": count})
```

- `publish_state()` 使用刚才注册的函数，发布当前的 `{"count": count}`。对应 WebApp 的 state 监听。
- `send_event()` 的第一个参数是自定义事件名，第二个参数是随事件发送的数据。
- `ble.ready` 表示设备已建立应用会话，本例只在此时推送；未连接时计数仍继续。
- 0 只发送 `counterReset`，10、20…90 发送 `multipleOfTen`。刚启动显示 0 时不发送重置事件。

主循环仍需持续调用 `ble.poll()`，才能处理读取请求并发送排队的状态和事件。

### WebApp：分别更新计数和事件提示

网页创建使用同一应用标识的客户端。以下代码假定已按本页开头取得 `webapp` 和 `device`，页面有 `#count`、`#event` 两个显示元素：

```js
const client = new BleAppClient(webapp.ble, { appId: 'BleEventState' });

function showCount(state) {
  document.querySelector('#count').textContent = state.count;
}

client.on('state', showCount);

client.on('event', (event) => {
  if (event.event === 'multipleOfTen') {
    document.querySelector('#event').textContent = `计数到达 ${event.count}`;
  } else if (event.event === 'counterReset') {
    document.querySelector('#event').textContent = '计数归零，开始新一轮';
  }
});

// 先注册监听，再连接并读取当前值。
await client.connect(device);
showCount(await client.requestSnapshot());
```

`on('state', ...)` 中的 `state.count` 来自 MPY 的 `read_state()`。`on('event', ...)` 接收各类事件，通过 `event.event` 区分名称；MPY 发送的 `{"count": count}` 可直接从 `event.count` 读取。

连接后调用 `requestSnapshot()` 是为了立即取得当前计数。例如连接时杯子已经数到 37，页面就显示 37；之后依靠 MPY `publish_state` 推送继续更新，不需要网页每秒主动查询。“读取当前值”按钮也只是再次调用同一个接口，不会重置计数。

计数到 10 时，数字和事件提示一起更新；到 11 时，只有数字更新，事件提示仍为“计数到达 10”。重新连接可以读取当前状态，但不会补发断开期间发生的事件。
