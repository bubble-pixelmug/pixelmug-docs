# 接收设备主动上报事件

设备事件由设备主动产生，例如充电状态发生变化。WebApp 接收事件需要完成两个步骤：使用 `onDeviceEvent()` 注册处理器，再使用 `subscribeDeviceEvents()` 订阅需要关注的设备。

## 注册事件处理器

```js
webapp.onDeviceEvent(handleDeviceEvent);
```

`onDeviceEvent(handler)` 告诉 WebApp 收到设备事件后调用哪个函数。它只负责处理 Bot 已经转发到页面的事件，不会自动订阅设备。一个处理器可以接收当前页面订阅的所有设备事件，再根据事件中的设备信息分别处理。

通常先注册处理器，再发起订阅，避免订阅成功后产生的第一条事件没有对应处理逻辑。

## 订阅设备

```js
const devices = await webapp.getDevices();
const mug = devices[0];

await webapp.subscribeDeviceEvents(mug);
```

`subscribeDeviceEvents(device)` 告诉 Bot 将这台设备后续上报的事件转发给当前 WebApp 页面。传入的设备对象应直接来自 `getDevices()`。订阅只对之后产生的事件生效，不会返回或补发历史事件。

这条链路要求：

- Bot 消息轮询正在运行，以处理 WebApp 的订阅请求；
- Bot 设备轮询正在运行，以接收设备的上报事件；
- WebApp 会话处于活跃状态；
- 订阅使用的 `deviceId` 与通知来源一致。

## 事件对象格式

`onDeviceEvent()` 的回调中，业务通常只需要读取 `payload` 里的设备和事件列表：

```js
{
  payload: {
    device: {
      deviceId: 'device-id',
      name: '我的像素水杯',
    },
    events: [
      {
        method: 'CurChargingState',
        params: { value: 1 },
      },
    ],
  },
}
```

- `device`：订阅时使用的设备对象，用于确定是哪台设备；
- `events`：设备本次上报的事件数组，一次通知可能包含多个事件。

原始事件使用 `method` 表示事件名称，具体 `params` 由设备接口定义。

## 使用设备 RPC SDK 解析事件

Bot 业务代码处理设备通知时通常会调用设备 RPC SDK 的 `parseNotify()`。WebApp 订阅通道转发的是尚未调用 `parseNotify()` 的事件数组，因此页面也可以使用同一个方法完成解析。这个方法只处理事件数据，不依赖 Bot 的消息上下文。设备 RPC SDK 直接导出 `parseNotify`，导入它只会获得事件解析函数，不会创建、注册或连接设备。

```js
import { parseNotify } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

function handleDeviceEvent(event) {
  const device = event.payload?.device;
  const rawEvents = event.payload?.events || [];
  const events = parseNotify(rawEvents);

  for (const item of events) {
    if (item.name !== 'CurChargingState') continue;

    const value = item.params?.value;
    const charging =
      value === true || value === 1 || value === '1';

    updateChargingState(device.deviceId, charging);
  }
}
```

`parseNotify()` 将原始事件的 `method` 转换为更适合业务处理的 `name`，并忽略设备 RPC SDK 不识别的事件。页面应使用当前 slot 对应的设备 RPC SDK；如果该 slot 允许关联兼容型号，只处理这些型号共同支持的事件。

不要直接使用 `Boolean(value)` 解析可能为字符串的状态，因为 `Boolean('0')` 也是 `true`。
## 多设备页面

为多个设备分别调用 `subscribeDeviceEvents()`，并按 `deviceId` 保存状态：

```js
for (const device of devices) {
  await webapp.subscribeDeviceEvents(device);
}

const stateByDevice = new Map();
```

收到事件后先匹配 `event.payload.device.deviceId`，再更新对应卡片。不要把最后一次通知当作当前选中设备的通知。

设备关联变化后，实际 `deviceId` 可能改变。页面应刷新设备列表，为新设备重新订阅，并清理旧设备的界面状态。

## 取消订阅

```js
await webapp.unsubscribeDeviceEvents(mug);
```

`unsubscribeDeviceEvents()` 完成后，Bot 会停止向当前 WebApp 页面转发这台设备之后上报的事件。

`stop()` 不会逐个调用取消订阅。页面关闭后，Bot 会在收到关闭消息或会话过期时停止向该会话转发。