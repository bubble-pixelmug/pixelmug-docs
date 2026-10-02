# 示例来源索引

本轮以 `mps/jeejio-bubble/examples` 为阅读来源。下表路径均相对于该目录，覆盖其中的示例源码和说明；`studio-debug/debug` 是历史运行产物，不作为教程源码。

这里是文档素材目录，不是运行入口。完整可运行项目后续整理到 `tools/studio/examples`，不复制到 `docs`。现有源码示例多数依赖本地 `config.dev.js` 和 SDK 相对路径，不能直接当成已发布 npm 包内的文件。

## Bot 消息与设备

| 示例文件 | 展示能力 | 对应文档主题 |
| --- | --- | --- |
| `added_events_bot.js` | 添加联系人、加入群聊、发送欢迎信息 | 事件与群聊 |
| `reply_bot.js` | 引用消息回复 | 消息与 Context |
| `test_at_bot.js` | 群聊 @ 与发送目标 | 群聊策略 |
| `test_message_bot.js` | 文字/Markdown/键盘回调与媒体消息处理 | 消息类型、命令菜单 |
| `binding_devices_bot.js` | 多个设备声明、查询关联设备、观察关联变化 | 设备身份与关联 |
| `dev_binding_bot.js` | 关联卡片、开关屏幕、设备充电通知 | 绑定、RPC、设备事件 |
| `binding_multi_dev_bot.js` | 多 slot 控制与按聊天保存设备订阅 | 多设备上下文、通知路由 |
| `dev_compatible_bot.js` | `compatible` 声明与多 slot 关联 | TALID 兼容规则 |
| `print_text_ext_bot.js` | 扩展设备模块构造文字显示 RPC | ext 层、异步 RPC 构造 |
| `show_image_ext_bot.js` | 图片显示与同步图片显示 | 设备图片能力 |
| `mps-dev-bot.js` | 启动设备 WebREPL、读取 Wi-Fi 信息 | 开发工具与设备运行条件 |
| `async-device-call/test_async_print_text_bot.js` | 异步发送、最终结果、超时、故意调用不存在的 RPC | 异步任务与错误处理 |

部分示例包含演示用回退匹配、内存缓存和较短超时。正式多用户教程需要重新确认隔离与目标设备匹配，不应照搬为通用业务策略。

## 消息媒体

| 文件 | 展示能力 | 辅助素材 |
| --- | --- | --- |
| `media/test_input_file_bot.js` | OSS 上传、图片/视频发送、媒体与引用消息读取 | `media/1160x904.png`、`media/960x720.mp4` |
| `voice/test_voice_bot.js` | 回发语音、上传 OGG、读取 Opus 时长 | `voice/west.ogg` |

时长解析是示例工具函数，不是 `inputFile()` 自动提供的能力。文件路径、远端预设 URL 和尺寸信息应在正式示例中替换为可维护的素材与配置。

## WebApp 与 Bot、设备

以下每组均包含已阅读的 Bot 与网页实现。

| 示例及文件 | 业务流程 | 文档主题 |
| --- | --- | --- |
| `webapp-sum/bot.js`、`index.html` | `app.sum` 请求 → Bot 计算 → WebApp 读取 `response.result` | 第一个 WebApp、错误应答 |
| `webapp-push/bot.js`、`index.html` | `app.ready/ping/triggerPush`、Bot 发送 `app.push`、自建会话表 | 请求与推送区别、会话目标 |
| `webapp-access-policy/bot.js`、`index.html` | 切换 `none/any/all` 并尝试打开页面 | WebApp 打开条件验证 |
| `webapp-device/bot.js`、`index.html` | 查询设备、开关屏幕、订阅充电通知、测试不存在的 RPC | 宿主设备调用、事件和错误 |
| `webapp-multi-devices/bot.js`、`index.html` | 选择设备、设备 RPC、按设备维护通知状态 | 多设备页面 |
| `webapp-camera/bot.js`、`index.html` | 浏览器选图/拍照、Canvas 压缩、申请上传会话、HTTP 上传、OSS 与消息发送 | 大文件与业务请求分离 |
| `gif-player/test_gif_player_bot.js`、`index.html`、`gifs.js` | GIF 列表、网页校验并调用 `talPlayGif`、Bot 观察结果后发送 GIF 消息 | 设备调用观察、媒体联动 |

`webapp-push` 的五分钟业务会话缓存、相机的上传大小限制、GIF 示例的 32×16 / 40 KiB 校验都是该示例的规则，不能直接列为 SDK 通用默认值或全部设备规格。

## BLE 与 MPY 配对

| 文件 | 内容 |
| --- | --- |
| `webapp-ble/bot.js` | 声明 S1 设备、提供关联卡片和 WebApp 入口 |
| `webapp-ble/index.html` | `webapp.ble.connect()`、状态处理、发送方向字符 |
| `webapp-ble/mpy/ble_ctrl.py`、`mpy/demo.py` | `maopaoBle` 回调与轮询、MicroPyxel 方块移动；当前两份内容相同 |
| `webapp-ble/README.md` | 基础方向控制说明；包含待修正的文件引用 |
| `webapp-ble-rt/bot.js` | 实时触摸板入口 |
| `webapp-ble-rt/app.js` | `BleAppClient` 握手、三字节 Simple RAW、移动合并与点击优先队列 |
| `webapp-ble-rt/index.html`、`style.css` | 触摸板界面、触摸事件区域、连接状态 |
| `webapp-ble-rt/mpy/touch.py` | `BleAppService` Simple 数据接收、光标与粒子效果、性能统计 |
| `webapp-ble-rt/mpy/draw.py` | 相同消息格式的连续绘制与渐隐效果 |
| `webapp-ble-rt/README.md` | F160 示例协议与运行说明；MPY 入口引用待修正 |

设备端示例体现了连接、ready 和应用绘制循环的区别。它们能作为固件文档的使用示例，不能代替对 `maopaoBle` / `maopaoBleApp` 实现的接口审阅。

## Home Assistant 扩展

HA 示例使用 `devices/hass`，不是所有 Bot 都需要的核心依赖流程。本轮阅读了调用方式，完整 HA API 文档需另行审阅扩展实现。

| 文件 | 内容与归属 |
| --- | --- |
| `hass/ha_bridge_smoke.js` | HA 连接、实体/注册表、能力契约只读验证 |
| `hass/ha_event_monitor.js` | 状态、注册表、能力与原生事件监听 |
| `hass/ha_action_test.js` | 默认 dry-run，按配置执行并尝试恢复电源状态 |
| `hass/ha_control_bot.js` | Bot 命令调用 HA 实体、通知与相机快照上传 |
| `hass/ha_external_control_bot.js` | 外部 Connector 通道、实体操作与相机数据 |
| `hass/ha_webapp_bot.js` | `HassWebAppGateway`、只读/控制开关、用户授权、页面服务 |
| `hass/webapp/app.js` | `ha.bootstrap`、`ha.entity.call`、增量事件、实体筛选与灯光面板 |
| `hass/webapp/index.html`、`style.css` | HA 看板页面与控件样式 |
| `hass/test_support.js` | 配置覆盖、WebSocket 实现选择、测试辅助函数 |
| `hass/README.md` | 扩展运行说明，部分 npm 命令需更新 |

`ha.*` 请求和事件由 HA 网关集成提供，不是 `BubbleWebApp` 内置方法。相机 Buffer 上传、HA token、实体语义和外部连接应放在集成专题中说明。

## 配置、素材与运行产物

- `config.dev.js`、`config.pub.js`：Bot 环境配置；不把本机 token 值写入文档。
- `hass/ha.config.js`、`hass/ha.config.extern.js`：HA 本机环境与凭据配置；教程使用占位值或环境变量。
- 图片、MP4、OGG：示例素材，登记用途，不作为 API 定义。
- `studio-debug/debug/**`：已有运行记录，不纳入文档示例集。

## SDK 阅读来源对应表

| 实现文件 | 文档归属 |
| --- | --- |
| `index.js`、`BubbleSDK.js` | 导出入口、兼容入口 |
| `BubbleBot.js`、`BubbleApiClient.js` | Bot 生命周期、业务与云端接口 |
| `Context.js`、`ContextFactory.js` | 上下文、事件归一化 |
| `DeviceRegistry.js`、`DeviceBinding.js` | 设备声明、slot、关联信息 |
| `InlineKeyboard.js`、`InputFile.js` | 消息辅助能力 |
| `WebApp.js`、`WebApp.d.ts` | 网页业务与设备通信 |
| `BleManager.js` | BLE 传输与原生桥接 |
| `BleAppSession.js/.d.ts`、`BleAppClient.js/.d.ts` | BLE 应用协议与客户端 |
| `constants.js`、`errors.js` | 常量与错误模型 |
| `Dispatcher.js`、`Poller.js`、`Queue.js`、`TraceManager.js`、`utils.js` | SDK 内部机制，主要供维护说明与排错参考 |
| `BubbleBot.test.js`、`WebApp.test.js` | 设备 ACK 与最终响应、错误细节 |
| `BleSimple.test.js`、`BleAppSession.test.js` | Simple 数据、消息大小限制 |
| `Poller.test.js` | 轮询看门狗与真正网络错误的区别 |
