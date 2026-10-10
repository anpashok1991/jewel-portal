# JewelPortal — Multi-Tenant Jeweller E-Commerce Portal

A Tanishq-style e-commerce platform for jewellers with 3D animated themed storefronts, a shop-owner admin panel, a super-admin platform console, GST invoicing, savings schemes (ROI + Gold), loyalty, coupons/gift cards, WhatsApp integration and the Sam Bot chatbot.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma (SQLite) · Three.js/R3F · GSAP · framer-motion**.

---

## Quick start

```bash
npm install
npx prisma db push      # creates dev.db
npm run seed            # demo shops, users, products, orders
npm run dev             # http://localhost:3000
```

Production check:

```bash
npm run build
npm start
```

### Demo logins

| Role     | Email                  | Password  | Where                        |
| -------- | ---------------------- | --------- | ---------------------------- |
| Platform | `admin@jewelportal.in` | `Admin@123`   | `/super/login`               |
| Owner    | `owner@maaanjani.in`   | `Owner@123`   | `/maa-anjani-jewelers/admin/login` |
| Staff    | `staff@maaanjani.in`   | `Staff@123`   | `/maa-anjani-jewelers/admin/login` |
| Customer | `customer@demo.in`     | `Demo@123`    | `/account/login`             |
| Shop 2   | `owner@vasantjewels.in`| `Owner@123`   | `/vasant-jewels/admin/login` |

## Scripts

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `npm run dev`      | Dev server (Turbopack)                |
| `npm run build`    | Production build                      |
| `npm start`        | Serve the production build            |
| `npm run lint`     | ESLint                                |
| `npm test`         | Vitest unit tests (`tests/`)          |
| `npm run seed`     | Seed demo data (idempotent-ish reset) |
| `npx prisma db push` | Sync schema → `dev.db`              |

Type-check: `npx tsc --noEmit`

## Route map

| Area          | Prefix                  | Who                     |
| ------------- | ----------------------- | ----------------------- |
| Storefront    | `/{slug}`               | Public (tenant-scoped)  |
| Checkout/API  | `/{slug}/cart`, `/api/*`| Public/customers        |
| Customer acct | `/account/*`            | CUSTOMER (also owners)  |
| Shop admin    | `/{slug}/admin/*`       | OWNER / STAFF (RBAC)    |
| Platform      | `/super/*`              | SUPER_ADMIN             |

Tenant resolution is path-based (`/{slug}/…`) via `src/proxy.ts`; `requireTenant()` loads the shop, theme and feature flags. Blocked shops 404 everywhere.

## Architecture highlights

- **Money in paise, weight in milligrams** — integer math throughout (`src/lib/money.ts`, `src/lib/pricing.ts`).
- **Pricing engine** — rate-based (metal × purity × weight + making charges) or fixed price, then coupons (bp), loyalty caps, gift cards, GST distribution per line, platform fee, shipping, COD fee, round-off.
- **Order state machine** — `PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED`, with `CANCELLED / RETURN_* / REFUNDED` branches (`src/lib/constants.ts`). Stock is reserved on order and restocked on cancel/return.
- **Auth** — bcrypt password hashes + JWT in `jp_session` httpOnly cookie; session pool `shop` vs `platform`; permissions table per staff module (`src/lib/auth.ts`).
- **Feature flags** — 20 platform features (`FEATURE_LIST`) toggleable per shop by owner and super admin; storefront/admin features gate on `hasFeature()`.
- **GST invoices** — pdfkit tax invoices + estimates, CSV report exports.
- **Payments** — Razorpay (REST + signature verify + refunds), static UPI QR, COD.
- **Reports** — dashboard KPIs, sales/GST/inventory reports, P&L, CSV downloads.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/FLOW.md](docs/FLOW.md) and [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Testing

```bash
npm test              # Vitest — pure-logic unit tests
npx tsc --noEmit      # types
npx eslint src --max-warnings=0
```

Unit coverage: pricing/GST/coupons, order transitions, savings schemes, money formatting, UPI helpers, CSV export.

HTTP end-to-end flows (login → place order → invoice → admin workflows → super console) were verified against a production build with scripted progressive-enhancement form posts (React server-action protocol) — no browser required.

## Notes

- SQLite file `dev.db` — swap `provider` in `prisma/schema.prisma` for Postgres/MySQL in production.
- Razorpay keys, GSTIN, WhatsApp number, theme and features are all editable at `/{slug}/admin/settings`.
- API-first design: all mutations are server actions or `/api/*` routes, ready for a future Android client.
