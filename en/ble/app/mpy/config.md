# Configuration transfer

Configure the interface to write larger data segments to the device ' s temporary file, which is then processed by application at the right time. It uses the standard message channel (F150), which requires the application handshake to be completed.

For full examples, see `examples/ble-config`: WebApp prefilling numbers, strings, Booleans, arrays and objects five configurations, and MPY validates each article. See [WebApp Configuration Upload Example](/en/ble/app/webapp/config) for core calls on both ends.

## Register and apply configuration

```python
import json

settings = {"color": 1}

def apply_settings(path, meta):
    with open(path, "r") as source:
        value = json.load(source)
    color = int(value["color"])
    if not 0 <= color <= 255:
        raise ValueError("invalid color")
    settings["color"] = color
    return {"color": color}

ble.config("settings", apply_settings)

# In the application main cycle: 
# ble.poll()
# ble.process_pending_config(max_items=1)
```

`config(name, handler)` returns handler, the same name is registered to replace the old processing function. The name is 1 to 32 characters long and only letters, numbers, underlineds and hyphens are allowed.

The callback signature is `handler(path, meta)`:path is the path to the uploaded file, Meta is the metadata attached to the client, defaulting `{}`. The contents of the document are agreed by the parties and will not be automatically desolved.

`process_pending_config(max_items=1)` Synchronizes the submitted configuration and returns the amount of this consumption, including failure items. It is not controlled by the time budget of the Poll and should be called at the main cycle stage of allowing document processing.

Whether the callback is successful or an anomaly is dropped, the temporary file is then deleted. If you need to save it permanently, read, copy or save it before the callback is returned; do not just keep the temporary path.


## Client Upload

```js
client.on('event', (event) => {
  if (event.event === 'configApplied') console.log('Configure applied', event.name);
  if (event.event === 'configError') console.error(event.error);
});

const result = await client.setConfig(
  'settings',
  { color: 8 },
  { meta: { source: 'webapp' }, chunkSize: 128 }
);
console.log(result.accepted, result.applying);
```

SDK supports bytes, strings, or serialized objects for JSON. `setConfig()` Completed indicates that the transfer is responded,** does not mean that the device has been configured.**

Adds a state version after the device has successfully returned, releases a state status and sends `configApplied` events, data containing name, result. Send `configError` when the device fails, including name, error. These events do not guarantee offline service; after reconnect, the status confirmation should be asked.

## Transfer flow

1. begin: Declaration name, total bytes, CRC32 and meta, device creation temporary.
2. chunk: Base64 encoded data with byte offsets and the device returns next.
3. Commit: Close the file when the length is complete and add a queue waiting for application.
4. Apply the main cycle to call the process ping config, execute the processing function and remove the temporary file.

Each segment is still limited by the size of the standard message channel. A smaller MTU can reduce the WebApp `chunkSize` if it fails to send.

:::info CRC32 's current behaviour
The protocol and SDK carry CRC32, but the current device has been closed to the CRC32 check only for transmission lengths and deviations. The returned crc32 cannot be used as a certificate that the device has been independently verified; the application requires content verification to be completed in the processing function.
:::

## Advanced transfer options

Most applications do not need to set these parameters. Only when configuration exceeds the default capacity, transports have a longer interval or temporary files need to be placed in other directories are adjustments made when creating the service:

```python
ble = BleAppService(
    "MyApp",
    config_limit=32768,
    config_timeout_ms=10000,
    config_dir="/",
)
```

`config_limit` is the capacity limit for a single configuration, defaulting 32768 bytes; `config_timeout_ms` is the time when the transmission has been suspended and the default is 10 seconds; `config_dir` must be a directory that already exists and can be written. The size of the segment is usually given to SDK and the component default for processing.

## Advanced server declaration

If 10 seconds does not successfully advance the configuration, the subsequent pol will suspend the unfinished business and remove the temporary file. The disconnect will also suspend the configuration that has not been set up.

Only one service is currently being received; the new begin will suspend the old one. The same name uses the same temporary path, so the client must wait for the actual application of the previous configuration to be completed and upload the next one. The configuration should be serialized to avoid a backlog of applications.

The application configuration may be executed even if the connection is disconnected; `deinit()` cleans up an unprocessed configuration. The system does not roll back automatically when the application fails or partial changes occur, so the processing function should first verify and then modify the formal configuration.

The protocol field and the error response are [Custom Terminal Access](/en/ble/custom-client#配置消息).
