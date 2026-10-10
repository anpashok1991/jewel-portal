import { db } from "@/lib/db";
import { toggleShop } from "@/actions/super";
import { CreateShopForm } from "@/components/super/SuperForms";
import Link from "next/link";

export const metadata = { title: "Platform · Shops" };
export const dynamic = "force-dynamic";

export default async function SuperShopsPage() {
  const [shops, themes, plans] = await Promise.all([
    db.shop.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        theme: { select: { name: true } },
        plan: { select: { name: true } },
        users: { where: { role: "OWNER" }, select: { email: true }, take: 1 },
        _count: { select: { products: true, orders: true } },
      },
    }),
    db.theme.findMany({ orderBy: { name: "asc" } }),
    db.platformPlan.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Shops</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>Launch, suspend and manage tenant stores.</p>
      </div>

      <CreateShopForm
        themes={themes.map((t) => ({ id: t.id, label: t.name }))}
        plans={plans.map((p) => ({ id: p.id, label: `${p.name} · ₹${p.pricePaise / 100}/mo` }))}
      />

      <section className="card p-5" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
        <h2 className="font-semibold mb-3">All shops ({shops.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase border-b" style={{ color: "var(--c-muted)", borderColor: "rgba(255,255,255,.08)" }}>
                <th className="py-2 pr-3">Shop</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Theme</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Products</th>
                <th className="py-2 pr-3">Orders</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id} className="border-b last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                  <td className="py-2 pr-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs" style={{ color: "var(--c-muted)" }}>/{s.slug}</p>
                  </td>
                  <td className="py-2 pr-3 text-xs">{s.users[0]?.email ?? "—"}</td>
                  <td className="py-2 pr-3">{s.theme.name}</td>
                  <td className="py-2 pr-3">{s.plan?.name ?? "—"}</td>
                  <td className="py-2 pr-3">{s._count.products}</td>
                  <td className="py-2 pr-3">{s._count.orders}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.status === "ACTIVE" ? "rgba(74,222,128,.12)" : "rgba(248,113,113,.12)", color: s.status === "ACTIVE" ? "#4ade80" : "#f87171" }}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link href={`/super/shops/${s.id}`} className="text-xs underline mr-2">Manage</Link>
                    <form action={toggleShop} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs underline">{s.status === "BLOCKED" ? "Unblock" : "Block"}</button>
                    </form>
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
