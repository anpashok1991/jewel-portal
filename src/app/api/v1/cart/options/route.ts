import { getTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartSummary } from "@/lib/cart";
import { jsonOk, jsonErr, readJsonBody, bodyStr, bodyBool } from "@/lib/api";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const slug = bodyStr(body, "slug", 200);
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const cart = await db.cart.findUnique({ where: { userId_shopId: { userId: s.uid, shopId: tenant.id } } });
  if (!cart) return jsonErr(400, "Cart is empty.");

  await db.cart.update({
    where: { id: cart.id },
    data: {
      couponCode: bodyStr(body, "couponCode", 60).toUpperCase(),
      giftCardCode: bodyStr(body, "giftCardCode", 60).toUpperCase(),
      useLoyalty: bodyBool(body, "useLoyalty"),
      branchId: bodyStr(body, "branchId", 100) || cart.branchId,
    },
  });

  return jsonOk({ cart: await cartSummary(tenant, s.uid) });
}
