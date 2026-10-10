"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { FEATURE_LIST } from "@/lib/constants";

export type SuperState = { ok?: boolean; error?: string; slug?: string };

async function requireSuper() {
  const s = await getSession();
  if (!s || s.pool !== "platform" || s.role !== "SUPER_ADMIN") return null;
  return s;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "shop";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const found = await db.shop.findUnique({ where: { slug: candidate } });
    if (!found) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function rs(fd: FormData, key: string): number {
  const n = Number(String(fd.get(key) ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeDomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export async function createShop(_prev: SuperState, fd: FormData): Promise<SuperState> {
  const s = await requireSuper();
  if (!s) return { error: "Not authorized." };

  const name = String(fd.get("name") ?? "").trim();
  const requestedSlug = String(fd.get("slug") ?? "").trim();
  const customDomain = normalizeDomain(String(fd.get("customDomain") ?? ""));
  const ownerName = String(fd.get("ownerName") ?? "").trim();
  const ownerEmail = String(fd.get("ownerEmail") ?? "").trim().toLowerCase();
  const ownerPassword = String(fd.get("ownerPassword") ?? "");
  const themeId = String(fd.get("themeId") ?? "");
  const planId = String(fd.get("planId") ?? "") || null;

  if (!name) return { error: "Shop name is required." };
  if (!ownerName || !ownerEmail || ownerPassword.length < 6) {
    return { error: "Owner name, email and a 6+ character password are required." };
  }
  const theme = await db.theme.findUnique({ where: { id: themeId } });
  if (!theme) return { error: "Pick a storefront theme." };
  const emailTaken = await db.user.findUnique({ where: { email: ownerEmail } });
  if (emailTaken) return { error: "That owner email is already registered." };
  if (customDomain) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(customDomain)) {
      return { error: "Custom domain must look like maaanjani.in (no path or protocol)." };
    }
    const domainTaken = await db.shop.findUnique({ where: { customDomain } });
    if (domainTaken) return { error: "That custom domain is already mapped to another shop." };
  }
  if (planId) {
    const plan = await db.platformPlan.findUnique({ where: { id: planId } });
    if (!plan) return { error: "Plan not found." };
  }

  const slug = await uniqueSlug(requestedSlug || name);
  const shop = await db.shop.create({
    data: { name, slug, customDomain: customDomain || null, themeId, planId, contactEmail: ownerEmail, status: "ACTIVE" },
  });
  await db.user.create({
    data: { name: ownerName, email: ownerEmail, passwordHash: await hashPassword(ownerPassword), role: "OWNER", shopId: shop.id },
  });
  await db.featureFlag.createMany({ data: FEATURE_LIST.map((f) => ({ shopId: shop.id, key: f.key, enabled: true })) });
  await db.branch.create({ data: { shopId: shop.id, name: "Main showroom", isDefault: true } });

  revalidatePath("/super/shops");
  return { ok: true, slug };
}

export async function updateShop(_prev: SuperState, fd: FormData): Promise<SuperState> {
  const s = await requireSuper();
  if (!s) return { error: "Not authorized." };
  const id = String(fd.get("id") ?? "");
  const shop = await db.shop.findUnique({ where: { id } });
  if (!shop) return { error: "Shop not found." };

  const name = String(fd.get("name") ?? "").trim();
  const status = String(fd.get("status") ?? "");
  const themeId = String(fd.get("themeId") ?? "");
  const planId = String(fd.get("planId") ?? "") || null;
  const customDomain = normalizeDomain(String(fd.get("customDomain") ?? ""));
  if (!name) return { error: "Shop name is required." };
  if (!["ACTIVE", "BLOCKED", "DRAFT"].includes(status)) return { error: "Invalid status." };
  if (!(await db.theme.findUnique({ where: { id: themeId } }))) return { error: "Theme not found." };
  if (customDomain) {
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(customDomain)) {
      return { error: "Custom domain must look like maaanjani.in (no path or protocol)." };
    }
    const domainTaken = await db.shop.findFirst({ where: { customDomain, NOT: { id } } });
    if (domainTaken) return { error: "That custom domain is already mapped to another shop." };
  }

  await db.shop.update({ where: { id }, data: { name, status, themeId, planId, customDomain: customDomain || null } });
  revalidatePath("/super/shops");
  revalidatePath(`/super/shops/${id}`);
  return { ok: true };
}

export async function setShopFeatures(_prev: SuperState, fd: FormData): Promise<SuperState> {
  const s = await requireSuper();
  if (!s) return { error: "Not authorized." };
  const id = String(fd.get("id") ?? "");
  const shop = await db.shop.findUnique({ where: { id } });
  if (!shop) return { error: "Shop not found." };

  for (const f of FEATURE_LIST) {
    const enabled = fd.get(`feat_${f.key}`) === "on";
    await db.featureFlag.upsert({
      where: { shopId_key: { shopId: id, key: f.key } },
      create: { shopId: id, key: f.key, enabled },
      update: { enabled },
    });
  }
  revalidatePath(`/super/shops/${id}`);
  return { ok: true };
}

export async function savePlan(_prev: SuperState, fd: FormData): Promise<SuperState> {
  const s = await requireSuper();
  if (!s) return { error: "Not authorized." };
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Plan name is required." };

  let features: string[];
  try {
    const parsed = JSON.parse(String(fd.get("featuresJson") ?? "[]"));
    if (!Array.isArray(parsed) || parsed.some((x) => typeof x !== "string")) throw new Error("bad");
    features = parsed;
  } catch {
    return { error: "Features must be a JSON array of strings, e.g. [\"coupons\", \"reports\"]." };
  }

  const data = { name, pricePaise: Math.max(0, Math.round(rs(fd, "priceRs") * 100)), featuresJson: JSON.stringify(features) };
  if (id) {
    const plan = await db.platformPlan.findUnique({ where: { id } });
    if (!plan) return { error: "Plan not found." };
    await db.platformPlan.update({ where: { id }, data });
  } else {
    await db.platformPlan.create({ data });
  }
  revalidatePath("/super/plans");
  revalidatePath("/super/shops");
  return { ok: true };
}

export async function deletePlan(fd: FormData): Promise<void> {
  const s = await requireSuper();
  if (!s) return;
  const id = String(fd.get("id") ?? "");
  const plan = await db.platformPlan.findUnique({ where: { id } });
  if (!plan) return;
  await db.shop.updateMany({ where: { planId: id }, data: { planId: null } });
  await db.platformPlan.delete({ where: { id } });
  revalidatePath("/super/plans");
  revalidatePath("/super/shops");
}

export async function toggleShop(fd: FormData): Promise<void> {
  const s = await requireSuper();
  if (!s) return;
  const id = String(fd.get("id") ?? "");
  const shop = await db.shop.findUnique({ where: { id } });
  if (!shop) return;
  await db.shop.update({ where: { id }, data: { status: shop.status === "BLOCKED" ? "ACTIVE" : "BLOCKED" } });
  revalidatePath("/super/shops");
  revalidatePath(`/super/shops/${id}`);
}

/** Permanently delete a shop and ALL its data (products, orders, users, …). */
export async function deleteShop(fd: FormData): Promise<void> {
  const s = await requireSuper();
  if (!s) return;
  const id = String(fd.get("id") ?? "");
  const shop = await db.shop.findUnique({ where: { id }, select: { id: true } });
  if (!shop) return;
  await db.shop.delete({ where: { id } });
  revalidatePath("/super/shops");
}

export async function createPlatformUser(_prev: SuperState, fd: FormData): Promise<SuperState> {
  const s = await requireSuper();
  if (!s) return { error: "Not authorized." };
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !email || password.length < 6) return { error: "Name, email and a 6+ character password are required." };
  const existing = await db.platformUser.findUnique({ where: { email } });
  if (existing) return { error: "That email is already registered." };
  await db.platformUser.create({ data: { name, email, passwordHash: await hashPassword(password), role: "SUPER_ADMIN" } });
  revalidatePath("/super/users");
  return { ok: true };
}

export async function togglePlatformUser(fd: FormData): Promise<void> {
  const s = await requireSuper();
  if (!s) return;
  const id = String(fd.get("id") ?? "");
  if (id === s.uid) return;
  const user = await db.platformUser.findUnique({ where: { id } });
  if (!user) return;
  await db.platformUser.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/super/users");
}
