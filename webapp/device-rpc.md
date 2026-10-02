# 从 WebApp 调用设备 RPC

`webapp.callDevice()` 通过冒泡 App 的原生桥直接向关联设备发送 RPC，并等待返回最终结果，不经过 Bot 转发。Bot 可以选择观察 WebApp 到设备的调用，但不负责转发它。

```text
WebApp → 冒泡 App 原生桥 → 云端 → 关联设备 → 响应
```

## 调用一个设备

先导入设备 RPC SDK，并从当前对话取得关联设备：

```js
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const [mug] = await webapp.getDevices();
```

使用设备 RPC SDK 构造指令，再把目标设备和 RPC 交给 `callDevice()`：

```js
const rpc = deviceRpc.talSetDisplayOnOff({ onoff: true });
const response = await webapp.callDevice(mug, rpc);

console.log(response.result);
```

设备 RPC SDK 根据接口定义生成包含 `method` 和 `params` 的对象，业务代码不需要手工填写方法名。RPC 应以目标设备公开的接口为准；如果一个 slot 允许关联兼容型号，页面只能调用这些型号共同支持的 RPC。

`callDevice()` 的第一个参数应直接使用 `getDevices()` 返回的设备对象。存在多台设备时，先让用户选择目标设备，再把选中的完整对象传给 `callDevice()`；业务代码不需要自行提取或组合设备标识。

## 处理调用结果

`callDevice()` 返回一个 Promise。设备成功执行时返回调用结果；设备执行失败、通信异常或等待超时时会抛出错误，页面使用 `try...catch` 处理即可：

```js
try {
  const response = await webapp.callDevice(mug, rpc);
  showResult(response.result);
} catch (error) {
  showError(error.message);
}
```

默认等待时间为 20 秒，也可以为单次调用设置 `timeout`：

```js
await webapp.callDevice(device, rpc, {
  timeout: 30000,
});
```

超时只表示页面没有按时收到结果，不能证明设备没有执行。对于可能产生重复效果的操作，不应在超时后自动重试。

## 界面处理建议

设备调用期间应暂时禁用对应操作，避免用户连续提交。完成后恢复按钮，并分别显示成功、设备错误和超时状态。页面关闭会中断用户观察，但不保证已经发出的设备操作被取消。