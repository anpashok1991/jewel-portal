/** Razorpay REST helpers using per-shop credentials (no SDK dependency). */
import crypto from "crypto";

const API = "https://api.razorpay.com/v1";

function auth(keyId: string, secret: string): string {
  return "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
};

export async function createRazorpayOrder(opts: {
  keyId: string;
  secret: string;
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: auth(opts.keyId, opts.secret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: "INR",
      receipt: opts.receipt,
      notes: opts.notes ?? {},
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAZORPAY_ORDER_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/** razorpay_order_id|razorpay_payment_id|razorpay_signature → HMAC SHA256 verify */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", opts.secret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opts.signature));
  } catch {
    return false;
  }
}

/** Webhook signature: HMAC SHA256 of raw body with webhook secret (falls back to key secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature ?? ""));
  } catch {
    return false;
  }
}

export async function refundPayment(opts: {
  keyId: string;
  secret: string;
  paymentId: string;
  amountPaise?: number;
}): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API}/payments/${opts.paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: auth(opts.keyId, opts.secret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts.amountPaise ? { amount: opts.amountPaise } : {}),
  });
  if (!res.ok) throw new Error(`RAZORPAY_REFUND_FAILED:${res.status}`);
  return (await res.json()) as { id: string; status: string };
}
