# 设备端接口

设备端接口供直接运行在 PixelMug S1 上的 MicroPython 程序使用。开发者通过这些接口编写设备本地逻辑，实现自定义显示、音频、触摸、运动和网络通信功能。

如果只需要从 Bot 控制屏幕、查询状态等固件已有能力，使用运行在 Bot 一侧的 JavaScript [设备 RPC SDK](/bot/device-sdk)即可。它通过 RPC 远程调用固件内置接口，无需编写或部署设备端程序。

先阅读 [MPY 运行基础](/device/runtime/)，了解项目入口、文件路径、运行循环、资源清理和固件依赖，再按需要查阅组件接口。

| 文档 | 内容 |
| --- | --- |
| [MPY 运行基础](/device/runtime/) | 运行环境、程序结构、加载、文件、任务与退出 |
| [Network](/device/network/) | HTTP/HTTPS、WebSocket、TLS、TCP、UDP 与连接生命周期 |
| [MicroPyxel](/device/micropyxel/) | 绘图、图片、字体、地图、动画、声音合成与运行循环 |
| [Audio Service](/device/audio/) | 播放、录音与频谱分析 |
| [提示音播放器](/device/prompt-sound/) | 分批播放 Ogg Opus 提示音，支持打断与预加载缓存 |
| [Touch](/device/button/) | 读取底部触摸区域的单击、双击和即时按下状态 |
| [G-sensor](/device/g-sensor/) | 加速度与运动输入 |
| [Dust](/device/dust/) | 粒子运动、碰撞与边界 |
| [BLE（独立专题）](/ble/) | 冒泡 App、自定义中心设备与 MPY 的近距离通信 |

运行基础、MicroPyxel、Audio Service 与 G-sensor 详细接口已补充，其他组件将逐项完善。本文档面向 PixelMug S1 系列（Pro / Lite），不包括 PixelMug P1。

完整可运行项目见[立刻体验](/getting-started/)，设备端代码位于项目的 `mpy/` 中。
