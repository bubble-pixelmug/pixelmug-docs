# 错误处理与使用限制

WebApp 的业务请求和设备 RPC 走不同通道，失败形式也不同。界面层应分别处理，并在请求进行中给用户明确的状态反馈。

## 业务请求错误

`request()` 返回 Promise，以下情况会进入 `catch`：

- 冒泡 App 拒绝发送，请求确认码不是 200；
- Bot 返回失败响应；
- 在超时时间内没有收到 Bot 响应；
- 消息超过大小限制，或当前环境没有提供原生桥 `JeeWeb`。

```js
try {
  const response = await webApp.request('profile.get');
  renderProfile(response.result);
} catch (error) {
  showError(error.message);
}
```

冒泡 App 对“已发送”的确认不等于 Bot 已处理完成。`request()` 会继续等待具有相同请求 ID 的业务响应。

Bot 的 `onWebAppRequest()` 处理器抛出错误时，SDK 会向 WebApp 返回失败响应，并把错误交给 Bot 的错误处理流程。适合向用户展示的内容应由业务代码主动返回或使用稳定的错误码，不要依赖内部异常文本。

## 设备 RPC 错误

`callDevice()` 只有在设备响应码为 200 时才会成功。设备返回失败时会抛出 `DeviceRpcError`，其中常用字段有：

| 字段 | 含义 |
| --- | --- |
| `code`、`deviceCode` | 设备响应码 |
| `method` | 调用的 RPC 方法 |
| `response` | 原始设备响应 |
| `result` | 响应中的结果数据，如果存在 |

设备调用超时、桥接接口缺失或桥接层直接抛错时，可能得到普通 `Error`。因此业务代码可以先判断 `error.name === 'DeviceRpcError'`，再读取设备错误字段。

```js
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const rpc = deviceRpc.talSetBrightness({ percent: 60 });

try {
  await webapp.callDevice(device, rpc);
} catch (error) {
  if (error.name === 'DeviceRpcError') {
    showError(`设备执行失败：${error.code ?? '未知错误'}`);
  } else {
    showError(error.message);
  }
}
```

超时只表示 WebApp 没有在期限内收到结果，不能证明设备一定没有执行。对可能重复产生副作用的操作，不要在超时后无条件重试。

## 超时设置

业务请求和设备调用的默认超时都是 20 秒。可以在创建实例时统一设置，也可以为单次调用覆盖：

```js
const webApp = new BubbleWebApp({
  ble: false,
  timeoutMillis: 30_000,
});

await webApp.request('report.create', {}, { timeoutMillis: 60_000 });
await webApp.callDevice(device, rpc, { timeoutMillis: 30_000 });
```

## 消息大小

WebApp 通过冒泡 App 原生桥发送的完整消息默认上限为 256 KiB；Bot 发往 WebApp 的完整消息默认上限为 512 KiB。这里计算的是 SDK 包装后的整个 JSON 消息，不只是 `payload`。

WebApp 可以用 `maxPayloadBytes` 调整本地限制，Bot 可以用 `maxWebAppPayloadBytes` 调整发送限制。服务端和冒泡 App 的运行环境仍可能有自己的限制，因此不建议通过消息通道传输大文件。

图片、音频和视频应先上传到文件服务或 OSS，再通过 WebApp 消息传递 URL、文件类型和必要的元数据。直接传 Base64 会显著增大消息体。

## 兼容较旧的 Android WebView

冒泡 App 中的 WebApp 运行在系统 WebView 内。部分旧版 Android WebView 对原生桥的自动注入和较新的 JavaScript 语法支持不完整。需要覆盖这些设备时，建议在 HTML 的 `<head>` 中显式加载冒泡 App 的桥脚本：

```html
<script>
  if (!globalThis.JeeWeb) {
    const script = document.createElement('script');
    script.src = 'jeesdk://jeeweb.js';
    document.head.appendChild(script);
  }
</script>
```

入口代码尽量使用普通的异步初始化函数，避免在模块最外层直接使用 `await`。创建 `BubbleWebApp` 前可以短暂等待 `JeeWeb` 就绪，并把失败状态显示在页面上：

```js
initialize().catch((error) => {
  document.querySelector('#status').textContent = error.message;
});

async function initialize() {
  await waitForJeeWeb();
  const webapp = new BubbleWebApp({ ble: false });
  const devices = await webapp.getDevices();
  renderDevices(devices);
}

async function waitForJeeWeb(timeoutMillis = 3000) {
  const deadline = Date.now() + timeoutMillis;
  while (!globalThis.JeeWeb && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!globalThis.JeeWeb) {
    throw new Error('未连接到冒泡 App');
  }
}
```

Studio 会把 WebApp 转换为较稳妥的浏览器语法。使用自己的构建工具时，也应设置明确的 Chrome 和 Safari 兼容目标，避免直接发布未经转换的 ES2022 代码。仍无法启动时，建议先更新 Android System WebView。

## 排查问题

创建 WebApp 或 Bot 时设置 `debug: true`，可以看到请求、响应和队列分发日志。排查时优先记录请求类型、请求 ID、会话 ID、设备 ID 和 RPC 方法，避免把令牌或用户隐私数据写入日志。