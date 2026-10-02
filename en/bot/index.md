# Bot SDK

The Bubble App is where users interact with devices. Chat is its primary interaction model: users can send messages, tap buttons, receive device status updates, or open a WebApp for more complex graphical operations. Developers can begin with messages and buttons, then add page-based interaction when needed.

Groups extend this model from personal device control to collaboration among several people and devices. Users interact with the same Bot in a group; the Bot calls associated devices according to application logic and reports results or device events in the conversation. Family members can operate shared devices, or a team can coordinate several devices through one Bot. Applications can therefore be organized around group members, devices, and workflows instead of being limited to one person controlling one device from one page.

A Bot connects Bubble conversations to application logic. It receives user messages, sends text and media, displays action buttons, associates PixelMug devices, and calls device capabilities. A Bot runs in Node.js on a computer or server. Studio can launch it, or it can run independently.

For your first project, complete [Your first Bot](./quick-start), then add [inline buttons](./inline-keyboard) and [device association](./devices).

## Application structure

A user sends a message in the Bubble App, and the cloud delivers the update to the Bot. The SDK polls for updates, creates a context, and invokes handlers. Your handler defines what to do and how to reply.

```text
Bubble chat → Cloud → Bot SDK → Application handler
                 ↑                 │
                 └──── Reply ──────┘
```

For a device call, application code first uses a JavaScript device RPC SDK to construct the request, then sends it through the Bot. After execution, the Bot SDK matches the response to the call or delivers a device event, such as a button press or a change in charging state, to a notification handler.

```text
Application handler → Device RPC → Bot SDK → Cloud → Associated device
Application handler ← RPC result or device event ← Bot SDK ← Cloud ← Associated device
```

The device RPC SDK is a JavaScript library that runs on the Bot side. It wraps the remote procedure call interfaces built into the device firmware. You use it to construct commands, and the Bot SDK sends those commands to control the display, query status, and use other built-in capabilities. The device firmware performs the operation; you do not need to write or deploy a device-side program.

[Device APIs](/en/device/) serve a different kind of development: writing programs that run directly on the device for custom graphics, interaction, and sensor processing. Use them when the application needs to extend local device behavior.

## Choose a guide by task

| What you want to do | Documentation |
| --- | --- |
| Understand startup, message processing, and shutdown | [Runtime](./runtime) |
| Start a Bot that replies with text | [Your first Bot](./quick-start) |
| Read sender data, handle events, and add common logic | [Context and events](./events) |
| Send text and Markdown, quote a message, or send proactively | [Send and reply to messages](./messages) |
| Add buttons to a message and handle clicks | [Inline keyboard](./inline-keyboard) |
| Upload files and send or receive images, voice, video, and GIFs | [Media and files](./media) |
| Define a command menu and use a Bot in group chats | [Commands and groups](./commands-and-groups) |
| Reply in the conversation language and localize command descriptions | [Internationalization](./internationalization) |
| Declare device requirements and guide users through associating one or more devices | [Device declaration and association](./devices) |
| Combine the Bot SDK with a device RPC SDK to control an S1 and display text | [Use the device RPC SDK](./device-sdk) |
| Wait for device results and handle asynchronous completion and failure | [Device calls and results](./device-rpc) |
| Receive charging events and route notifications to the correct conversation | [Device notifications and multi-device routing](./device-events) |

## Example conventions

The tutorials import `@jeejio-bubble/bot/sdk`, and device examples primarily use PixelMug S1. Create the `bot` by following [Quick start](./quick-start), then add the short snippets from each page. Unless stated otherwise, register handlers before startup. Device features use `await bot.start()` so that both message polling and device polling are active.
