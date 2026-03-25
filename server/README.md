# Lumière API

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your Atlas **SRV** connection string and use a long random `JWT_SECRET`.
3. Run `npm run dev:api` (or `npm run dev:all` for frontend and API together).

The API serves authentication, profiles, saved addresses, favorites, orders, and newsletter subscriptions at `/api`.

## Security controls

- Helmet security headers, narrow CORS allow-list, disabled `X-Powered-By`, and a 32 KB JSON limit.
- Rejects MongoDB operator keys (`$...`) and dotted keys before any database operation.
- JWTs are algorithm-pinned, issuer/audience-bound, and expire after one hour.
- Bcrypt password hashing (cost 12), a 12-character minimum password, and account-enumeration-safe login errors.
- Layered IP rate limits: API, authentication, and write operations; request/header timeouts limit slow connections.
- All account and order access is authenticated and owner-scoped; address/order IDs are checked before database access.

For production, place the service behind a managed CDN/WAF/load balancer with DDoS mitigation, TLS termination, request-size limits, and centralized monitoring. App-level rate limits cannot stop volumetric attacks before they reach your host.
