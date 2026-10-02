# Runtime model

A Bot application usually takes only three steps: create examples, register business handlers, start. SDK will receive updates on an ongoing basis, and you do not need to write your own round of queries.

## Two polling queues

SDK has two internal roundabouts to receive information from users, as well as the reported incidents and the RPC call results; each of the two tracks updates into a separate line and is processed sequentially.

After text is sent by the user, the message goes to the user message queue of SDK. SDK converts the original update to `ctx`, then executes the public middle and matching event handler. The handler calls the cloud to send the message, for example `ctx.sendText()`.

```js
bot.on('message:text', async (ctx) => {
  await ctx.sendText(`What you said.: ${ctx.message.text}`);
});
```

`ctx` represents only the event, where `chat` is the chat, `from` is the sender. When you process the next message, a new context is created, so do not save " current user " with a global variable. Multi-chat operations should keep their status according to Dialogue ID.

Another round of queries and queues is used for device upgrades. Thus, when the word handler waits for the device to respond, the device queue can still receive the results and end the wait.

## Declaration completed before startup

```js
// Here, as required. registerDevices(), on(), use().
await bot.start();
```

`start()` Sync device declarations, default Bot settings, and then start the round of inquiries. When it is finished, it means that the start-up step is over and does not mean that the first message has been received. The device-not-related pure message application can be `start({ device: false })`, but the startup will still synchronize the device statement.

`setCommands()` will immediately request to save the command menu, which should `await`. The device declaration and event handler should be ready before `start()`.

Initialization or `start()` itself failed and needs to be handled in the start-up code; `bot.on('error', ...)` errors transferred by SDK during the main receiver run-off.

## Handle long-running device calls

User message queues are sequentially processed. If you wait in the handler for the call to be completed by device RPC, subsequent user messages will also wait. For example, when you display a picture via device RPC, you may need to wait for the device to download, process and display the picture. SDK will not automatically create a separate queue for each chat, so this waiting period will also affect the processing of other conversations.

When calling shorter, use `await bot.callDevice(...)`, you can use it when you have a longer call. `callDeviceAsync()`, closes the current message after the request and allows Bot to continue with the follow-up process; device returns the performance results and then passes the mission application. See more on the use.[Step aside](./device-rpc#先受理再处理完成事件).

The request for processing does not imply that the device has been executed.

## Stop Application

```js
bot.stop();
bot.clearQueues();
```

`stop()` Stops the two-wheeled inquiries and suspends the current requests; `clearQueues()` clears the unprocessed updates. The two methods do not cancel the business handlers already in progress, nor clean up the timers, HTTP services or third-party connections that were created by the application. Nor can the calls that have been sent out be considered cancelled.

When these resources are available, they are closed on a case-by-case basis in the application exit process.

## Error handling

Keep a simple error handler first:

```js
bot.on('error', (ctx) => {
  console.error('[bot]', ctx.error?.name, ctx.error?.message);
});
```

The business error that you can explain to the user is captured and answered in the corresponding handler; the rest is given to the unified log. The SSDK `debug` will output the requested details, which may contain token, and the log should be removed before sharing the document.
