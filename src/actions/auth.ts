"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";

export type AuthState = { error?: string };

export async function loginCustomer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Invalid email or password." };
  if (!user.active) return { error: "This account has been deactivated." };
  if (user.role !== "CUSTOMER" && user.role !== "OWNER" && user.role !== "STAFF") return { error: "Invalid account type." };

  await setSessionCookie({
    uid: user.id, role: user.role, shopId: user.shopId ?? "", name: user.name, email: user.email, pool: "shop",
  });
  redirect(next && next.startsWith("/") ? next : "/");
}

export async function registerCustomer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const shopId = String(formData.get("shopId") ?? "");
  const shopSlug = String(formData.get("shopSlug") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!name || !email || password.length < 6) return { error: "Name, email and a 6+ character password are required." };

  // Resolve the shop server-side — never trust the posted shopId.
  const shop = shopSlug
    ? await db.shop.findUnique({ where: { slug: shopSlug } })
    : shopId
      ? await db.shop.findUnique({ where: { id: shopId } })
      : null;
  if (!shop || shop.status === "BLOCKED") return { error: "This shop is not accepting new registrations." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Try logging in." };

  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: "CUSTOMER", shopId: shop.id },
  });
  await db.wallet.create({ data: { shopId: shop.id, userId: user.id } });

  await setSessionCookie({ uid: user.id, role: "CUSTOMER", shopId: shop.id, name, email, pool: "shop" });
  redirect(next && next.startsWith("/") ? next : `/${shop.slug}`);
}

export async function loginShopAdmin(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const shopSlug = String(formData.get("shopSlug") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Invalid email or password." };
  if (!user.active) return { error: "This account has been deactivated." };
  if (user.role !== "OWNER" && user.role !== "STAFF") return { error: "Owner/staff credentials only. Use the customer login." };
  if (user.shopId) {
    const shop = await db.shop.findUnique({ where: { id: user.shopId } });
    if (shop?.slug !== shopSlug) return { error: "This login does not belong to this shop." };
    if (shop.status === "BLOCKED") return { error: "This shop has been suspended by the platform." };
  }

  await setSessionCookie({
    uid: user.id, role: user.role, shopId: user.shopId ?? "", name: user.name, email: user.email, pool: "shop",
  });
  redirect(`/${shopSlug}/admin`);
}

export async function loginSuperAdmin(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const user = await db.platformUser.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Invalid email or password." };
  if (!user.active) return { error: "Account disabled." };

  await setSessionCookie({ uid: user.id, role: "SUPER_ADMIN", shopId: "", name: user.name, email: user.email, pool: "platform" });
  redirect("/super");
}

export async function logout(): Promise<void> {
  const s = await getSession();
  await clearSessionCookie();
  redirect(s?.pool === "platform" ? "/super/login" : "/");
}
