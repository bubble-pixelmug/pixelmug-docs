# Network

PixelMug S1 applications can communicate with network services via HTTP, HTTPS, WebSocket, TCP and UDP. Wi-Fi configuration, connection, disconnection and restoration are managed by the device solids, and the application is only responsible for building the application layer of connectivity that it needs.

## Select Interface

| Requirements | Recommended interface | Characteristics |
| --- | --- | --- |
| Call RET API, upload JSON, download files | [`requests`](./http) | Sync, interface simple, and support HTTP and HTTPS |
| Receiving server delivers in real time and maintains a two-way long connection | [`mps_websocket`](./websocket) | Step, support `ws://`, `wss://`, message size limit and connection cleanup |
| Use private CA or client certificates | [`ssl`](./tls) | Create TLS context for `requests`, `mps_websocket` or original Socket |
| Achieve custom TCP, UDP protocols | [`socket`](./socket) | Bottom interface with self-processing subcontracts, overtime and reconnection |

These modules are already available with the solids and do not need to be declared as relying on the components in `mps.json`.

## Wi-Fi is managed by firmware

MPY applications should not call `network.WLAN` to create, close or reconfigure Wi-Fi. Solidware is responsible for:

- (a) Connections are established using a user-configured network certificate;
- Implementation of device-level restoration after network break-ups;
- Synchronization system UTC time;
- Possible suspension of MPY and closure of Wi-Fi frequency when device enters a syllable policy;
- Reactivate and connect Wi-Fi after the bright screen is restored.

There is currently no open Wi-Fi configuration interface for MPY applications, nor is there a recommended application of the dependent "net-ready" query interface. The `WLAN.isconnected()` type status does not provide a separate proof that DHCP addresses, DNS and target services are available.

Applications should be directly executed with time-out requests or connections; if failure occurs, the current resource should be closed and re-trying should be done with a maximum retreat time.

## Secure connections

The current firmware default when using `https://` or `wss://`:

- Use TLS client mode;
- Require certification of server certificates;
- Use a public CA certificate package that is embedded in the firmware;
- Validate target hostname;
- Use the system UTC to determine the validity of the certificate, which is maintained by the solid.

When accessing a public CA service, you do not need to import `ssl`. Only private CA, client certificate or original TLS Socket needs to create `SSLContext`.

Do not replace `verify_mode` with `CERT_NONE` for successful connection.

## Network and device lifecycle

The memory status of MPY will be maintained during the break (low working time) but Wi-Fi frequency will be stopped. Upon restoration, the TCP, TLS and WebSocket connection prior to the pause cannot be considered to be still valid.

The following rules shall govern the application:

1. Set timeout for each connection.
2. Closes the HTTP response, Socket and WebSocket in `finally`.
3. Reconnect after a long connection has been disconnected and re-enacts authentication or subscription.
4. Do not automatically reset an order that may cause side effects, such as payment, writing or control operations.
5. Retry to use the incremental and capped waiting time to avoid the continued use of CPUs when offline.
6. No long-term blocking requests are executed in drawing, touching or audio echoes.

For full recovery, see [Connect life cycle](./lifecycle).


## Documentation map

- [HTTP 与 HTTPS](./http)
- [WebSocket](./websocket)
- [TLS 与证书](./tls)
- [Socket: TCP, UDP 与 DNS](./socket)
- [连接生命周期](./lifecycle)
