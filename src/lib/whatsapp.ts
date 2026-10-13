/** Free WhatsApp (wa.me click-to-chat) helpers — pure, unit-testable. No Meta API. */

import { formatINR, formatWeightMg } from "./money";
import { statusLabel } from "./order-state";
import { waMeUrl } from "./upi";

export { waMeUrl };

export type WaOrderItem = {
  name: string;
  purity?: string;
  qty: number;
  netWeightMg?: number;
  lineTotalPaise: number;
};

export type PurchaseDetailsInput = {
  shopName: string;
  orderNumber: string;
  placedAt: Date | string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items: WaOrderItem[];
  subTotalPaise?: number;
  discountPaise?: number;
  shippingPaise?: number;
  gstPaise?: number;
  totalPaise: number;
  trackUrl?: string;
  /** Opening line (greeting / recipient context) — omitted for a bare receipt. */
  intro?: string;
};

/**
 * Builds a WhatsApp-formatted purchase-details message (plain text with
 * *bold* markers — WhatsApp renders those as bold).
 */
export function purchaseDetailsMessage(i: PurchaseDetailsInput): string {
  const placed = new Date(i.placedAt);
  const lines: string[] = [];
  if (i.intro) lines.push(i.intro, "");

  lines.push(
    `*Purchase details — ${i.shopName}*`,
    `Order: ${i.orderNumber}`,
    `Placed: ${placed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    `Status: ${statusLabel(i.status)}`,
  );
  const payment = [i.paymentMethod, i.paymentStatus].filter(Boolean).join(" · ");
  if (payment) lines.push(`Payment: ${payment}`);

  lines.push("", "Items:");
  for (const it of i.items) {
    const meta = [it.purity, it.netWeightMg ? formatWeightMg(it.netWeightMg) : null]
      .filter(Boolean)
      .join(" · ");
    lines.push(`• ${it.name}${meta ? ` (${meta})` : ""} × ${it.qty} — ${formatINR(it.lineTotalPaise)}`);
  }

  lines.push("");
  if (i.subTotalPaise != null) lines.push(`Subtotal: ${formatINR(i.subTotalPaise)}`);
  if (i.discountPaise) lines.push(`Discount: −${formatINR(i.discountPaise)}`);
  if (i.shippingPaise) lines.push(`Shipping: ${formatINR(i.shippingPaise)}`);
  if (i.gstPaise != null) lines.push(`GST: ${formatINR(i.gstPaise)}`);
  lines.push(`*Total: ${formatINR(i.totalPaise)}*`);

  if (i.trackUrl) lines.push("", `Track order: ${i.trackUrl}`);
  return lines.join("\n");
}
