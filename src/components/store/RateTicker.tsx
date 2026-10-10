import { db } from "@/lib/db";

export default async function RateTicker({ shopId }: { shopId: string }) {
  const rates = await db.metalRate.findMany({ where: { shopId }, orderBy: { effectiveAt: "desc" }, take: 60 });
  const seen = new Set<string>();
  const rows: { label: string; price: string }[] = [];
  for (const r of rates) {
    const key = `${r.metal}-${r.purity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      label: `${r.metal === "GOLD" ? "Gold" : r.metal === "SILVER" ? "Silver" : "Platinum"} ${r.purity}`,
      price: `₹${(r.pricePerGramPaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}/g`,
    });
    if (rows.length >= 5) break;
  }
  if (!rows.length) return null;

  const items = [...rows, ...rows];
  return (
    <div className="text-[11px] sm:text-xs py-1.5 overflow-hidden" style={{ background: "color-mix(in srgb, var(--c-gold) 30%, var(--c-surface))", color: "#241b08" }}>
      <div className="flex gap-8 whitespace-nowrap animate-marquee w-max">
        {items.map((r, i) => (
          <span key={i} className="font-semibold">
            ★ {r.label}: {r.price}
          </span>
        ))}
        <span className="opacity-70">Rates updated today · Live pricing applies at checkout</span>
      </div>
    </div>
  );
}
