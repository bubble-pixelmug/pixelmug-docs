# Overview

Think of Bubble as a platform where people, applications, and devices work together. Users start interactions in the Bubble App, Bots organize application logic, WebApps provide rich user interfaces, and devices act and respond in the physical world.

A few examples make this easier to understand. You can tell a Bot in chat, “Draw a puppy on my mug.” The Bot finds your associated PixelMug and calls its device API to display a pixel-art puppy. If you want to draw a pixel expression yourself, open the Bot's WebApp, create and edit it on a canvas, and send it to the mug. To run an interactive game on the mug, you can also write a device-side application for models that support the MPY container.

You can combine these capabilities gradually. A Bot that only sends and receives messages does not need a device, and an application that uses existing firmware features does not require an MPY program.

## Overall architecture

![The logical relationship among the Bubble App, Bot, and device: the Bot and WebApp connect to TAL, and the WebApp can also communicate with the device over BLE](/images/bubble-overview-en.svg)

Both Bots and WebApps can interact with devices through the RPC service provided by Bubble. BLE gives WebApps another channel between the phone and a nearby device.

| Component | A useful way to think about it | Main responsibilities |
| --- | --- | --- |
| Bubble App | User entry point | Chat, use WebApps, associate devices, and manage Bots |
| Bot | Business center of an application | Handle messages and actions, organize application logic, associate users with devices, call devices, and receive feedback |
| WebApp | Application user interface | Provide buttons, forms, sliders, canvases, and other rich interactions |
| TAL | Unified device interface | Express device capabilities as callable methods and observable events |
| TALID | Identifier for a set of device interfaces | Specify the interface family required by an application and separate application code from a particular hardware implementation |
| MPY | Runtime for applications written for the device | Extend device behavior with MicroPython and components; available on S1 Pro and Lite |

## Bot: connecting conversations, users, and devices

A Bot contains the application logic you write. Users interact with it in direct messages or group chats. The Bot decides what to do with each message, replies to the user, or asks a device to perform an action.

For example, a reminder Bot can receive “Remind me in ten minutes,” send a message when the time arrives, and display the reminder on an associated mug. Understanding the request, tracking time, and applying reminder rules are application logic. The platform SDK provides the basic messaging and device-call capabilities. Whether to use AI and how to interpret natural language are decisions for the developer.

A Bot also brings the relationship between users and devices into the application. It first declares the device interfaces it needs; each user then associates a specific device. The same Bot can therefore serve different users through their own devices without hard-coding a serial number in application code.

When an application organizes interaction among several people and devices, it can form a **Device Social Network**. An action by one person or feedback from one device can trigger other participants or devices. For example, within the application's rules and authorization boundaries, two Bubble contacts can send pixel expressions to each other's mugs, or several devices can join the same game.

This model builds applications around the associations among users, Bots, and devices. Who may control a device and how events propagate are still determined by device associations, platform permissions, and application rules.

## Why use a WebApp?

Conversation works well for expressing intent, receiving notifications, and issuing simple commands, but it does not fit every operation. A slider is more convenient than repeatedly typing brightness values, a canvas is more direct than describing pixel art in text, and a panel is clearer than a long stream of messages when controlling several devices.

A WebApp provides this browser-based interface inside the Bubble App. Together, the WebApp and Bot form an application:

- The WebApp sends requests to the Bot when application logic is required, and the Bot returns the result.
- The Bot can push data to the WebApp when the interface needs to show a change.
- The WebApp can operate devices through Bubble's device RPC capability or communicate with nearby devices over BLE.

For example, a user opens a “Pixel Art” application from chat, draws in the WebApp, and taps Send. The device displays the artwork, and the Bot sends the image back to chat as a record. Conversation, a graphical interface, and a physical device all participate in one interaction.

## TAL: describing device capabilities through a unified interface

**TAL stands for Things Abstraction Layer.** It describes device capabilities as methods an application can call and events it can receive, such as turning the display on or off, showing content, reading information, or reporting charging state.

Device communication below TAL uses **MQTT RPC**. RPC means requesting a remote device to execute a method and return a result. Developers normally use an SDK to construct methods and parameters while the platform handles delivery, so each application does not need to implement its own device transport.

For example, an application can request “turn on the display” by specifying the operation and parameters. The device implementation is responsible for driving the actual screen. The application must still handle failures, offline devices, and response timeouts.

TAL defines the device capability contract; MQTT RPC is the underlying transport and invocation mechanism. They belong to different layers.

### Why does TALID matter?

A **TALID identifies a set of device interfaces.** For example, `PixelMug` and `PixelMugS1` represent different interface sets. The SDK usually exposes this value as `talId`.

When an application declares that it needs a device supporting a particular TALID, its code is declaring a dependency on that interface set. The user then associates compatible hardware. The application depends on the contract rather than the internal implementation of a specific device. This decouples software from hardware: hardware implementations can evolve while applications continue to use the agreed interface.

| Identifier | Question it answers |
| --- | --- |
| TALID | Which capability and event interfaces does the device provide? |
| `deviceId` / serial number | Which specific device is it? |

Multiple hardware models can provide the same interface set. PixelMug S1 Pro and Lite are different hardware models, but they share the same TALID, so an application is fully compatible with both.

## MPY: extending the device itself

TAL lets applications call capabilities already provided by the firmware. For developers who want to define additional device behavior, **PixelMug S1 Pro and S1 Lite also provide a MicroPython runtime container** that runs custom MicroPython applications on the device.

The device exposes graphics, audio, sensor, button, BLE, and other components for building new interactions. You can run a game on the device, change the display in response to motion or touch, or react to real-time input from a phone. The device documentation describes each component's API and support requirements.

This extends an application into the device instead of limiting it to existing firmware TAL methods. The Bot and WebApp handle user interaction and business collaboration, while MPY implements custom behavior on the device. If the two sides exchange custom messages, they must also agree on the transport and message format. Deploying an MPY application does not automatically add a cloud TAL method.

| Device | MicroPython application container described here |
| --- | --- |
| PixelMug S1 Pro | Supported |
| PixelMug S1 Lite | Supported |
| PixelMug P1 | Not supported; use the capabilities exposed by its firmware through TAL |

## PixelMug Studio: the application development workbench

PixelMug Studio is the workbench for developing, running, and debugging these applications. During development it starts the Bot on your computer, provides an address for the WebApp, and helps you associate devices, deploy MPY, and inspect logs. This also explains the three main parts of a project:

| Project directory | Where the code runs | When it is needed |
| --- | --- | --- |
| `bot/` | A Node.js process on a development computer or server | To implement message handling and application logic |
| `webapp/` | A web page inside the Bubble App | When the application needs richer graphical interaction |
| `mpy/` | A device that supports the MPY container | When the application needs custom device-side code |

## Get started

Continue to [Get started](/en/getting-started/) to download the Bubble App, bind a PixelMug, apply for your first Bubble Bot, and run several examples in Studio. The guide walks through conversations, WebApps, and device collaboration step by step.
