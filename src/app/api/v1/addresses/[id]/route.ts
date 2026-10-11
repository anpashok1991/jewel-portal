import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonErr } from "@/lib/api";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const address = await db.address.findFirst({ where: { id, userId: s.uid } });
  if (!address) return jsonErr(404, "Address not found.");

  await db.address.delete({ where: { id } });
  return jsonOk({ ok: true });
}
