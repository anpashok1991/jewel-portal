import "server-only";
import { db } from "./db";
import type { InvoiceData } from "./pdf";

export async function buildInvoiceData(orderId: string): Promise<InvoiceData | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, shop: true, user: true, branch: true, invoice: true },
  });
  if (!order) return null;

  let address: { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string } = {};
  try {
    address = JSON.parse(order.addressJson);
  } catch {
    address = {};
  }

  const buyer = {
    name: address.name || order.user.name,
    phone: address.phone || order.user.phone,
    address: [address.line1, address.line2, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", "),
  };

  return {
    number: order.invoiceNumber || order.invoice?.number || order.number,
    date: new Date(order.placedAt).toLocaleDateString("en-IN", { dateStyle: "medium" }),
    orderNumber: order.number,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    shop: {
      name: order.shop.name,
      address: [order.shop.address, order.shop.state].filter(Boolean).join(", "),
      gstin: order.shop.gstin || order.branch.gstin,
      state: order.shop.state,
      phone: order.shop.phone,
      email: order.shop.contactEmail,
    },
    buyer,
    placeOfSupply: address.state || order.shop.state || "India",
    items: order.items.map((it) => ({
      name: it.name,
      hsn: it.hsnCode || "7113",
      qty: it.qty,
      netWeightG: (it.netWeightMg / 1000) * it.qty,
      ratePerGram: it.rateApplied,
      metalPaise: it.metalPaise,
      makingPaise: it.makingPaise,
      stonePaise: it.stonePaise,
      discountPaise: it.discountPaise,
      gstPercentBp: it.gstPercentBp,
      gstExempt: it.gstExempt,
      gstPaise: it.gstPaise,
      totalPaise: it.lineTotalPaise,
    })),
    totals: {
      subTotalPaise: order.subTotalPaise,
      discountPaise: order.discountPaise,
      couponPaise: order.couponPaise,
      loyaltyPaise: order.loyaltyPaise,
      platformFeePaise: order.platformFeePaise,
      gstPaise: order.gstPaise,
      shippingPaise: order.shippingPaise,
      codFeePaise: order.codFeePaise,
      roundOffPaise: order.roundOffPaise,
      totalPaise: order.totalPaise,
    },
    exemptNote: order.items.some((i) => i.gstExempt)
      ? "Includes Nil-rated/exempt line items as per GST rules for precious metals."
      : undefined,
  };
}
