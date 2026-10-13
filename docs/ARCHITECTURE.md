# Architecture

## Stack
- **Next.js 16.4** (App Router, Turbopack, React 19.3, TypeScript strict) — note: `proxy.ts` replaces `middleware.ts`; all Request APIs are async (`await params/cookies/headers`).
- **Tailwind CSS v4** (CSS-first config) + CSS variables for theming.
- **Prisma 6 + SQLite** (`dev.db`), schema portable to PostgreSQL.
- **Auth**: custom sessions — bcryptjs hashing, jose JWT in httpOnly cookie (`session`), roles `SUPER_ADMIN | OWNER | STAFF | CUSTOMER`.
- **3D**: `three` + `@react-three/fiber` + `@react-three/drei`; animations: `gsap`, `framer-motion`.
- **PDF**: `pdfkit` (invoice, estimate) via route handlers.
- **Payments**: Razorpay REST via `fetch` (per-shop keys), `qrcode` for UPI QR.
- **Charts**: hand-rolled SVG (no chart dependency).

## Multi-tenancy
- Every business table carries `shopId` (FK, indexed). Queries always filtered by tenant helper.
- Path tenancy: storefront under `/[slug]`; admin under `/[slug]/admin`.
- Host tenancy: `src/proxy.ts` reads `TENANT_HOST_MAP` (`{"domain.com":"slug"}`) and rewrites `/*` → `/{slug}/*`; skips `/api`, `/_next`, `/super`, `/admin/login`, static.
- Tenant context resolved server-side by `getTenant(slug)` (cached per-request) → layouts provide `TenantProvider` (shop name, logo, theme vars, whatsapp, settings).

## Theming (FR-11)
- `Theme` rows: palette (primary/accent/bg/surface/text), fonts (display/body), radius, layout variant.
- Storefront root layout injects `--c-primary` … variables; components consume variables only.
- Super Admin assigns `shop.themeId`; admin panel uses same logic with theme shell applied.

## Permission model (FR-12)
- `Permission { userId, module, canView, canCreate, canEdit, canDelete }`.
- Modules: `products, orders, customers, inventory, queries, reports, schemes, coupons, staff, settings, popups, media, appointments`.
- `requirePerm(user, module, action)` guards every server mutation; nav filtered client-side by same matrix. Owners implicitly all-true.

## Pricing engine (`src/lib/pricing.ts`)
```
metalValue   = netWeightMg × (ratePerGram / 1000) × (purity/1000)   // rate per gram of 1000‰ purity
making       = mode: PERCENT | PER_GRAM | FLAT
subtotal     = metalValue + making + stoneValue + platformFee
discount     = product/line discount
coupon/gift/loyalty applied at cart level
taxable      = subtotal − discounts
gst          = exempt ? 0 : round(taxable × gstRate/100)
total        = taxable + gst + shipping + codFee − roundOff
```
- Rates: `MetalRate(shopId, metal, purity, pricePerGram, effectiveAt)` — latest wins.
- Money in **paise (int)**, weight in **mg (int)**; rounding half-up.

## Savings engine (`src/lib/scheme.ts`)
- `SavingsPlan(shopId, name, frequency DAILY|WEEKLY|MONTHLY|CUSTOM, customDays[], amount, tenureCount, mode ROI|GOLD, roiPercent, goldBonusPercent)`.
- `Deposit(planId, userId, dueDate, paidAt, amountPaise, goldMgAtPay, status)`.
- ROI maturity: `principal + Σ(principal × roi% × daysHeld/365)` → wallet balance.
- Gold mode: each deposit buys `amount / todayRate` grams (locked at payment rate) → gold wallet (`goldMg`); maturity may add `goldBonusPercent`.
- Redemption: checkout accepts wallet money and gold mg (converted at current rate).

## Payments (FR-18)
- Settings per shop: `razorpayKeyId/Secret`, `upiVpa`, `upiName`, `codFee`, `codMaxAmount`, `whatsappNumber/whatsappGreeting/whatsappEnabled/whatsappOrderShare`.
- WhatsApp is free-tier only (no Meta API): `whatsappOrderShare` toggle drives `wa.me` purchase-details deep links on order pages (admin order detail → customer number; storefront order page → shop number), built by `src/lib/whatsapp.ts`.
- `POST /api/razorpay/create` → order (amount paise) → client `Razorpaycheckout` → `POST /api/razorpay/verify` (HMAC SHA256) → order CONFIRMED; webhook path idempotent.
- UPI QR: build `upi://pay?pa=&pn=&am=&cu=INR&tn=` → `qrcode.toDataURL` server-side.
- Refunds on cancel: mark `refundStatus` + create wallet credit fallback if keys missing (test mode).

## Order state machine
Transitions defined in `src/lib/constants.ts` (`ORDER_TRANSITIONS`), enforced via `src/lib/order-state.ts` + `src/actions/admin/orders.ts` — legal transitions only; every transition writes `OrderEvent` + `Notification`; cancellations/returns restock inventory and can auto-refund.

## Sam Bot (`src/lib/sambot.ts`)
Intent pipeline: normalize → match rules (regex/keywords) → shop-scoped handlers (rates, catalog search, order lookup w/ last-4 verification, scheme calculator, policies, branches, appointment) → owner FAQ fallback (vector-free keyword scoring) → WhatsApp handoff. Session state in client; server is stateless.

## Storage
`StorageAdapter` interface: `put(buffer, dir, name) → /uploads/...`; local FS impl now, S3-swappable.

## Reporting
SQL aggregations in `src/lib/reports.ts` → CSV via `/{slug}/admin/reports/csv?kind=sales|gst|inventory|rates`; KPIs computed for day/month windows; P&L = revenue ex-GST − COGS.

## Project structure
```
src/
  proxy.ts                  # host → tenant rewrite + route guards
  lib/                      # db, auth, tenant, pricing, scheme, orders, order-state,
                            # reports, sambot, razorpay, upi, pdf, storage, catalog, money
  actions/                  # server actions (auth, cart, checkout, account,
                            # admin/{orders,catalog,manage,settings}, super)
  components/               # ui, storefront, admin, super, account, chat, three
  app/
    page.tsx                # root resolver → default shop
    [slug]/(web)/…          # storefront (home, shop, p/[handle], cart, checkout, …)
    account/(account)/…     # customer area (login, register, orders, wallet, schemes, addresses)
    [slug]/admin/…          # shop admin (login + (panel): dashboard, orders, products,
                            # leads, schemes, marketing, rates, reports, settings)
    [slug]/admin/reports/csv# CSV export route handler
    super/…                 # platform console (login + (panel): dashboard, shops, plans, users)
    api/…                   # upload, chat, invoice PDF, payment verify
prisma/{schema.prisma, seed.ts}
tests/                      # vitest unit tests
uploads/                    # local media (git-ignored)
```
