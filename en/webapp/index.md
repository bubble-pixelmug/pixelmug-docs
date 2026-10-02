# WebApp SDK

A WebApp is a mini application that runs inside the Bubble App. It can use devices already associated with the current Bot conversation and extend chat with a graphical interface. WebApps are well suited to device control panels, forms, and workflows that involve continuous interaction.

## Responsibilities of the WebApp and Bot

The WebApp presents the interface and responds to user actions. The Bot has two basic responsibilities. First, it provides the WebApp entry point as a button in a chat message, allowing the user to open the page from the current direct message or group. Second, it declares which devices can be associated, guides users through association, and synchronizes the associated devices and subsequent changes with the WebApp.

The Bot can also act as the WebApp's backend when the application needs one. The WebApp can send data to the Bot for persistent or centralized processing. The Bot can coordinate several associated devices and implement interactions across them. It can also periodically retrieve external information such as weather or BTC prices, then return or push updates to the WebApp.

The WebApp SDK provided by `jeejio-bubble` uses a native bridge injected by the Bubble App to connect the WebApp, Bot, and devices associated with the current conversation. It can query associated devices, communicate bidirectionally with the Bot, call device RPCs directly, and receive device events. These capabilities use three channels with distinct responsibilities:

```text
Bidirectional communication between WebApp and Bot:
WebApp ⇄ Bubble App bridge ⇄ Cloud ⇄ Bot

Direct device RPC calls from a WebApp:
WebApp → Bubble App bridge → Cloud → Associated device
                                  └→ Bot may observe the call

Device events delivered to a WebApp:
Device → Cloud → Bot device polling → Cloud → Bubble App bridge → WebApp
```

The WebApp and Bot use the message channel for requests, responses, and proactive pushes. A WebApp device RPC goes directly from the Bubble App to the associated device and does not pass through a Bot application handler. The Bot receives device-originated events and forwards them to active WebApp sessions that subscribed to that device.

## Main WebApp SDK capabilities

| Goal | Main API | Bot dependency |
| --- | --- | --- |
| WebApp → Bot | `webapp.request()`, `bot.onWebAppRequest()` | Requires Bot message polling |
| Bot → WebApp | `webapp.on()`, `ctx.sendWebAppData()` | Requires the Bot and an active page session |
| Get associated devices | `webapp.getDevices()` | Handled by a built-in Bot system request |
| Call a device RPC | `webapp.callDevice()` | Called directly through the Bubble App native bridge |
| Receive device notifications | `subscribeDeviceEvents()`, `onDeviceEvent()` | Requires the Bot to poll device messages and forward them to the session |
| Observe WebApp device calls | `observeWebAppDeviceCalls` | Requires observation to be enabled on the Bot |

The WebApp must be opened inside the Bubble App. A normal browser does not have the native `globalThis.JeeWeb` bridge and cannot use these capabilities. You can develop the visual interface in a browser, but flows involving the native bridge or a device must be tested in the Bubble App.
