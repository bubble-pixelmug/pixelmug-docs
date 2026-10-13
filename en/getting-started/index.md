# Get started

Begin by sending a line of text to your mug, then explore how a Bot, WebApp, and device-side MPY application work together. Each example is a project that runs directly in Studio. The code is under `getting-started/`; this guide explains how to use it and what the code does.

If these concepts are new, read the [Overview](/en/overview/) first. You do not need to memorize every API. Start by making the mug respond, then return to the code to understand each part.

## Before you begin

These tutorials assume that you **already have a Bot token and have installed PixelMug Studio**. You will also need:

- The Bubble App, signed in and able to open a direct conversation with your Bot.
- A PixelMug that is bound to your Bubble account, connected to the network, and online.
- A computer that can run Studio and the `getting-started` examples included with the project.

The first example supports PixelMug P1 and the S1 family. It calls the device’s built-in firmware APIs through TAL (*Things Abstraction Layer*), a device-provided RPC interface for accessing built-in capabilities. This means you don’t need to write any device-side code. The computer and mug must be able to reach Bubble services. The later WebApp example also requires the phone to reach the computer over the local network.

### Apply for a Bot token

::: info Planned documentation
This section will explain how to create a Bubble Bot, obtain its token, and find it in the Bubble App. Continue if you already have a token.
:::

### Install Studio

::: info Planned documentation
This section will cover downloading, installing, and starting Studio for the first time. The tutorials below assume Studio is ready to use.
:::

## Work through four examples

| Example | What you will see | What you will learn |
| --- | --- | --- |
| [01 · Interact with PixelMug through chat](/en/getting-started/01-chat) | Send text to the Bot, display it on the mug, and receive the result in chat | The complete Studio workflow; Bots, device declarations, TALID, binding, RPC, commands, and replies |
| [02 · Interact with PixelMug through a WebApp](/en/getting-started/02-pixel-text) | Configure text, font size, color, and scrolling mode in a WebApp, then display it on PixelMug | How a WebApp gets associated devices and calls them directly through the device SDK |
| [03 · Install and run MPY on PixelMug](/en/getting-started/03-ble-play) | Control a light dot on the mug in real time with a WebApp — make it move and blink | Automatic loading MPY code to device, WebApp BLE, message formats, and real-time interaction |
| [04 · Explore more MPY applications](/en/getting-started/04-more-mpy) | Real-time Bitcoin price, image rotation, music spectrum visualization, and particle simulation | Manual MPY installation and switching among independent applications |

Follow the four tutorials in order. The second reuses the first tutorial's application selection, startup, editing, saving, and restart flow, then focuses on the WebApp address and page interaction. The third adds automatic MPY loading for the S1 family, device-side graphics, and BLE. The fourth explores several independent MPY applications and how to switch among them.

Continue to [01 · Interact with PixelMug through chat](/en/getting-started/01-chat).
