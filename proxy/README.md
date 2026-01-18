# Development Proxy

This project includes an optional, development-only proxy for Expo Web. When enabled, the proxy routes network requests through a local server to:

- Avoid CORS restrictions in the browser
- Bypass per-origin connection limits

The proxy is only used in development and is never enabled on native platforms.

## Features

### 1. Generic Request Proxy

`GET /proxy?url=<encoded target URL>`

Forwards any HTTP request to the specified target URL, streaming the response directly back to the client. Useful for accessing local devices or APIs blocked by browser CORS rules.

Example:

```
http://localhost:4100/proxy?url=http%3A%2F%2F192.168.1.37%3A8090%2Finfo
```

## Configuration

The proxy is controlled entirely through environment variables.

### Client-side (Expo Web)

These variables define whether the proxy is enabled and where requests are routed:

- `EXPO_PUBLIC_USE_DEV_PROXY` enables or disables the dev proxy.
- `EXPO_PUBLIC_PROXY_BASE_URL` sets the base URL for the proxy.
- `EXPO_PUBLIC_PROXY_PORT` sets the port the proxy server listens on.

### Server-side (Proxy)

These variables configure the proxy server itself:

- `DEV_PROXY_PORT` sets the port for the main proxy server.
- `DEV_PROXY_DISCOVERY_TIMEOUT_MS` sets the timeout (in milliseconds) for proxied requests.

Example `.env`:

```
# Enable dev proxy
EXPO_PUBLIC_USE_DEV_PROXY=true
EXPO_PUBLIC_PROXY_BASE_URL=http://localhost
EXPO_PUBLIC_PROXY_PORT=4100

# Development proxy server settings
DEV_PROXY_PORT=4100
DEV_PROXY_DISCOVERY_TIMEOUT_MS=15000
```

## Running the Proxy

Start the development proxy server with:

```
npm run proxy
```

## Platform Behavior

Expo Web (development):
Requests are automatically routed through the proxy when enabled via environment variables.

Expo Go / Native (iOS and Android):
The proxy is not used. All requests are made directly.

## Notes

- This proxy is intended only for local development.
- All proxy behavior is opt-in via environment variables.
