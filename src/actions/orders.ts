"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { applyStatus, restockOrder, customerCanCancel } from "@/lib/orders";
import { refundPayment } from "@/lib/razorpay";

export type OrderActionResult = { ok?: boolean; error?: string };

async function ownOrder(orderId: string) {
  const s = await getSession();
  if (!s) return { error: "Please login." } as const;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== s.uid) return { error: "Order not found." } as const;
  return { order, s };
}

export async function cancelOwnOrder(_prev: OrderActionResult, formData: FormData): Promise<OrderActionResult> {
  const orderId = String(formData.get("orderId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 300);

  const res = await ownOrder(orderId);
  if ("error" in res) return res;
  const { order } = res;

  if (!customerCanCancel(order.status)) {
    return { error: "This order can no longer be cancelled online. Please contact the store." };
  }

  await applyStatus(order.id, "CANCELLED", { note: reason || "Cancelled by customer", actor: "customer" });
  await restockOrder(order.id);

  if (order.paymentStatus === "PAID" && order.razorpayPaymentId) {
    await db.order.update({ where: { id: order.id }, data: { refundStatus: "STARTED", refundPaise: order.totalPaise } });
    const shop = await db.shop.findUnique({ where: { id: order.shopId } });
    if (shop?.razorpayKeyId && shop.razorpaySecret) {
      try {
        await refundPayment({ keyId: shop.razorpayKeyId, secret: shop.razorpaySecret, paymentId: order.razorpayPaymentId });
        await db.order.update({ where: { id: order.id }, data: { refundStatus: "SUCCESS", paymentStatus: "REFUNDED" } });
      } catch {
        await db.order.update({ where: { id: order.id }, data: { refundStatus: "FAILED" } });
      }
    }
  }

  revalidatePath(`/${slug}/order/${order.id}`);
  revalidatePath("/account/orders");
  return { ok: true };
}

export async function requestReturn(_prev: OrderActionResult, formData: FormData): Promise<OrderActionResult> {
  const orderId = String(formData.get("orderId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 300);

  const res = await ownOrder(orderId);
  if ("error" in res) return res;
  const { order } = res;

  if (order.status !== "DELIVERED") return { error: "Returns can be requested only after delivery." };

  await applyStatus(order.id, "RETURN_REQUESTED", { note: reason || "Return requested by customer", actor: "customer" });
  revalidatePath(`/${slug}/order/${order.id}`);
  revalidatePath("/account/orders");
  return { ok: true };
}
