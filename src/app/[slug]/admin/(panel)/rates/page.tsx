import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateCardRows } from "@/lib/reports";
import { RateForm } from "@/components/admin/ManageForms";

export const metadata = { title: "Rates · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminRatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || !(await can(session, "settings", "view"))) redirect(`/${slug}/admin`);

  const [current, history] = await Promise.all([
    rateCardRows(tenant.id),
    db.metalRate.findMany({ where: { shopId: tenant.id }, orderBy: { effectiveAt: "desc" }, take: 40 }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Metal rates</h1>
        <p className="text-sm text-muted">Per-gram rates used for live pricing across the store.</p>
      </div>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Set today&apos;s rate</h2>
        <RateForm />
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Current rate card</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Metal</th>
                <th className="py-2 pr-3">Purity</th>
                <th className="py-2 pr-3">₹ / gram</th>
                <th className="py-2">Effective</th>
              </tr>
            </thead>
            <tbody>
              {current.map((r) => (
                <tr key={`${r.metal}-${r.purity}`} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{r.metal}</td>
                  <td className="py-2 pr-3">{r.purity}</td>
                  <td className="py-2 pr-3 font-semibold">₹{r.rate.toLocaleString("en-IN")}</td>
                  <td className="py-2 text-muted text-xs">{new Date(r.at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {current.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted">No rates set yet. The store falls back to seed defaults.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Rate history</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Metal</th>
                <th className="py-2 pr-3">Purity</th>
                <th className="py-2 pr-3">₹ / gram</th>
                <th className="py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 text-muted whitespace-nowrap">{new Date(r.effectiveAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 pr-3">{r.metal}</td>
                  <td className="py-2 pr-3">{r.purity}</td>
                  <td className="py-2 pr-3 font-semibold">₹{(r.pricePerGramPaise / 100).toLocaleString("en-IN")}</td>
                  <td className="py-2 text-xs text-muted">{r.createdById ? "admin" : "system"}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-muted">No history yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
