import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { rateCardRows } from "@/lib/reports";

export const metadata: Metadata = { title: "Today's Gold & Silver Rates" };

export default async function RatesPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const [rows, history] = await Promise.all([
    rateCardRows(tenant.id),
    db.metalRate.findMany({ where: { shopId: tenant.id, metal: "GOLD", purity: "916" }, orderBy: { effectiveAt: "desc" }, take: 14 }),
  ]);
  const hist = [...history].reverse();
  const max = Math.max(...hist.map((h) => h.pricePerGramPaise), 1);
  const min = Math.min(...hist.map((h) => h.pricePerGramPaise), max);
  const points = hist
    .map((h, i) => {
      const x = (i / Math.max(hist.length - 1, 1)) * 100;
      const y = 100 - ((h.pricePerGramPaise - min) / Math.max(max - min, 1)) * 90 - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <span className="badge">Updated today</span>
      <h1 className="section-title mt-2">Today&apos;s Rates — {tenant.name}</h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Rates are set by the shop each day and drive live pricing across every product page. Making charges are added on top of metal value.
      </p>

      <div className="mt-6 card overflow-hidden table-responsive">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "color-mix(in srgb, var(--c-gold) 22%, transparent)" }}>
              <th className="text-left px-4 py-3">Metal</th>
              <th className="text-left px-4 py-3">Purity</th>
              <th className="text-right px-4 py-3">Rate / gram</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Effective</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.metal}-${r.purity}`} className="border-t" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 20%, transparent)" }}>
                <td className="px-4 py-3 font-semibold">{r.metal === "GOLD" ? "Gold" : r.metal === "SILVER" ? "Silver" : "Platinum"}</td>
                <td className="px-4 py-3">{r.purity}‰ {r.metal === "GOLD" && r.purity === "916" ? "(22K)" : r.metal === "GOLD" && r.purity === "750" ? "(18K)" : r.metal === "GOLD" && r.purity === "999" ? "(24K)" : ""}</td>
                <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--c-primary)" }}>
                  ₹{r.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-muted hidden sm:table-cell">{new Date(r.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No rates published yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {hist.length > 2 ? (
        <div className="mt-8 card p-5">
          <h2 className="font-bold">22K Gold — recent trend</h2>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-40 mt-3" role="img" aria-label="Gold rate trend chart">
            <polyline points={points} fill="none" stroke="var(--c-gold)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <polyline points={`0,100 ${points} 100,100`} fill="color-mix(in srgb, var(--c-gold) 25%, transparent)" stroke="none" />
          </svg>
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{hist[0] ? new Date(hist[0].effectiveAt).toLocaleDateString("en-IN") : ""}</span>
            <span>Today</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
