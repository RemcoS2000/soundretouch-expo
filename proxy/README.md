# Local browser companion

`npm run web:export` produces the web app; `npm run proxy` serves it at `http://localhost:4100` together with the HTTP and WebSocket bridge. The same origin avoids browser CORS and mixed-content problems. This is a local companion, not a public hosted service.

Native apps communicate directly with speakers. Browser discovery remains unavailable; add speakers by IP address or hostname.

The bridge binds to `127.0.0.1`. `/proxy?url=<encoded-target>` accepts speaker HTTP on port 8090 and WebSocket on port 8080, forwards the `gabbo` subprotocol, pins validated local DNS addresses, rejects redirects and untrusted origins, and cleans up on disconnect. `/health` reports bridge availability. Do not expose this service publicly.

For development with Metro's web server, use `npm run web` alongside `npm run proxy`. Existing `.env.local` settings remain supported:

```dotenv
EXPO_PUBLIC_USE_DEV_PROXY=true
EXPO_PUBLIC_PROXY_BASE_URL=http://localhost
EXPO_PUBLIC_PROXY_PORT=4100
DEV_PROXY_PORT=4100
DEV_PROXY_DISCOVERY_TIMEOUT_MS=8000
DEV_PROXY_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

Production web exports use their own origin for the bridge unless `EXPO_PUBLIC_SOUNDTOUCH_PROXY_URL` explicitly overrides it. Native platforms ignore bridge settings. `EXPO_PUBLIC_*` values are visible to users and must not contain secrets.

Integration tests bind loopback ports 8080 and 8090; keep those ports free when running tests.
