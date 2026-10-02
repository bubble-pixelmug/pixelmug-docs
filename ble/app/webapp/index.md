# WebApp BLE 接口

WebApp 通过冒泡 App 的手机蓝牙与 PixelMug 通信。网页使用 `BleAppClient` 连接设备、发送指令和接收数据，设备端使用 `maopaoBleApp.BleAppService` 处理这些请求。本页的所有网页代码均运行在冒泡 App 中。

## 创建客户端和连接管理

### 创建客户端并连接

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { BleAppClient } from '@jeejio-bubble/bot/sdk/BleAppClient.js';

const webapp = new BubbleWebApp();
const [device] = await webapp.getDevices();
const client = new BleAppClient(webapp.ble, { appId: 'BleMinimal' });

await client.connect(device);
```

- `webapp.getDevices()` 取得已关联设备，示例选择第一台；请先通过 Bot 绑定杯子。
- `appId` 指定要连接的 MPY 应用，必须与设备端的 `BleAppService("BleMinimal")` 一致。
- `await client.connect(device)` 等待 BLE 连接、冒泡鉴权和应用握手完成，之后即可发送命令。

如果页面需要判断当前能否交互，可以读取 `client.ready`：为 `true` 表示连接与应用会话均已就绪。入门示例直接等待 `connect()` 完成即可，其余构造选项通常使用默认值。

### 主动断开

`BleAppClient` 没有直接断开物理 BLE 连接的接口。最小示例在 MPY 中注册了自定义的 `disconnect` 命令，网页通过该命令请求设备主动断开：

```js
await client.command('disconnect', {}, { retries: 0 });
```

这里的 `retries: 0` 表示不自动重试这次断开请求。设备先返回命令响应，再调用 `ble.disconnect()`；因此收到响应只表示设备已经处理命令，不表示 BLE 连接已经断开。

### 重新连接

等杯子显示 DISC 后，调用：

```js
await client.reconnect();
```

`reconnect()` 使用此前连接过的设备，不需要重新传入 `device`。它不会先切断已有连接，因此最小示例按“断开 → 等待 DISC → 重连”的顺序操作。

### 页面退出

页面退出时释放客户端和 WebApp 持有的监听：

```js
window.addEventListener('pagehide', () => {
  client.close();
  webapp.stop();
});
```

`close()` 不会断开物理 BLE 连接；需要主动断开时，先执行上面的断开流程。完整实现见[最小示例](../)。
