# 上传配置接口：setConfig()

普通控制命令优先使用 `command()`。需要发送体积较大的 JSON 配置时，建议使用 `setConfig()`。

`examples/ble-config` 示例展示了把表单中的 config1～config5 发送给 MPY，再在 PixelMug 上逐条显示。两端应用标识为 `BleConfig`。

页面为数字、字符串、布尔、数组和对象预填默认值，连接后即可直接发送。数字使用 `Number()` 转换，布尔选项转换为 `true` / `false`，数组和对象通过 `JSON.parse()` 解析，再交给 SDK 上传。WebApp 通过 `setConfig()` 将 JSON 报文发送给 MPY，并注册 `event` 回调，等待设备端确认配置是否执行成功：

```js
client.on('event', (event) => {
  if (event.name !== 'settings') return;
  if (event.event === 'configApplied') console.log('信息已应用，开始显示');
  if (event.event === 'configError') console.log('应用失败：', event.error);
});

await client.setConfig('settings', {
  config1: 42,
  config2: 'hello',
  config3: true,
  config4: [1, 2, 3],
  config5: { x: 1, y: 2 },
});
```

`settings` 是设备注册的配置名，可自定义，但要求 WebApp 和 MPY 两端一致。第二个参数是配置内容。SDK 自动将对象序列化为 JSON 并分块上传。

设备端通过 `config()` 方法设置相同配置名 `settings` 的处理函数。处理函数在 MPY 调用 `process_pending_config()` 时触发执行。下面摘出核心调用；`display` 是项目中的文字轮播辅助对象：

```python
import json

def apply_config(path, meta):
    with open(path, "r") as source:
        settings = json.load(source)
    # 完整示例先校验字段，再更新全部五项显示内容。
    display.show([
        "config%d: %s" % (i, json.dumps(settings["config%d" % i]))
        for i in range(1, 6)
    ])
    return {"items": 5}

ble.config("settings", apply_config)

# 在主循环中持续调用：
ble.poll()
ble.process_pending_config(max_items=1)
```

`poll()` 推进收包，`process_pending_config()` 执行配置处理函数。处理成功后组件自动发送 `configApplied`；函数抛出异常时自动发送 `configError`。因此 WebApp 应在配置下发前监听事件，不能仅凭 `setConfig()` 返回就认为“配置成功”。更多接口规则见[配置传输](../mpy/config)。
