# Error handling and use limits

The interface level should be handled separately and the user should be given a clear status feedback in the process.

## Application request errors

`request()` returns Promise, entering `catch`:

- Bubble App refused to send, requesting confirmation number not 200;
- Bot returns failed response;
- Bot's response was not received over time;
- Messages exceed the size limit or the current environment does not provide a primary bridge `JeeWeb`.

```js
try {
  const response = await webApp.request('profile.get');
  renderProfile(response.result);
} catch (error) {
  showError(error.message);
}
```

Bubble App does not confirm that Bot has been processed. `request()` will continue to await an operational response with the same request ID.

When the `onWebAppRequest()` handler of Bot throws an error, SDK returns a failed response to WebApp and gives the error to the error process of Bot. The contents that fit to be shown to the user should be returned or use a stable error code, without relying on internal abnormal text.

## Device RPC errors

`callDevice()` successful only when the device responds with a 200 code. When the device fails to return, `DeviceRpcError` will be thrown out, with the common fields being:

| Fields | Meaning |
| --- | --- |
| `code`, `deviceCode` | Device Response Code |
| `method` | Called RPC Method |
| `response` | Original Device Response |
| `result` | Outcome data in response, if available |

The normal `Error` may be obtained when the device is called overtime, the bridge interface is missing or the bridge layer is dropped. The business code is thus able to judge `error.name === 'DeviceRpcError'` and then read the wrong device field.

```js
import { rpc as deviceRpc } from '@jeejio-bubble/bot/devices/pixelmug-s1/ext';

const rpc = deviceRpc.talSetBrightness({ percent: 60 });

try {
  await webapp.callDevice(device, rpc);
} catch (error) {
  if (error.name === 'DeviceRpcError') {
    showError(`Device execution failed: ${error.code ?? 'Unknown error'}`);
  } else {
    showError(error.message);
  }
}
```

Timeout means only that WebApp does not receive the results within the time limit and cannot prove that the device has not been performed. Do not try again after timeout without conditions for operations that may have side effects.

## Timeout Settings

The default timeout for application requests and devices is 20 seconds. You can set it up when you create an instance or you can overwrite a single call:

```js
const webApp = new BubbleWebApp({
  ble: false,
  timeoutMillis: 30_000,
});

await webApp.request('report.create', {}, { timeoutMillis: 60_000 });
await webApp.callDevice(device, rpc, { timeoutMillis: 30_000 });
```

## Message size

WebApp default limit for full message sent via the Bubble App primary bridge is 256 KiB; Bot default limit for full message sent to WebApp is 512 KiB. This calculates the entire JSON message, not just `payload`, after SSDK is packaged.

WebApp can adjust local limits by `maxPayloadBytes`, and Bot can adjust the dispatch limits by `maxWebAppPayloadBytes`. The service and Bubble App may still operate with their own limitations, so it is not recommended to transfer large files through the message channel.

Pictures, audio and video should be uploaded to the file service or OSS, and then transmitted through WebApp messages, URLs, file types and necessary metadata. Direct transmission Base64 significantly increases the message.

## Android WebView.

WebApp in Bubble App runs on the system WebView. Some of the old Android WebView autoinjection to the original bridge and newer JavaScript syntax support is incomplete. When these devices need to be covered, it is recommended that the bridge script for Bubble App be loaded in the HTML `<head>` visible:

```html
<script>
  if (!globalThis.JeeWeb) {
    const script = document.createElement('script');
    script.src = 'jeesdk://jeeweb.js';
    document.head.appendChild(script);
  }
</script>
```

The entry code uses the normal stept initialization function to avoid direct use at the outermost level of the module `await`. Create `BubbleWebApp` You can wait a little longer. `JeeWeb` Ready and show failure state on page:

```js
initialize().catch((error) => {
  document.querySelector('#status').textContent = error.message;
});

async function initialize() {
  await waitForJeeWeb();
  const webapp = new BubbleWebApp({ ble: false });
  const devices = await webapp.getDevices();
  renderDevices(devices);
}

async function waitForJeeWeb(timeoutMillis = 3000) {
  const deadline = Date.now() + timeoutMillis;
  while (!globalThis.JeeWeb && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!globalThis.JeeWeb) {
    throw new Error('Not connected to bubble App');
  }
}
```

Studio converts WebApp to a more secure browser syntax. When using its own construction tool, you should also set a clear Chrome and Safari compatible target to avoid the direct release of unmodified ES2022 codes. It is still not possible to start with android System WebView.

## Troubleshooting

Sets `debug: true` when creating WebApp or Bot to see requests, responses and queue distribution logs. Prefer the type of request, request ID, session ID, device ID and RCC methods when checking to avoid writing tokens or user privacy data into the logs.
