# Upload configuration with setConfig()

The normal control command gives preference to `command()`. When you need to send a larger JSON configuration, the `setConfig()` is recommended.

`examples/ble-config` The example shows that the config1 ~config5 in the form is sent to MPY and then displayed on PixelMug article by article. Both ends apply the mark `BleConfig`.

Page is the default prefilled for numbers, strings, Booleans, arrays and objects, which can be sent directly when connected. `Number()` Convert, Boolean option to `true` / `false`, arrays and objects pass `JSON.parse()` Parsing, then uploading to SDK. WebApp `setConfig()` Send JSON to MPY, and register `event` Callback, wait for device side to confirm whether the implementation was successful:

```js
client.on('event', (event) => {
  if (event.name !== 'settings') return;
  if (event.event === 'configApplied') console.log('Information applied, Start Show');
  if (event.event === 'configError') console.log('Application Failed: ', event.error);
});

await client.setConfig('settings', {
  config1: 42,
  config2: 'hello',
  config3: true,
  config4: [1, 2, 3],
  config5: { x: 1, y: 2 },
});
```

`settings` is the configuration name for the device to register, which is customised, but requires WebApp and MPY to match. The second parameter is the configuration content. SDK automatically changes the object sequence to JSON and uploads it in segments.

♪ By the power side ♪ `config()` Method sets the same configuration name `settings` . The processing function calls in MPY `process_pending_config()` . The core call is removed below;`display` It is a text-repeated support object in the project:

```python
import json

def apply_config(path, meta):
    with open(path, "r") as source:
        settings = json.load(source)
    # Full example first check field, Update all five displays.
    display.show([
        "config%d: %s" % (i, json.dumps(settings["config%d" % i]))
        for i in range(1, 6)
    ])
    return {"items": 5}

ble.config("settings", apply_config)

# Continuous Call in Main Cycle: 
ble.poll()
ble.process_pending_config(max_items=1)
```

`poll()` Drive Packaging, `process_pending_config()` Execute Configuration Processing Functions. The processing of successful components automatically sends `configApplied`; The function automatically sends `configError` when the anomaly is thrown out. Therefore, WebApp should be able to configure the listening event before sending, and not simply return with `setConfig()` to consider "configuration successful". More interface rules are available at [Configure Transfer](../mpy/config).
