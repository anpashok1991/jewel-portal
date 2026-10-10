"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession, can } from "@/lib/auth";
import { applyStatus, canTransition, restockOrder } from "@/lib/orders";
import { refundPayment } from "@/lib/razorpay";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/constants";

async function requireShopEditor() {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) return null;
  if (!(await can(s, "orders", "edit"))) return null;
  return s;
}

async function revalidateAdmin(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { shop: { select: { slug: true } } } });
  const base = order ? `/${order.shop.slug}/admin` : null;
  if (!base) return;
  revalidatePath(base);
  revalidatePath(`${base}/orders`);
  revalidatePath(`${base}/orders/${orderId}`);
}

export async function applyOrderStatus(formData: FormData): Promise<void> {
  const s = await requireShopEditor();
  if (!s) return;

  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim();
  if (!orderId || !ORDER_STATUSES.includes(to)) return;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.shopId !== s.shopId) return;
  if (!canTransition(order.status as OrderStatus, to)) return;

  await applyStatus(orderId, to, { note, actor: `${s.role}:${s.name}` });

  if (to === "CANCELLED" || to === "RETURNED") {
    await restockOrder(orderId);
  }

  if (to === "CANCELLED" && order.paymentStatus === "PAID") {
    await db.order.update({ where: { id: orderId }, data: { refundStatus: "STARTED" } });
    try {
      if (order.razorpayPaymentId) {
        const shop = await db.shop.findUnique({ where: { id: order.shopId } });
        if (!shop?.razorpayKeyId || !shop.razorpaySecret) throw new Error("RAZORPAY_NOT_CONFIGURED");
        await refundPayment({
          keyId: shop.razorpayKeyId,
          secret: shop.razorpaySecret,
          paymentId: order.razorpayPaymentId,
          amountPaise: order.totalPaise,
        });
      }
      await db.order.update({
        where: { id: orderId },
        data: { refundStatus: "SUCCESS", paymentStatus: "REFUNDED", refundPaise: order.totalPaise },
      });
      await applyStatus(orderId, "REFUNDED", { note: "Refund processed", actor: `${s.role}:${s.name}` });
    } catch {
      await db.order.update({ where: { id: orderId }, data: { refundStatus: "FAILED" } });
    }
  }

  await revalidateAdmin(orderId);
}

export async function markRefunded(formData: FormData): Promise<void> {
  const s = await requireShopEditor();
  if (!s) return;
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.shopId !== s.shopId) return;
  if (order.status !== "CANCELLED" && order.status !== "RETURNED") return;
  if (order.paymentStatus === "PAID") {
    await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: "REFUNDED", refundPaise: order.totalPaise, refundStatus: "SUCCESS" },
    });
  }
  await applyStatus(orderId, "REFUNDED", { note: "Refund marked manually (offline)", actor: `${s.role}:${s.name}` });
  await revalidateAdmin(orderId);
}
