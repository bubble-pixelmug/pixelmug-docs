# MPY 运行基础

MPY 是运行在 PixelMug 设备端的 MicroPython 应用。它可以绘制画面、处理触摸和运动输入、播放或录制音频，也可以通过 Wi-Fi 或 BLE 与其他程序交互。

本篇先说明程序如何组织、启动和退出，以及文件、内存和任务如何管理。具体的绘图、音频和通信接口在各组件文档中介绍。

## 适用设备与运行环境

设备端 MPY 适用于 **PixelMug S1 系列（Pro / Lite），不包括 PixelMug P1**。

当前内核源码基于 **MicroPython 1.27.0-preview** 修改，并加入了 PixelMug 的设备组件。

可以在设备程序中打印运行环境：

```python
import sys
import os

print(sys.implementation)
print(sys.version)
print(os.uname())
```

MicroPython 支持常用 Python 语法，但不是电脑上的完整 CPython 环境。桌面 Python 包、原生扩展和标准库接口不能默认直接使用。设备程序使用的组件也不是 Studio 的 npm 依赖。

## 程序运行在哪里

| 部分 | 运行位置 | 与 MPY 的关系 |
| --- | --- | --- |
| Studio | 开发电脑 | 编辑、上传和启动设备程序，展示日志 |
| Bot | 电脑或服务器上的 Node.js | 处理消息和业务逻辑，通过设备接口发起操作 |
| WebApp | 冒泡 App 内的网页环境 | 提供操作页面，可通过设备接口或 BLE 与设备交互 |
| MPY | PixelMug 的 MicroPython 容器 | 执行设备端 Python 代码，使用显示、音频和传感器等能力 |

Bot 启动和 MPY 启动是两个步骤。只启动 Bot，不代表设备端代码已经加载；MPY 是否依赖持续的网络或手机连接，则由应用自己的逻辑决定。

## 项目目录与入口

在 Studio 项目中，把设备端代码放在 `mpy/`：

```text
my-app/
├─ bot/
│  └─ index.js
└─ mpy/
   ├─ __main__.py      程序入口
   ├─ mps.json         应用描述
   ├─ drawing.py      自己编写的模块
   └─ assets/
      └─ image.png    程序使用的资源
```

Studio 当前要求应用具有 `bot/`。如果包含 `mpy/`，其中必须有 `__main__.py` 和合法的 `mps.json`。纯设备端应用也可以借助一个简单 Bot 完成关联和加载，参考[体验更多 MPY 应用](/getting-started/04-more-mpy)。

### `__main__.py`

设备从 `__main__.py` 开始执行。建议把主流程放进 `main()`：

```python
def main():
    print("Hello, PixelMug!")


if __name__ == "__main__":
    main()
```

这个程序打印一行日志后就结束了。这是正常完成，不是运行失败。需要持续显示或响应操作的程序，应保留自己的运行循环。

### `mps.json`

下面是包含 MicroPyxel 的应用描述示例：

```json
{
  "name": "my-pixelmug-app",
  "version": "1.0.0",
  "description": "我的第一个设备应用",
  "dependencies": [
    { "name": "micropyxel", "version": ">=1.0.0" }
  ]
}
```

| 字段 | 用途 |
| --- | --- |
| `name` | 应用名称 |
| `version` | 应用版本 |
| `description` | 应用简介 |
| `dependencies` | 声明应用使用的设备组件及版本要求 |

**依赖声明不会自动下载或安装组件。** 当前 Studio 打开项目时检查此文件是否为合法的 JSON 对象，不会据此安装库或完整核验组件版本。上面的版本字符串是声明格式示例，不代表固件提供了同名版本查询接口。实际可用接口要与目标固件核对。

设备内置组件由固件提供；自己编写的 Python 模块和应用资源则随 `mpy/` 一起上传。

## 从加载到运行

在 Studio 中有两种常用方式：

- **自动加载**：勾选“启动后自动运行设备代码”。启动智能体并识别到关联设备后，由 Studio 加载并运行 `mpy/`。
- **手动加载**：关闭自动运行，由 Bot 提供安装命令。示例 4 使用 `/installMPY` 发起设备加载。

具体操作可参考[在 PixelMug 上安装和运行 MPY](/getting-started/03-ble-play)和[体验更多 MPY 应用](/getting-started/04-more-mpy)。

保存电脑上的文件不会自动更新水杯。修改后需要重新加载设备代码；采用自动加载方式时，可以保存后重启智能体。

“程序已开始运行”表示进入了入口执行阶段，不等于网络、蓝牙或所有组件都已就绪。应用应在初始化完成后再开始相关操作，例如等待传感器就绪，或者等待 BLE 连接完成。

## 文件路径与模块导入

### 电脑上的 `mpy/` 对应设备上的应用根目录

Studio 上传的是 `mpy/` **里面的内容**。例如：

| 电脑上的文件 | Studio 加载后的设备路径 |
| --- | --- |
| `mpy/__main__.py` | `/__main__.py` |
| `mpy/drawing.py` | `/drawing.py` |
| `mpy/assets/image.png` | `/assets/image.png` |

Studio 启动入口时把工作目录设为 `/`。因此读取资源时使用：

```python
with open("assets/image.png", "rb") as source:
    header = source.read(8)
```

不要写成 `mpy/assets/image.png`，也不要使用电脑上的 `D:\...` 路径。二进制资源用 `rb` 读取，文本文件用 `r`。

相对路径以当前工作目录为准，不以当前 Python 模块所在目录为准。若程序调用了 `os.chdir()`，之后的相对路径也会改变。

### 导入自己的模块

如果 `drawing.py` 与入口位于同一目录：

```python
import drawing
```

多个文件也可以组织成带 `__init__.py` 的包。内置组件直接导入，例如：

```python
import micropyxel as pyxel
import mpy_button
```

避免把自己的文件命名为 `time.py`、`json.py`、`micropyxel.py` 等已有模块名称，以免发生导入冲突。

### 写入文件与重新部署

程序可以使用 `open()` 和 `os` 操作设备文件，但**不要假定应用数据会跨安装或重新部署保留**。

当前 Studio 在上传前会清理设备应用文件，仅保留其需要的 REPL 启动文件；固件安装流程在需要重新安装应用时也会清理 MPY 分区。程序运行中写入的设置、缓存或录音，可能随下次加载被删除。需要保留的内容应在重新加载前取出，或由应用发送到外部服务保存。

在 `mpy/` 根目录不要放入 Studio 保留文件名：`boot.py`、`webrepl_cfg.py`、`__studio_bootstrap__.py`。这些文件由运行环境管理。

## 选择一种运行循环

### 普通循环：适合简单任务

```python
import time


def main():
    while True:
        print("MPY is running")
        time.sleep_ms(1000)


if __name__ == "__main__":
    main()
```

循环中留出等待时间，避免无间隔地查询设备或输出日志。

测量经过的时间时，使用 `time.ticks_ms()` 和 `time.ticks_diff()`；计数值会回绕，不要长期依赖直接相减：

```python
started = time.ticks_ms()
# 执行操作
elapsed = time.ticks_diff(time.ticks_ms(), started)
```

### MicroPyxel 循环：适合持续绘图和交互

下面的完整入口在屏幕上显示一个光点，单击底部触摸按键退出：

```python
import micropyxel as pyxel
import mpy_button


def update(rt):
    if mpy_button.get() == "click":
        pyxel.quit()


def draw(rt):
    pyxel.cls(0)
    pyxel.pset(16, 8, 10)


def main():
    pyxel.init(start_audio=False)
    try:
        mpy_button.clear()
        pyxel.run(update, draw, fps=30)
    finally:
        pyxel.destroy()


if __name__ == "__main__":
    main()
```

- `update()` 处理输入并更新状态。
- `draw()` 根据状态绘图。
- `run()` 调用这两个函数，并在每帧绘制后刷新屏幕。
- `rt` 是回调传入的运行时模块对象；本例直接使用 `pyxel`，不需要使用它。
- `quit()` 请求结束绘图循环，控制流返回 `main()`，随后执行清理。

`fps=30` 是目标帧率，不是实时保证。不要在每帧回调里执行长时间阻塞的 HTTP 请求、文件读取或等待，否则画面和输入响应都会停顿。

### `asyncio`：适合异步网络和协作任务

```python
import asyncio


async def main():
    while True:
        print("async task is running")
        await asyncio.sleep_ms(1000)


asyncio.run(main())
```

`asyncio` 通过 `await` 让任务交替执行。同步网络请求、`time.sleep_ms()` 和长时间计算不会因为放进 `async def` 就变成异步操作；需要使用对应的异步接口。

如果主函数需要参数，参数传给主函数：

```python
# 假设你定义了 async def main(proxy=None)
asyncio.run(main(proxy="http://192.168.0.10:7890"))
```

这里 `proxy` 是应用函数的参数，不是 `asyncio.run()` 的参数，也不会自动配置全部网络连接。应用需要再把它交给支持代理的网络接口。

`pyxel.run()` 和 `asyncio.run()` 都会占用调用流程直到退出。不要简单地前后调用它们并期待两个循环同时工作；先根据应用需要选择主循环，再设计组件之间的协作。

当前固件也启用了 `_thread`，但线程涉及共享状态、退出和设备资源竞争。基础应用优先使用单个循环或异步任务；只有明确需要时再引入线程。

## 退出与资源清理

程序可以自然执行完毕，也可以通过结束循环退出。未处理异常会终止当前执行流程，并输出错误信息。

对需要释放的资源，使用 `try/finally` 或组件提供的退出回调：

| 资源 | 常见清理方式 |
| --- | --- |
| 文件 | `with open(...)` 自动关闭 |
| MicroPyxel | `pyxel.destroy()` |
| BLE 应用服务 | 服务对象的 `deinit()` |
| G-sensor | `g_sensor.deinit()` |
| PixelDust | 粒子对象的 `deinit()` |
| HTTP、WebSocket、音频会话 | 按对应组件接口关闭或取消 |

只清理由当前应用初始化或持有的资源。多个组件共用音频、显示等能力时，应统一安排初始化与清理，具体规则见组件文档。

`pyxel.run()` 也支持 `on_exit(rt, reason, error)`，可把绘图循环的清理集中放在该回调中。上面的示例选择了 `finally`，无需再重复注册相同的销毁动作。

`finally` 能处理正常的 Python 退出和异常展开，**不能保证在断电、硬件重启或强制终止 VM 时执行**。Studio 的停止或重新部署可能涉及设备重启，因此不要只在退出时才保存重要数据。

## 常用基础模块与内存

| 模块 | 常见用途 |
| --- | --- |
| `time` | 等待、计时、时间读取 |
| `asyncio` | 异步任务与网络协作 |
| `json` | JSON 编解码 |
| `struct` | 二进制消息打包和解析 |
| `os` | 文件、目录和工作路径 |
| `sys` | 运行环境、模块路径、异常输出 |
| `gc` | 垃圾回收和 Python 堆内存观察 |
| `math`、`random` | 数学计算和随机数 |

这些模块应按 MicroPython 支持的接口使用。

设备内存有限，图片、音频和网络数据应尽量按块处理；频繁执行的循环尽量复用缓冲区，避免每帧创建大量临时对象。

```python
import gc

print("Python heap free:", gc.mem_free())
gc.collect()
print("After collection:", gc.mem_free())
```


这些数值反映 Python 堆，不代表全部系统内存。`gc.collect()` 也不能代替显示、音频和网络组件自身的资源释放。

## 日志与下一步

使用 `print()` 输出关键状态，在 Studio 的设备调试页查看。建议记录初始化完成、连接变化和操作结果，避免每帧打印大量内容。

需要捕获异常并保留堆栈时，可以使用 `sys.print_exception(error)`。不要把所有异常都静默忽略，否则程序已经失败，界面却可能仍停留在之前的画面。

```python
import sys

try:
    1 / 0
except Exception as error:
    # 打印完整异常堆栈信息到 Studio
    sys.print_exception(error)
```

准备好目录、入口和运行循环后，可以进入 [MicroPyxel](/device/micropyxel/)、[触摸按键](/device/button/)、[G-sensor](/device/g-sensor/)等组件文档。想先运行完整项目，可以返回[立刻体验](/getting-started/)。
