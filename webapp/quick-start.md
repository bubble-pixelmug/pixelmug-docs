# 快速开始

下面是两个最小的完整示例，让开发者对一个 WebApp 有总体认识。第一个示例中，用户在与 Bot 的对话中打开 WebApp，页面向 Bot 发送问候请求，Bot 返回结果。第二个示例中，用户在 WebApp 中直接向设备发出 RPC 请求。

## 第一个 WebApp：hello bot

### 示例由两部分组成

```text
webapp-hello-bot/
├─ bot/
│  └─ index.js
├─ webapp/
│  ├─ index.html
│  └─ main.js
└─ package.json
```

Bot 提供页面入口并处理业务请求；`webapp/` 是在冒泡 App 中显示的前端页面。页面需要通过冒泡 App 能访问的 HTTP 或 HTTPS 地址提供。

### Bot 处理请求

```js
import {
  BubbleBot,
  InlineKeyboard,
} from '@jeejio-bubble/bot/sdk';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
});

bot.onWebAppRequest('app.hello', async (ctx) => {
  const name = String(ctx.webAppData.payload?.name || '朋友');
  return {
    message: '你好，' + name + '！',
  };
});

bot.on('message:text', async (ctx) => {
  if (ctx.message.text.trim() !== '/open') return;

  const keyboard = new InlineKeyboard()
    .url('打开 WebApp', process.env.STUDIO_WEBAPP_URL);

  await ctx.sendKeyboard('点击下面的按钮打开页面。', keyboard);
});

await bot.start({ device: false });
```

`onWebAppRequest()` 的返回值会成为 WebApp 响应中的 `result`。这个示例没有设备功能，因此 Bot 可以关闭设备轮询。

### WebApp 发出请求

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';

const webapp = new BubbleWebApp({ ble: false });

const response = await webapp.request('app.hello', {
  name: 'PixelMug',
});

document.querySelector('#result').textContent =
  response.result.message;
```

`ble: false` 表示这个页面不创建 BLE 管理器。本组文档中的示例均不依赖 BLE。

`BubbleWebApp` 默认使用 `globalThis.JeeWeb`。如果页面不在冒泡 App 中打开，构造函数会报告缺少冒泡 App 注入的 `JeeWeb` 桥接对象。

### 在 Studio 中运行

在 PixelMug Studio 中配置 Bot token 和 API 地址后启动智能体。Studio 会构建 `webapp/` 目录，并通过 `STUDIO_WEBAPP_URL` 把页面地址提供给 Bot。然后从冒泡 App 的 Bot 对话中发送 `/open`。

验证时应看到：

1. Bot 发出带页面链接的消息。
2. 页面在冒泡 App 中打开。
3. WebApp 的 `app.hello` 请求到达 Bot。
4. 页面显示 Bot 返回的 `response.result.message`。

## 第二个 WebApp：调用设备 RPC

这个示例在 Bot 中注册一个 PixelMug S1 slot，同时允许该 slot 关联 PixelMug P1。用户完成设备关联后，从 Bot 对话打开 WebApp，通过页面上的两个按钮直接打开或关闭设备屏幕。

### Bot 注册设备并提供页面入口

```js
import {
  BubbleBot,
  InlineKeyboard,
} from '@jeejio-bubble/bot/sdk';
import PixelMugS1 from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});

const mug = new PixelMugS1();
mug.name = '像素水杯';
mug.compatible = ['PixelMug'];
bot.registerDevices([mug]);

bot.on('message:text', async (ctx) => {
  const command = ctx.message.text.trim();

  if (command === '/bind') {
    await ctx.sendBindDevice({
      content: '请选择一台 PixelMug S1 或 PixelMug P1。',
      actionButtonTitle: '关联设备',
    });
    return;
  }

  if (command === '/open') {
    const keyboard = new InlineKeyboard()
      .url('打开设备控制', process.env.STUDIO_WEBAPP_URL);

    await ctx.sendKeyboard('打开 WebApp，控制水杯屏幕。', keyboard);
  }
});

await bot.setCommands([
  { command: 'bind', description: '关联 PixelMug' },
  { command: 'open', description: '打开设备控制页面' },
]);

await bot.start({ device: false });
```

`webAppDeviceAccess: 'any'` 表示用户至少关联一个 Bot 定义的设备后才能打开 WebApp。这里注册的是 PixelMug S1，但 `compatible` 允许同一个 slot 关联 PixelMug P1。兼容设备必须提供页面要调用的共同 RPC；本例使用的 `talSetDisplayOnOff` 同时受两个型号支持。

设备 RPC 由 WebApp 通过冒泡 App 直接发给设备，不需要 Bot 转发。本例也不监听设备事件，因此可以关闭 Bot 的设备轮询。

### WebApp 放置控制按钮

页面中放置两个按钮和一段状态文字：

```html
<button id="turn-on" type="button" disabled>Turn on display</button>
<button id="turn-off" type="button" disabled>Turn off display</button>
<p id="status"></p>
```

页面启动后先获取当前对话关联的设备，同时通过 PixelMug S1 设备 RPC SDK 创建 RPC 构造器。找到设备后启用按钮，再把构造好的 RPC 交给 `callDevice()` 发送：

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const webapp = new BubbleWebApp({ ble: false });
const [device] = await webapp.getDevices();
const turnOnButton = document.querySelector('#turn-on');
const turnOffButton = document.querySelector('#turn-off');
const status = document.querySelector('#status');

if (!device) {
  status.textContent = '请返回 Bot 发送 /bind，先关联设备。';
} else {
  turnOnButton.disabled = false;
  turnOffButton.disabled = false;
}

turnOnButton.addEventListener('click', () => setDisplay(true));
turnOffButton.addEventListener('click', () => setDisplay(false));

async function setDisplay(onoff) {
  turnOnButton.disabled = true;
  turnOffButton.disabled = true;
  status.textContent = onoff ? '正在打开屏幕…' : '正在关闭屏幕…';

  try {
    const rpc = deviceRpc.talSetDisplayOnOff({ onoff });
    await webapp.callDevice(device, rpc);
    status.textContent = onoff ? '屏幕已打开。' : '屏幕已关闭。';
  } catch (error) {
    status.textContent = `调用失败：${error.message}`;
  } finally {
    turnOnButton.disabled = false;
    turnOffButton.disabled = false;
  }
}
```

`deviceRpc.talSetDisplayOnOff()` 根据设备接口定义生成包含 `method` 和 `params` 的 RPC，业务代码不需要手工填写方法名。`getDevices()` 返回当前 Bot 对话已经关联的设备；本例只有一个 slot，因此直接使用列表中的第一台设备。`callDevice()` 使用设备对象中的 `slotId` 定位关联设备，并等待设备返回调用结果。

### 在 Studio 中运行

1. 在 Studio 中打开 `examples/webapp-device-rpc`，配置 Bot token 和 WebApp 访问地址。
2. 启动智能体，不需要运行设备代码。
3. 在冒泡 App 中发送 `/bind`，关联 PixelMug S1 或 PixelMug P1。
4. 发送 `/open` 并打开 WebApp。
5. 点击 “Turn on display” 或 “Turn off display”，观察设备屏幕状态。
