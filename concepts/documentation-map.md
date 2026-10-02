# 文档框架与补全顺序

这是一版基于源码的文档框架。已建立概念、接口索引和示例索引；完整参数说明与端到端教程将逐模块补全。本文不是尚未实现功能的接口承诺。

## 信息架构

文档按“概念 → 完成一件事 → 查接口 → 排错”组织，不照搬源码文件树。

| 模块 | 已整理页面 | 后续主题与建议文件 |
| --- | --- | --- |
| 核心概念 | `concepts/index.md` | 运行环境、通信通道、设备身份、请求与会话 |
| Bot | 概览、运行框架、快速开始；上下文、消息、按钮、媒体、命令与群聊；设备关联、设备 RPC SDK、RPC 与通知教程；接口索引 | 后续单独补充 `webapp.md` 请求/推送/策略；当前教程入口见 [Bot SDK](/bot/) |
| WebApp | `webapp/index.md`、`webapp/reference.md` | `quick-start.md`；`messaging.md` 请求/应答/推送；`devices.md` 查询/RPC/订阅；`media.md` 相机与 HTTP 上传；`lifecycle.md` 会话/资源清理 |
| BLE | `ble/index.md`、`ble/app/index.md`、`ble/app/webapp/`、`ble/app/mpy/`、`ble/custom-client.md` | 与 Bot、WebApp、设备端并列；按连接冒泡 App 与自定义中心设备分为两条阅读路径 |
| 设备 RPC 定义 | 后续归入设备端接口模块 | PixelMug / S1 的方法与参数，基础层与 ext 层；需专门核对 `devices` 源码 |
| 集成 | 本轮在示例索引中归档 HA | 后续 `integrations/hass/`，单独读 `devices/hass`，不把 HA 特有接口列为通用 Bot API |
| Studio | 保留 `studio/index.md` | 项目配置、npm 依赖、WebApp 地址、部署、日志；与 SDK 生命周期分开 |
| 维护资料 | 本页、`concepts/source-examples.md` | 来源、适用版本、核对状态；不放完整可运行项目 |

BLE 文档统一放在独立的 `ble/` 目录。“连接冒泡 App”包含总体框架与完整示例、WebApp SDK 接口和 MPY 接口；“连接自定义 BLE 中心设备”集中说明开放协议。Bot、WebApp 和设备端目录只保留相关入口链接。

## 优先补全顺序

| 顺序 | 交付内容 | 示例基础 |
| --- | --- | --- |
| 1 | 最小 Bot 收发消息；最小 WebApp 调用 Bot 并显示结果 | `reply_bot.js`、`test_message_bot.js`、`webapp-sum/` |
| 2 | 注册关联设备、兼容类型、设备 RPC、错误与超时 | `dev_binding_bot.js`、`dev_compatible_bot.js`、`async-device-call/` |
| 3 | WebApp 设备控制、事件订阅、多设备、Bot 推送 | `webapp-device/`、`webapp-multi-devices/`、`webapp-push/` |
| 4 | BLE 两种连接路径、应用接口与开放协议 | `tools/studio/examples/ble-minimal/`、`tools/studio/examples/ble-custom-client/` |
| 5 | 媒体、相机上传、GIF；进阶集成 | `media/`、`voice/`、`webapp-camera/`、`gif-player/`、`hass/` |

教程最终配套项目放在 `tools/studio/examples`。`docs` 只放说明、API 表、短代码片段和使用示例说明。本轮保留 `mps/jeejio-bubble/examples` 的现有目录，作为整理依据，不搬迁项目。

## 每篇接口说明的固定内容

| 项目 | 必须说明的内容 |
| --- | --- |
| 适用范围 | SDK 包版本、Node / Bubble App / 固件环境；哪些版本实际验证过 |
| 用途与前置条件 | 是否需要 Bot 启动、关联设备、宿主 bridge、MPY 应用已运行 |
| 导入与签名 | npm 子路径、同步或 Promise、参数是否可选 |
| 参数 | 类型、默认值、单位、允许值；尤其区分秒与毫秒、序号与 ID |
| 返回与事件 | 返回包裹层、事件对象结构、请求接收和执行完成的区别 |
| 错误 | 异常类型、业务码、超时、断线、可否重试及重复执行风险 |
| 最小片段 | 只展示本接口必要代码，不复制静态服务器等辅助实现 |
| 完整项目 | 指向可运行项目、配置步骤、预期结果 |
| 生命周期 | 启动、订阅、取消订阅、关闭；是否清理计时器和连接 |
| 来源 | 实现文件、相关测试、参考示例、最后核对日期 |

`system.*` 是 SDK 内置 WebApp 协议；示例的 `app.*` 是业务自行定义；`ha.*` 属于 HA 集成。三者应分开编写。

## 本轮发现的待核对项

以下来自源码审阅，本轮未修改 SDK 或示例。

| 项目 | 现状与对文档的影响 |
| --- | --- |
| 版本基线 | 本地 `package.json` 是 `0.1.1`，`sdk/constants.js` 的 `VERSION` 仍为 `0.1.0`。不据此推断 npm 最新版本；后续统一版本来源 |
| 类型声明 | `WebApp.d.ts` 未覆盖全部实现方法，BLE 声明也有概括类型。接口索引以实现为准，后续补齐类型再考虑自动生成 API |
| npm 与源码示例 | 示例多数使用相对源码导入和本地配置；正式教程需要改为已发布的 npm 子路径。浏览器裸导入包名需要打包器或显式模块映射 |
| BLE 基础 README | 指向 `mpy/ble_ctrl.json`，该文件未在当前目录发现；现有 `ble_ctrl.py` 与 `demo.py` 内容相同 |
| BLE 实时 README | 指向 `mpy/__main__.py`，当前目录实际提供 `touch.py` 和 `draw.py`；需选定并说明入口 |
| WebApp 打开条件示例 | 服务根路径指向 `/examples/webapp-access/index.html`，实际目录为 `webapp-access-policy`；不能直接复用根路径步骤 |
| HA README 命令 | 使用多个 `example:hass:*` 命令，当前 package scripts 未提供这些命令；后续教程应给出真实启动方式 |
| 示例静态服务 | 多个示例直接提供仓库根目录文件，包含本地配置所在目录；HA README 关于“不提供 token 文件”的描述与静态服务范围不一致。不能直接作为正式发布服务模板 |
| 设备 online 格式 | SDK 绑定归一化按 `true`、`1`、`"1"` 判断在线；Creator 接口又有 `ONLINE/OFFLINE`。应按不同 API 返回格式分别核对，不能互套 |
| 取消订阅结果 | Bot 内置取消设备订阅处理会移除订阅，但响应仍含 `subscribed: true`；不要用该字段说明取消后的状态 |
| 生命周期 | `BubbleWebApp.stop()` 停止心跳并上报关闭，并非销毁全部监听和待处理请求；BLE `close()` 不等于原生断开蓝牙；Bot `stop()` 主要停止轮询 |
| 服务端策略与兼容性 | `none/any/all` 的协议映射可从源码确认，App 实际准入行为、BLE 通道支持版本、固件协议细节仍需联调 |

## 审阅边界

本轮阅读 SDK 实现、类型声明与现有 SDK 测试，以及 examples 中的 Bot、HTML、JavaScript、CSS、Python 与 README。图片、音频、视频作为示例素材登记；本地凭据和历史运行日志不作为公开文档内容。

示例能证明“如何调用”，不能单独证明所有云端或硬件行为。后续每个模块完成真实运行验证后，再补充明确的版本与验证结果。
