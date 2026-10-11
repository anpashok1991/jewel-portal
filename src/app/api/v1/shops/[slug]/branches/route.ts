import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const branches = await db.branch.findMany({
    where: { shopId: tenant.id, active: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return jsonOk({
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.address,
      phone: b.phone,
      isDefault: b.isDefault,
    })),
  });
}
