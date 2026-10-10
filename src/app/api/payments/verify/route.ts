import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    internalOrderId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: String(body.internalOrderId ?? "") } });
  if (!order || order.userId !== s.uid) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.razorpayOrderId !== body.razorpay_order_id) {
    return NextResponse.json({ error: "Order id mismatch." }, { status: 400 });
  }

  const shop = await db.shop.findUnique({ where: { id: order.shopId } });
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const valid = verifyPaymentSignature({
    orderId: String(body.razorpay_order_id ?? ""),
    paymentId: String(body.razorpay_payment_id ?? ""),
    signature: String(body.razorpay_signature ?? ""),
    secret: shop.razorpaySecret,
  });
  if (!valid) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  await db.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", razorpayPaymentId: String(body.razorpay_payment_id ?? "") },
  });
  await db.orderEvent.create({
    data: { orderId: order.id, status: "PLACED", note: `Payment captured (${body.razorpay_payment_id})`, actor: "gateway" },
  });

  return NextResponse.json({ ok: true, url: `/${shop.slug}/order/${order.id}` });
}
