# 获取关联设备

设备 slot 的声明、注册以及引导用户关联设备都由 Bot 负责。WebApp 不创建或关联设备，只能获取并操作当前 Bot 对话中已经关联的设备。页面打开后，应先调用 `getDevices()` 获取设备列表；只有一台设备时可以直接使用，存在多台设备时再让用户选择操作目标。

## 查询设备

```js
const devices = await webapp.getDevices();

if (!devices.length) {
  showMessage('请先在 Bot 对话中关联设备。');
}
```

`getDevices()` 会发送请求到 Bot，Bot 收到请求后查询当前对话的设备关联，并把已关联设备返回给页面。列表只包含已经关联的设备，不会为未关联的 slot 返回空对象。

## `getDevices()` 返回的设备信息

下面是 `getDevices()` 返回数组中每个设备对象的常用字段：

| 字段 | 用途 |
| --- | --- |
| `slot` | Bot 中从 1 开始的逻辑位置 |
| `slotId` | 云端关联位置的 ID，也是 WebApp 设备调用的主要目标 |
| `talId` | Bot 创建设备 slot 时使用的设备类型，如"PixelMug"，"PixelMugS1" |
| `deviceTalId` | 当前与 `talId` 相同，同样表示创建 slot 时使用的设备类型 |
| `compatible` | 该 slot 允许关联的兼容设备类型，如"PixelMug" |
| `deviceId` | 当前关联设备的唯一 ID |
| `name` | 设备在冒泡 App 中的别名 |
| `online` | `true`、`false` 或状态未知 |

兼容关联只扩展一个 slot 可以关联的设备范围，不会改变 `talId` 或 `deviceTalId`。例如，PixelMug S1 slot 允许关联 PixelMug P1 后，即使用户实际关联的是 P1，这两个字段仍然是 `PixelMugS1`，不能用来判断关联设备的实际型号。因此，兼容型号应提供页面所需的共同 RPC，WebApp 按 slot 声明的设备类型构造调用即可。

页面应保留 `getDevices()` 返回的完整对象。显示名称适合界面展示，不能作为设备的唯一标识；多设备状态通常按 `deviceId` 保存，找不到时再回退到 `slotId`。

## 监听关联变化

```js
webapp.onDevicesChanged((event) => {
  const devices = event.payload?.devices || [];
  renderDeviceList(devices);
});
```

当 Bot 收到当前对话的设备关联变更消息时，会向活跃页面发送 `system.devicesChanged` 内部协议消息。页面可以直接使用协议消息携带的设备列表，也可以重新调用 `getDevices()`。

设备被替换后，slot 可能不变，但 `deviceId` 会变化。已经按旧设备建立的事件订阅不应继续沿用，应使用新设备对象重新订阅。

## 页面没有设备时

WebApp 不能直接替用户完成关联。通常由 Bot 在对话中发送关联卡片，用户完成关联后再打开页面。页面发现列表为空时，应给出明确提示，并允许用户返回对话完成关联。