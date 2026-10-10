"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireCustomer() {
  const s = await getSession();
  if (!s || s.role === "SUPER_ADMIN") return null;
  return s;
}

async function getCart(shopId: string, userId: string) {
  let cart = await db.cart.findUnique({ where: { userId_shopId: { userId, shopId } } });
  if (!cart) cart = await db.cart.create({ data: { userId, shopId } });
  return cart;
}

export type CartState = { error?: string; ok?: boolean };

export async function addToCart(_prev: CartState, formData: FormData): Promise<CartState> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");

  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const qty = Math.max(1, Number(formData.get("qty") ?? 1) || 1);
  const branchId = String(formData.get("branchId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE") return { error: "Product unavailable." };

  const cart = await getCart(product.shopId, s.uid);
  const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, productId, variantId } });
  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { qty: { increment: qty }, ...(branchId ? { branchId } : {}) } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, productId, variantId, qty, branchId } });
  }
  revalidatePath(`/${slug}/cart`);
  return { ok: true };
}

export async function updateCartQty(formData: FormData): Promise<void> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");
  const itemId = String(formData.get("itemId") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  const slug = String(formData.get("slug") ?? "");
  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== s.uid) return;
  if (qty <= 0) await db.cartItem.delete({ where: { id: itemId } });
  else await db.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(10, Math.max(1, qty)) } });
  if (slug) {
    revalidatePath(`/${slug}/cart`);
    revalidatePath(`/${slug}/checkout`);
  }
}

export async function removeCartItem(formData: FormData): Promise<void> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");
  const itemId = String(formData.get("itemId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item || item.cart.userId !== s.uid) return;
  await db.cartItem.delete({ where: { id: itemId } });
  if (slug) {
    revalidatePath(`/${slug}/cart`);
    revalidatePath(`/${slug}/checkout`);
  }
}

export async function applyCartOptions(_prev: CartState, formData: FormData): Promise<CartState> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");
  const shopId = String(formData.get("shopId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const cart = await db.cart.findUnique({ where: { userId_shopId: { userId: s.uid, shopId } } });
  if (!cart) return { error: "Cart is empty." };
  await db.cart.update({
    where: { id: cart.id },
    data: {
      couponCode: String(formData.get("couponCode") ?? "").trim().toUpperCase(),
      giftCardCode: String(formData.get("giftCardCode") ?? "").trim().toUpperCase(),
      useLoyalty: formData.get("useLoyalty") === "on",
      branchId: String(formData.get("branchId") ?? cart.branchId),
    },
  });
  if (slug) {
    revalidatePath(`/${slug}/cart`);
    revalidatePath(`/${slug}/checkout`);
  }
  return { ok: true };
}
