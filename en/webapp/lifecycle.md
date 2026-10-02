# WebApp session and life cycle

An example `BubbleWebApp` corresponds to a page session. SDK uses `sessionId` to identify this page example so that Bot can distinguish between different pages opened by the same user and send the device event or orientation to the right page.

## Create a page session

Usually only need to create examples:

```js
const webapp = new BubbleWebApp({ ble: false });
```

Construct function default calls `start()` automatically. The "start" here is not about starting a web page, server or Bot, but about two things:

1. Notify Bot that the current page session has been opened;
2. Starts the page heartbeat, keeps telling Bot this session is still active.

Bot opens the page with a notice to open the page by `sessionId` to record the user, the chat and the latest activity time of the page. The subscription relationship is also stored in this session when the page subscribes to the device event. Bot can then forward the device events and changes in the device connection (e.g., the user switches the associated device) to the right page on the basis of this information.

Normal business does not require a manual call `start()`. Only when the application needs to have control of the page from the beginning will the application set `autoStart: false` and call when the page is ready:

```js
const webapp = new BubbleWebApp({
  ble: false,
  autoStart: false,
});

// After the initialization of the application, Start page session again.
webapp.start();
```

In the absence of a clear time requirement for commencement, it is sufficient to maintain the tacit act.

## `sessionId` Mark what?

`sessionId` Marks a running page example, which does not represent a user, chat, or page URL. Reopening or refreshing the page will create a new `BubbleWebApp` instance and will create a new `sessionId`.

The request from WebApp will carry the current `sessionId`. Bot returns the targeted data with this identification; data that belongs to other sessions will ignore it. Thus, even if there are multiple page sessions for the same user for a certain period of time, each page only handles the data sent to itself.

For orientation and multiple page sessions, see [Bot Actively Send to WebApp](./push).

## Heartbeat timeout

When a page session is started, SDK defaults to send a heartbeat every 25 seconds. Bot updates the latest activity time of the session when you receive the heartbeat, and does not turn the heartbeat to the business handler.

The default validity for page sessions on the Bot side is 90 seconds. If the page exits abnormally, network interruptions or closure notifications are not delivered, Bot clears expired sessions after the heart beat continues to fail and stops transmitting device events and device-related changes to it.

These times are automatically managed by SDK and no adjustments are required for normal applications.

## Close page with `stop()`

When the page exits normally, SDK automatically stops the heartbeat and informs Bot that the session is closed. Bot, when received, deletes the corresponding session record, so that no active call `stop()` is required on the normal page.

If a single page is applied to unmount WebApp without the page itself being closed, you can end the session manually:

```js
webapp.stop();
```

`stop()` indicates that this page session is inactive and stops the subsequent heartbeat. It is used to end the session state and is not a common page destruction interface.

## Session startup and application state

The page session maintained by Bot SDK mainly serves the life cycle, device event subscriptions, and device-related change forwarding. If the business code saves its own `sessions` table for later active delivery, it is still required to set expiry times and clean up records; SDK does not automatically manage this business data.
