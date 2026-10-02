# 设置 WebApp 的打开条件

`webAppDeviceAccess` 用于设置用户打开 WebApp 前必须满足的设备关联条件。冒泡平台会检查当前 Bot 对话中的设备关联情况，再决定是否允许打开页面。开发者可以用它区分不依赖设备的 WebApp、关联任意一台设备即可使用的，以及必须配齐全部设备的 WebApp。例如，Word By 应用需要两只 PixelMug 分别显示一个字或单词，可以将打开条件设为 `all`；只有两个设备 slot 都完成关联后页面才会打开，避免用户进入页面后才发现设备不足。

## 三种打开条件

在创建 Bot 时通过 `webAppDeviceAccess` 设置：

| 配置值 | 打开条件 | 典型场景 |
| --- | --- | --- |
| `'none'` | 不要求关联设备 | 信息展示、账户设置或仅与 Bot 通信的页面 |
| `'any'` | 至少关联一个 Bot 定义的设备 | 可以控制任意一台已关联设备的页面 |
| `'all'` | Bot 定义的设备都已关联 | 多台设备必须配套工作的应用 |

```js
import { BubbleBot } from '@jeejio-bubble/bot';

const bot = new BubbleBot(process.env.BUBBLE_BOT_TOKEN, {
  apiBaseUrl: process.env.BUBBLE_API_BASE_URL,
  webAppDeviceAccess: 'any',
});

await bot.start();
```

Bot 启动时会把这项配置同步到服务端。用户尝试打开 WebApp 时，平台会根据当前对话中的设备关联情况检查条件；条件不满足时，页面不会打开。

这里的“设备”是 Bot 注册的设备 slot。`any` 表示这些 slot 中至少有一个已经关联设备；`all` 表示所有 slot 都已经完成关联。


## 作用范围

`webAppDeviceAccess` 只检查打开 WebApp 前的设备关联情况。页面打开后能够调用哪些设备 RPC，仍取决于已关联设备实际提供的接口。它也不代替账号、订单等业务数据的身份校验；这类请求应通过 [Bot 通信通道](./bot-channel)交给 Bot 处理。

`observeWebAppDeviceCalls` 与打开条件相互独立：前者让 Bot 观察 WebApp 发起的设备调用，后者决定用户打开页面前需要满足的设备关联条件。
