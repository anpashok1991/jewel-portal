"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, can, hashPassword } from "@/lib/auth";

async function requireEditor(module: string, action: "view" | "create" | "edit") {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) return null;
  if (!(await can(s, module, action))) return null;
  return s;
}

async function shopSlugOf(shopId: string): Promise<string> {
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  return shop?.slug ?? "shop";
}

async function revalidateSection(shopId: string, section: "rates" | "schemes" | "leads" | "marketing"): Promise<void> {
  const slug = await shopSlugOf(shopId);
  revalidatePath(`/${slug}/admin`);
  revalidatePath(`/${slug}/admin/${section}`);
}

export type ManageState = { ok?: boolean; error?: string };

/* ---------------- rates ---------------- */

export async function setMetalRate(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("settings", "edit");
  if (!s) return { error: "You cannot change rates." };

  const metal = String(formData.get("metal") ?? "");
  const purity = String(formData.get("purity") ?? "");
  const priceRs = Number(String(formData.get("priceRs") ?? "").replace(/,/g, ""));
  if (!["GOLD", "SILVER", "PLATINUM"].includes(metal)) return { error: "Pick a metal." };
  if (!/^\d{2,3}$/.test(purity)) return { error: "Pick a purity." };
  if (!Number.isFinite(priceRs) || priceRs <= 0) return { error: "Enter a valid rate." };

  await db.metalRate.create({
    data: {
      shopId: s.shopId,
      metal,
      purity,
      pricePerGramPaise: Math.round(priceRs * 100),
      createdById: s.uid,
    },
  });
  await revalidateSection(s.shopId, "rates");
  return { ok: true };
}

/* ---------------- schemes ---------------- */

function numFd(fd: FormData, key: string): number {
  const n = Number(String(fd.get(key) ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function savePlan(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("schemes", formData.get("id") ? "edit" : "create");
  if (!s) return { error: "You cannot manage schemes." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "");
  const mode = String(formData.get("mode") ?? "ROI");
  const amountRs = numFd(formData, "amountRs");
  const tenure = Math.round(numFd(formData, "tenure"));
  if (!name || !["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"].includes(frequency)) return { error: "Name and frequency are required." };
  if (amountRs < 1 || tenure < 1) return { error: "Installment amount and tenure must be at least 1." };

  const data = {
    name,
    description: String(formData.get("description") ?? "").trim(),
    frequency,
    customDays: String(formData.get("customDays") ?? "").trim(),
    amountPaise: Math.round(amountRs * 100),
    tenureCount: tenure,
    mode,
    roiPercentBp: Math.round(numFd(formData, "roiPercent") * 100),
    goldBonusBp: Math.round(numFd(formData, "goldBonusPercent") * 100),
    minJoinPaise: Math.round(numFd(formData, "minJoinRs") * 100),
    active: formData.get("active") === "on",
  };

  if (id) {
    const plan = await db.savingsPlan.findFirst({ where: { id, shopId: s.shopId } });
    if (!plan) return { error: "Plan not found." };
    await db.savingsPlan.update({ where: { id }, data });
  } else {
    await db.savingsPlan.create({ data: { ...data, shopId: s.shopId } });
  }
  await revalidateSection(s.shopId, "schemes");
  return { ok: true };
}

export async function togglePlan(formData: FormData): Promise<void> {
  const s = await requireEditor("schemes", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const plan = await db.savingsPlan.findFirst({ where: { id, shopId: s.shopId } });
  if (!plan) return;
  await db.savingsPlan.update({ where: { id }, data: { active: !plan.active } });
  await revalidateSection(s.shopId, "schemes");
}

/* ---------------- leads ---------------- */

const APPT_STATUS = ["CONFIRMED", "CANCELLED", "COMPLETED", "PENDING"] as const;
const EXCHANGE_STATUS = ["QUOTED", "ACCEPTED", "REJECTED", "NEW"] as const;
const QUERY_STATUS = ["IN_PROGRESS", "RESOLVED", "NEW"] as const;

export async function appointmentStatus(formData: FormData): Promise<void> {
  const s = await requireEditor("appointments", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!APPT_STATUS.includes(status as never)) return;
  const appt = await db.appointment.findFirst({ where: { id, shopId: s.shopId } });
  if (!appt) return;
  await db.appointment.update({ where: { id }, data: { status } });
  await revalidateSection(s.shopId, "leads");
}

export async function exchangeStatus(formData: FormData): Promise<void> {
  const s = await requireEditor("queries", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!EXCHANGE_STATUS.includes(status as never)) return;
  const ex = await db.exchangeRequest.findFirst({ where: { id, shopId: s.shopId } });
  if (!ex) return;
  const valueRs = Number(String(formData.get("estValueRs") ?? "").replace(/,/g, ""));
  await db.exchangeRequest.update({
    where: { id },
    data: { status, ...(Number.isFinite(valueRs) && valueRs >= 0 ? { estValuePaise: Math.round(valueRs * 100) } : {}) },
  });
  await revalidateSection(s.shopId, "leads");
}

export async function queryStatus(formData: FormData): Promise<void> {
  const s = await requireEditor("queries", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!QUERY_STATUS.includes(status as never)) return;
  const q = await db.query.findFirst({ where: { id, shopId: s.shopId } });
  if (!q) return;
  await db.query.update({ where: { id }, data: { status } });
  await revalidateSection(s.shopId, "leads");
}

/* ---------------- marketing ---------------- */

export async function saveCoupon(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("coupons", formData.get("id") ? "edit" : "create");
  if (!s) return { error: "You cannot manage coupons." };

  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const type = String(formData.get("type") ?? "");
  const value = numFd(formData, "value");
  const endsAt = String(formData.get("endsAt") ?? "");
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { error: "Code must be 3–24 letters/numbers." };
  if (!["PERCENT", "FLAT"].includes(type)) return { error: "Pick a discount type." };
  if (value <= 0) return { error: "Value must be positive." };
  if (type === "PERCENT" && value > 100) return { error: "Percent cannot exceed 100." };
  if (!endsAt) return { error: "End date is required." };

  const dup = await db.coupon.findFirst({ where: { shopId: s.shopId, code, ...(id ? { NOT: { id } } : {}) } });
  if (dup) return { error: "That code already exists." };

  const data = {
    code,
    description: String(formData.get("description") ?? "").trim(),
    type,
    value: type === "PERCENT" ? Math.round(value * 100) : Math.round(value * 100),
    minOrderPaise: Math.round(numFd(formData, "minOrderRs") * 100),
    maxDiscountPaise: Math.round(numFd(formData, "maxDiscountRs") * 100),
    endsAt: new Date(`${endsAt}T23:59:59`),
    usageLimit: Math.max(0, Math.round(numFd(formData, "usageLimit"))),
    perUserLimit: Math.max(1, Math.round(numFd(formData, "perUserLimit")) || 1),
    active: formData.get("active") === "on",
  };

  if (id) {
    const coupon = await db.coupon.findFirst({ where: { id, shopId: s.shopId } });
    if (!coupon) return { error: "Coupon not found." };
    await db.coupon.update({ where: { id }, data });
  } else {
    await db.coupon.create({ data: { ...data, shopId: s.shopId } });
  }
  await revalidateSection(s.shopId, "marketing");
  return { ok: true };
}

export async function toggleCoupon(formData: FormData): Promise<void> {
  const s = await requireEditor("coupons", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const coupon = await db.coupon.findFirst({ where: { id, shopId: s.shopId } });
  if (!coupon) return;
  await db.coupon.update({ where: { id }, data: { active: !coupon.active } });
  await revalidateSection(s.shopId, "marketing");
}

export async function createGiftCard(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("coupons", "create");
  if (!s) return { error: "You cannot create gift cards." };

  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const amountRs = numFd(formData, "amountRs");
  const expiresAt = String(formData.get("expiresAt") ?? "");
  if (code.length < 4) return { error: "Code must be at least 4 characters." };
  if (amountRs < 100) return { error: "Minimum value ₹100." };
  const existing = await db.giftCard.findUnique({ where: { code } });
  if (existing) return { error: "That gift card code already exists." };

  await db.giftCard.create({
    data: {
      shopId: s.shopId,
      code,
      initialPaise: Math.round(amountRs * 100),
      balancePaise: Math.round(amountRs * 100),
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : null,
    },
  });
  await revalidateSection(s.shopId, "marketing");
  return { ok: true };
}

export async function toggleGiftCard(formData: FormData): Promise<void> {
  const s = await requireEditor("coupons", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const card = await db.giftCard.findFirst({ where: { id, shopId: s.shopId } });
  if (!card) return;
  await db.giftCard.update({ where: { id }, data: { active: !card.active } });
  await revalidateSection(s.shopId, "marketing");
}

export async function grantLoyalty(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("coupons", "edit");
  if (!s) return { error: "You cannot adjust loyalty points." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const points = Math.round(numFd(formData, "points"));
  const reason = String(formData.get("reason") ?? "").trim() || "Manual adjustment";
  if (!email) return { error: "Customer email is required." };
  if (!points) return { error: "Enter a non-zero point amount (negative to deduct)." };

  const user = await db.user.findFirst({ where: { email, shopId: s.shopId, role: "CUSTOMER" } });
  if (!user) return { error: "No customer with that email at this shop." };

  await db.loyaltyLedger.create({ data: { shopId: s.shopId, userId: user.id, points, reason } });
  await revalidateSection(s.shopId, "marketing");
  return { ok: true };
}

/* ---------------- staff password reset ---------------- */

export async function resetStaffPassword(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await getSession();
  if (!s || s.role !== "OWNER") return { error: "Only the owner can reset staff passwords." };
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "New password must be 6+ characters." };
  const user = await db.user.findFirst({ where: { id, shopId: s.shopId, role: "STAFF" } });
  if (!user) return { error: "Staff member not found." };
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password), active: true } });
  const slug = await shopSlugOf(s.shopId);
  revalidatePath(`/${slug}/admin/settings`);
  return { ok: true };
}

/* ---------------- hero banners ---------------- */

export async function saveBanner(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const s = await requireEditor("coupons", "create");
  if (!s) return { error: "Not authorized." };

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const placement = String(formData.get("placement") ?? "HERO");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!title) return { error: "Slide title is required." };
  if (!["HERO", "STRIP", "SECTION"].includes(placement)) return { error: "Invalid placement." };

  const data = { title, subtitle, image, videoUrl, href, placement, sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 };
  if (id) {
    const existing = await db.banner.findFirst({ where: { id, shopId: s.shopId } });
    if (!existing) return { error: "Banner not found." };
    await db.banner.update({ where: { id }, data });
  } else {
    await db.banner.create({ data: { ...data, shopId: s.shopId } });
  }
  await revalidateSection(s.shopId, "marketing");
  return { ok: true };
}

export async function toggleBanner(formData: FormData): Promise<void> {
  const s = await requireEditor("coupons", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const b = await db.banner.findFirst({ where: { id, shopId: s.shopId } });
  if (!b) return;
  await db.banner.update({ where: { id }, data: { active: !b.active } });
  await revalidateSection(s.shopId, "marketing");
}

export async function deleteBanner(formData: FormData): Promise<void> {
  const s = await requireEditor("coupons", "create");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const b = await db.banner.findFirst({ where: { id, shopId: s.shopId } });
  if (!b) return;
  await db.banner.delete({ where: { id } });
  await revalidateSection(s.shopId, "marketing");
}
