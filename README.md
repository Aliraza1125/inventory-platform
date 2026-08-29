# Inventory Platform — POS Integration

Inventory management platform that connects to real POS systems (Square, Toast) and depletes stock **only** from authenticated webhook events — never from a UI button pretending to be a sale.

**Live demo:** https://inventory-platform-omega.vercel.app/ (frontend) · https://inventory-platform-huue.onrender.com (backend)

## Stack

- **Backend:** Node.js, Express, TypeScript, MongoDB/Mongoose
- **Frontend:** React, Redux Toolkit, TypeScript, Tailwind CSS
- **POS integrations:** Square (real, live sandbox via OAuth) · Toast (real code, blocked by Toast's own access policy — see below)

## Architecture

Every POS integration implements one shared `POSProvider` interface (`backend/src/providers/pos-provider.interface.ts`) — connect, create catalog item, allocate inventory, verify + parse a webhook into a normalized sale event. `ProviderFactory` picks the concrete implementation per provider.

A single function, `processSaleEvent`, handles **every** sale — real webhook or otherwise. Depletion is atomic and idempotent: a conditional `findOneAndUpdate` (`quantity: { $gte: amount }`) prevents negative stock under concurrent sales, and a unique index on the external transaction ID makes duplicate webhook deliveries a no-op.

## Square — real, live

Real OAuth 2 integration against Square's Sandbox (Catalog, Inventory, Orders, Payments, Webhooks APIs), HMAC-signature-verified webhooks. The **Store** page creates a genuine Square Order + Payment; inventory only updates once Square's own webhook confirms it back.

## Toast — real code, not connectable

`backend/src/providers/toast/toast.provider.ts` is a complete implementation built directly against Toast's published API reference (auth, restaurant/menu/stock endpoints, HMAC webhook verification) — not guessed. It has never run against a live Toast account: Toast's Partner Integrations program requires business vetting and a signed agreement, and is only available in the US, Canada, Ireland, and the UK.

There is no mock fallback in the running app — `Connect Toast` fails with a clear "not configured" error rather than faking a connection. (Tests still use a fast in-memory `MockToastProvider` double, gated to `NODE_ENV=test` only, so the depletion/webhook/idempotency logic stays covered without needing real Toast credentials.)

## Local setup

```bash
# backend
cd backend
cp .env.example .env   # fill in MONGODB_URI, Square sandbox credentials
npm install
npm run dev             # http://localhost:4000

# frontend
cd frontend
npm install
npm run dev              # http://localhost:3000
```

## Tests

```bash
cd backend
npm test   # 28 tests — idempotency, concurrency, allocation, webhook processing
```
