# Yarima Digital — Full API Management

## Admin identity
The initial allowlisted admin is `smbabanba@gmail.com`. The existing customer authentication must first have an account registered with this exact email. Admin authorization is server-side and checks the authenticated session; hiding a UI link is not security.

## Required Vercel environment variables
- `DATABASE_URL`: existing Neon connection string.
- `API_SECRET_ENCRYPTION_KEY`: 32 random bytes encoded as 64 hexadecimal characters. Generate with `openssl rand -hex 32`. Store only in Vercel Environment Variables; never commit it.
- `ADMIN_EMAIL` is currently pinned in `api/admin.js` to the owner-confirmed email. A later hardening pass can move this to an environment variable.

## Database
The admin endpoint creates `yarima_app.api_providers` and `yarima_app.api_routes` lazily. Provider credentials are encrypted using AES-256-GCM. API responses never return the encrypted credential or plaintext secret.

## API
- GET /api/admin — list providers and service routes (admin session required).
- POST /api/admin action=add-provider — add provider; requires name, HTTPS baseUrl, authType and secret.
- POST /api/admin action=set-provider — enable/disable provider.
- POST /api/admin action=set-route — manually assign a provider to a service/network/plan type.
- POST /api/admin action=test-provider — intentionally returns 501 until a provider-specific adapter and its official docs are verified.

## Current scope and safety
This is the first backend foundation only. It does not initiate purchases, debit wallets, fetch balances, or contact providers. No live credentials are included. Before live transactions, implement provider-specific adapters, status reconciliation, idempotency, atomic wallet ledger operations, refunds on confirmed failures, rate limits, CSRF/origin protection and audit events. Do not enable a route until a real low-value test is successful.
