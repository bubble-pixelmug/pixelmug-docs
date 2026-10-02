# Call a device RPC from a WebApp

`webapp.callDevice()` Sends RPC directly to associated devices via the Buble App's primary bridge and waits for return to final results without going through Bot. Bot can choose to observe WebApp to call the device, but not to forward it.

```text
WebApp → Bubble App Native Bridge → Cloud → Associated equipment → Response
```

## Call a device

Import the epoch RPC SDK first and get associated devices from the current chat:

```js
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const [mug] = await webapp.getDevices();
```

Construct a command using device RPC SDK, then handing the target device and the RPC to `callDevice()`:

```js
const rpc = deviceRpc.talSetDisplayOnOff({ onoff: true });
const response = await webapp.callDevice(mug, rpc);

console.log(response.result);
```

By the interface definition, create objects with `method` and `params`. The business code does not need to be manually filled in a method name. The RPC should be based on the open interface of the target device; if a slot allows associated compatible models, the page can only call on the RPCs that are supported by these models.

The first parameter `callDevice()` should be directly used for returning device objects `getDevices()`. When multiple devices exist, the user is given the choice of the target device and the complete object selected is passed to `callDevice()`; the business code does not need to extract or group the device identification.

## Handle call results

`callDevice()` returns a Promise. Returns the call result when the device is successfully executed; errors are thrown when the device fails, communication is abnormal or waiting for time to pass, and the page is handled with `try...catch`:

```js
try {
  const response = await webapp.callDevice(mug, rpc);
  showResult(response.result);
} catch (error) {
  showError(error.message);
}
```

The default waiting time is 20 seconds and can also be set for single calls `timeout`:

```js
await webapp.callDevice(device, rpc, {
  timeout: 30000,
});
```

Timeout only means that the page does not receive the results on time and cannot prove that the device was not executed. An operation that may have a repetitive effect should not be automatically retried after timeout.

## UI handling recommendations

The application should be temporarily disabled while the device is being called to avoid the user submitting it consecutively. Restoring the button after completion and displaying success, device error and time overtime separately. Page closes will interrupt user observation, but do not guarantee that the device that has been sent out is cancelled.
