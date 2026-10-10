import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform Â· Application flow" };
export const dynamic = "force-dynamic";

const CREDENTIALS = [
  { role: "Platform super admin", email: "admin@jewelportal.in", password: "Admin@123", where: "/super/login" },
  { role: "Shop owner (Shop 1)", email: "owner@maaanjani.in", password: "Owner@123", where: "/maa-anjani-jewelers/admin/login" },
  { role: "Shop staff (limited RBAC)", email: "staff@maaanjani.in", password: "Staff@123", where: "/maa-anjani-jewelers/admin/login" },
  { role: "Customer", email: "customer@demo.in", password: "Demo@123", where: "/account/login" },
  { role: "Shop 2 owner", email: "owner@vasantjewels.in", password: "Owner@123", where: "/vasant-jewels/admin/login" },
];

type Row = readonly [string, string];
const CUSTOMER_STEPS: Row[] = [
  ["Discover", "SEO-friendly storefront at /{slug} — hero carousel with jewelry artwork, category banners, live gold/silver rate ticker, offer popups, announcement bar."],
  ["Browse & compare", "/{slug}/shop — faceted filters (material, audience, type, purity, price, weight), wishlist toggle, search at /{slug}/search."],
  ["Evaluate", "/{slug}/p/[handle] — gallery + YouTube, price breakup (metal + making + GST), size/variant picker, WhatsApp inquiry, reviews."],
  ["Add to cart", "Server action addToCart — session required (guests are sent to /account/login). Stock reserved only at order time."],
  ["Checkout", "/{slug}/checkout — saved address or inline new address, payment method (COD / Razorpay / UPI QR), coupon code, loyalty points, gift card."],
  ["Order placed", "placeOrder — creates Order + OrderItems + Invoice (GST split), reserves stock, clears cart, logs OrderEvent + Notification, sends WhatsApp-ready tracking link."],
  ["Track & manage", "/{slug}/order/[id] and /account/orders — status timeline; customer may cancel (PLACED/CONFIRMED) or request return (DELIVERED). Cancel/return restocks inventory."],
  ["After-sales", "GST invoice PDF at /api/orders/[id]/invoice, wallet top-ups/credits, savings-scheme deposits, old-gold exchange requests, appointment bookings."],
];

const ORDER_LIFECYCLE: Row[] = [
  ["PLACED", "Customer paid/committed. Stock reserved. Owner may confirm or cancel."],
  ["CONFIRMED", "Owner verified payment/inventory. Customer notified."],
  ["PACKED", "Ready for dispatch."],
  ["SHIPPED", "Handed to courier / out for delivery."],
  ["DELIVERED", "Complete. Customer can open a return request from here."],
  ["CANCELLED", "Before shipping. Stock restocked. Paid orders auto-refund via Razorpay → REFUNDED."],
  ["RETURN_REQUESTED", "Customer raised a return; owner approves (→ RETURNED) or rejects (→ DELIVERED)."],
  ["RETURNED", "Goods received back; stock restocked; refund can be marked."],
  ["REFUNDED", "Terminal. Money returned (manual mark or automatic on cancel of a paid order)."],
];

const ADMIN_SECTIONS: Row[] = [
  ["Dashboard", "Today/month revenue, profit, customers, inventory value, open leads, 14-day revenue chart, recent orders."],
  ["Orders", "Search + status filters, one-click transitions with audit events, invoice PDF, refund marking. RBAC: orders module."],
  ["Catalog", "Product CRUD (weight g→mg, price ₹→paise, making bp), variants, per-branch inventory, image upload (/api/upload), categories."],
  ["Rates", "Daily metal rate card (paise/gram) used by live pricing and scheme gold-locking; full history with actor."],
  ["Schemes", "Savings plans (ROI % or Gold + bonus), tenure/frequency, due dates auto-generated; customer deposits tracked in /account/schemes."],
  ["Leads", "Appointments, old-gold exchange requests, contact queries — status workflow (NEW → IN_PROGRESS → …) per tab."],
  ["Marketing", "Hero carousel slides (image URL or upload, artwork fallback), coupons (%, flat, min-order, cap, usage limits), gift cards, loyalty ledger with manual grants."],
  ["Reports", "Date-range sales + GST tables, low-stock alerts, P&L, collections by method, CSV downloads for accounts/CA."],
  ["Settings", "Shop profile & GSTIN, Razorpay keys, UPI VPA/QR, COD rules, shipping thresholds, 20 feature toggles, theme switcher (7 themes), branches, staff logins with per-module permissions."],
];

const PAYMENTS: Row[] = [
  ["COD", "Default on. Optional COD fee + order-value cap configurable per shop. Status stays PLACED until owner confirms."],
  ["Razorpay", "Key/secret stored per shop. Checkout creates a Razorpay order (REST), browser checkout, server signature verify → PAID. Cancel of paid order triggers automatic refund."],
  ["UPI QR", "Static UPI intent (upi://pay) rendered as QR from shop VPA — customer pays in any UPI app and shares screenshot; owner confirms manually."],
];

const SCHEMES: Row[] = [
  ["ROI mode", "Customer deposits monthly; at maturity receives principal + simple interest accrued per deposit day-by-day to maturity date."],
  ["Gold mode", "Each deposit locks gold milligrams at that day's rate (amount ÷ rate). A bonus percent (e.g. 5%) is added on maturity. Purchases can be made against locked gold."],
  ["Due engine", "DAILY / WEEKLY / MONTHLY / CUSTOM (day-of-month or weekday lists) schedules; next-due surfaced to both customer and admin."],
];

const PLATFORM: Row[] = [
  ["Landing page", "The app-owner domain root (/) is a Jewel Portal landing page with a shop directory, customer login and Super admin login — it never auto-redirects to a shop."],
  ["Shops", "Launch a new jeweller in one form: shop + slug + custom domain + theme + plan + owner login + 20 feature flags + default branch."],
  ["Custom domains", "Set a shop's Custom domain (e.g. maaanjani.in) and the whole site serves from the domain root (/, /shop, /admin — clean URLs). Local test: maaanjani.in.localhost:3000. /super is served on the app-owner domain only. No domain? The shop keeps working at /{slug} on the default domain."],
  ["Danger zone", "Shop detail page: Block access (1 click — suspends for non-payment, 404 everywhere, data kept) or Delete permanently (2 clicks with a red confirmation panel — type the shop name, wipes the shop and all its data via cascades)."],
  ["Plans", "Monthly subscription tiers (price + included feature keys) assignable to shops."],
  ["Feature flags", "Master list of 20 features; owner can toggle within their shop, super admin can override per shop."],
  ["Users", "Additional platform-console logins with enable/disable (cannot disable yourself)."],
  ["App flow", "This page — always available under /super/flow for the application owner."],
];

const CONVENTIONS: Row[] = [
  ["Money", "Every rupee is stored as integer paise; all pricing/GST/coupon math is integer-safe with half-up rounding."],
  ["Weight", "All weights are integer milligrams (g × 1000 on input)."],
  ["Tenancy", "Host-based + path-scoped: Shop.customDomain maps a domain to a tenant (the proxy rewrites to /{slug}/…); everything also works at /{slug}/… on the default domain. Shared /account for customers."],
  ["Hero", "Storefront hero is an auto-rotating carousel; slides without media show jewelry line-art (ring/chain/bangle/necklace). Owners add images via Admin → Marketing → Hero carousel (paste URL or upload)."],
  ["Auth", "Single httpOnly JWT cookie (jp_session) with pool = shop | platform; staff RBAC via Permission rows per module."],
  ["Database", "SQLite (dev.db) for development — Prisma schema is provider-portable. Production: switch provider to postgresql, set DATABASE_URL, run prisma db push + seed."],
  ["APIs", "All mutations are Next.js server actions or /api/* routes (upload, chat, invoice PDF, payment verify) — ready for a future Android client."],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 space-y-3" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Steps({ rows }: { rows: Row[] }) {
  return (
    <ol className="space-y-3">
      {rows.map(([t, d], i) => (
        <li key={t} className="flex gap-3 text-sm">
          <span
            className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(59,130,246,.18)", color: "#93c5fd" }}
          >
            {i + 1}
          </span>
          <span>
            <b className="text-white">{t}</b>
            <span style={{ color: "var(--c-muted)" }}> — {d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function SuperFlowPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Application flow</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>
          How JewelPortal works end-to-end — for the application owner. Super-admin only.
        </p>
      </div>

      <Section title="1 Â· System at a glance">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { k: "Storefront", v: "Public, per jeweller, 3D themed, path /{slug}" },
            { k: "Shop admin", v: "Owner + staff, RBAC, path /{slug}/admin" },
            { k: "Platform", v: "You — shops, plans, flags, path /super" },
            { k: "Customer area", v: "Orders, wallet, schemes, /account" },
            { k: "Payments", v: "COD Â· Razorpay Â· UPI QR" },
            { k: "Database", v: "SQLite dev → PostgreSQL prod ready" },
          ].map((x) => (
            <div key={x.k} className="rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>{x.k}</p>
              <p className="mt-1 font-medium text-white">{x.v}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="2 Â· Demo credentials (all roles)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase border-b" style={{ color: "var(--c-muted)", borderColor: "rgba(255,255,255,.08)" }}>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Password</th>
                <th className="py-2">Login at</th>
              </tr>
            </thead>
            <tbody>
              {CREDENTIALS.map((c) => (
                <tr key={c.email} className="border-b last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{c.role}</td>
                  <td className="py-2 pr-3">{c.email}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{c.password}</td>
                  <td className="py-2 text-xs" style={{ color: "var(--c-muted)" }}>{c.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs" style={{ color: "var(--c-muted)" }}>
          Change all passwords before going live. Staff logins are RBAC-limited (no settings/marketing by default).
        </p>
      </Section>

      <Section title="3 Â· Customer journey">
        <Steps rows={CUSTOMER_STEPS} />
      </Section>

      <Section title="4 Â· Order lifecycle">
        <Steps rows={ORDER_LIFECYCLE} />
        <p className="text-xs" style={{ color: "var(--c-muted)" }}>
          Illegal transitions are rejected server-side (ORDER_TRANSITIONS in src/lib/constants.ts). Every change writes an OrderEvent with actor + note and notifies the customer.
        </p>
      </Section>

      <Section title="5 Â· Shop admin capabilities">
        <Steps rows={ADMIN_SECTIONS} />
      </Section>

      <Section title="6 Â· Payments">
        <Steps rows={PAYMENTS} />
      </Section>

      <Section title="7 Â· Savings schemes">
        <Steps rows={SCHEMES} />
      </Section>

      <Section title="8 Â· Platform console (you)">
        <Steps rows={PLATFORM} />
      </Section>

      <Section title="9 Â· Engineering conventions">
        <Steps rows={CONVENTIONS} />
      </Section>

      <Section title="10 Â· Quick reference">
        <div className="text-sm space-y-2" style={{ color: "var(--c-muted)" }}>
          <p>
            <b className="text-white">Dev server:</b> <code className="font-mono">npm run dev</code> Â·{" "}
            <b className="text-white">Build:</b> <code className="font-mono">npm run build && npm start</code> Â·{" "}
            <b className="text-white">Seed:</b> <code className="font-mono">npm run seed</code>
          </p>
          <p>
            <b className="text-white">Gates:</b> <code className="font-mono">npx tsc --noEmit</code> Â·{" "}
            <code className="font-mono">npx eslint src --max-warnings=0</code> Â·{" "}
            <code className="font-mono">npm test</code> (Vitest) Â·{" "}
            <code className="font-mono">npm run test:e2e</code> (Playwright)
          </p>
          <p>
            <b className="text-white">Docs:</b> docs/REQUIREMENTS.md Â· docs/FLOW.md Â· docs/ARCHITECTURE.md Â· README.md
          </p>
        </div>
      </Section>
    </div>
  );
}

