# Device APIs

Device APIs are for MicroPython programs that run directly on PixelMug S1. Use them to implement local device logic for custom graphics, audio, touch, motion, and network communication.

If you only need a Bot to control the display, query status, or use other firmware capabilities, use the JavaScript [device RPC SDK](/en/bot/device-sdk) on the Bot side. It calls built-in firmware interfaces remotely over RPC and does not require a device-side program.

Begin with [MPY runtime fundamentals](/en/device/runtime/) to learn about project entry points, file paths, the run loop, resource cleanup, and firmware dependencies. Then read the component documentation you need.

| Documentation | Covers |
| --- | --- |
| [MPY runtime fundamentals](/en/device/runtime/) | Runtime, program structure, loading, files, tasks, and shutdown |
| [Network](/en/device/network/) | HTTP/HTTPS, WebSocket, TLS, TCP, UDP, and connection lifecycle |
| [MicroPyxel](/en/device/micropyxel/) | Graphics, images, fonts, maps, animation, sound synthesis, and the run loop |
| [Audio Service](/en/device/audio/) | Playback, recording, and spectrum analysis |
| [Prompt sound player](/en/device/prompt-sound/) | Play Ogg Opus prompts in batches, with interruption and preload caching |
| [Touch](/en/device/button/) | Read taps, double taps, and immediate press state from the bottom touch area |
| [G-sensor](/en/device/g-sensor/) | Acceleration and motion input |
| [Dust](/en/device/dust/) | Particle movement, collisions, and boundaries |
| [BLE](/en/ble/) | Nearby communication among the Bubble App, a custom central, and MPY |

The runtime, MicroPyxel, Audio Service, and G-sensor APIs are documented in detail, and the remaining components are being completed. This documentation applies to the PixelMug S1 family (Pro and Lite), not PixelMug P1.

Complete runnable projects are available in [Get started](/en/getting-started/). Device-side code is stored in each project's `mpy/` directory.
