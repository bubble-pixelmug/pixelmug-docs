# PixelMug Studio: first run and device deployment

Target duration: **2 minutes 40 seconds**. Record in English with the real Studio application, a dedicated test Bubble account, one test Bot, and one compatible online PixelMug. Use `getting-started/03-ble-play` so Bot, WebApp, and MPY appear in one recording.

## Before recording

- Start with Studio closed and the test device online.
- Never expose a usable token; paste it off-screen or mask the field before export.
- Blur account name, device serial number, device ID, private LAN address, and unrelated logs.
- Set Studio to English and record at 1920×1080, or crop consistently to the application window.

## Shot list and narration

| Time | Screen action | Narration / subtitle |
| --- | --- | --- |
| 00:00–00:12 | Open Studio and show the three navigation stages. | “PixelMug Studio is the local workspace for running a Bot, serving a WebApp, deploying MicroPython, and reading logs.” |
| 00:12–00:28 | Sign in; cut before showing the code. Open **My Bubble**. | “Sign in with the Bubble account that owns your test Bot and PixelMug.” |
| 00:28–00:47 | Show online device, Bot, masked token, and **Set**. | “My Bubble shows account devices and Bots. Tokens stay only for this Studio session.” |
| 00:47–01:10 | Open `getting-started/03-ble-play`; show its settings. | “Choose the project root, Bot, phone-reachable WebApp address, and automatic device code.” |
| 01:10–01:27 | Click **Start agent**; link the test device. | “Start the agent, then link a compatible device. Account ownership alone is not a Bot binding.” |
| 01:27–01:50 | Show Python Dev, connect, upload, and run steps. | “Studio uploads the contents of mpy and runs the main program on the linked PixelMug.” |
| 01:50–02:10 | Show green topology and WebApp if practical. | “Green paths show active state. WebApp and MPY paths appear as those services become ready.” |
| 02:10–02:31 | Show Bot/WebApp logs, device logs, and **Errors only**. | “Use Bot, WebApp, and device logs to find the failing layer.” |
| 02:31–02:40 | Show MPY-only update, then **Stop agent**. | “Update one device for MPY-only changes. Stop the agent before changing settings.” |

## Export

Export H.264/AAC MP4 at 1080p. Add `pixelmug-studio-first-run.en.vtt` as the English subtitle track. Use the same click numbering from [the capture list](../capture-list), and check every final frame for secrets.
