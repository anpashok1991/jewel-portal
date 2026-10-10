"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function toggleWishlist(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const s = await getSession();
  if (!s) redirect(`/account/login?next=/${slug}/p/${productId}`);

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const existing = await db.wishlist.findFirst({ where: { userId: s.uid, productId } });
  if (existing) {
    await db.wishlist.delete({ where: { id: existing.id } });
  } else {
    await db.wishlist.create({ data: { shopId: product.shopId, userId: s.uid, productId } });
  }
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/p/${product.slug}`);
  revalidatePath(`/${slug}/wishlist`);
}
