import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  // Latest effective rate per metal/purity pair.
  const rows = await db.metalRate.findMany({
    where: { shopId: tenant.id },
    orderBy: { effectiveAt: "desc" },
    take: 200,
  });
  const seen = new Set<string>();
  const rates: { metal: string; purity: string; pricePerGramPaise: number; effectiveAt: string }[] = [];
  for (const r of rows) {
    const key = `${r.metal}:${r.purity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rates.push({
      metal: r.metal,
      purity: r.purity,
      pricePerGramPaise: r.pricePerGramPaise,
      effectiveAt: r.effectiveAt.toISOString(),
    });
  }
  return jsonOk({ rates });
}
