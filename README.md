# EL YARIMA SUB DATA

Premium, responsive dashboard concept for a Nigerian data, airtime and VTU brand. Built with React + Vite for quick Vercel deployment.

## Included
- Branded home dashboard, wallet balance card, quick actions and service tiles
- Data bundle selection for MTN, Airtel, Glo and 9mobile
- Airtime purchase interface with common denominations and custom amount
- VTU service catalogue, transaction history, profile, settings and wallet screens
- Responsive desktop, tablet and mobile navigation
- Brand mark recreated as a local SVG in `public/logo.svg`
- Demo-only wallet and purchase flows with clear notices

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Production readiness
This repository currently provides a front-end prototype. Wallet balance changes and purchases are simulated in the browser and are **not real financial transactions**. Before public launch, connect secure server-side authentication, a transactional wallet ledger/database, a verified payment gateway, and an authorized VTU/data provider API. Never store provider secrets in client-side code. Add server-side validation, idempotency, audit logging and webhook signature verification before handling money.
