# Deployment, Environment & Admin Workflows

This document explains, in plain language, how to put Jewel Portal online, what environment variables it needs, and what a Super Admin and a Shop Admin actually do day-to-day. Mermaid flow diagrams are included (render them in GitHub, VS Code "Mermaid" preview, or any Mermaid viewer).

---

## 1. Environment variables

Only **four** variables are read from the environment (everything else — Razorpay keys, WhatsApp number, GSTIN, UPI ID, theme, feature flags — is stored **per shop in the database** and configured by the owner in the admin Settings screen, not via env).

| Variable | Required | Example / default | What it does |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `file:./dev.db`<br>`postgresql://user:pass@host:5432/jewelportal` | Where Prisma stores data. SQLite file for small/self-hosted; switch to PostgreSQL URL for production at scale. |
| `AUTH_SECRET` | **Yes** | a long random string (64+ chars) | Signs the login JWT cookie (`jp_session`). **If this changes, every logged-in user is signed out.** Never reuse the dev default in production. |
| `TENANT_HOST_MAP` | No | `{"maaanjani.in":"maa-anjani-jewelers"}` | Optional JSON that maps a custom domain to a shop slug. Overrides the database lookup. Leave `{}` if you rely on the DB `customDomain` field. |
| `NEXT_PUBLIC_APP_NAME` | No | `Jewel Portal` | Display name baked into the client bundle. |

Set them wherever you host (see below). `NODE_ENV` is set automatically by Next.js (`production` on a build).

**Per-shop settings are NOT env vars** — each shop owner sets their own Razorpay keys, WhatsApp number, GSTIN, UPI ID, theme and feature toggles at `/{slug}/admin/settings`. This is what makes the platform multi-tenant.

---

## 2. How to deploy

The app is a standard Next.js 16 server. Any host that runs a Node server works. High-level steps (same for all hosts):

1. **Push to GitHub** (already done — `main` branch).
2. **Point your host** at the repo (Vercel / Railway / Render / a VPS).
3. **Set env vars** `DATABASE_URL` and `AUTH_SECRET` (and optionally the other two) in the host's dashboard.
4. **Build & start.** For a Node/VPS host:
   ```bash
   npm ci
   npx prisma db push        # create tables (use a Postgres DATABASE_URL in prod)
   npm run seed              # optional: load demo shops/products
   npx prisma generate
   npm run build
   npm start                 # serves the production build
   ```
5. **CI runs automatically** — `.github/workflows/ci.yml` runs typecheck → lint → unit tests → build → Playwright e2e on every push/PR to `main`.

### Option A — Vercel (easiest, managed)
- Import the GitHub repo. Vercel detects Next.js and builds on push.
- Set `DATABASE_URL` (use a hosted Postgres — Vercel Postgres, Neon, Supabase) and `AUTH_SECRET`.
- SQLite (`file:…`) does **not** persist on Vercel's serverless filesystem — use Postgres there.
- Run `npx prisma db push` + `npm run seed` once from your machine against the production DB, or add a deploy hook.

### Option B — VPS / any Node server (full control, SQLite-friendly)
```bash
git clone https://github.com/anpashok1991/jewel-portal.git && cd jewel-portal
npm ci
cp .env.example .env         # then edit DATABASE_URL + AUTH_SECRET
npx prisma db push
npm run seed                 # optional demo data
npm run build
npm start                    # listens on PORT (default 3000)
```
Put Nginx/Caddy in front for HTTPS + your domain(s). Run it under a process manager (PM2 / systemd) so it restarts on reboot.

### Custom domains per shop
Each shop can have its own domain (`maaanjani.in`). DNS for that domain must point at your server. The proxy (`src/proxy.ts`) reads the incoming `Host`, looks up the shop (DB `customDomain` field, or `TENANT_HOST_MAP` env), and rewrites the request to that shop's content. The platform console (`/super`) stays only on your main app domain.

---

## 3. The two roles, in plain language

Think of it like a shopping-mall operator vs. a shopkeeper inside the mall:

- **Super Admin (mall operator)** — owns the *platform*. They open new shops, assign each a theme and subscription plan, decide which feature flags a shop may use, and can suspend or delete a shop. They see the whole mall, not individual product listings.
- **Shop Admin / Owner (shopkeeper)** — owns *one jewellery store*. They add their products, set prices and stock, run the daily sales desk (orders), and configure their own payments and branding. Their world is only their shop.
- **Staff** — a shopkeeper's employee. Same shop admin panel, but the owner grants them access to only some sections (e.g. can process orders but cannot see Settings or edit payments).

---

## 4. Super Admin workflow

**Where:** main app domain → `/super/login` (demo: `admin@jewelportal.in` / `Admin@123`).

**What they do:**

1. **Sign in** to the platform console.
2. **Dashboard** — see cross-shop numbers: total shops, active vs blocked, platform GMV (total sales), plans, recent shops.
3. **Shops** — launch a new shop (name, slug, owner email/password, pick a theme, pick a subscription plan), or open an existing one.
4. **Shop detail** — edit the shop's basics, change its theme or plan, set a custom domain, and toggle which **feature flags** that shop can use (schemes, coupons, Razorpay, popups, etc.).
5. **Danger zone** — block a shop (instantly 404s its whole storefront + admin) or delete it (wipes the shop and all its data after a type-the-name confirmation). Unblock restores it.
6. **Plans / Users** — manage subscription tiers and platform-console user accounts.

```mermaid
flowchart TD
    A[Super Admin visits /super/login] --> B{Valid credentials?}
    B -- No --> A
    B -- Yes --> C[Platform dashboard]
    C --> D[Shops list]
    C --> E[Plans]
    C --> F[Platform users]

    D --> G[Create new shop]
    G --> G1[name, slug, owner email]
    G1 --> G2[assign theme + plan]
    G2 --> G3[shop created · owner can log in]

    D --> H[Open a shop]
    H --> I[Shop detail]
    I --> I1[edit basics · theme · plan · custom domain]
    I --> I2[set feature flags for this shop]
    I --> I3[Danger zone]
    I3 --> I4{Block or Delete?}
    I4 -- Block --> I5[Shop 404s everywhere · Unblock restores]
    I4 -- Delete --> I6[Type shop name to confirm → all data wiped]

    I1 --> J[Shop is live at /slug or its custom domain]
```

---

## 5. Shop Admin workflow

**Where:** `/{slug}/admin/login` (demo: `owner@maaanjani.in` / `Owner@123`).

**What they do (daily flow):**

1. **Sign in** to their shop's admin panel. The left nav shows only the sections they have permission for.
2. **Dashboard** — today's revenue, order counts, recent orders, pending leads.
3. **Catalog** (Products) — add/edit products: name, SKU, category/type/material/audience (with a **custom icon** — emoji, image URL, or upload; blank = default), metal & purity, price (₹ or rate-based), weight, GST, making charge, images, variants, and per-branch stock. Toggle products active/hidden, delete.
4. **Rates** — post the day's metal rates (gold/silver/platinum per purity). Rate-based products price off these.
5. **Orders** — the sales desk. Move each order through `PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED` (with cancel/return/refund branches). Stock is reserved on order and returned on cancel.
6. **Marketing** — hero & section banners for the storefront (title, subtitle, image or YouTube, link), plus coupons, gift cards and loyalty adjustments.
7. **Schemes** — create savings plans (daily/weekly/monthly deposits that mature into gold or ROI).
8. **Leads** — appointment / exchange / query requests from the storefront; update their status.
9. **Reports** — sales / GST / inventory / P&L, with CSV export and GST invoices (PDF).
10. **Settings** — shop profile, payments (COD / UPI / Razorpay keys), WhatsApp, GSTIN, theme pick, feature flags, branches, and staff management (owner only).

```mermaid
flowchart TD
    A[Owner/Staff visits /slug/admin/login] --> B{Valid + right shop?}
    B -- No --> A
    B -- Yes --> C[Shop admin panel<br/>nav filtered by RBAC permissions]

    C --> D[Dashboard · today's revenue & orders]
    C --> E[Catalog]
    C --> F[Orders · sales desk]
    C --> G[Marketing]
    C --> H[Schemes]
    C --> I[Leads]
    C --> J[Reports]
    C --> K[Settings]

    E --> E1[Add/edit products<br/>price · weight · GST · images · stock]
    E1 --> E2[Categories with custom icons]

    F --> F1[PLACED]
    F1 --> F2[CONFIRMED]
    F2 --> F3[PACKED]
    F3 --> F4[SHIPPED]
    F4 --> F5[DELIVERED]
    F1 -.-> X[CANCELLED / RETURN / REFUND<br/>stock restocked]

    G --> G1[Hero + section banners<br/>image URL or upload · YouTube]
    G --> G2[Coupons · gift cards · loyalty]

    K --> K1[Payments: COD / UPI / Razorpay]
    K --> K2[WhatsApp · GSTIN · theme]
    K --> K3[Branches · staff (owner only)]

    E1 -.-> S[(Storefront at /slug updates live)]
    G1 -.-> S
    F5 -.-> S
```

### How a customer order flows through the system

```mermaid
sequenceDiagram
    participant C as Customer
    participant SF as Storefront /slug
    participant O as Owner (admin)
    C->>SF: Browse → add to cart → checkout (COD/UPI/Razorpay)
    SF->>SF: Order created (PLACED) · stock reserved
    SF->>O: Order appears in admin Orders
    O->>SF: CONFIRMED → PACKED → SHIPPED → DELIVERED
    SF->>C: GST invoice (PDF) + status updates
    Note over C,O: Cancel/return refunds payment and restocks inventory
```

---

## 6. Putting it together

```mermaid
flowchart LR
    subgraph Platform [Platform — Super Admin]
        SA[Super Admin console /super]
    end
    subgraph Tenants [Tenant shops]
        S1[Shop A · /maa-anjani-jewelers]
        S2[Shop B · /vasant-jewels]
    end
    subgraph People [Users]
        OWN[Shop Owners / Staff]
        CU[Customers]
    end

    SA -- creates & manages --> S1
    SA -- creates & manages --> S2
    OWN -- manages own shop only --> S1
    OWN -- manages own shop only --> S2
    CU -- browse & buy --> S1
    CU -- browse & buy --> S2
```

**Remember the boundary:** the Super Admin controls *whether a shop exists and what it's allowed to do*; the Shop Admin controls *everything inside their own shop*. One database, many isolated stores, resolved by the URL path (`/{slug}`) or the shop's custom domain.