# 04 Experience more MPY applications

This time, we let MPY run independently on the cup, and experience real-time behavior, graphic animation, music spectrum and motion. You just switch files, install programs, and see the same PixelMug displays different abilities.

This example only supports the **PixelMug S1 series (Pro / Lite) and not the P1**. Project location: `getting-started/04-more-mpy`. WebApp is not needed, nor is there a need to connect to Bluetooth.

## I. Run the example in Studio

### 1. Select Application

Starts a agent running before you stop. Opens the entire `getting-started/04-more-mpy` folder in Studio.

Confirms that the Bot entrance is `bot/index.js`, and fills out Bot token. The application and configuration token is the same as [First](/en/getting-started/01-chat).

The project has two catalogues of the plant placement procedures:

| Contents | Purpose |
| --- | --- |
| `exampleMPY/` | Save individual examples for your choice and copy |
| `mpy/` | Store the actual installation on the mug |

Studio loads the contents of **`mpy/`,** and does not install all the applications in `exampleMPY/` at the same time. Replaces `mpy/` with the item and runs your current input.

### 2. Turn off autorun, start the agent

In " Run Configuration " **, delete the ticking " Auto-run device code after start-up " **, and then click " Start Smart " .

Unlike the third, this example sets up MPYs manually through Bot commands, so that you can start running every time you change a file. During the installation, you keep Studio and your agent running, glass online, computer and glass in the same local area network.

### 3. Associated device

Open Bot in Bubble App

- Send `/help` Look for a brief description.
- Send `/bindPixelMug`, associate a PixelMug S1; it can also be done in the Studio's Associated Device card.

If the right device has been linked, it can continue directly.

### 4. Install and experience

Send `/installMPY`. Studio loads the current program and resources in `mpy/` on the mug.

Wait for Bot hint ** “MPY has been running on PixelMug and can start to experience.”** and then watch the mug. You can wait until you receive the installation request.

When the default `bitCoin` example is used for the first time, the mug connects to the line service and then shows the BTC/USD price. Wi-Fi of the device needs access to the line service.

## II. Switch between applications

The four examples are shared with the same Bot, and the switch does not need to replace token or open another Studio project.

1. Stops the agent in Studio.
2. Empty Project **`mpy/` Old Files and Subdirectories in**;if modified and desired, back up.
3. Select an example from `exampleMPY/` to copy all ** files and subdirectories** in this folder to `mpy/`.
4. Keeps the running options closed automatically, restarts the agent.
5. Send `/installMPY` in Bubble App, waiting for a successful run and experience of new applications.

For example, after switching to a music player, the directory should read

```text
04-more-mpy/
├─ bot/
├─ exampleMPY/         Keep original examples
└─ mpy/
   ├─ __main__.py
   ├─ mps.json
   ├─ ogg.py
   ├─ spectrum.py
   └─ test_audio.ogg
```

::: Tip Copys contents in folders
The entry point should read `mpy/__main__.py` and not be copied to `mpy/musicPlayer/__main__.py`. In addition to the Python file, resources such as `mps.json`, pictures, audio, etc. should be copied together.
:::

## III. What the four examples demonstrate

### Bitcoin: show live prices on the mug

** Duplicate source: `exampleMPY/bitCoin/`**

The glass is directly via Wi-Fi to get Kraken’s open BTC/USD lines and displays the price in green numbers.

Displays `CONNECT` on startup, then `WAIT`, shows the price in United States dollars when you receive the line and updates it as you wish. This example shows the ability of the device to access the network and keep the screen updated on an ongoing basis without the need for a mobile phone page.

### RotateImage: rotate an image

** Duplicate source: `exampleMPY/rotateImage/`**

After running, the mug displays a picture of a continuous rotation. The material is a 32x16 `asset.png`: the right half is laid in the background, the left half is rotated in the middle of the screen.

Do not require extra operation to see it when installed. Switch to copy `asset.png` together to `mpy/`.

### MusicPlayer: tap to play and view the spectrum

** Duplicate source: `exampleMPY/musicPlayer/`**

After running, the screen scrolls `Click to Start`, and the red pent-triangular pointer key that moves at the bottom.

1. Click the touch button at the bottom of the mug to start playing local `test_audio.ogg`.
2. When playing, the screen displays a colour column spectrum and a white peak line that changes with the music.
3. After playback, the screen shows `Click to Restart` and the red back triangle appears again.
4. Click again, play from the beginning, and experience again.

Clicking on a play does not restart. Music is generated from an audio file within the project and no online music service is required.

### Motion: tilt the mug to move particles

** Duplicate source: `exampleMPY/motion/`**

At the bottom of the screen, there was a white particle column of five and ten large, consisting of 50 single pixels.

Slant or gently shakes a glass, where the particles are dumped, dispersed, ejected on the screen, and bounced back at the border. There are no obstacles in the picture, and you can see directly how the mug moves affect the particle movement.

** Click the bottom touch button to restart**: All particles revert to the bottom white column, zero speed, no additional hints.

These four examples show the network, images, audio and motion interactions. Maintaining the same set of hardware and Bot, replacing only the MPY program on the device, allows the cup to perform different tasks.
