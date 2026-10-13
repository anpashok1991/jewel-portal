import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { FEATURE_LIST } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { WHATSAPP_PAGE_LABELS, type WhatsappPageType } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Platform · Shop handover" };
export const dynamic = "force-dynamic";

type Check = { ok: boolean; item: string; detail: string; fix: string };

// Walkthrough: what to explain to the incoming owner, and where to show it.
const WALKTHROUGH: { group: string; rows: { title: string; what: string; where: string }[] }[] = [
  {
    group: "Daily operations",
    rows: [
      { title: "Dashboard", what: "Today/month revenue, profit, customers, inventory value, open leads, 14-day revenue chart, recent orders — the owner's home screen each morning.", where: "/{slug}/admin" },
      { title: "Orders", what: "Search + status filters; one-click transitions (Placed → Confirmed → Packed → Shipped → Delivered) with audit events and notes; GST invoice PDF; refund marking on cancels/returns.", where: "/{slug}/admin/orders" },
      { title: "Leads", what: "Appointments, old-gold exchange requests and contact queries arrive here with a NEW → IN_PROGRESS workflow per tab.", where: "/{slug}/admin/leads" },
      { title: "Reports", what: "Date-range sales and GST tables, low-stock alerts, P&L, collections by payment method, CSV downloads for the accountant/CA.", where: "/{slug}/admin/reports" },
    ],
  },
  {
    group: "Catalog & pricing",
    rows: [
      { title: "Products", what: "Product CRUD with weight (g → mg) and price (₹ → paise) inputs, making-charges in basis points, variants/sizes, per-branch stock, image upload, category icons.", where: "/{slug}/admin/products" },
      { title: "Rates", what: "The daily metal rate card (paise/gram) that drives live storefront pricing and locks gold in savings schemes. Every change is logged with actor + history.", where: "/{slug}/admin/rates" },
      { title: "Savings schemes", what: "Create ROI (%) or Gold (+bonus) plans with tenure/frequency; customer deposits and due dates are tracked automatically.", where: "/{slug}/admin/schemes" },
    ],
  },
  {
    group: "Settings (one-time setup)",
    rows: [
      { title: "Shop profile", what: "Name, tagline, logo, contact details, address, GSTIN + PAN — GSTIN feeds the invoice PDF.", where: "/{slug}/admin/settings" },
      { title: "Payments", what: "Razorpay keys (card/netbanking with auto verify + refunds), UPI VPA + QR, COD with optional fee and order-value cap.", where: "/{slug}/admin/settings" },
      { title: "Commercials", what: "GST %, platform fee (flat + %), free-shipping threshold, flat shipping, loyalty earn/redeem percentages.", where: "/{slug}/admin/settings" },
      { title: "WhatsApp (free)", what: "Shop WhatsApp number + greeting for the floating chat button; choose which page types show it; enable 'Send purchase details over WhatsApp' so staff/customers share order receipts via wa.me — no paid Meta API needed.", where: "/{slug}/admin/settings" },
      { title: "Features", what: "20 per-shop feature toggles (COD, Razorpay, UPI QR, invoices, Sam Bot, popups, coupons, loyalty, schemes…) — turn off anything the owner won't use.", where: "/{slug}/admin/settings" },
      { title: "Theme", what: "Seven ready-made jewellery themes with colour/font/scene presets; the storefront restyles instantly.", where: "/{slug}/admin/settings" },
      { title: "Branches", what: "Each branch has its own address, stock and appointment slot; checkout requires at least one active branch.", where: "/{slug}/admin/settings" },
      { title: "Staff logins", what: "Invite staff with per-module permissions (products, orders, reports… stay limited by default — no settings or marketing access).", where: "/{slug}/admin/settings" },
    ],
  },
  {
    group: "Growth & customer experience",
    rows: [
      { title: "Marketing", what: "Hero carousel slides (URL or upload), coupons (% / flat, caps, usage limits), gift cards, loyalty ledger with manual grants.", where: "/{slug}/admin/marketing" },
      { title: "Storefront tour", what: "Walk the owner through their public site: home carousel + rate ticker, faceted shop, product price breakup, cart → checkout → order tracking with WhatsApp purchase-details links.", where: "/{slug}" },
      { title: "Customer account", what: "Orders + cancellations, wallet, savings-scheme deposits, addresses, wishlist — what their shoppers will see at /account.", where: "/account" },
      { title: "Sam Bot (optional)", what: "Shop-scoped assistant answering rates, order status, schemes and FAQs from the owner's own data, with a WhatsApp handoff fallback.", where: "Feature flag: sambot" },
    ],
  },
];

const HANDOVER_SCRIPT: { task: string; why: string }[] = [
  { task: "Log in together as the owner and change the password immediately", why: "Credentials handed over at launch are temporary — the owner must own the login." },
  { task: "Confirm GSTIN, PAN and business address", why: "They print on every GST invoice the shop issues." },
  { task: "Choose payment mode: live Razorpay keys, UPI QR + COD, or a mix", why: "Test one order end-to-end before going live." },
  { task: "Set the WhatsApp number, greeting, floating-button pages and purchase-details sharing", why: "This is the shop's free support + order-details channel (wa.me — no Meta charges)." },
  { task: "Publish today's metal rate", why: "All storefront prices and scheme gold-locking derive from it." },
  { task: "Create staff logins with least-privilege modules", why: "Staff never get Settings/Marketing unless explicitly granted." },
  { task: "Upload logo, announcement bar and pick a theme", why: "Branding the owner will recognise as their own." },
  { task: "Add a custom domain (or agree the /{slug} URL)", why: "Domain maps the whole site — storefront, admin and clean URLs." },
  { task: "Place a test order through to invoice + WhatsApp purchase details", why: "Proves checkout, stock, pricing, invoicing and messaging all work." },
  { task: "Hand over access summary: owner login, Razorpay dashboard, domain registrar, this console's scope", why: "Everything the owner is now responsible for, in one place." },
];

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card p-5 space-y-3" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">{title}</h2>
      {note ? <p className="text-xs" style={{ color: "var(--c-muted)" }}>{note}</p> : null}
      {children}
    </section>
  );
}

function StatusIcon({ ok }: { ok: boolean }) {
  return (
    <span
      className="shrink-0 h-5 w-5 rounded-full grid place-items-center text-[11px] font-bold"
      style={ok ? { background: "rgba(34,197,94,.18)", color: "#4ade80" } : { background: "rgba(248,113,113,.18)", color: "#f87171" }}
      aria-hidden
    >
      {ok ? "✓" : "!"}
    </span>
  );
}

function Checklist({ rows }: { rows: Check[] }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((c) => (
        <li key={c.item} className="flex gap-3 text-sm">
          <StatusIcon ok={c.ok} />
          <span className="min-w-0">
            <b className="text-white">{c.item}</b> <span style={{ color: "var(--c-muted)" }}>— {c.detail}</span>
            {!c.ok ? (
              <>
                <br />
                <span className="text-xs" style={{ color: "#fbbf24" }}>Fix: {c.fix}</span>
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function SuperHandoverPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const { shop: shopParam } = await searchParams;

  const shops = await db.shop.findMany({
    orderBy: { name: "asc" },
    include: {
      plan: { select: { name: true, pricePaise: true } },
      theme: { select: { name: true } },
      _count: { select: { branches: true, products: true, categories: true } },
    },
  });
  const shop = shops.find((s) => s.slug === shopParam) ?? shops[0] ?? null;

  let owner: { email: string; name: string } | null = null;
  let staffCount = 0;
  let rateCount = 0;
  let featuresOn = 0;
  if (shop) {
    [owner, staffCount, rateCount, featuresOn] = await Promise.all([
      db.user.findFirst({ where: { shopId: shop.id, role: "OWNER", active: true }, select: { email: true, name: true } }),
      db.user.count({ where: { shopId: shop.id, role: "STAFF", active: true } }),
      db.metalRate.count({ where: { shopId: shop.id } }),
      db.featureFlag.count({ where: { shopId: shop.id, enabled: true } }),
    ]);
  }

  const required: Check[] = shop
    ? [
        {
          ok: Boolean(owner),
          item: "Owner login",
          detail: owner ? `${owner.name} · ${owner.email} · /${shop.slug}/admin/login` : "no active OWNER user on this shop",
          fix: "re-create the owner from Platform → Shops",
        },
        {
          ok: Boolean(shop.tagline && shop.contactEmail && shop.phone && shop.address && shop.state),
          item: "Shop profile",
          detail: `tagline / contact email / phone / address ${shop.tagline && shop.contactEmail && shop.phone && shop.address && shop.state ? "are set" : "are incomplete"}`,
          fix: `Admin → Settings → Shop profile (/${shop.slug}/admin/settings)`,
        },
        {
          ok: Boolean(shop.gstin),
          item: "GSTIN for GST invoices",
          detail: shop.gstin ? shop.gstin : "missing — invoice PDFs will have a blank GSTIN",
          fix: `Admin → Settings → Shop profile`,
        },
        {
          ok: shop._count.branches >= 1,
          item: "At least one active branch",
          detail: `${shop._count.branches} branch(es) — checkout needs one for pickup/stock`,
          fix: `Admin → Settings → Branches`,
        },
        {
          ok: shop._count.categories >= 1 && shop._count.products >= 1,
          item: "Catalog ready",
          detail: `${shop._count.categories} categories · ${shop._count.products} products`,
          fix: `Admin → Products (/${shop.slug}/admin/products)`,
        },
        {
          ok: rateCount >= 1,
          item: "Metal rates published",
          detail: rateCount >= 1 ? `${rateCount} rate rows — live pricing works` : "no rates yet — storefront prices and schemes cannot compute",
          fix: `Admin → Rates (/${shop.slug}/admin/rates)`,
        },
        {
          ok: shop.enableCod || (Boolean(shop.razorpayKeyId) && Boolean(shop.razorpaySecret)) || (shop.enableUpiQr && Boolean(shop.upiVpa)),
          item: "A working payment method",
          detail: `${shop.enableCod ? "COD ✓" : "COD off"} · ${shop.razorpayKeyId && shop.razorpaySecret ? "Razorpay keys ✓" : "no Razorpay keys"} · ${shop.enableUpiQr && shop.upiVpa ? "UPI QR ✓" : "no UPI VPA"}`,
          fix: `Admin → Settings → Payments`,
        },
        {
          ok: true,
          item: "Theme assigned",
          detail: shop.theme.name,
          fix: "",
        },
      ]
    : [];

  const recommended: Check[] = shop
    ? [
        {
          ok: Boolean(shop.logo),
          item: "Branding (logo)",
          detail: shop.logo ? "logo uploaded" : "no logo — header falls back to the shop initial",
          fix: `Admin → Settings → Shop profile`,
        },
        {
          ok: Boolean(shop.whatsappNumber),
          item: "WhatsApp channel (free wa.me)",
          detail: shop.whatsappNumber
            ? `${shop.whatsappNumber} · FAB on ${shop.whatsappEnabled ? "on" : "off"} · purchase-details sharing ${shop.whatsappOrderShare ? "on" : "off"}`
            : "no number — floating button and WhatsApp links stay hidden",
          fix: `Admin → Settings → WhatsApp`,
        },
        {
          ok: Boolean(shop.customDomain),
          item: "Custom domain",
          detail: shop.customDomain ? shop.customDomain : `not mapped — shop runs at /${shop.slug} on the default domain`,
          fix: `Platform → Shops → Manage → custom domain`,
        },
        {
          ok: Boolean(shop.planId),
          item: "Subscription plan",
          detail: shop.plan ? `${shop.plan.name} · ${formatINR(shop.plan.pricePaise)}/mo` : "no plan assigned",
          fix: `Platform → Shops → Manage`,
        },
        {
          ok: staffCount >= 1,
          item: "Staff logins (least privilege)",
          detail: staffCount >= 1 ? `${staffCount} active staff` : "owner is the only login — add staff for counter/ops",
          fix: `Admin → Settings → Staff`,
        },
        {
          ok: featuresOn > 0,
          item: "Feature flags reviewed",
          detail: `${featuresOn}/${FEATURE_LIST.length} features enabled`,
          fix: `Admin → Settings → Features`,
        },
      ]
    : [];

  const readyCount = [...required, ...recommended].filter((c) => c.ok).length;
  const totalCount = [...required, ...recommended].length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shop handover guide</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>
            Readiness checklist + feature walkthrough for handing a launched shop over to its owner. Super-admin only.
          </p>
        </div>
        {shop ? (
          <div className="text-xs" style={{ color: "var(--c-muted)" }}>
            {readyCount}/{totalCount} checks passing
          </div>
        ) : null}
      </div>

      {/* shop picker */}
      <div className="flex flex-wrap gap-2">
        {shops.map((s) => (
          <Link
            key={s.id}
            href={`/super/handover?shop=${s.slug}`}
            className="px-3 py-1.5 rounded-lg border text-sm"
            style={
              s.id === shop?.id
                ? { borderColor: "#3b82f6", background: "rgba(59,130,246,.15)", color: "#fff" }
                : { borderColor: "rgba(255,255,255,.15)", color: "var(--c-muted)" }
            }
          >
            {s.name}
          </Link>
        ))}
      </div>

      {shop ? (
        <>
          <Section title={`Before you hand over · ${shop.name}`} note="Everything here should be green before the owner takes charge.">
            <Checklist rows={required} />
          </Section>

          <Section title="Recommended" note="Not blockers, but the owner will ask for them in week one.">
            <Checklist rows={recommended} />
          </Section>

          <Section title="Owner credentials to hand over">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>Owner login</p>
                <p className="mt-1 font-medium text-white">{owner ? `${owner.name} · ${owner.email}` : "—"}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>/{shop.slug}/admin/login · password to be changed on first sign-in</p>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,255,255,.08)" }}>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>Storefront</p>
                <p className="mt-1 font-medium text-white">{shop.customDomain ? shop.customDomain : `/${shop.slug}`}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
                  Admin: /{shop.slug}/admin · Theme: {shop.theme.name} · WhatsApp pages:{" "}
                  {shop.whatsappPages
                    .split(",")
                    .filter(Boolean)
                    .map((k) => WHATSAPP_PAGE_LABELS[k as WhatsappPageType] ?? k)
                    .join(", ") || "none"}
                </p>
              </div>
            </div>
          </Section>
        </>
      ) : (
        <Section title="No shops yet">
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Launch a shop from Platform → Shops first.</p>
        </Section>
      )}

      <Section title="Feature walkthrough for the owner" note="Suggested order for the handover session — each row says what it does and where to show it.">
        <div className="space-y-5">
          {WALKTHROUGH.map((g) => (
            <div key={g.group}>
              <p className="text-xs uppercase tracking-[0.16em] mb-2" style={{ color: "var(--c-accent)" }}>{g.group}</p>
              <ol className="space-y-3">
                {g.rows.map((r, i) => (
                  <li key={r.title} className="flex gap-3 text-sm">
                    <span
                      className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(59,130,246,.18)", color: "#93c5fd" }}
                    >
                      {i + 1}
                    </span>
                    <span>
                      <b className="text-white">{r.title}</b>
                      <span style={{ color: "var(--c-muted)" }}> — {r.what}</span>
                      <br />
                      <span className="text-xs" style={{ color: "#fbbf24" }}>Show: {r.where}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Handover script" note="Run through this list with the owner before you leave.">
        <ol className="space-y-3">
          {HANDOVER_SCRIPT.map((h, i) => (
            <li key={h.task} className="flex gap-3 text-sm">
              <span
                className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(251,191,36,.16)", color: "#fbbf24" }}
              >
                {i + 1}
              </span>
              <span>
                <b className="text-white">{h.task}</b>
                <br />
                <span className="text-xs" style={{ color: "var(--c-muted)" }}>{h.why}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
