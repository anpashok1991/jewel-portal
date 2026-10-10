"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type LeadState = { ok?: boolean; error?: string; id?: string };

export async function bookAppointment(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const shopId = String(formData.get("shopId") ?? "");
  const branchId = String(formData.get("branchId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const slot = String(formData.get("slot") ?? "");
  const service = String(formData.get("service") ?? "Consultation");
  const message = String(formData.get("message") ?? "");

  if (!shopId || !branchId || !name || !phone || !date || !slot) {
    return { error: "Please fill name, phone, branch, date and slot." };
  }
  if (phone.replace(/\D/g, "").length < 10) return { error: "Enter a valid 10-digit phone number." };

  const s = await getSession();
  const existing = await db.appointment.findFirst({
    where: { shopId, date, slot, status: { in: ["PENDING", "CONFIRMED"] } },
  });
  if (existing) return { error: "That slot is already booked. Please pick another time." };

  const appt = await db.appointment.create({
    data: { shopId, branchId, userId: s?.uid, name, phone, email, date, slot, service, message },
  });
  if (s) {
    await db.notification.create({
      data: { shopId, userId: s.uid, title: `Appointment requested — ${date} ${slot}`, body: `${service} with ${name}`, link: "/admin/appointments" },
    });
  }
  revalidatePath("/appointment");
  return { ok: true, id: appt.id };
}

export async function requestExchange(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const shopId = String(formData.get("shopId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const metal = String(formData.get("metal") ?? "GOLD");
  const purity = String(formData.get("purity") ?? "22K");
  const grossWeightG = Number(formData.get("grossWeightG") ?? 0);
  const note = String(formData.get("note") ?? "");

  if (!shopId || !name || !phone || grossWeightG <= 0) return { error: "Name, phone and gross weight are required." };

  const s = await getSession();
  await db.exchangeRequest.create({
    data: { shopId, userId: s?.uid, name, phone, metal, purity, grossWeightG, note },
  });
  revalidatePath("/exchange");
  return { ok: true };
}

export async function submitQuery(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const shopId = String(formData.get("shopId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const source = String(formData.get("source") ?? "CONTACT");

  if (!shopId || !name || !message) return { error: "Name and message are required." };

  const s = await getSession();
  await db.query.create({ data: { shopId, userId: s?.uid, name, phone, email, subject, message, source } });
  revalidatePath("/contact");
  return { ok: true };
}
