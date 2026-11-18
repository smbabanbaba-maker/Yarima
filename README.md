# EL YARIMA SUB DATA

Official website: **https://www.alyarimasub.com.ng/**

The apex domain **https://alyarimasub.com.ng/** is configured in Vercel to redirect to the www hostname. The Vercel project is `yarima` and the previous `yarima-zeta.vercel.app` hostname remains available as a deployment alias.

## Stack
React + Vite frontend, Vercel serverless API, Neon PostgreSQL, Paystack funding and VTU provider integration.

## Development
```bash
npm install
npm run dev
npm run build
```

## Production setup
- Verify the official www hostname and apex redirect in Vercel Domains.
- Keep API calls relative (e.g. `/api/auth`) so the app works on the custom domain without cross-origin changes.
- Confirm Paystack dashboard callback and webhook configuration against the *actual* server endpoints before modifying any URLs. Do not use the homepage as a webhook URL.
- Preserve existing email MX/SPF/DKIM records if modifying DNS.
- Verify purchase provider callbacks, pending orders, refunds, wallet reconciliation, and authorization before enabling real-money VTU purchases.

Do not put payment or VTU secret keys in frontend code.
