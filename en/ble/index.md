# BLE

PixelMug S1 Pro and Lite operate as BLE peripherals and can connect to a BLE central such as a phone, computer, or embedded development board. A PixelMug currently supports one connection at a time. Because BLE development spans both the central and the device, this section brings the related PixelMug BLE documentation together.

## Ways to connect to PixelMug over BLE

Two connection modes are available:

- **Bubble App mode:** Connect through the official Bubble App. The developer uses the `jeejio-bubble` WebApp SDK to build the interface, while the SDK and Bubble App handle connection management, authentication, and messaging.
- **Open connection mode:** Connect directly from a custom desktop application, mobile application, or development board acting as a BLE central. The Bubble App and Bubble authentication are not required; the developer implements the public connection and data protocol.

The modes differ in the central that initiates the connection and the authentication method. On the PixelMug, both use the `maopaoBleApp` component. Select the mode when starting the component; the remaining application APIs are the same.

| Mode | Central | Recommended use | Examples |
| --- | --- | --- | --- |
| Bubble App | Phone running the Bubble App | WebApps that interact with PixelMug and need a rich UI. The Bubble App handles connection, authentication, and messaging so the developer can focus on the interface and application logic. | Music player controls, a virtual game controller, lighting and animation settings |
| Open connection | A custom BLE central | A custom application, desktop program, or ESP-based development board. The developer manages the connection and protocol without the Bubble App or Bubble authentication. | Physical buttons and controllers, BLE sensors whose readings are displayed on PixelMug in real time |

Select the mode before startup. The modes are mutually exclusive; the device does not detect a client and switch automatically.

## Two data channels: standard messages and high-speed data {#data-channels}

Both connection modes expose two channels: the **standard message channel (F150)** and the **high-speed data channel (F160, Simple)**. F150 and F160 are 16-bit UUIDs for two custom GATT services. The standard channel carries the `maopaoBleApp` application protocol. The central first sends `hello` to validate the protocol version and `appId` and establish an application session. Commands, state, events, and configuration become available after that handshake. The high-speed channel does not participate in the application handshake.

The standard channel provides a unified application protocol for command responses, state synchronization, event notifications, and configuration transfer. The high-speed channel provides lightweight transport and packet splitting for binary data and text. It is intended for compact, continuous data. `Simple` in the `maopaoBleApp` component refers to this high-speed channel.

The channels share one BLE connection and can be used by the same application. In Bubble App mode, both use the same authentication, but only the standard channel encrypts its application payload. A game might configure a level and retrieve results through the standard channel while continuously sending joystick coordinates through the high-speed channel.

| Comparison | Standard message channel | High-speed data channel |
| --- | --- | --- |
| Payload | JSON | Binary data or UTF-8 text |
| Bubble App mode | Available after authentication; application payloads are encrypted with the session key | Also requires authentication, but application payloads are not encrypted |
| Open connection mode | No Bubble authentication; application payloads are not encrypted | No Bubble authentication; application payloads are not encrypted |
| Typical use | Play or pause music, set brightness, change a game level, read state, upload configuration | Continuous joystick coordinates, sensor samples, compact custom byte data |

Choose a channel based on the application:

- For an operation that needs a result, such as confirming a brightness change, use `command()` on the standard channel and wait for the device response. State updates and events also use this channel, but normally do not require a response to every message.
- For continuous compact input, such as joystick coordinates every few tens of milliseconds, use the high-speed channel. A successful send only means that the data was submitted, not that the peer processed it. Define an application-level response when confirmation is required.
- For confidential data, use the standard channel in Bubble App mode. The high-speed channel does not encrypt application payloads.

“Bubble App / open connection” chooses the connection and authentication model. “Standard message / high-speed data” chooses the transport channel. The high-speed channel still requires authentication in Bubble App mode and does not require it in open connection mode.

“High-speed” describes a low-overhead transport design; it does not guarantee a fixed rate or real-time delivery. Performance depends on MTU, connection parameters, and application processing speed. The channel does not automatically discard stale input or combine messages by business type. Add sequence numbers, expiration rules, or latest-value processing in the application when needed.

## Where to begin

| Connection | Start here | Code to develop |
| --- | --- | --- |
| Connect through the official Bubble App | [Connect to the Bubble App](./app/) | A WebApp using `jeejio-bubble`, and device-side MPY using `maopaoBleApp` |
| Connect from your own application or hardware | [Connect a custom BLE central](./custom-client) | Central code in your environment, and device-side MPY using `maopaoBleApp` |
