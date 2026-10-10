"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type AddressState = { error?: string; ok?: boolean };

export async function addAddress(_prev: AddressState, formData: FormData): Promise<AddressState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in first." };

  const label = String(formData.get("label") ?? "").trim() || "Home";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();

  if (!name || !phone || !line1 || !city || !state || !/^\d{6}$/.test(pincode)) {
    return { error: "Name, phone, address line, city, state and a 6-digit pincode are required." };
  }

  const existing = await db.address.count({ where: { userId: session.uid } });
  await db.address.create({
    data: { userId: session.uid, label, name, phone, line1, line2, city, state, pincode, isDefault: existing === 0 },
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  const addr = await db.address.findFirst({ where: { id, userId: session.uid }, select: { id: true } });
  if (!addr) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: session.uid, isDefault: true }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const id = String(formData.get("id") ?? "");
  await db.address.deleteMany({ where: { id, userId: session.uid } });
  revalidatePath("/account/addresses");
}

export type ProfileState = { error?: string; ok?: boolean };

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await getSession();
  if (!session) return { error: "Please sign in first." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) return { error: "Name is required." };

  await db.user.update({ where: { id: session.uid }, data: { name, phone } });
  revalidatePath("/account");
  return { ok: true };
}
