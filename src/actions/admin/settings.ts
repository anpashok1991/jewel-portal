"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, can } from "@/lib/auth";
import { FEATURE_LIST } from "@/lib/constants";
import type { ManageState } from "./manage";

export type { ManageState };

async function requireSettingsEditor() {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) return null;
  if (!(await can(s, "settings", "edit"))) return null;
  return s;
}

async function slugOf(shopId: string): Promise<string> {
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  return shop?.slug ?? "shop";
}

async function revalidateSettings(shopId: string): Promise<void> {
  const slug = await slugOf(shopId);
  revalidatePath(`/${slug}/admin/settings`);
  revalidatePath(`/${slug}`);
}

function rs(fd: FormData, key: string): number {
  const n = Number(String(fd.get(key) ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function saveShopProfile(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot edit shop settings." };
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Shop name is required." };
  await db.shop.update({
    where: { id: s.shopId },
    data: {
      name,
      tagline: String(fd.get("tagline") ?? "").trim(),
      contactEmail: String(fd.get("contactEmail") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      state: String(fd.get("state") ?? "").trim(),
      gstin: String(fd.get("gstin") ?? "").trim().toUpperCase(),
      pan: String(fd.get("pan") ?? "").trim().toUpperCase(),
      announcement: String(fd.get("announcement") ?? "").trim(),
    },
  });
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function savePayments(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot edit payment settings." };
  const codMax = rs(fd, "codMaxRs");
  const codFee = rs(fd, "codFeeRs");
  await db.shop.update({
    where: { id: s.shopId },
    data: {
      upiVpa: String(fd.get("upiVpa") ?? "").trim(),
      upiName: String(fd.get("upiName") ?? "").trim(),
      razorpayKeyId: String(fd.get("razorpayKeyId") ?? "").trim(),
      razorpaySecret: String(fd.get("razorpaySecret") ?? "").trim(),
      enableRazorpay: fd.get("enableRazorpay") === "on",
      enableCod: fd.get("enableCod") === "on",
      enableUpiQr: fd.get("enableUpiQr") === "on",
      codFeePaise: Math.max(0, Math.round(codFee * 100)),
      codMaxPaise: Math.max(0, Math.round(codMax * 100)),
    },
  });
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function saveCommercials(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot edit commercial settings." };
  await db.shop.update({
    where: { id: s.shopId },
    data: {
      gstPercentBp: Math.max(0, Math.round(rs(fd, "gstPercent") * 100)),
      platformFeePaise: Math.max(0, Math.round(rs(fd, "platformFeeRs") * 100)),
      platformFeePercentBp: Math.max(0, Math.round(rs(fd, "platformFeePercent") * 100)),
      freeShippingAbovePaise: Math.max(0, Math.round(rs(fd, "freeShippingRs") * 100)),
      shippingFlatPaise: Math.max(0, Math.round(rs(fd, "shippingFlatRs") * 100)),
      loyaltyEarnBp: Math.max(0, Math.round(rs(fd, "loyaltyEarnPercent") * 100)),
      loyaltyRedeemMaxBp: Math.max(0, Math.round(rs(fd, "loyaltyRedeemMaxPercent") * 100)),
    },
  });
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function saveWhatsApp(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot edit WhatsApp settings." };
  const number = String(fd.get("whatsappNumber") ?? "").replace(/[^0-9]/g, "");
  if (number && number.length < 10) return { error: "Enter a valid WhatsApp number with country code." };
  await db.shop.update({
    where: { id: s.shopId },
    data: {
      whatsappNumber: number,
      whatsappGreeting: String(fd.get("whatsappGreeting") ?? "").trim() || "Hi! I need help.",
      whatsappEnabled: fd.get("whatsappEnabled") === "on",
    },
  });
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function setFeatures(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot edit features." };
  for (const f of FEATURE_LIST) {
    const enabled = fd.get(`feat_${f.key}`) === "on";
    await db.featureFlag.upsert({
      where: { shopId_key: { shopId: s.shopId, key: f.key } },
      create: { shopId: s.shopId, key: f.key, enabled },
      update: { enabled },
    });
  }
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function setTheme(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot change the theme." };
  const themeId = String(fd.get("themeId") ?? "");
  const theme = await db.theme.findUnique({ where: { id: themeId } });
  if (!theme) return { error: "Theme not found." };
  await db.shop.update({ where: { id: s.shopId }, data: { themeId } });
  await revalidateSettings(s.shopId);
  const slug = await slugOf(s.shopId);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

export async function saveBranch(_prev: ManageState, fd: FormData): Promise<ManageState> {
  const s = await requireSettingsEditor();
  if (!s) return { error: "You cannot manage branches." };
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Branch name is required." };
  await db.branch.create({
    data: {
      shopId: s.shopId,
      name,
      address: String(fd.get("address") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      hours: String(fd.get("hours") ?? "").trim() || "10:00 AM - 9:00 PM",
      gstin: String(fd.get("gstin") ?? "").trim().toUpperCase(),
      mapUrl: String(fd.get("mapUrl") ?? "").trim(),
    },
  });
  await revalidateSettings(s.shopId);
  return { ok: true };
}

export async function toggleBranch(fd: FormData): Promise<void> {
  const s = await requireSettingsEditor();
  if (!s) return;
  const id = String(fd.get("id") ?? "");
  const branch = await db.branch.findFirst({ where: { id, shopId: s.shopId } });
  if (!branch) return;
  await db.branch.update({ where: { id }, data: { active: !branch.active } });
  await revalidateSettings(s.shopId);
}
