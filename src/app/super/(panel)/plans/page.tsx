import { db } from "@/lib/db";
import { deletePlan } from "@/actions/super";
import { PlanForm } from "@/components/super/SuperForms";

export const metadata = { title: "Platform · Plans" };
export const dynamic = "force-dynamic";

export default async function SuperPlansPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const [plans, editId] = await Promise.all([
    db.platformPlan.findMany({ orderBy: { pricePaise: "asc" } }),
    sp.edit ? db.platformPlan.findUnique({ where: { id: sp.edit } }) : Promise.resolve(null),
  ]);
  const shopCounts = await db.shop.groupBy({ by: ["planId"], _count: { _all: true } });
  const countMap = new Map(shopCounts.map((c) => [c.planId, c._count._all]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Platform plans</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>Subscription tiers shops can be assigned to.</p>
      </div>

      <PlanForm plan={editId ? { id: editId.id, name: editId.name, pricePaise: editId.pricePaise, featuresJson: editId.featuresJson } : undefined} />

      <section className="card p-5" style={{ background: "var(--c-surface)", borderColor: "rgba(255,255,255,.08)" }}>
        <h2 className="font-semibold mb-3">All plans ({plans.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase border-b" style={{ color: "var(--c-muted)", borderColor: "rgba(255,255,255,.08)" }}>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Price / month</th>
                <th className="py-2 pr-3">Shops</th>
                <th className="py-2 pr-3">Features</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                let feats: string[] = [];
                try {
                  const parsed = JSON.parse(p.featuresJson);
                  if (Array.isArray(parsed)) feats = parsed;
                } catch {
                  feats = [];
                }
                return (
                  <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "rgba(255,255,255,.06)" }}>
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3">₹{(p.pricePaise / 100).toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3">{countMap.get(p.id) ?? 0}</td>
                    <td className="py-2 pr-3 text-xs" style={{ color: "var(--c-muted)" }}>{feats.join(", ") || "—"}</td>
                    <td className="py-2">
                      <a href={`/super/plans?edit=${p.id}`} className="text-xs underline mr-2">Edit</a>
                      <form action={deletePlan} className="inline">
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-xs underline" style={{ color: "#f87171" }}>Delete</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center" style={{ color: "var(--c-muted)" }}>No plans yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
