import { getTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartSummary } from "@/lib/cart";
import { jsonOk, jsonErr, readJsonBody, bodyStr, bodyInt } from "@/lib/api";

async function requireCustomer() {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return null;
  return s;
}

export async function GET(req: Request) {
  const s = await requireCustomer();
  if (!s) return jsonErr(401, "Not signed in.");

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  return jsonOk({ cart: await cartSummary(tenant, s.uid) });
}

export async function POST(req: Request) {
  const s = await requireCustomer();
  if (!s) return jsonErr(401, "Not signed in.");

  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const slug = bodyStr(body, "slug", 200);
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const productId = bodyStr(body, "productId", 100);
  const variantId = bodyStr(body, "variantId", 100);
  const branchId = bodyStr(body, "branchId", 100);
  const qty = Math.max(1, Math.min(10, bodyInt(body, "qty") ?? 1));

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.shopId !== tenant.id || product.status !== "ACTIVE") {
    return jsonErr(404, "Product unavailable.");
  }

  let cart = await db.cart.findUnique({ where: { userId_shopId: { userId: s.uid, shopId: tenant.id } } });
  if (!cart) cart = await db.cart.create({ data: { userId: s.uid, shopId: tenant.id } });

  const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId } });
  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { qty: { increment: qty }, ...(branchId ? { branchId } : {}) },
    });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, productId, variantId, qty, branchId } });
  }

  return jsonOk({ cart: await cartSummary(tenant, s.uid) });
}

export async function PATCH(req: Request) {
  const s = await requireCustomer();
  if (!s) return jsonErr(401, "Not signed in.");

  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const slug = bodyStr(body, "slug", 200);
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const itemId = bodyStr(body, "itemId", 100);
  const qty = bodyInt(body, "qty");
  if (qty == null) return jsonErr(400, "qty is required.");

  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== s.uid || item.cart.shopId !== tenant.id) {
    return jsonErr(404, "Cart item not found.");
  }
  if (qty <= 0) await db.cartItem.delete({ where: { id: itemId } });
  else await db.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(10, Math.max(1, qty)) } });

  return jsonOk({ cart: await cartSummary(tenant, s.uid) });
}

export async function DELETE(req: Request) {
  const s = await requireCustomer();
  if (!s) return jsonErr(401, "Not signed in.");

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") ?? "";
  const itemId = url.searchParams.get("itemId") ?? "";
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== s.uid || item.cart.shopId !== tenant.id) {
    return jsonErr(404, "Cart item not found.");
  }
  await db.cartItem.delete({ where: { id: itemId } });

  return jsonOk({ cart: await cartSummary(tenant, s.uid) });
}
