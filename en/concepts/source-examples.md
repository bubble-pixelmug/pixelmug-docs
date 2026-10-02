# Example source index

This round is based on `mps/jeejio-bubble/examples`. The following table path is relative to the directory, covering the illustrative source code and description; `studio-debug/debug` is a historical running product and is not a tutorial source.

This is the document material directory, not the running entry. Full runable items are then sorted to `tools/studio/examples` and not copied to `docs`. The existing source examples are mostly based on local `config.dev.js` and SDK relative paths and cannot be directly considered as documents in the npm package.

## Bot messages and devices

| Example file | Demonstrating abilities | Corresponding Document Theme |
| --- | --- | --- |
| `added_events_bot.js` | Add Contacts, Add Group Talk, Send Welcome Messages | Events & Chats |
| `reply_bot.js` | Quote Message Reply | Message and Context |
| `test_at_bot.js` | Group Talk @ and Send Target | Group chat strategy |
| `test_message_bot.js` | Text/Markdown/Keyboard Back and Media Message Processing | Message Type, Command Menu |
| `binding_devices_bot.js` | Multiple device declarations, query associated device, observation of changes in association | Device identity and association |
| `dev_binding_bot.js` | Associated cards, switch screens, device charge notifications | Tie, RPC, Device Event |
| `binding_multi_dev_bot.js` | Multiple slot control and click chat saver subscription | Multiple device context, notification route |
| `dev_compatible_bot.js` | `compatible` Declaration with multiple slot | TALID Compatibility Rules |
| `print_text_ext_bot.js` | Extension device module construction text display | ext layer, step RPC construction |
| `show_image_ext_bot.js` | Picture Display & Sync Image Display | Device Photo Capability |
| `mps-dev-bot.js` | Start device WebREPL, read Wi-Fi information | Development of tools and device operating conditions |
| `async-device-call/test_async_print_text_bot.js` | Step-by-step, end-out, time-out, intentional call-in-no-existent RPC | Step job and error management |

Some examples include demonstrations of back-matching, memory caches, and shorter timeout. The formal multi-user tutorial needs to re-confirm segregation to match the target device and should not be replicated as a generic business strategy.

## Media examples

| Documentation | Demonstrating abilities | Auxiliary material |
| --- | --- | --- |
| `media/test_input_file_bot.js` | OSS Upload, Photo/Video Transmission, Media and Reference Access | `media/1160x904.png`, `media/960x720.mp4` |
| `voice/test_voice_bot.js` | Resume voice, upload OGG, read Opus | `voice/west.ogg` |

Time long resolution is an example tool function and is not an automatic `inputFile()` ability. The file path, long-end preset URL and size information should be replaced with a maintenanceable material and configuration in the official example.

## WebApp, Bot, and devices

Each group below contains read Bot and web-based realizations.

| Example and File | Business processes | Document Theme |
| --- | --- | --- |
| `webapp-sum/bot.js`, `index.html` | `app.sum` Request →Bot Calculating →WebApp Read `response.result` | First WebApp, error response |
| `webapp-push/bot.js`, `index.html` | `app.ready/ping/triggerPush`, Bot to send `app.push`, build a table | Distinction between request and delivery, session target |
| `webapp-access-policy/bot.js`, `index.html` | Switch `none/any/all` and try to open the page | WebApp Open Conditional Authentication |
| `webapp-device/bot.js`, `index.html` | Querying devices, switch screens, subscription to charge notifications, testing of RPCs that do not exist | Host device call, event and error |
| `webapp-multi-devices/bot.js`, `index.html` | Select Device, device RPC, as Device Maintenance Notification | Multiple Device Pages |
| `webapp-camera/bot.js`, `index.html` | Browser selection/photography, Canvas compression, application for uploading sessions, HTTP uploading, OSS and message sending | Dissociation of large documents from application requests |
| `gif-player/test_gif_player_bot.js`, `index.html`, `gifs.js` | GIF list, page check and call `talPlayGif`, Bot observation after sending GIF messages | Device calls for observation, media connections |

The five-minute business session cache of `webapp-push`, the camera upload size limit, the 32x16/40 KiB verification of the GIF example are the rules of that example and cannot be directly classified as the SDK generic default or all device specifications.

## BLE and MPY

| Documentation | Contents |
| --- | --- |
| `webapp-ble/bot.js` | Declaration S1 Devices, Associated Cards and WebApp portal |
| `webapp-ble/index.html` | `webapp.ble.connect()`, status processing, sending direction character |
| `webapp-ble/mpy/ble_ctrl.py`, `mpy/demo.py` | `maopaoBle` Callback and Roundup, MicroPyxel Square Move; current two are the same |
| `webapp-ble/README.md` | basic direction control statement; including references to documents to be amended |
| `webapp-ble-rt/bot.js` | Real-time touchboard entrance |
| `webapp-ble-rt/app.js` | `BleAppClient` Shake hands, 3-bytes Simple RAW, Move Merge and Click First |
| `webapp-ble-rt/index.html`, `style.css` | Touchboard interface, touch event area, connect status |
| `webapp-ble-rt/mpy/touch.py` | `BleAppService` Simple Data Reception, Cursor and Particle Effects, Performance Statistics |
| `webapp-ble-rt/mpy/draw.py` | Continuously and gradually draw in the same message format |
| `webapp-ble-rt/README.md` | F160 Example protocol and operational description; MPY entry references to be amended |

The device end example reflects the difference between connection, ready and application drawing loops. They serve as examples of the use of solid-ware documents and cannot replace an interface that is achieved by `maopaoBle`/ `maopaoBleApp`.

## Home Assistant Extension

The HA example uses `devices/hass`, which is not the core dependent process that all Bot needs. This round reads how to call, and a full HA API document needs to be read and expanded separately.

| Documentation | Content and attribution |
| --- | --- |
| `hass/ha_bridge_smoke.js` | HA Connection, Entity/Registration Form, Capacity Compact read-only validation |
| `hass/ha_event_monitor.js` | Status, registration form, ability and listening to birth events |
| `hass/ha_action_test.js` | Default dry-run, execute by configuration and try to restore power |
| `hass/ha_control_bot.js` | Bot command calling HA entity, notification and camera snapshot upload |
| `hass/ha_external_control_bot.js` | External Connector Channel, Entity Operations and Camera Data |
| `hass/ha_webapp_bot.js` | `HassWebAppGateway`, read-only/control switch, user authorization, page service |
| `hass/webapp/app.js` | `ha.bootstrap`, `ha.entity.call`, incremental events, physical screening and light panels |
| `hass/webapp/index.html`, `style.css` | HA Watch Board Pages and Control Styles |
| `hass/test_support.js` | Configure overwrite, WebSocket achieves selection, test assistive functions |
| `hass/README.md` | Extension description, part npm command to update |

`ha.*` Requests and events are integrated by the HA gateway, not by `BubbleWebApp` in-house. Camera Buffer uploads, HA token, physical semantics and external connections should be described in the integrated theme.

## Configuration, assets, and build output

- `config.dev.js`, `config.pub.js`: Bot Environment Configuration; not writing token values in the document.
- `hass/ha.config.js`, `hass/ha.config.extern.js`: HA environment and certificate configuration; tutorials use place value or environment variable.
- Pictures, MP4, OGG: Example material, registration use, not as API definition.
- `studio-debug/debug/**`: A running record already exists, not included in the document illustrative set.

## SDK and source-code mapping

| Achieved documentation | Document Attribution |
| --- | --- |
| `index.js`, `BubbleSDK.js` | Export entrance, compatible entrance |
| `BubbleBot.js`, `BubbleApiClient.js` | Bot Life Cycle, Operations & Cloud Interface |
| `Context.js`, `ContextFactory.js` | Context, events |
| `DeviceRegistry.js`, `DeviceBinding.js` | Device declaration, slot, association information |
| `InlineKeyboard.js`, `InputFile.js` | Message support capability |
| `WebApp.js`, `WebApp.d.ts` | Web operations and device communications |
| `BleManager.js` | BLE transfer to primary bridge |
| `BleAppSession.js/.d.ts`, `BleAppClient.js/.d.ts` | BLE Application Protocol and Client |
| `constants.js`, `errors.js` | Constant and Error Model |
| `Dispatcher.js`, `Poller.js`, `Queue.js`, `TraceManager.js`, `utils.js` | SDK internal mechanism, mainly for maintenance statements and miscalculation |
| `BubbleBot.test.js`, `WebApp.test.js` | Device ACK with final response, error details |
| `BleSimple.test.js`, `BleAppSession.test.js` | Simple Data, Message Size Limit |
| `Poller.test.js` | The difference between a guard dog and a real cyber error. |
