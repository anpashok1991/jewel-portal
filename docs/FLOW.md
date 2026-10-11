# Flow — Screens, Roles & Data Flow

## 1. Route map

### Storefront (tenant-scoped, path = `/{shop-slug}`)
| Route | Purpose |
|---|---|
| `/[slug]` | Home: 3D hero, banners, categories, popups, rate ticker |
| `/[slug]/shop` | Category listing + faceted filters (material / audience / type, price, purity, weight) |
| `/[slug]/p/[handle]` | Product detail: gallery + YouTube, 360°, price breakup, size guide, WhatsApp, reviews |
| `/[slug]/rates` | Today's gold/silver rates + history |
| `/[slug]/schemes` | Savings plans + maturity calculator |
| `/[slug]/appointment` | Consultation booking (branch + slot) |
| `/[slug]/exchange` | Old-gold exchange request |
| `/[slug]/search`, `/cart`, `/checkout`, `/order/[id]/success` | Commerce |
| `/[slug]/about`, `/contact` | Store info |

Host-based clean URLs: `proxy.ts` rewrites hostname → `/{slug}/...` using `TENANT_HOST_MAP` env; local dev uses path form directly.

### Customer account
`/account/login`, `/register`, `/` (overview), `/orders`, `/orders/[id]` (→ storefront tracking), `/wallet`, `/schemes`, `/addresses`

### Shop admin — `/{slug}/admin` (owner + staff, RBAC-filtered nav)
`dashboard`, `orders` (+detail/status/invoice), `products` (+new/edit, categories, upload), `rates` (metal rate card + history), `schemes` (plan CRUD), `leads` (appointments / exchange / queries tabs), `marketing` (coupons, gift cards, loyalty ledger), `reports` (KPIs, sales/GST/inventory tables, CSV downloads), `settings` (profile, payments, commercials, WhatsApp, feature flags, theme, branches, staff)

### Super admin — `/super`
`login`, `dashboard`, `shops` (+create shop w/ owner login, block/unblock, feature flags per shop), `plans` (CRUD), `users` (platform console access)

### APIs — `/api/*`
`v1/…` mobile REST (see [API.md](API.md)) · `upload` (media, OWNER/STAFF) · `chat` (Sam Bot) · `orders/[id]/invoice` (GST PDF, staff+customer) · `payments/verify` (Razorpay signature)

## 2. Key flows

### A. Customer purchase
Browse/filter → PDP (live price breakup from today's rate) → Cart (coupon/gift card/loyalty) → Checkout (address + branch pickup/delivery + payment: Razorpay | UPI QR | COD) → Payment verify → Order (status Placed) + Invoice PDF → Admin confirms → packs → ships (AWB) → Delivered → review; cancel allowed until Packed (refund path), return/exchange within 7 days.

### B. Owner onboarding (Super Admin)
Super Admin creates shop (name, slug, logo, contact, GSTIN) → assigns theme → owner receives `/{slug}/admin` credentials → owner completes Settings (Razorpay keys, UPI VPA, WhatsApp, branches, staff) → shop live.

### C. Staff permissions
Owner creates staff login → picks modules with view/create/edit/delete checkboxes → server middleware denies any action not granted; nav filtered by same matrix.

### D. Savings scheme
Owner defines plan (frequency, amount, tenure, ROI% **or** gold-gram mode) → customer enrolls → deposits on due dates (wallet debit or checkout payment) → ledger accrues ROI/grams → on maturity, credit wallet money or gold grams → customer redeems against any order or buys gold; reminders via notification center.

### E. Pricing (per shop, per day)
Owner sets daily rates per purity (24K/22K/18K, silver) → product price derived: `(netWeight × rate/1000mg × purity) + making + stones + platformFee − discounts + GST (or exempt)` → recalculated everywhere instantly; rate history audited.

### F. Sam Bot
User opens widget → message sent to `/api/chat` with shop slug → intent matcher (rate, product search, order status, scheme calculator, policy, contact, appointment) → answer from that shop's data → fallback FAQ from owner-managed knowledge → final fallback: WhatsApp handoff link.

### G. Popup offer
Owner creates popup (trigger/schedule/audience/budget chips) → on trigger condition, client shows modal → chip click navigates to filtered listing → dismissal respected per frequency setting.

## 3. Data flow diagram

```
Browser ── RSC/SSR pages ──────────────► Next.js 16 (App Router)
   │                                       │  proxy.ts: host → tenant
   ├─ Server Actions (forms, mutations) ──►│  auth guard + permission matrix
   ├─ /api/* JSON (cart, chat, payments) ─►│
   │                                       ▼
   │                              Prisma (SQLite/PG)  ── row-level shopId
   │                                       │
   ├─ Razorpay checkout.js ◄── server create order (shop keys)
   ├─ UPI QR (server generated)           │
   └─ wa.me deep links ◄── Shop.settings  │
                                          ▼
                              Storage adapter (/public/uploads)
```

## 4. Order state machine

```
PLACED ─► CONFIRMED ─► PACKED ─► SHIPPED ─► DELIVERED ─► [RETURN_REQUESTED ─► RETURNED/EXCHANGED]
   │           │                                              │
   └──────► CANCELLED ◄──────────────┘                        └─► REFUNDED
              │ (customer, until PACKED; admin anytime pre-ship)
              └─► refund: prepaid→Razorpay/refund-to-wallet, COD→closed
```
