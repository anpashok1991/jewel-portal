import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { ShopEditForm, ShopFeaturesForm } from "@/components/super/SuperForms";
import ShopDangerZone from "@/components/super/ShopDangerZone";

export const metadata = { title: "Platform · Shop" };
export const dynamic = "force-dynamic";

export default async function SuperShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shop, themes, plans] = await Promise.all([
    db.shop.findUnique({
      where: { id },
      include: {
        theme: { select: { name: true } },
        plan: { select: { name: true } },
        features: true,
        users: { where: { role: "OWNER" }, select: { name: true, email: true } },
        _count: { select: { products: true, orders: true, users: true } },
      },
    }),
    db.theme.findMany({ orderBy: { name: "asc" } }),
    db.platformPlan.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!shop) notFound();

  const enabled: Record<string, boolean> = {};
  for (const f of shop.features) enabled[f.key] = f.enabled;

  const meta = [
    { label: "Slug", value: `/${shop.slug}` },
    { label: "Custom domain", value: shop.customDomain ?? "— (slug path only)" },
    { label: "Status", value: shop.status },
    { label: "Theme", value: shop.theme.name },
    { label: "Plan", value: shop.plan?.name ?? "—" },
    { label: "Owner", value: shop.users[0] ? `${shop.users[0].name} · ${shop.users[0].email}` : "—" },
    { label: "Products / Orders / Users", value: `${shop._count.products} / ${shop._count.orders} / ${shop._count.users}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{shop.name}</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Tenant detail · created {shop.createdAt.toLocaleDateString("en-IN")}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${shop.slug}`} target="_blank" className="btn btn-ghost !min-h-10 text-sm">Open storefront</Link>
          <Link href={`/${shop.slug}/admin/login`} target="_blank" className="btn btn-ghost !min-h-10 text-sm">Admin login</Link>
        </div>
      </div>

      <section className="card p-5" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {meta.map((m) => (
            <div key={m.label}>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>{m.label}</p>
              <p className="font-medium mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <ShopEditForm
          shop={{ id: shop.id, name: shop.name, status: shop.status, themeId: shop.themeId, planId: shop.planId, customDomain: shop.customDomain }}
          themes={themes.map((t) => ({ id: t.id, label: t.name }))}
          plans={plans.map((p) => ({ id: p.id, label: `${p.name} · ₹${p.pricePaise / 100}/mo` }))}
        />
        <ShopFeaturesForm shopId={shop.id} enabled={enabled} />
      </div>

      <ShopDangerZone shopId={shop.id} shopName={shop.name} blocked={shop.status === "BLOCKED"} />
    </div>
  );
}
