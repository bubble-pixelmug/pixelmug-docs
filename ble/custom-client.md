# 连接自定义 BLE 中心设备

本页适用于 `AUTH_MODE_NONE` 开放连接模式。PixelMug 是 BLE Peripheral / GATT Server，自定义终端作为 Central / GATT Client 主动扫描和连接。无需冒泡 App、冒泡鉴权凭据。

本文使用两个通道名称：标准消息通道对应 F150，高速数据通道对应 F160（Simple）。下面的 UUID 和 Simple 包头名称保留协议原名。

本文定义接入现有应用服务所需的协议。它不开放设备端底层模块，也不提供 PixelMug 主动连接其它外设的接口。不同终端的 BLE API 和 MTU 能力不同，接入时需进行实机验证。

## 完整示例：用 ESP32-C3 开发板做中心设备

仓库中的 `examples/ble-custom-client` 包含运行在 PixelMug 上的 `mpy`，以及运行在 ESP32-C3 上的 `custom-client-c3`。C3 作为 BLE 中心设备扫描并连接 PixelMug，每秒发送一个数字 0～9，随后主动断开；杯子依次显示 `DISC → CONN → 0…9 → DISC`。

C3 端提供 ESP-IDF 工程，通过 ESP-IDF 组件管理器引入 `esp-nimble-cpp`，使用它提供的 C++ 接口完成 BLE 初始化、扫描、连接、服务发现和特征写入，开发者无需直接处理 NimBLE 的 GAP/GATT 回调、发现状态和属性句柄。

示例使用开放模式和 F160 高速数据通道，一次写入一个带 Simple 包头的二进制数字。业务代码仍负责选择目标设备、构造 Simple 数据包并安排发送流程。安装、目标地址与运行步骤见项目 README。

自己的手机 App、电脑程序或开发板同样可以按本文协议连接。MPY 的应用接口仍见[MPY BLE 接口](/ble/app/mpy/)，只需将启动模式改为 `AUTH_MODE_NONE`。

## PixelMug 从机端准备

```python
import time
from maopaoBleApp import BleAppService, AUTH_MODE_NONE

ble = BleAppService("MyApp")

def echo(params, context):
    return {"text": str(params.get("text", ""))}

ble.command("echo", echo, mutates=False)
ble.start(auth_mode=AUTH_MODE_NONE)

try:
    while True:
        ble.poll()
        time.sleep_ms(5)
finally:
    ble.deinit()
```

## 扫描与服务发现

从机广播包含 F150 和 F160 服务 UUID，扫描响应名称按 `MPY-<SN><MAC末字节的两位十六进制>` 生成。名称只用于辅助选择，不作为唯一身份凭据。设备需要处于应用运行、正在广播且没有其它终端占用连接的状态。

表中的短 UUID 使用 Bluetooth 基础 UUID 展开，例如 F150 为 `0000f150-0000-1000-8000-00805f9b34fb`。

| 服务 | 特征 | 方向与属性 |
| --- | --- | --- |
| F150 | F152 | 主机 → PixelMug，write / write without response |
| F150 | F151 | PixelMug → 主机，notify |
| F160 | F161 | 主机 → PixelMug，write without response |
| F160 | F162 | PixelMug → 主机，notify |

通过服务发现取得句柄，不硬编码属性句柄。需要接收设备返回数据时，先订阅所用通知特征，再发送请求。开放模式仍可能发现 F140 内部鉴权服务，但不需要向它写入数据。

## 连接顺序

1. 扫描并选择 PixelMug。
2. 建立 BLE 连接，发现服务与特征。
3. 在终端平台支持时协商足够大的 MTU。
4. 订阅 F151（使用 F150 请求响应时）和 F162（需要接收 Simple 数据时）。
5. F150 发送 hello，收到成功响应后保存 session 和 max_message。
6. 使用当前 session 发送业务请求；断开后重新执行连接与握手。

只使用 Simple 时可以跳过 F150 hello；只向设备发送 Simple 数据时也无需订阅 F162。Simple 收包依赖开放模式放行及自身包头，不检查应用 session。

当前一台 PixelMug 最多同时连接一个终端。退出时由终端主动断开；设备的后续 poll 会推进重新广播。

## 标准消息通道（F150）：消息与 MTU

开放模式的 F150 数据是明文 UTF-8 JSON。一条消息对应一次特征值写入或一次通知；没有换行分隔符、流式拼接或应用层自动分包。不要把一条 JSON 拆成多次普通写入。

每条消息都用 `v` 表示协议版本，用 `t` 表示消息类型。当前常用值如下：

| 字段 | 值 | 方向 | 含义 |
| --- | --- | --- | --- |
| `v` | `1` | 双向 | 当前协议版本，现阶段固定为 1 |
| `t` | `hello` | 双向 | 建立应用会话及返回握手结果 |
| `t` | `req` | 主机 → PixelMug | 发送业务命令 |
| `t` | `res` | PixelMug → 主机 | 返回命令或配置操作结果 |
| `t` | `state` | PixelMug → 主机 | 推送当前应用状态 |
| `t` | `event` | PixelMug → 主机 | 推送一次性应用事件 |
| `t` | `ping` | 主机 → PixelMug | 发送心跳请求 |
| `t` | `pong` | PixelMug → 主机 | 返回心跳响应 |
| `t` | `cfg` | 主机 → PixelMug | 传输应用配置 |

主机发送的请求还会使用 `p` 表示处理级别。当前 SDK 对状态快照和心跳使用 `0`，普通命令使用 `1`，配置传输使用 `2`；自定义主机按消息用途使用对应值即可。

设协商 MTU 为 M，设备当前使用的传输上限为：

```text
L = min(384, max(16, floor((max(23, M) - 3) / 16) * 16 - 1))
有效 max_message = min(构造时请求的上限, L)
```

这是当前实现沿用的保守上限，无鉴权模式也不会自动放宽。JSON 的全部 UTF-8 字节都计入限制。

| 协商 MTU | 传输上限 L |
| --- | --- |
| 23 | 16 字节 |
| 247 | 239 字节 |
| 512 | 384 字节 |

默认 MTU=23 无法容纳应用 hello 响应，因此“BLE 已连接”不能证明 F150 应用协议能工作。建议协商 MTU 至少 403，使当前 F150 上限达到 384 字节，并保持 app_id、app_version 等字段简短。MTU=247 时 hello 等消息也可能过大；若平台无法协商足够 MTU，可使用能容纳的小型 Simple 消息。

hello 之前尚未取得 max_message，终端应根据 MTU 预先限制 hello 大小。取得响应后按返回值限制后续请求。提高构造参数 max_message 不能突破 384 字节传输上限。

以下 JSON 为字段展示，实际发送可使用紧凑编码。

## hello 与会话

hello 是标准消息通道开始业务通信前的应用握手。它用于确认当前 PixelMug 正在运行主机期望的应用协议，并取得本次通信使用的 `session`、消息大小等参数。后续请求携带这个 `session`，设备据此将消息归入当前应用会话，并拒绝失效或不匹配的请求；BLE 断开后需要重新连接并发送 hello。hello 和 `session` 不承担 BLE 配对或身份认证。

终端写入 F152：

```json
{"v":1,"t":"hello","id":"h1","app":"MyApp","app_version":"1.0"}
```

设备在 F151 通知，下面仅展示连接与请求所需的关键字段，省略能力列表等附加字段：

```json
{"v":1,"t":"hello","id":"h1","ok":true,"session":"0123456789abcdef","app":"MyApp","app_version":"1.0","max_message":384,"config_chunk":128,"rev":0}
```

终端必须使用实际返回的 session，不使用示例值。hello 后设备还会主动通知一次状态，终端应按 t 分发消息。

v 必须为 1。app 应填写目标应用标识，填写错误会得到 `application mismatch`；版本不匹配得到 `unsupported protocol`。app_version 用于版本描述，目前不作兼容性校验。

每次新会话使用新的 hello id。相同 hello id 在缓存有效时会重发相同响应；新的成功 hello 会创建新 session。握手是应用选择与会话建立，不是身份认证。

## 命令与响应

请求：

```json
{"v":1,"t":"req","id":"r1","session":"0123456789abcdef","method":"echo","params":{"text":"hello"},"p":1}
```

成功响应：

```json
{"v":1,"t":"res","id":"r1","session":"0123456789abcdef","ok":true,"result":{"text":"hello"},"rev":0}
```

失败响应使用 ok=false 和 error 替代 result，例如：

```json
{"v":1,"t":"res","id":"r1","session":"0123456789abcdef","ok":false,"error":"unknown method","rev":0}
```

请求 id 使用非空字符串，每次新操作唯一。按 id 匹配响应，同时检查 session。ATT write response 只代表写入结果，不能替代此业务响应。标准消息通道也用于状态和事件通知，这两类消息不等待业务响应；两个通道的设备上行均使用 notify，不能把提交通知当成对端已处理的确认。

超时重试保留同一 id 和内容。设备只缓存有限响应，不能承诺跨会话或缓存淘汰后不重复执行。

## 状态、事件与心跳

状态表示 MPY 应用当前的一组业务值，例如分数、播放状态或传感器读数，具体字段由设备端应用定义。`__snapshot` 是 `BleAppService` 内置的状态读取命令，不需要 MPY 应用另行注册；它返回读取时的当前状态，不返回历史记录。

主机在 hello 完成后、重新连接或发现状态版本缺口时，可以发送快照请求：

```json
{"v":1,"t":"req","id":"s1","session":"0123456789abcdef","method":"__snapshot","params":{},"p":0}
```

设备使用相同的 `id` 返回当前状态及其版本：

```json
{"v":1,"t":"res","id":"s1","session":"0123456789abcdef","ok":true,"result":{"state":{"score":10},"rev":1},"rev":1}
```

设备也会主动发送状态通知：

```json
{"v":1,"t":"state","session":"0123456789abcdef","rev":1,"event":"stateChanged","state":{"score":10}}
```

事件通知：

```json
{"v":1,"t":"event","session":"0123456789abcdef","rev":1,"event":"gameOver","data":{"score":10}}
```

通知不保证每个中间状态都到达，发现版本缺口时可发送上述快照请求。旧 session 的通知不应应用于新会话。

心跳请求使用 `{"v":1,"t":"ping","id":"p1","session":"...","ts":123,"p":0}`，响应 t 为 pong，并回显 id、ts，携带当前 session。当前设备 ping 处理不校验请求 session，因此 pong 不代表旧 session 仍然有效。设备不会仅因没有 ping 就自动断开。

## 配置消息

配置消息使用 t=cfg，携带当前 session 和唯一 id。响应统一为 t=res。推荐串行发送，一块收到确认后再发下一块。

| op | 额外字段 | 成功 result |
| --- | --- | --- |
| begin | name、size、crc32、可选 meta | accepted=true、next=0、chunk |
| chunk | offset、data（Base64） | next；偏移不符时还包含 retry=true |
| commit | 无 | accepted=true、applying=true、crc32、pending |
| abort | 无 | aborted=true |

建议每条 cfg 都携带 name，但 chunk、commit、abort 实际作用于当前唯一事务。size、offset 都按原始字节计算，不按 Base64 字符数计算。客户端每次以设备返回的 next 为下一偏移，不忽略 retry。

示例 begin：

```json
{"v":1,"t":"cfg","id":"c1","session":"0123456789abcdef","name":"settings","op":"begin","size":2,"crc32":2745614147,"meta":{},"p":2}
```

上述 size 和 crc32 对应 UTF-8 字节 `{}`，其 chunk 为：

```json
{"v":1,"t":"cfg","id":"c2","session":"0123456789abcdef","name":"settings","op":"chunk","offset":0,"data":"e30=","p":2}
```

计算整份数据的标准 CRC32 无符号 32 位整数。当前固件未启用设备端 CRC32 校验，不能据 commit 响应推断数据已通过独立校验。commit 只表示等待应用，最终结果通过 configApplied / configError 事件或应用状态确认。

错误包含 unknown config、bad config size、no config transaction、config chunk too large、config overflow、config incomplete 等。应用处理与事务限制见[配置传输](/ble/app/mpy/config)。

## 高速数据通道（Simple）：分包协议 {#simple-分包协议}

终端写入 F161，接收 F162 通知。每次写入或通知恰好是一包，包头固定为 6 字节：

| 偏移 | 字段 | 值 |
| --- | --- | --- |
| 0 | version | 0x01 |
| 1 | flags | 0x00 |
| 2 | data_type | 0x00=RAW；0x01=UTF-8 文本 |
| 3 | packet_info | 高 4 位为总包数，低 4 位为包序号 |
| 4 | total_length 高字节 | 整条消息负载长度，大端 |
| 5 | total_length 低字节 | 不含包头 |
| 6 起 | payload | 本包负载 |

总包数为 1～8，序号从 0 开始，必须小于总包数。整条消息非空，默认不超过 4024 字节。每包负载不超过 MTU-9。

例如 RAW 消息 `01 20 30` 单包发送为：

```text
01 00 00 10 00 03 01 20 30
```

UTF-8 文本 `hi` 为：

```text
01 00 01 10 00 02 68 69
```

多包消息各包的类型、总包数和总长度必须相同，序号严格递增；所有负载拼接后的长度必须等于 total_length。以 MTU=23、20 字节 RAW 为例，分为 14+6 字节两包，两包头分别为 `01 00 00 20 00 14` 和 `01 00 00 21 00 14`。

接收端按连接保存重组状态。多包消息的第 0 包开启新的重组；顺序、类型、总包数或总长度不匹配会丢弃重组。当前没有分包确认、消息编号或重组超时协议，应连续串行发送一条消息的各包，禁止交错多条消息。失败后重发应从第 0 包开始；单包消息不应被用作取消旧重组的信号。

Simple 包头不包含应用会话、消息有效期、校验和或业务确认字段。需要这些语义时，由应用在负载中约定并实现；需要请求与响应时可使用 F150 命令。类型 1 只规定负载使用 UTF-8 编码，文本内容的格式由应用自行约定。

## PixelMugBLECentral 类

为了方便在 ESP32、Arduino 等嵌入式开发板上实现 BLE 主机，也便于开发桌面或移动端上位机时参考，仓库提供了一个 C++ 封装类 `PixelMugBLECentral`。它把本页介绍的连接流程封装成应用接口，包括扫描和连接、MTU 协商、服务发现、F151/F162 订阅、hello 与会话、命令响应、配置分块以及 Simple 数据分包。

当前实现位于 `examples/ble-custom-client-lib/custom-client-c3/BLECentral/`，使用 ESP-IDF 5.5.x 和 esp-nimble-cpp 2.5.0。这个类可以直接用于该示例，也可以作为移植参考：适配其它 Arduino BLE 库、操作系统或上位机 BLE API 时，需要替换扫描、GATT 读写、通知、任务同步和 JSON 处理部分，PixelMug 的 UUID 与应用协议保持不变。

示例中的 MPY 应用使用 `BleCustomClientLib` 作为应用标识，因此主机使用相同的标识创建对象。`connect()` 会完成连接和 hello；随后可以通过配置接口下发运行参数，并通过命令触发即时操作：

```cpp
#include <atomic>
#include "PixelMugBLECentral.h"

PixelMugBLECentral mug("BleCustomClientLib");
std::atomic<bool> configApplied{false};

mug.onEvent([&configApplied](const std::string& name,
                             const std::string&,
                             uint32_t) {
    if (name == "configApplied") configApplied = true;
});

if (!mug.begin("My PixelMug Controller") ||
    !mug.connect("AA:BB:CC:DD:EE:FF")) {
    ESP_LOGE("app", "connect failed: %s", mug.lastError().c_str());
    return;
}

const auto config = mug.setConfigJson(
    "circle",
    R"({"color":10,"step":1,"steps":6})"
);
if (!config.ok) {
    ESP_LOGE("app", "config failed: %s", config.error.c_str());
    return;
}

// setConfigJson() 只确认提交成功；等待 MPY 应用配置。
for (int elapsed = 0; !configApplied && elapsed < 5000; elapsed += 20) {
    vTaskDelay(pdMS_TO_TICKS(20));
}
if (!configApplied) return;

const auto result = mug.command("nextCircle", "{}");
```

目标地址应填写 PixelMug 端启动时打印的 BLE MAC。省略地址时，类只会在扫描结果中仅有一台符合条件的 PixelMug 时自动连接；发现多台设备会返回错误，避免连接到错误的杯子。

`command()`、`requestSnapshot()` 和配置接口会同步等待设备的业务响应；`Result.data` 保存紧凑 JSON。状态、事件和 Simple 数据通过 `onState()`、`onEvent()` 和 `onSimple()` 回调接收。回调运行在 NimBLE host 任务中，应快速返回，并避免在回调内调用同步命令。完整的设备端配置处理、`configApplied` 事件等待和 GPIO9 按键控制见示例的 `mpy/__main__.py` 与 `custom-client-c3/main/main.cpp`。

### 使用注意事项

在当前 ESP-IDF 5.5.x、esp-nimble-cpp 2.5.0 环境中，除 Central 和 Observer 外，还需保留以下编译支持：

```ini
CONFIG_BT_NIMBLE_ROLE_PERIPHERAL=y
CONFIG_BT_NIMBLE_ROLE_BROADCASTER=y
CONFIG_BT_NIMBLE_GATT_SERVER=y
```

该版本的 NimBLE 将通知接收入口放在 GATT Server 的编译条件下；esp-nimble-cpp 在开启 Peripheral 时还需开启 Broadcaster，避免条件编译错误。这些选项不会自动启动广播，示例仍作为 Central 运行。

- 主机的应用标识须与 MPY 的 `BleAppService` 一致。当前封装用于 `AUTH_MODE_NONE` 开放连接模式，不包含应用层认证流程。
- MPY 主循环应持续调用 `ble.poll()`；接收配置时还需调用 `ble.process_pending_config()`。配置提交成功后，等待 `configApplied` 再执行依赖该配置的命令。
- 通知回调应快速返回。需要在回调后发起同步命令时，先记录状态，再交给主任务处理，避免阻塞接收响应的 NimBLE host 任务。
