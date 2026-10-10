# Requirements — Multi-Tenant Jeweller E-Commerce Portal

Reference experience: Tanishq (tanishq.co.in). Serves as an online-marketing + full e-commerce platform that a **Super Admin (application owner)** licenses to individual jewellers. Each jeweller gets an isolated, fully branded shop with their own inventory, pricing, reports, logo and settings.

## 1. Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Super Admin** | Entire application | Create/enable/disable shop tenants, assign theme presets, manage platform plans, platform-wide overview. Admin logic is identical for everyone; only UI theme varies. |
| **Shop Owner** | One shop (many branches) | Everything: catalog, media, pricing, orders, invoices, staff, permissions, popups, schemes, settings (Razorpay keys, UPI VPA, WhatsApp number, GSTIN, logo). |
| **Staff** | One shop | Module-level permissions assigned by owner: view / create / edit / delete over Products, Orders, Customers, Inventory, Queries, Reports, Schemes, Settings. |
| **Customer** | Multiple shops | Browse, cart, checkout, orders + tracking + cancel, wallet, savings schemes, appointments, wishlist, reviews, Sam Bot, WhatsApp. |

## 2. Feature Requirements (mapped to your 13 points + additions)

### FR-1 Online marketing
- Themed homepage: hero, offer banners (image or YouTube video), category tiles, collections, festive sections.
- SEO: per-page metadata, sitemap, JSON-LD product schema.
- Coupons, gift cards, loyalty points, login/offer popups, newsletter capture.
- Public **today's gold/silver rate ticker** and rate history page.
- WhatsApp click-to-chat, Sam Bot engagement.

### FR-2 3D animated + responsive pages
- 3D hero scene (React Three Fiber) on home, product **360° viewer** on PDP.
- Scroll animations (GSAP/Framer Motion), cinematic transitions.
- Responsive from 360px → desktop; no horizontal overflow; lazy-load 3D.

### FR-3 Multi-branch shop
- Each shop defines branches (name, address, phone, GSTIN, map, operating hours).
- Branch-scoped inventory, branch selector on storefront, **store pickup vs insured home delivery**, per-branch ETA, stock transfer between branches.

### FR-4 Super Admin → shop tenancy, customizable shop name
- Super Admin creates shops: name, slug, logo, contact, domain, theme assignment.
- Shop #1 seeded: **"Maa Anjani Jewelers"**.
- Complete data isolation per shop (row-level `shopId` on every business table).

### FR-5 Rich media
- Multiple images per product/banner/popup + **YouTube video URL** (embedded player) + gallery.
- Drag-style multi-upload to local `/public/uploads` storage (swap to S3 later).

### FR-6 E-commerce
- Catalog with variants (purity 18K/22K/24K, size, weight), search, filters, sort, wishlist, cart, addresses, checkout, orders, statuses, invoices, returns/exchanges, reviews, gift cards, loyalty redemption, abandoned-cart report.

### FR-7 Recurring deposits → ROI or Gold (savings schemes)
- Shop owner creates plans: frequency **daily / weekly / monthly / custom dates**, installment amount, tenure, joining bonus.
- Maturity mode: **(a) ROI % on deposits** credited to wallet, or **(b) gold grams** accrued at prevailing rate per deposit.
- Customer deposits from account; ledger with due dates + reminders; maturity → redeem against any purchase, or buy gold/any item from maturity amount. Auto-maturity processing job (on-load computation + settle action).

### FR-8 Invoices with GST
- Invoice with shop GSTIN, HSN codes, GST breakup, place of supply, round-off.
- Per-line **"GST exempt"** checkbox → invoice prints *Exempt / Nil rated* for that line.
- PDF download (invoice + pre-purchase **estimate/quotations**).

### FR-9 Login popups / offers
- Popup manager: image/content/CTA, trigger (login, visit, exit-intent), schedule window, audience, budget-picker style (e.g. "Less than ₹25k" chips → filtered results), frequency (once/session/daily).

### FR-10 Category filtering & shop-by
- Three category axes: **Material** (Gold, Silver, Diamond, Platinum, Bracelet…), **Audience** (Male, Female, Kids, Unisex), **Type** (Ring, Chain, Earring, Mangalsutra, Bangle, Pendant, Nosepin…).
- Faceted filters: price (live-rate aware), purity, weight, occasion, category axes; "Shop by" mega-menu.

### FR-11 Theme selection by Super Admin
- Theme presets (palette, fonts, radius, layout variant) stored centrally; Super Admin assigns to shop; storefront renders via CSS variables. Admin panel shares one logic/UI shell with theme applied.

### FR-12 Staff permissions
- Staff users per shop with a permission matrix (module × action). UI hides what a user cannot access; server enforces it on every action.

### FR-13 Shop owner dashboard
- KPIs: today's / monthly revenue, orders (day/month), customers, queries, inventory valuation.
- Profit & loss summary **in %** (revenue − COGS − discounts), low-stock alerts.
- Reports with date-range filter + CSV export: sales, GST collection, inventory, P&L, day-end collection split (cash / online / COD / wallet).

### FR-14 Order tracking + cancel (customer)
- Timeline: Placed → Confirmed → Packed → Shipped (courier + AWB) → Delivered / Cancelled / Refunded.
- **Cancel button** while Placed/Confirmed (reason required) → stock restock; prepaid → Razorpay refund, COD → closed; refund state visible.
- Return / exchange request after delivery (size exchange supported).
- WhatsApp share-status link.

### FR-15 WhatsApp per shop
- Floating WhatsApp CTA; number + greeting from **Shop Owner → Settings**; contextual `wa.me` deep links (product, order, query); enable/disable per page type.

### FR-16 Sam Bot (shop-scoped chatbot)
- Floating widget "Sam Bot"; every answer scoped to the current shop's data: today's rates, catalog search, scheme maturity calculator, order status by order id, policies, branch info.
- Shop owner manages knowledge (FAQ Q/A) in admin; fallback hands off to that shop's WhatsApp with context.
- Deterministic retrieval/intent engine (no external LLM key required).

### FR-17 Additional business actions
- Book consultation/appointment (branch + slot) → admin calendar.
- Old-gold exchange request (photos, purity, weight) → admin queries.
- Estimate/quotation PDF; hallmark/BIS certificate image + purity guarantee badge.
- Size guide on PDP (ring/chain); notification center (order events, scheme due, offers).

### FR-18 Payments (per-shop credentials)
- **Razorpay**: key_id/key_secret stored per shop in Settings; server creates orders, verifies signature, webhook confirmation, refunds.
- **COD** with configurable fee/limit.
- **Dynamic UPI QR** generated from the shop's VPA (`upi://pay?...` → QR image) with exact payable amount.
- Line/totals engine: metal value + making charge + stone value + platform fee − discount − coupon − gift card − loyalty + **GST (or exempt)** + shipping + COD fee − round-off.

## 3. Non-functional
- Responsive (360px+), accessible labels, WCAG-friendly forms.
- Row-level tenant security; permission checks server-side; password hashing (bcrypt), signed session cookies (jose).
- Money stored in paise (integer); weights in milligrams (integer); computed values rounded half-up at display/invoice.
- Runs on SQLite (dev) → PostgreSQL (prod) via Prisma; local file storage behind a storage adapter.
