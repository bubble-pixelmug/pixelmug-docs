# Commands and Responses

The command is suitable for an operation that requires a clear result, such as reading information, changing brightness or switching scenes. It is transmitted through the Standard Message Channel (F150) and the session is already ready.

## Register a command

```python
state = {"brightness": 50}

def set_brightness(params, context):
    value = int(params.get("value", 50))
    if not 0 <= value <= 100:
        raise ValueError("brightness must be 0..100")
    state["brightness"] = value
    return {"brightness": value}

ble.set_state_provider(lambda: dict(state))
ble.command("setBrightness", set_brightness)
```

`command()` Register command name and processing function, the same name register replaces the old processing function.

The processing function signature is `handler(params, context)`. `params` is the parameter that WebApp enters when `{}`; most applications need not read `context`. The return value must be serialized to JSON, WebApp reads it from `response.result`. When the processing function exits an anomaly, WebApp 's `command()` fails and throws an error.

At `mutates=True`, the processing function successfully returns the post-state version plus one and automatically queuing the notification; the read-only command should be `mutates=False`.

## Call a command from the client

The following clips are assumed to be created and connected `BleAppClient`:

```js
const response = await client.command('setBrightness', { value: 80 });
console.log(response.result.brightness);
```

## Retry and repeat requests

SDK may automatically retry the same request over time, and the device will try to avoid duplication in the current connection as much as possible. Reconnection or rebooting of the device cannot rely on this mechanism to weigh it. A side-effect command should be in the form of a "set target value" such as `setBrightness(80)`, avoiding design to `increaseBrightness(10)`; when it is really necessary to cross-connect to remove weight, the application will add a business ID to the parameter.

## Message size and failures

The command parameters and the return result are subject to `ble.max_message` after the JSON code, and the protocol field will also occupy space. The default limit is 384 bytes, and MTU will be reduced when the MTU is negotiated.

Returns an error `response too large; use config transfer` when the result is too large. If the processing function is executed, this does not roll back. Select the interface according to the data orientation:

| Data orientation and use | Suggested interface |
| --- | --- |
| WebApp Sends down song lists, game maps, etc. | `setConfig()` |
| WebApp Reads larger data from devices such as playlists, history records, etc. | Read with `command()` Page Break |
| The device uploads binary or large pieces of data continuously, without requiring a command response on every page | Simple, with application design segment and confirmation |

The configuration transfer currently only supports WebApp uploading to the device. It cannot be used to return a large response to WebApp. Status, event and `requestSnapshot()` also use standard message channels with the same message size.

### Example: next track

WebApp, for example, saves the name and URL of the ten songs to the device and does not send the whole list as `command()` arguments. Use `setConfig()` part uploading:

```js
client.on('event', (event) => {
  if (event.event === 'configApplied' && event.name === 'playlist') {
    console.log('Playlist saved, 共', event.result.count, '首');
  }
});

await client.setConfig('playlist', {
  songs: [
    { name: 'Song 1', url: 'https://example.com/1.ogg' },
    { name: 'Song 2', url: 'https://example.com/2.ogg' },
    // The rest of the songs……
  ],
});
```

Device registration as a configuration processing function:

```python
import json

playlist = []

def apply_playlist(path, meta):
    global playlist
    with open(path, "r") as source:
        value = json.load(source)
    songs = value.get("songs")
    if not isinstance(songs, list):
        raise ValueError("songs must be a list")
    playlist = songs
    return {"count": len(playlist)}

ble.config("playlist", apply_playlist)
```

The main cycle still needs to be called `ble.poll()` and `ble.process_pending_config()`. Upload completion means only that the configuration has been submitted; only when `configApplied` is received indicates that the processing function has been successfully performed. See [Configure Transfer](./config) for temporary files, capacity and error processing.

### Example: paginate a device playlist

The configuration transfer cannot be used in reverse when the device returns to the WebApp playlist. It is recommended to register a page-only break command and return only one song at a time:

```python
def get_playlist_item(params, context):
    index = max(0, int(params.get("index", 0)))
    if index >= len(playlist):
        return {"item": None, "next": None, "total": len(playlist)}

    next_index = index + 1
    if next_index >= len(playlist):
        next_index = None

    return {
        "item": playlist[index],
        "next": next_index,
        "total": len(playlist),
    }

ble.command("getPlaylistItem", get_playlist_item, mutates=False)
```

WebApp read consecutively until `next` is `null`:

```js
const playlist = [];
let index = 0;

while (index !== null) {
  const response = await client.command('getPlaylistItem', { index });
  if (response.result.item) playlist.push(response.result.item);
  index = response.result.next;
}
```

After page break, each complete reissue must still be less than `max_message`. If the message of a single song is itself too large, the field should be shortened, only retrace the data side ID and search as needed, or change to [Simple](./simple) Transfer and self-add the transfer number, block sequence number and confirmation mechanism. Do not place the full playback list in state, event or snapshot, which does not bypass the message cap.

The processing function should first verify the parameters and then execute the changes to avoid some of the side effects that have occurred before returning to failure.
