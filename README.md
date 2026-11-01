# EL YARIMA DATA SUB — cPanel customer frontend

This repository contains the customer-facing React interface prepared for a same-origin cPanel deployment. It is not a Vercel deployment.

## Hosting target
- Build with Vite into `dist/`.
- Upload the contents of `dist/` to the customer frontend directory on the existing cPanel hosting.
- Keep the existing PHP application, administrator panel, API credentials, and database on cPanel unchanged.
- The login form posts to the existing PHP session endpoint at `/mobile/home/includes/route.php`.

## Build
```bash
npm ci
npm run build
```

## Important integration boundary
The legacy PHP application remains the source of truth for authentication, wallet balances, transactions, VTU purchases, funding, and account data. This frontend must not invent balances, plans, transaction records, or successful payments. The cPanel deployment must be served from the same domain as the PHP application so the PHP session cookie is shared.

Do not deploy the contents of `api/` as serverless functions. The existing PHP routes handle customer operations.
