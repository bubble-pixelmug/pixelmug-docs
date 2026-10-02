# Documentation structure and completion order

This is a source-code-based document frame. Concepts, interface indexes and illustrative indexes have been created; complete parameter descriptions and end-to-end tutorials will be completed on a module-by-map basis. This is not an interface commitment that has not yet been achieved.

## Information architecture

The document presses " Concept Zoom Finishes One Zooming Interface Zooming " , without replicating the source file tree.

| Modules | Other Organiser | Follow-up themes and recommendations |
| --- | --- | --- |
| Core concepts | `concepts/index.md` | Operating environment, communication channels, device identity, requests for meetings |
| Bot | Overview, operating framework, fast start; context, news, buttons, media, commands and group chats; device connection, DVD SDK, RPC and notification tutorial; interface index | Follow-up to request/push/strategy `webapp.md` separately; for the current entrance to the curriculum, see [Bot SDK](/en/bot/) |
| WebApp | `webapp/index.md`, `webapp/reference.md` | `quick-start.md`; `messaging.md` ReQuest/response/referral;`devices.md` Query/RPC/subscribe;`media.md` Camera and HTTP upload;`lifecycle.md` Session/resource cleanup |
| BLE | `ble/index.md`, `ble/app/index.md`, `ble/app/webapp/`, `ble/app/mpy/`, `ble/custom-client.md` | Line with Bot, WebApp, device end; two reading paths by connecting Bubble App and custom center devices |
| definition of data RPC | Follow-up to device end interface module | PixelMug / S1 methods and parameters, base layer and ext layer; special check `devices` source code |
| Integration | This round is archived in the Example Index | Following `integrations/hass/`, read `devices/hass` without the HA-specific interface as a generic Bot API |
| Studio | Keep `studio/index.md` | Project configuration, npm dependency, WebApp address, deployment, log; separated from SDK life cycle |
| Maintenance of information | Page `concepts/source-examples.md` | Source, applicable version, check status; not complete runable items |

BLE documents are placed in a separate `ble/` directory. The " Connect Bubble App" contains a master frame with a full example, a WebApp SDK interface and an MPY interface; and " Connect custom BLE central devices" concentrates on the open protocol. Bot, WebApp and the device end directory only keep links to the relevant entry.

## Recommended completion order

| Order | Delivery | Example Basis |
| --- | --- | --- |
| 1 | Minimum Bot receiving and sending messages; smallest WebApp calls Bot and shows results | `reply_bot.js`, `test_message_bot.js`, `webapp-sum/` |
| 2 | Register associated devices, compatible types, device RPC, error and timeout | `dev_binding_bot.js`, `dev_compatible_bot.js`, `async-device-call/` |
| 3 | WebApp device control, event subscription, multi-device, Bot delivery | `webapp-device/`, `webapp-multi-devices/`, `webapp-push/` |
| 4 | BLE Two Connection Paths, Application Interfaces and Open Agreements | `tools/studio/examples/ble-minimal/`, `tools/studio/examples/ble-custom-client/` |
| 5 | Media, camera upload, GIF; progress integration | `media/`, `voice/`, `webapp-camera/`, `gif-player/`, `hass/` |

The final package of the tutorials is put in `tools/studio/examples`.`docs` Only notes, API tables, short code clips and use example instructions. This round is reserved `mps/jeejio-bubble/examples` Existing catalogues, as a basis for consolidation, do not relocate projects.

## Standard content for each API page

| Item | Elements to describe |
| --- | --- |
| Scope of application | SDK package version, Node / Bubble App/ Solidware Environment; which versions have actually been validated |
| Purpose and precondition | Need Bot Starts, Associated Devices, Host Bridge, MPY Applications Run |
| Import and Sign | npm subpath, sync or Promise, optional |
| Parameters | Type, default, unit, permissible; in particular, distinction between seconds and milliseconds, serial numbers and id |
| Return and Event | Return to package layer, object structure of event, request for receipt and execution completed distinction |
| Error | Unusual type, business code, time out, breakout, retryability and duplicate risk |
| Minimal Snippet | Show only the required codes for this interface, not copying static servers, etc. |
| Full Item | Point to operational projects, configuration steps, expected results |
| Life cycle | Start, subscribe, unsubscribe, close; clear timers and connections |
| Source | Achievement documents, relevant tests, reference examples, final check dates |

`system.*` is the built-in WebApp protocol for SDK; the example `app.*` is self-defined for business; `ha.*` belongs to HA integration. The three should be prepared separately.

## Items to be verified during current cycle

The following is from the source review and this round does not modify SDK or examples.

| Item | Status and impact on documents |
| --- | --- |
| Version baseline | Local `package.json` is `0.1.1`, `sdk/constants.js` and `VERSION` remains `0.1.0`. The latest version of npm cannot be inferred from this. Source of subsequent harmonized version |
| Type declaration | `WebApp.d.ts` does not cover the full realization method, and BLE statements also have a general type. The interface index is followed and subsequent completion type considers the automatic generation of API |
| npm and Source Example | Examples are mostly imported and locally configured using relative source code; the official tutorial needs to be changed to the released npm sub-routine. The browser needs a packager or a visible module map to import a package name naked |
| BLE Foundation README | Point to `mpy/ble_ctrl.json`, which is not found in the current directory; the current `ble_ctrl.py` is the same as `demo.py` |
| BLE Real Time README | Point to `mpy/__main__.py`, the current directory actually provides `touch.py` and `draw.py`; the entrance needs to be selected and indicated |
| WebApp Open Exemplation | Service root path to `/examples/webapp-access/index.html` with actual directory to `webapp-access-policy`; cannot directly repeat root path step |
| HA README command | Using multiple `example:hass:*` commands, these commands are not provided by the current package scripts; the follow-up course should give a real startup |
| Example static service | Multiple examples directly provide the repository root directory file, which contains the local configuration directory; HA README's description of "do not provide token file" is not consistent with the static service range. It cannot serve as a template for official distribution services directly |
| Device online format | SDK binding is online by `true`, `1`, `"1"`; the Creator interface is also `ONLINE/OFFLINE`. Checks should be made separately in different API return formats, and cannot be implemented interchangeably |
| Unsubscribe Results | Bot inner unsubscription removes subscriptions, but the response still contains `subscribed: true`; do not use this field to state cancellations |
| Life cycle | `BubbleWebApp.stop()` Stop the heartbeat and report it closed, not destroying all listening and pending requests; BLE `close()` does not equal the original cut-off of bluetooth; Bot `stop()` main stop of the inquiry |
| Service-end strategy and compatibility | The protocol map `none/any/all` can be confirmed from the source code that App actual access behaviour, BLE channel support version, firmware protocol details still need to be reconciled |

## Review scope

This round reads SDK realization, type statement and existing SDK tests, as well as Bot, HTML, JavaScript, CSS, Python and README in examples. Pictures, audio, video are registered as illustrative material; local documents and historical logs are not used as public documents.

The example shows how to " call " , which does not support all cloud or hardware behaviour separately. Each subsequent module completes the real run validation and then adds a clear version and validation result.
