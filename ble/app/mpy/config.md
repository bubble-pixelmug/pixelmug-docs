# 配置传输

配置接口将较大数据分块写入设备临时文件，再由应用在合适的时机处理。它使用标准消息通道（F150），需要完成应用握手。

完整示例见 `examples/ble-config`：WebApp 预填数字、字符串、布尔、数组和对象五种配置，MPY 校验后逐条显示。两端核心调用见 [WebApp 配置上传示例](/ble/app/webapp/config)。

## 注册与应用配置

```python
import json

settings = {"color": 1}

def apply_settings(path, meta):
    with open(path, "r") as source:
        value = json.load(source)
    color = int(value["color"])
    if not 0 <= color <= 255:
        raise ValueError("invalid color")
    settings["color"] = color
    return {"color": color}

ble.config("settings", apply_settings)

# 放在应用主循环中：
# ble.poll()
# ble.process_pending_config(max_items=1)
```

`config(name, handler)` 返回 handler，同名注册替换旧处理函数。名称长度为 1～32 个字符，只允许字母、数字、下划线和连字符。

回调签名为 `handler(path, meta)`：path 是已上传文件的路径，meta 是客户端附带的元数据，缺省为 `{}`。文件内容由双方约定，不会自动解析。

`process_pending_config(max_items=1)` 同步处理已提交配置，返回本次消费的数量，包括失败项。它不受 poll 的时间预算控制，应在允许文件处理的主循环阶段调用。

无论回调成功还是抛出异常，临时文件随后都会被删除。需要持久保存时，在回调返回前完成读取、复制或保存；不要只保留临时路径。


## 客户端上传

```js
client.on('event', (event) => {
  if (event.event === 'configApplied') console.log('配置已应用', event.name);
  if (event.event === 'configError') console.error(event.error);
});

const result = await client.setConfig(
  'settings',
  { color: 8 },
  { meta: { source: 'webapp' }, chunkSize: 128 }
);
console.log(result.accepted, result.applying);
```

SDK 支持字节、字符串或可 JSON 序列化对象。`setConfig()` 完成表示传输 commit 已获响应，**不表示设备已经应用配置**。

设备回调成功后增加状态版本、发布状态并发送 `configApplied` 事件，data 包含 name、result。失败时发送 `configError`，包含 name、error。这些事件不保证离线送达；重连后应查询状态确认结果。

## 工作过程

1. begin：声明名称、总字节数、CRC32 和 meta，设备创建临时文件。
2. chunk：Base64 编码数据并带上字节偏移，设备返回 next。
3. commit：检查长度完整后关闭文件，加入等待应用的队列。
4. 应用主循环调用 process_pending_config，执行处理函数并删除临时文件。

每个分块仍受标准消息通道大小限制。较小 MTU 下如果发送失败，可以减小 WebApp 的 `chunkSize`。

::: info CRC32 的当前行为
协议和 SDK 携带 CRC32，但当前设备实现关闭了 CRC32 校验，只检查传输长度和偏移。返回的 crc32 不能作为设备独立校验通过的证明；应用需要内容校验时应在处理函数中完成。
:::

## 高级传输参数

大多数应用不需要设置这些参数。只有配置超过默认容量、传输间隔较长或临时文件需要放到其他目录时，才在创建服务时调整：

```python
ble = BleAppService(
    "MyApp",
    config_limit=32768,
    config_timeout_ms=10000,
    config_dir="/",
)
```

`config_limit` 是单份配置的容量上限，默认为 32768 字节；`config_timeout_ms` 是传输停顿多久后放弃未完成配置，默认为 10 秒；`config_dir` 必须是已经存在且可写的目录。分块大小通常交给 SDK 和组件默认值处理。

## 高级事务说明

默认 10 秒没有成功推进配置块时，后续 poll 会中止未完成事务并删除临时文件。断开也会中止尚未 commit 的配置。

当前只维护一个正在接收的事务；新的 begin 会中止旧事务。相同名称使用相同临时路径，因此客户端必须等待上一份同名配置实际应用完毕，再上传下一份。配置应串行处理，避免积压待应用文件。

commit 后即使连接断开，待应用配置仍可能执行；`deinit()` 会清理尚未处理的配置。应用校验失败或发生部分修改时，系统不会自动回滚，因此处理函数应先完成校验，再修改正式配置。

协议字段及错误响应见[自定义终端接入](/ble/custom-client#配置消息)。
