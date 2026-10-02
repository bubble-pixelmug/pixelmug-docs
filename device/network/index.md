# Network

PixelMug S1 系列的 MPY 应用可以通过 HTTP、HTTPS、WebSocket、TCP 和 UDP 与网络服务通信。Wi-Fi 的配置、连接、断开和恢复由设备固件统一管理，应用只负责建立自己需要的应用层连接。

## 选择接口

| 需求 | 推荐接口 | 特点 |
| --- | --- | --- |
| 调用 REST API、上传 JSON、下载文件 | [`requests`](./http) | 同步、接口简单，支持 HTTP 和 HTTPS |
| 接收服务器实时推送、保持双向长连接 | [`mps_websocket`](./websocket) | 异步，支持 `ws://`、`wss://`、消息大小限制和连接清理 |
| 使用私有 CA 或客户端证书 | [`ssl`](./tls) | 为 `requests`、`mps_websocket` 或原始 Socket 创建 TLS 上下文 |
| 实现自定义 TCP、UDP 协议 | [`socket`](./socket) | 底层接口，应用自行处理分包、超时和重连 |

这些模块已经随固件提供，不需要在 `mps.json` 中声明组件依赖。

## Wi-Fi 由固件管理

MPY 应用不应调用 `network.WLAN` 创建、关闭或重新配置 Wi-Fi。固件负责：

- 使用用户已经配置的网络凭据建立连接；
- 在网络断开后执行设备级恢复；
- 同步系统 UTC 时间；
- 在设备进入息屏策略时可能暂停 MPY 并关闭 Wi-Fi 射频；
- 恢复亮屏后重新启动并连接 Wi-Fi。

当前没有面向 MPY 应用公开的 Wi-Fi 配置接口，也没有建议应用依赖的“网络已经完全就绪”查询接口。`WLAN.isconnected()` 一类状态不能单独证明 DHCP 地址、DNS 和目标服务都已经可用。

应用应直接执行带超时的请求或连接；失败后关闭当前资源，并使用有上限的退避时间重试。

## 安全连接

使用 `https://` 或 `wss://` 时，当前固件默认：

- 使用 TLS 客户端模式；
- 要求验证服务器证书；
- 使用固件内置的公共 CA 证书包；
- 验证目标主机名；
- 使用固件维护的系统 UTC 判断证书有效期。

访问使用公共 CA 的服务时，不需要导入 `ssl`。只有私有 CA、客户端证书或原始 TLS Socket 才需要自行创建 `SSLContext`。

不要为了让连接成功而把 `verify_mode` 改成 `CERT_NONE`。

## 网络与设备生命周期

MPY 的内存状态会在息屏暂停期间（低功耗待机）保留，但 Wi-Fi 射频会被停止。恢复后，暂停前的 TCP、TLS 和 WebSocket 连接不能视为仍然有效。

应用应遵循以下规则：

1. 每次连接都设置超时。
2. 在 `finally` 中关闭 HTTP 响应、Socket 和 WebSocket。
3. 长连接断开后重新连接，并重新执行认证或订阅。
4. 不自动重放可能产生副作用的命令，例如支付、写入或控制操作。
5. 重试使用递增且有上限的等待时间，避免断网时持续占用 CPU。
6. 不在绘图、触摸或音频回调中执行长时间阻塞请求。

完整的恢复方式见[连接生命周期](./lifecycle)。


## 文档目录

- [HTTP 与 HTTPS](./http)
- [WebSocket](./websocket)
- [TLS 与证书](./tls)
- [Socket：TCP、UDP 与 DNS](./socket)
- [连接生命周期](./lifecycle)
