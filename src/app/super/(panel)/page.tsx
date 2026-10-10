import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Platform · Dashboard" };
export const dynamic = "force-dynamic";

const PAID_LIKE = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"];

export default async function SuperDashboard() {
  const [totalShops, activeShops, blockedShops, plans, platformUsers, ordersAgg, recentShops] = await Promise.all([
    db.shop.count(),
    db.shop.count({ where: { status: "ACTIVE" } }),
    db.shop.count({ where: { status: "BLOCKED" } }),
    db.platformPlan.count(),
    db.platformUser.count({ where: { active: true } }),
    db.order.aggregate({ where: { status: { in: PAID_LIKE } }, _sum: { totalPaise: true }, _count: { _all: true } }),
    db.shop.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { theme: { select: { name: true } }, plan: { select: { name: true } }, features: { select: { enabled: true } } },
    }),
  ]);
  const enabledFlags = await db.featureFlag.count({ where: { enabled: true } });

  const kpis = [
    { label: "Shops", value: String(totalShops), sub: `${activeShops} active` },
    { label: "Blocked", value: String(blockedShops), sub: "suspended stores" },
    { label: "Platform GMV", value: formatINR(ordersAgg._sum.totalPaise ?? 0), sub: `${ordersAgg._count._all} orders` },
    { label: "Plans", value: String(plans), sub: "subscription tiers" },
    { label: "Platform users", value: String(platformUsers), sub: "console access" },
    { label: "Enabled flags", value: String(enabledFlags), sub: "across all shops" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Platform dashboard</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>Cross-shop health and quick actions.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>{k.label}</p>
            <p className="text-lg font-bold mt-1">{k.value}</p>
            <p className="text-[11px]" style={{ color: "var(--c-muted)" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <section className="card p-5" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent shops</h2>
          <Link href="/super/shops" className="text-sm underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase border-b" style={{ color: "var(--c-muted)", borderColor: "rgba(255,255,255,.08)" }}>
                <th className="py-2 pr-3">Shop</th>
                <th className="py-2 pr-3">Slug</th>
                <th className="py-2 pr-3">Theme</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentShops.map((s) => (
                <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3" style={{ color: "var(--c-muted)" }}>/{s.slug}</td>
                  <td className="py-2 pr-3">{s.theme.name}</td>
                  <td className="py-2 pr-3">{s.plan?.name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.status === "ACTIVE" ? "rgba(74,222,128,.12)" : "rgba(248,113,113,.12)", color: s.status === "ACTIVE" ? "#4ade80" : "#f87171" }}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/${s.slug}`} target="_blank" className="text-xs underline mr-2">Storefront</Link>
                    <Link href={`/super/shops/${s.id}`} className="text-xs underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
