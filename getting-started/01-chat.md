# 01 · 通过对话与 PixelMug 交互

给 Bot 发一句“你好”，PixelMug 显示“你好”，Bot 再回复“杯子收到啦：你好”。这个示例把 [快速了解](/overview/) 中的“对话 → Bot → 设备”变成一次可以亲手完成的交互。

该示例支持 PixelMug P1 和 S1 系列。

项目位置：`getting-started/01-chat`。应用逻辑全部在 `bot/index.js` 中；本例没有 WebApp，也不需要 MPY。

## 一、在 Studio 中运行

### 1. 登录并选择应用

打开 Studio，用冒泡账号登录。请使用拥有这只 PixelMug 的账号，在“我的设备”中确认能看到它，并且状态为“在线”。

点击左侧“选择应用”，再点击“打开应用目录”，选择 `getting-started/01-chat` 文件夹。这里要选整个 `01-chat`，不要只选里面的 `bot` 文件夹或 `index.js` 文件。

选择后，左侧“选择应用”下面会出现 `01-chat` 文件树。即使页面已经跳到“调试运行”，也可以点回“选择应用”检查“运行配置”。

### 2. 配置应用

在“选择应用 → 运行配置”中确认以下内容：

| 配置项 | 本例如何填写 |
| --- | --- |
| Bot 入口 | `bot/index.js`，通常会自动识别 |
| Bot token | 填入你已经申请的 Bot token |
| 启动后自动运行设备代码 | 本例没有 `mpy/`，不需要开启 |

本例没有 `webapp/`，因此也不需要选择 WebApp 访问地址。Bot token 由 Studio 传给 Bot，不必写进示例源码；当前配置只保存在 Studio 进程中，完全退出 Studio 后需要重新配置。测试时，同一个 token 只运行一个 Bot 实例。

### 3. 启动智能体

进入“调试运行”，查看“当前状态”卡片。若提示检查不通过，按红色提示回到“选择应用”修正配置；配置正确后，点击“启动智能体”。

点击后会进入“智能体已启动，开始使用和测试吧”卡片，下面的说明随启动过程更新。等到 Bot 启动运行，再去冒泡 App 中交互；如果 Bot 启动失败，可以在“应用运行日志”的 Bot 日志中查看错误。

这里启动的是电脑上的 Bot 程序。水杯随后通过固件提供的 TAL 接口接收显示指令，不需要先上传代码到水杯。

### 4. 关联你的 PixelMug

在冒泡 App 中打开这个 Bot 的私聊，发送 `/help`，先看看示例介绍。

接着点击命令菜单中的 `/bindPixelMug`。Bot 会发出绑定请求，按请求中的“关联 PixelMug”入口选择你的设备即可。

你也可以在 Studio 的“调试运行 → 关联设备”中，找到“关联设备 1”，点击“选择并关联设备”，从匹配的设备中选择一个。Studio 会按这个位置声明的 TALID 和兼容 TALID 筛选设备。两种关联入口任选其一即可。

这里有两层不同的关系：

- “我的设备”表示这只水杯已经属于你的冒泡账号。
- “与智能体关联”表示这个 Bot 可以控制这个设备。

这就是软硬件解耦：设备提供能力，Bot 定义用途，两者通过关联关系和统一接口协作。它类似于给同一台设备使用不同的软件，不过 Bot 实际运行在电脑或服务器上，通过网络与 PixelMug 配合，并不需要安装到水杯内部。所以，水杯出现在“我的设备”中，并不等于当前 Bot 已经关联它。

### 5. 发一句话，观察水杯和回复

关联后，给 Bot 发送普通文字，例如 `你好`。

你应该看到水杯用绿色显示这段文字，并收到 Bot 的回复：

```text
杯子收到啦：你好
```

再试试自己的名字或一句短消息。整个过程是：你发消息，Bot 读取文字并调用设备，水杯执行，Bot 回复结果。

如果还未关联，Bot 会先发送绑定请求；如果设备调用失败或超时，Bot 会回复“显示失败：……”以及错误原因。可以先确认水杯在线，再结合 Studio 的 Bot 日志检查。

## 二、改一行代码，再试一次

在 Studio 左侧展开 `01-chat → bot`，点击 `index.js`。找到这行：

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
```

把绿色 `#00ff00` 改成橙色 `#ff8800`：

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#ff8800', speed: 80 });
```

点击编辑器的“保存”，或按 `Ctrl + S`（macOS 为 `⌘ + S`）。回到“调试运行”，点击“重启智能体”，等待 Bot 重新运行，再发一句话。水杯上的文字应该变成橙色。

保存会更新本机文件，重启才会让 Bot 加载新代码。本例的代码运行在电脑上，因此这次修改不用给水杯上传 MPY。

还可以把 `ctx.sendText` 中的“杯子收到啦”改成自己的回复，再保存、重启、发消息验证。这就是后面几个示例都会沿用的开发流程。

## 三、对照源码理解结构

回到 `bot/index.js`。它从上到下做五件事：导入 SDK、创建 Bot 和设备声明、注册消息处理、设置命令菜单、启动 Bot。下面按这个顺序阅读。

### Bot SDK 和设备 SDK 各做什么？

```js
import { BubbleBot } from '@jeejio-bubble/bot/sdk';
import PixelMug from '@jeejio-bubble/bot/devices/pixelmug/ext';
```

两个入口来自同一个 npm 包，但职责不同：

| 导入 | 在本例中的职责 |
| --- | --- |
| `BubbleBot` | 连接 Bubble 服务、处理消息、设置命令、查找关联设备、发送设备 RPC |
| `PixelMug` | 描述 PixelMug 的设备接口，并提供组织设备指令的方法 |

这里使用设备 SDK 的 `/ext` 入口，因为本例需要 `talPrintText` 这样的扩展辅助方法。它会把文字转换为设备可显示的数据，让应用只需提供文字和颜色。

对应“快速了解”的概念：Bot SDK 帮你编写业务逻辑，设备 SDK 帮你使用 TAL 定义的设备能力。

### 创建 Bot：token 从哪里来？

```js
const bot = new BubbleBot(process.env.BOT_TOKEN, {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
});
```

`new BubbleBot(...)` 创建 Bot 实例。`process.env` 是 Node.js 读取环境变量的入口；Studio 启动程序时，把运行配置中的 token 和可选 API 地址传进来。

因此，同一份代码可以使用你在 Studio 中配置的 Bot 身份运行，无需把 token 写死在文件中。

### 定义设备、注册位置与兼容 TALID

```js
const mug = new PixelMug();
mug.compatible = ['PixelMugS1'];
bot.registerDevices([mug]);
```

`mug` 是应用需要的一份设备声明：它依赖 `PixelMug` 这组接口。此时没有指定具体水杯的序列号，也没有连接某一只水杯。

`registerDevices([mug])` 声明一个设备关联位置，称为 **slot**。本例只有一个设备声明，所以 Studio 会显示一个“关联设备”卡片。Bot 启动时，SDK 会向服务同步设备声明，供用户随后关联实际设备。

`compatible = ['PixelMugS1']` 表示这个位置也接受 TALID 为 `PixelMugS1` 的设备。因此本例能用于 P1 和 S1 系列，它使用的是两者都支持的显示能力。

这正对应“快速了解”中 TALID 的作用：应用依赖接口集合，用户选择实际硬件。**声明兼容不会自动补齐接口**；只有应用用到的能力确实兼容时，才应把另一个 TALID 加入列表。

### 接收消息：`ctx` 是什么？

```js
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  // 处理命令、检查关联、调用设备、回复消息
});
```

`bot.on('message:text', ...)` 注册文字消息处理函数。Bot 收到文字消息后，SDK 调用这个函数，并把本次消息的上下文放在 `ctx` 中。

| 本例使用的内容 | 含义 |
| --- | --- |
| `ctx.message.text` | 用户发来的文字 |
| `ctx.chat` | 当前会话，用于在相应会话中调用关联设备 |
| `ctx.sendText(...)` | 向这次交互所在的会话回复文字 |
| `ctx.sendBindDevice(...)` | 发出关联设备的请求 |

`.trim()` 去掉文字两端的空白。`async` 和 `await` 让代码可以按顺序等待网络请求或设备结果，例如先等待设备调用完成，再回复用户。

### Bot 命令：注册菜单和处理消息

文件末尾先设置命令菜单，再启动 Bot：

```js
await bot.setCommands([
  { command: 'help', description: '了解这个 Bot 的使用方法' },
  { command: 'bindPixelMug', description: '关联你的 PixelMug' },
]);
await bot.start();
```

`setCommands` 把命令和说明注册到冒泡 App 使用的命令菜单。注册时写 `help`，不带 `/`；用户点击命令或手动输入时，本例收到并判断的是 `/help`。

命令菜单不会替你执行处理逻辑。因此消息函数里还需要对应的判断：

```js
if (text === '/help') {
  await ctx.sendText('这是一个最简单的 PixelMug Bot：发送文字，Bot 会让 PixelMug 显示它。\n\n使用 /bindPixelMug 关联设备。');
  return;
}

if (text === '/bindPixelMug') {
  await ctx.sendBindDevice({
    content: '请选择要关联的 PixelMug。',
    actionButtonTitle: '关联 PixelMug',
  });
  return;
}
```

`return` 结束这一次消息处理，避免把命令文字继续发送到水杯上。命令判断放在设备关联检查之前，因此尚未关联设备的用户也能查看帮助、发起关联。

`bot.start()` 则真正启动 Bot 的消息与设备处理。本例只处理上面两个明确的命令，其他非空文字用于显示到水杯。

### 绑定设备：从设备声明找到实际水杯

```js
if (!(await bot.isDeviceBound(ctx, mug))) {
  await ctx.sendBindDevice({ content: '先关联你的 PixelMug，再发一句话吧。' });
  return;
}
```

`isDeviceBound(ctx, mug)` 检查这次交互中的设备位置是否已经有关联设备。若没有，就发出绑定请求并结束当前处理，用户完成关联后再发送文字。

注意，`sendBindDevice` 是发起关联流程，最终还需要用户选择设备；`isDeviceBound` 检查关联关系，也不保证设备此刻在线。后面的实际调用仍可能失败。

这样，代码始终使用同一个 `mug` 声明，由会话与绑定关系确定具体设备，不必把你的水杯 ID 写进示例。

### 调用 RPC：准备指令，再等待设备结果

```js
const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
await bot.callDevice(ctx.chat, mug, rpc);
```

这两行有不同的任务：

1. `talPrintText` 把文字转换成设备所需的显示数据，构造 RPC 指令。`color` 指定颜色，`speed` 设置显示指令的速度参数。这一步还没有调用实际水杯。
2. `callDevice` 根据当前会话和设备位置发送这条 RPC，并等待设备响应。底层通信由 SDK 和平台处理。

这就是“快速了解”中的远程方法调用：Bot 运行在电脑上，显示动作发生在水杯上。`mug.rpc` 提供描述动作的方法，`bot.callDevice` 负责发起远程调用。

### Bot 回复消息与处理失败

```js
try {
  const rpc = await mug.rpc.talPrintText({ text, color: '#00ff00', speed: 80 });
  await bot.callDevice(ctx.chat, mug, rpc);
  await ctx.sendText(`杯子收到啦：${text}`);
} catch (error) {
  await ctx.sendText(`显示失败：${error.message}`);
}
```

调用成功后，`sendText` 把结果回复到聊天中；出现转换错误、设备调用错误或超时，则进入 `catch`，把失败原因告诉用户。这里等待的是设备调用结果，不表示一定要等屏幕上的整段文字播放结束才回复。

文件中的全局错误处理还会把 SDK 上报的错误写到日志中：

```js
bot.on('error', (ctx) => console.error(ctx.error.message));
```

使用 Studio 启动时，可以在 Bot 日志中查看这些输出。

## 接下来：通过 WebApp 与 PixelMug 交互

你已经完成了选择应用、配置、启动、关联设备，以及编辑保存和重启的完整流程，也能从源码中找到消息处理、设备声明和 RPC 调用的位置。

继续阅读 [02 · 通过 WebApp 与 PixelMug 交互](/getting-started/02-pixel-text)。它沿用这些基础，增加 `webapp/`：用户在冒泡 App 中打开文字控制器，设置文字、字体、颜色和滚动效果，再由 WebApp 获取关联设备并直接调用设备。教程重点解释 WebApp 访问地址、`getDevices()`、`talPrintText()` 和 `callDevice()`，不再重复本篇的基础操作。
