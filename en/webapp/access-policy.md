# Set prerequisites for opening a WebApp

`webAppDeviceAccess` For setting the device connection conditions that the user must meet before opening WebApp. The bubble platform will check the connection of the device in the current Bot chat and decide whether to allow the page to be opened. Developers can use it to distinguish between WebApps that do not depend on the device, WebApps that are available with any device associated with the device, and WebApps that must be fully equipped. For example, Wordby applications require two PixelMugs to display a word or word, setting the opening condition to `all`; only two devices will open the page after the connection has been completed, so that users will not be able to find the device deficient after entering the page.

## Three prerequisite modes

Use `webAppDeviceAccess` settings to create Bot:

| Configure Values | Open Condition | Typical scene |
| --- | --- | --- |
| `'none'` | No associated device required | Pages for display of information, account setting or communication only with Bot |
| `'any'` | Link at least one Bot defined device | Controls any page of an associated device |
| `'all'` | Bot defined devices are associated | Application for multiple devices to have to match work |

```js
import { BubbleBot } from '@jeejio-bubble/bot';

const bot = new BubbleBot(process.env.BUBBLE_BOT_TOKEN, {
  apiBaseUrl: process.env.BUBBLE_API_BASE_URL,
  webAppDeviceAccess: 'any',
});

await bot.start();
```

Bot starts by synchronizing this configuration to the service. When the user tries to open WebApp, the platform checks the conditions based on the device 's connection in the current chat; the page does not open if the condition is not met.

The "Device" here is the registered device for Bot slot. `any` indicates that at least one of these slots has been associated; `all` indicates that all slots have been associated.


## Where the policy applies

`webAppDeviceAccess` Only check the connection of the device before the WebApp is opened. The page is open to which device RPC can be called, depending on the interface actually provided by the associated device. It does not replace the identification of business data such as account numbers, orders, etc.; such requests should be submitted to Bot for processing by [Bot Communications Channel](./bot-channel).

`observeWebAppDeviceCalls` is independent of the opening conditions: the former allows Bot to observe the device initiated by WebApp, and the latter determines the associated conditions of the device that the user needs to meet before opening the page.
