# API setup

1. Copy `.env.example` to `.env.local`.
2. Set `API_PROXY_TARGET` to the actual Raspberry Pi server origin. The example IP is a placeholder.
3. Restart the development server.

Vite forwards `/api` requests to that server in development, avoiding cross-origin browser requests.
In production, configure your web server to proxy `/api`. Alternatively, set `VITE_API_URL` to the backend origin or its `/api` URL at build time and configure backend CORS and HTTPS. The development proxy is not included in the production build.

Cases, recent events, and summary statistics refresh every 10 seconds. Cases use server-side decision, risk, and domain filters with 20 records per page. Detail requests use the log ID. Statistics cover all stored cases, not just the current page. Restarting the backend can clear its in-memory logs.

The API does not supply raw snippets, classification tags, departments, or IP addresses, and does not support approval/denial writes. Policy, audit, and IP menus show unavailable states until their APIs are implemented. The obsolete custom data event has been removed. Demo screens are isolated in src/DemoScreens.tsx and never submit data.
