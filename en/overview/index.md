# Overview

PixelMug brings a 32×16 LED matrix display into a mug, along with a speaker, microphone, touch controls, motion and temperature sensors, Wi-Fi, and BLE. It's a **tiny computer** you can hold in your hand and use every day. Despite its low-resolution display, PixelMug opens up endless possibilities for creative pixel-based applications.

PixelMug is part of the **Bubble platform**, where applications and interactions are managed through the **Bubble App**.

You can think of the **Bubble App** as a platform where people, applications, and devices work together. Users initiate interactions in the Bubble App, Bots orchestrate application logic, WebApps provide rich interactive interfaces, and devices perform actions and provide feedback in the real world.

Here are a few examples to help you understand how it works. You might tell a Bot in Bubble chat, “Draw a puppy on my mug.” The Bot finds the PixelMug bound to your account and calls its device API to display a pixel-art puppy. If you want to create your own pixel-art emoji, you can open the Bot’s WebApp and use its canvas to draw and edit your design, then display it on your mug. If you want your mug to run an interactive mini-game, you can also write an on-device program for PixelMug models that support the MicroPython runtime. 

These capabilities can be combined progressively. A Bot that only sends and receives messages, much like a Telegram bot, doesn’t need any device. A Bot that uses only PixelMug’s built-in RPC APIs also doesn’t require any on-device code.

## Overall architecture

![The logical relationship among the Bubble App, Bot, and device: the Bot and WebApp connect to TAL, and the WebApp can also communicate with the device over BLE](/images/bubble-overview-en.svg)

The Bubble platform brings together users, applications, and devices. Developers can build Bots to handle application logic, create WebApps for richer interactions, access built-in device capabilities through RPC APIs, or run custom MicroPython code directly on supported PixelMug devices.

### 1. Bubble App - User Interaction

The Bubble App is the main entry point for users to interact with Bots and devices. Users can chat with Bots, receive notifications, bind their PixelMug devices, and open WebApps for more advanced interactions.

### 2. Bot - Application Logic

A **Bot** is the core of every application. It handles messages from users and devices, manages device definitions and bindings, and orchestrates application workflows. Users interact with Bots through private or group chats.

Bots run on a developer's own computer or server and can access device capabilities through RPC APIs and events. Application logic is entirely defined by the developer, with or without AI.

A single Bot can support **single-user, multi-user, and multi-device** applications, enabling rich interactions between people and devices.

### 3. WebApp — Rich Interactive Interface

A **WebApp** extends the chat experience with rich browser-based interfaces, such as buttons, sliders, canvases, and control panels. Users open WebApps through links provided by Bots within the Bubble App.

WebApps and Bots work together to build complete applications. They support bidirectional communication, allowing WebApps to send requests and Bots to push updates. WebApps can also directly invoke device RPC APIs or communicate with nearby devices over BLE, without routing every interaction through the Bot.

### 4. PixelMug Built-in Device Capabilities

The **Things Abstraction Layer (TAL)** defines a unified interface for device capabilities through firmware-provided RPC APIs and events. It allows Bots and WebApps to interact with devices without writing on-device code or dealing with underlying communication protocols.

Each **TalID**, such as `"PixelMug"` or `"PixelMugS1"`, identifies a defined set of RPC APIs and events, independent of specific hardware implementations. Different device models can share the same TalID, allowing applications to work across compatible devices.

### 5. PixelMug MicroPython Runtime — On-Device Applications

While TAL provides built-in device capabilities, the **MicroPython Runtime** allows developers to write and run custom Python applications directly on PixelMug devices. It provides integrated graphics, audio, touch, networking, and motion-sensing capabilities, enabling games, animations, and interactive applications.

On-device applications can run independently or work with Bots and WebApps to create richer experiences that go beyond the device's built-in capabilities.

::: info Please note 
MicroPython Runtime is only supported on **PixelMug S1 Pro and S1 Lite**.
:::

These components can be used independently or combined. A simple Bot may only exchange chat messages, while more advanced applications can integrate WebApps, device RPC APIs, and on-device MicroPython programs to create richer experiences.

## PixelMug Studio: the application development workbench

PixelMug Studio is the workbench for developing, running, and debugging these applications. During development it starts the Bot on your computer, provides an address for the WebApp, and helps you associate devices, deploy MPY, and inspect logs. This also explains the three main parts of a project:

| Project directory | Where the code runs | When it is needed |
| --- | --- | --- |
| `bot/` | A Node.js process on a development computer or server | always |
| `webapp/` | A web page inside the Bubble App | When the application needs richer graphical interaction |
| `mpy/` | A device that supports the MPY container | When the application needs custom device-side code |

## Get Started

Head to [**Get started**](/en/getting-started/) to download the Bubble App, bind your PixelMug, create your first Bubble Bot, and run examples in PixelMug Studio. Follow the step-by-step guide to experience how chat, WebApps, and devices work together.