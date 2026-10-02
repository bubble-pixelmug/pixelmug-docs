# 02 · 通过 WebApp 与 PixelMug 交互

在[第一个示例](/getting-started/01-chat)中，你给 Bot 发文字，Bot 让水杯显示文字。这一次，我们把输入方式换成一个页面：输入文字、选择字体和颜色、调整滚动效果，再点击按钮发送给 PixelMug。

对话适合表达意图，页面适合组合多个选项、反复调整参数。**WebApp 就是在冒泡 App 中打开的网页应用**，它让同一个 Bot 拥有更丰富的交互界面。

本例支持 PixelMug P1 和 S1 系列，不需要 MPY，也不使用 BLE。项目位置：`getting-started/02-pixel-text`。

## 一、在 Studio 中体验

选择应用、填写 token、关联设备的方法与第一篇相同。这里重点看新增的 WebApp 配置和操作。

### 1. 选择应用并配置访问地址

如果上一个示例还在运行，先停止智能体，再选择整个 `getting-started/02-pixel-text` 文件夹。

在“选择应用 → 运行配置”中确认：

| 配置项 | 本例如何设置 |
| --- | --- |
| Bot 入口 | `bot/index.js` |
| Bot token | 填入你的 Bot token；可以沿用第一篇的 Bot，先停止旧实例 |
| WebApp 访问地址 | 选择手机能够访问的电脑局域网 IP，或使用默认的 `pixelmug-studio.local` |

本例包含 `webapp/`，因此 Studio 会显示 WebApp 访问地址选项。

**手机端的冒泡 App 需要访问电脑提供的网页服务。** 请让运行 Studio 的电脑、运行冒泡 App 的手机和 PixelMug 位于同一个局域网。如果手机无法解析 `pixelmug-studio.local`，可以改用局域网 IP；运行中修改地址需要先停止智能体。

### 2. 启动、关联并打开页面

点击“启动智能体”，等待 Bot 和 WebApp 服务启动。在冒泡 App 中打开 Bot 私聊：

1. 发送 `/help` 查看介绍。
2. 用 `/bindPixelMug` 关联水杯，也可以在 Studio 的“关联设备”中完成。
3. 发送 `/webApp`，点击回复中的“打开文字控制器”。

页面会先显示“正在读取关联设备…”，找到设备后变为“准备好啦：设备名称”，并启用“显示到 PixelMug”按钮。如果提示没有关联设备，先完成关联，再重新打开页面。

### 3. 调整文字与显示效果

输入 `Hello PixelMug`，点击“显示到 PixelMug”，观察水杯显示。再尝试：

- 将字体从“中”改为“小”或“大”。
- 点击颜色色块，选择另一种颜色。
- 切换滚动方向，调整速度后再次发送。
- 关闭“滚动显示”，让文字保持静止。

颜色控件是 HTML 原生颜色选择器，手机系统决定它的面板样式。

## 二、改一行代码，再试一次

在 Studio 文件树中打开 `02-pixel-text → webapp → index.html`，找到：

```html
<input id="color" type="color" value="#00ff00">
```

把默认绿色改为橙色：

```html
<input id="color" type="color" value="#ff8800">
```

保存后重启智能体，关闭旧页面，再通过 `/webApp` 打开文字控制器。此时默认颜色应为橙色，点击“显示到 PixelMug”验证效果。

Studio 会在启动或重启时自动构建 WebApp，并打包它导入的 npm 依赖。你不需要手动构建，也不需要知道 SDK 安装在电脑的哪个目录。保存文件后，已打开的手机页面不会自动更新，需要重新打开。

## 三、对照源码理解新增部分

项目分为两部分：

```text
02-pixel-text/
├─ bot/
│  └─ index.js       注册设备、处理命令、提供页面入口
└─ webapp/
   ├─ index.html    输入框、颜色选择器、滑块和按钮
   ├─ style.css     页面样式
   └─ main.js       获取设备、读取输入、调用设备
```

Bot 运行在电脑上的 Node.js 环境中，WebApp 的 JavaScript 运行在手机冒泡 App 的 WebView 中。冒泡 App 提供页面与平台交互的桥接能力。

三端在本例中的分工是：

| 部分 | 负责什么 |
| --- | --- |
| Bot | 注册设备位置、处理帮助与关联命令、发出 WebApp 入口 |
| WebApp | 显示控件、读取用户输入、获取关联设备、发起设备 RPC |
| PixelMug | 执行固件 TAL 接口，显示文字 |

第一篇是“对话 → Bot 业务代码 → 设备”；本篇的显示操作是“WebApp → 设备”。**不需要自己定义一套 WebApp 与 Bot 的文字控制协议，也不需要在 Bot 中编写转发显示指令的处理函数。** 获取设备时仍会使用 SDK 内置的请求机制，因此体验期间要保持 Bot 运行。

### Bot：设置打开 WebApp 前的设备关联检查

```js
const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: 'any',
});
```

相比第一篇，新增 `webAppDeviceAccess`，用于决定**打开 WebApp 前，是否需要检查 Bot 的设备关联位置（slot）已经绑定设备**。

| 配置值 | 打开 WebApp 的条件 |
| --- | --- |
| `'none'` | 不检查是否绑定设备，也是 SDK 的默认值 |
| `'any'` | 任意一个 slot 完成设备绑定，即可打开 |
| `'all'` | 所有 slot 都完成设备绑定，才可打开 |

本例设为 `'any'`，并且只注册一个 slot，因此需要先关联一只 PixelMug，再打开文字控制器。它控制的是页面打开前的关联检查，不是授予 WebApp 调用设备的权限。页面打开后，仍用 `getDevices()` 获取关联设备，供后续选择和调用。

设备声明、兼容 TALID 和 `registerDevices()` 与第一篇相同。这里 Bot 导入的是基础设备入口 `devices/pixelmug`，因为 Bot 只需要声明设备，不再生成文字显示指令。

### Bot：用链接按钮打开 WebApp

```js
if (text === '/webApp') {
  await ctx.sendKeyboard('打开文字控制器，设置 PixelMug 显示的文字。',
    new InlineKeyboard().url('打开文字控制器', process.env.STUDIO_WEBAPP_URL));
}
```

`InlineKeyboard` 创建消息中的按钮，`.url(标题, 地址)` 创建链接按钮，`ctx.sendKeyboard()` 将说明和按钮发到会话。点击后，冒泡 App 打开该网页。

`STUDIO_WEBAPP_URL` 是 Studio 启动应用时提供的环境变量，包含本次应用的访问地址。使用它就不必在 Bot 源码里写死电脑 IP 或页面路径。

文件末尾通过 `bot.setCommands()` 注册 `help`、`bindPixelMug`、`webApp` 三个命令。菜单注册和消息判断的关系与第一篇相同；这里的打开按钮直接使用 URL，不需要再处理一次 callback。

### WebApp：导入两个不同职责的 SDK

```js
import { BubbleWebApp } from '@jeejio-bubble/bot/sdk/WebApp.js';
import { rpc } from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

| 导入 | 作用 |
| --- | --- |
| `BubbleWebApp` | 使用冒泡 App 的桥接能力获取设备、调用设备 |
| `rpc` | 生成 PixelMug 的 RPC 指令，包括 `talPrintText()` 快捷方法 |

这里导入的 `rpc` 只是一组生成指令的方法，不代表一个真实设备，也不会注册新的关联位置。

两端都使用 npm 包名导入。Studio 会把 WebApp 用到的代码打包为浏览器可加载的文件。

### 获取设备：`getDevices()`

页面初始化时执行：

```js
webapp = new BubbleWebApp({ ble: false });
const devices = await webapp.getDevices();
device = devices.find((item) =>
  item.talId === 'PixelMug' ||
  item.talId === 'PixelMugS1' ||
  /pixelmug/i.test(item.name || '')
);
```

`new BubbleWebApp()` 使用冒泡 App 提供的桥接能力；`ble: false` 表示本例不启用 BLE 管理功能。

`getDevices()` 获取当前会话中的关联设备信息，不是 Studio“我的设备”中账号拥有的全部设备，也不是 Bot 中那个 JavaScript 设备实例。SDK 通过内置的 `system.getDevices` 请求完成查询，不需要我们在 Bot 中另写查询处理函数。

示例优先按 `talId` 判断 PixelMug 和 PixelMugS1，也保留了设备名称匹配，然后选择第一个符合条件的设备。本例只声明一个关联位置；如果应用有多个位置，应按对应的 `slotId` 或界面选择确定目标。

找到设备后，页面保存这个对象，后续发送指令时交给 `callDevice()`。若没有找到，就显示关联提示，而不是继续调用设备。

::: tip 在冒泡 App 中体验
普通手机浏览器可以用来检查网页地址是否可达，但没有冒泡 App 的桥接能力。完整的获取设备和控制流程，需要从冒泡 App 的 Bot 链接按钮打开。
:::

### 生成指令：`rpc.talPrintText()`

点击“显示到 PixelMug”时，页面读取控件的值：

```js
const command = await rpc.talPrintText({
  text: value,
  specifications: fontSize.value,
  color: color.value,
  direction: scroll.checked ? Number(direction.value) : 0,
  speed: Number(speed.value),
});
```

| 参数 | 来源与含义 |
| --- | --- |
| `text` | 输入框中的文字，去除两端空白后传入 |
| `specifications` | 字体选项：`SMALL`、`MEDIUM`、`LARGE` |
| `color` | 颜色选择器的值，例如 `#00ff00` |
| `direction` | `0` 静止；`1` 向左；`2` 向右；`3` 向上；`4` 向下 |
| `speed` | 速度滑块的值，本例范围为 10–200，数值越大越慢 |

HTML 的选择框和滑块通常通过 `.value` 返回字符串，所以方向和速度使用 `Number()` 转为数字。复选框通过 `.checked` 返回是否选中。

与第一篇相同，`talPrintText()` 负责把文字转换成设备所需的数据并生成 RPC；**调用它还不会让水杯显示文字**。区别在于，这一步现在发生在 WebApp 中。

### 发送指令：`webapp.callDevice()`

```js
await webapp.callDevice(device, command);
```

`device` 来自 `getDevices()`，用于确定关联位置；`command` 来自设备 SDK，描述要执行的方法及参数。

`callDevice()` 通过冒泡 App 的桥接发起设备调用，并等待响应。这里的“直接调用”表示不需要 Bot 业务代码转发，不代表通过局域网或 BLE 直接连接水杯；底层设备 RPC 通信由平台处理。

可以把这三步记成：

```js
const devices = await webapp.getDevices();      // 找到关联设备
const command = await rpc.talPrintText(params); // 准备 RPC 指令
await webapp.callDevice(device, command);       // 发起远程调用
```

这里的 `device` 是从 `devices` 中选出的目标，`params` 是页面收集到的文字和显示参数。

### 在页面中反馈结果

发送期间，示例禁用按钮并显示“正在发送文字…”。设备调用成功后显示完成提示；失败时把 `error.message` 显示在页面；最后恢复按钮，允许用户调整后重试。

这与第一篇的 `try / catch` 是同一种处理方式，只是结果从 Bot 聊天回复变成了页面状态文字。调用成功表示收到设备响应，不必等待整段滚动文字播放完毕。

## 页面打不开或设备没有响应时

| 现象 | 先检查什么 |
| --- | --- |
| 点击链接后一直加载 | Studio 是否运行；手机能否访问所选 IP 和端口；`.local` 是否可解析 |
| 提示缺少 `JeeWeb` | 是否从冒泡 App 的 Bot 链接打开，而不是普通浏览器 |
| 一直显示正在读取关联设备 | Bot 是否仍在运行；查看 Studio 的 Bot 与 WebApp 日志 |
| 提示未关联 PixelMug | 在当前会话完成设备关联，再重新打开页面 |
| 发送失败或超时 | 水杯是否在线，以及页面和日志中的具体错误 |
| 保存后页面还是旧内容 | 保存后重启智能体，关闭旧页面，再通过 `/webApp` 打开 |

## 接下来：增加设备端程序与 BLE

本例通过固件已经提供的 TAL 显示接口完成交互。继续阅读 [03 · 在 PixelMug 上安装和运行 MPY](/getting-started/03-ble-play)：通过 Studio 自动加载设备端程序，再用 WebApp BLE 实现手机与 PixelMug S1 系列的近距离交互。选择应用、配置、启动和编辑的步骤继续沿用前两篇。
