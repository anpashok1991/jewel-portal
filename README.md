# JewelPortal — Multi-Tenant Jeweller E-Commerce Portal

[![CI](https://github.com/anpashok1991/jewel-portal/actions/workflows/ci.yml/badge.svg)](https://github.com/anpashok1991/jewel-portal/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Tanishq-style e-commerce platform for jewellers with themed storefronts (jewelry-art hero carousel, owner-uploaded banners), a shop-owner admin panel, a super-admin platform console, GST invoicing, savings schemes (ROI + Gold), loyalty, coupons/gift cards, WhatsApp integration and the Sam Bot chatbot.

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
| `npm run test:e2e` | Playwright e2e (`e2e/`)               |
| `npm run seed`     | Seed demo data (idempotent-ish reset) |
| `npx prisma db push` | Sync schema → `dev.db`              |

Type-check: `npx tsc --noEmit`

## Route map

| Area          | Prefix                  | Who                     |
| ------------- | ----------------------- | ----------------------- |
| Landing       | `/`                     | Public (shop directory) |
| Storefront    | `/{slug}`               | Public (tenant-scoped)  |
| Checkout/API  | `/{slug}/cart`, `/api/*`| Public/customers        |
| Customer acct | `/account/*`            | CUSTOMER (also owners)  |
| Shop admin    | `/{slug}/admin/*`       | OWNER / STAFF (RBAC)    |
| Platform      | `/super/*`              | SUPER_ADMIN             |

Tenancy is resolved two ways in `src/proxy.ts`: a **custom domain** (`Host` header → `Shop.customDomain`, with `TENANT_HOST_MAP` env fallback) rewrites to `/{slug}/…`, and **path-based** `/{slug}` routing works directly. `requireTenant()` loads the shop, theme and feature flags. Blocked shops 404 everywhere; super-admin routes are blocked on custom domains.

## What owners can manage

From `/{slug}/admin` (staff get a permission-filtered subset):

- **Products** — name, SKU, description, category/type/material/audience, metal & purity, price (₹→paise) or rate-based, weight (g→mg), GST, making charge, images (multi-upload), variants, per-branch inventory, featured flag.
- **Categories** — create/rename, toggle, and set a **custom icon** (emoji, image URL, or upload) for Shop by Category / Material / Audience; blank falls back to the default.
- **Hero & section banners** — title, subtitle, image (URL or upload), YouTube URL, link, order, active toggle. No image → animated jewelry artwork.
- **Theme** — pick one of the preset themes; **rates, schemes, coupons, gift cards, loyalty, announcement, shop profile, branches, feature flags, staff** all have admin UI.

Some homepage sections (trust strip, testimonials, footer link columns) are still static/seed-driven — see the audit notes in `docs/`.

## Architecture highlights

- **Money in paise, weight in milligrams** — integer math throughout (`src/lib/money.ts`, `src/lib/pricing.ts`).
- **Pricing engine** — rate-based (metal × purity × weight + making charges) or fixed price, then coupons (bp), loyalty caps, gift cards, GST distribution per line, platform fee, shipping, COD fee, round-off.
- **Order state machine** — `PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED`, with `CANCELLED / RETURN_* / REFUNDED` branches (`src/lib/order-state.ts`). Stock is reserved on order and restocked on cancel/return.
- **Auth** — bcrypt password hashes + JWT in `jp_session` httpOnly cookie; session pool `shop` vs `platform`; permissions table per staff module (`src/lib/auth.ts`).
- **Feature flags** — 20 platform features (`FEATURE_LIST`) toggleable per shop by owner and super admin; storefront/admin features gate on `hasFeature()`.
- **GST invoices** — pdfkit tax invoices + estimates, CSV report exports.
- **Payments** — Razorpay (REST + signature verify + refunds), static UPI QR, COD.
- **Reports** — dashboard KPIs, sales/GST/inventory reports, P&L, CSV downloads.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/FLOW.md](docs/FLOW.md) and [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Testing & CI

```bash
npm test              # Vitest — pure-logic unit tests
npx tsc --noEmit      # types
npx eslint src e2e tests prisma vitest.config.ts playwright.config.ts --max-warnings=0
npm run test:e2e      # Playwright — needs `npm run build` first
```

Unit coverage: pricing/GST/coupons, order transitions, savings schemes, money formatting, UPI helpers, CSV export.

E2E (Playwright, `e2e/`) covers the landing page, domain/tenancy routing, storefront + cart/checkout, the full customer journey (place order → owner confirms), the shop admin (including category-icon editing), the super console (including the delete danger zone) and responsive breakpoints. It boots a production build on `:3100` and resets branch inventory before the suite.

Every push and PR to `main` runs the full gate set in GitHub Actions (`.github/workflows/ci.yml`): typecheck → lint → unit tests → `next build` → Playwright e2e.

## Notes

- SQLite file `dev.db` — swap `provider` in `prisma/schema.prisma` for Postgres/MySQL in production and set `DATABASE_URL`.
- Razorpay keys, GSTIN, WhatsApp number, theme and features are all editable at `/{slug}/admin/settings`.
- API-first design: all mutations are server actions or `/api/*` routes, ready for a future Android client.
- Configuration via env — copy `.env.example` to `.env`: `AUTH_SECRET`, optional `TENANT_HOST_MAP`.

## License

MIT — see [LICENSE](LICENSE).
