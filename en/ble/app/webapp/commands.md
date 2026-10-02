# Command interface

For example, a `echo` command was given to the device with the following command parameters:

```js
const response = await client.command('echo', { text: 'echo' });
console.log(response.result.text); // "echo"
```

The first parameter is the command name, the second parameter is the data passed to the device. The device must register a processing function with the same name, such as `ble.command("echo", echo, mutates=False)`. The processing function returns the contents in `response.result`.

`await` Waits for the device to be processed. If the device fails to return or the response is eventually overtime, the call will throw out an anomaly and the page can display a failure alert at `try / catch`. See [Commands and Responses](../mpy/commands) for the device.

## Handle large messages

Compandparameter and return results need to be placed in a standard messageage. `response too large; use config transfer`At this time, do not continue to expand the content of the command:

- WebApp uses [`setConfig()`](./config) for the distribution of larger data such as song lists, maps to devices.
- WebApp designs a page break command when you read larger data such as playlists, historical records from the device, and returns only one page at a time.
- For the continuous transmission of binary or real-time data, [Simple](./simple) is used and the agreed data format applies.

Page-by-page reading and full code from configuration can be found in the device side document[Message size and failure](../mpy/commands#消息大小与失败).
