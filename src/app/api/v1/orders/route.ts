import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonErr, apiOrder } from "@/lib/api";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const orders = await db.order.findMany({
    where: {
      userId: s.uid,
      ...(slug ? { shop: { slug } } : {}),
    },
    include: {
      items: true,
      shop: { select: { slug: true, name: true } },
    },
    orderBy: { placedAt: "desc" },
    take: 50,
  });

  return jsonOk({ orders: orders.map((o) => apiOrder(o)) });
}
