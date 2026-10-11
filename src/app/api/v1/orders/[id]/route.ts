import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonErr, apiOrder } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      shop: { select: { slug: true, name: true } },
    },
  });
  if (!order) return jsonErr(404, "Order not found.");
  if (order.userId !== s.uid) return jsonErr(403, "Forbidden.");

  return jsonOk({ order: apiOrder(order) });
}
