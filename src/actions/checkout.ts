"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cartSummary } from "@/lib/cart";
import { requireTenant } from "@/lib/tenant";
import { reserveStock, nextOrderNumber } from "@/lib/orders";
import { createRazorpayOrder } from "@/lib/razorpay";
import { roundHalfUp } from "@/lib/money";

export type CheckoutState = {
  error?: string;
  ok?: boolean;
  razorpay?: {
    keyId: string;
    rzpOrderId: string;
    amountPaise: number;
    internalId: string;
    name: string;
    email: string;
    contact: string;
    notes: Record<string, string>;
  };
};

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const s = await getSession();
  if (!s) redirect("/account/login");

  const slug = String(formData.get("slug") ?? "");
  const tenant = await requireTenant(slug);
  if (tenant.status !== "ACTIVE") return { error: "Store is currently unavailable." };

  const fulfillment = String(formData.get("fulfillment") ?? "DELIVERY") === "PICKUP" ? "PICKUP" : "DELIVERY";
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "COD");
  const branchId = String(formData.get("branchId") ?? "");
  const addressId = String(formData.get("addressId") ?? "");
  const notes = String(formData.get("notes") ?? "").slice(0, 500);

  // ── cart ──────────────────────────────────────────────
  const summary = await cartSummary(tenant, s.uid);
  if (!summary.lines.length) return { error: "Your cart is empty." };
  if (summary.totals.couponError || summary.totals.giftCardError) {
    return { error: summary.totals.couponError ?? summary.totals.giftCardError };
  }

  // ── branch ───────────────────────────────────────────
  const mainBranch = await db.branch.findFirst({
    where: { shopId: tenant.id, active: true },
    orderBy: { isDefault: "desc" },
  });
  const finalBranchId = branchId || summary.branchId || mainBranch?.id || "";
  const branch = await db.branch.findFirst({ where: { id: finalBranchId, shopId: tenant.id } });
  if (!branch) return { error: "Please choose a branch." };

  // ── address ──────────────────────────────────────────
  let address: Record<string, string> = {};
  if (fulfillment === "DELIVERY") {
    if (addressId) {
      const saved = await db.address.findFirst({ where: { id: addressId, userId: s.uid } });
      if (!saved) return { error: "Selected address not found." };
      address = {
        name: saved.name, phone: saved.phone, line1: saved.line1, line2: saved.line2,
        city: saved.city, state: saved.state, pincode: saved.pincode, label: saved.label,
      };
    } else {
      address = {
        name: String(formData.get("name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        line1: String(formData.get("line1") ?? "").trim(),
        line2: String(formData.get("line2") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        state: String(formData.get("state") ?? "").trim(),
        pincode: String(formData.get("pincode") ?? "").trim(),
        label: String(formData.get("label") ?? "Home"),
      };
      if (!address.name || !address.line1 || !address.city || !address.state || !address.pincode) {
        return { error: "Please fill the complete delivery address." };
      }
      if (address.phone.replace(/\D/g, "").length < 10) return { error: "Enter a valid 10-digit phone number." };
      if (formData.get("saveAddress") === "on") {
        await db.address.create({
          data: {
            userId: s.uid,
            label: address.label || "Home",
            name: address.name,
            phone: address.phone,
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
        });
      }
    }
  } else {
    address = { name: s.name, phone: "", line1: `Pickup at ${branch.name}`, city: branch.city, state: tenant.state, pincode: "" };
  }

  // ── payment method gating ────────────────────────────
  const shop = await db.shop.findUnique({ where: { id: tenant.id } });
  if (!shop) return { error: "Shop not found." };
  const features = tenant.features;
  let paymentMethod = paymentMethodRaw;
  if (!["COD", "RAZORPAY", "UPI"].includes(paymentMethod)) paymentMethod = "COD";
  if (paymentMethod === "COD" && (!shop.enableCod || !features.has("cod"))) return { error: "COD is not available for this order." };
  if (paymentMethod === "RAZORPAY" && (!shop.enableRazorpay || !features.has("razorpay") || !shop.razorpayKeyId)) {
    return { error: "Online card/UPI payment is not configured for this shop." };
  }
  if (paymentMethod === "UPI" && !features.has("upi_qr")) return { error: "UPI QR payment is not available." };

  // ── reserve stock ────────────────────────────────────
  try {
    await reserveStock(
      tenant.id,
      branch.id,
      summary.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("OUT_OF_STOCK")) return { error: "One of the items just went out of stock at this branch. Try another branch." };
    return { error: "Unable to reserve stock right now." };
  }

  // ── create order ─────────────────────────────────────
  try {
    const totals = summary.totals;
    const number = await nextOrderNumber(tenant.id);
    const invoiceNumber = features.has("invoices_gst") ? `INV-${number.replace(/^.*?-/, "")}` : "";

    const order = await db.order.create({
      data: {
        number,
        shopId: tenant.id,
        branchId: branch.id,
        userId: s.uid,
        status: "PLACED",
        fulfillment,
        subTotalPaise: totals.subTotalPaise,
        discountPaise: totals.couponPaise + totals.loyaltyPaise,
        couponCode: summary.coupon?.code ?? "",
        couponPaise: totals.couponPaise,
        giftCardPaise: totals.giftCardPaise,
        loyaltyPointsUsed: summary.useLoyalty ? Math.min(summary.loyaltyPoints, Math.round(totals.loyaltyPaise / 100)) : 0,
        loyaltyPaise: totals.loyaltyPaise,
        platformFeePaise: totals.platformFeePaise,
        gstPaise: totals.gstPaise,
        shippingPaise: totals.shippingPaise,
        codFeePaise: totals.codFeePaise,
        roundOffPaise: totals.roundOffPaise,
        totalPaise: totals.totalPaise,
        paymentMethod,
        paymentStatus: paymentMethod === "RAZORPAY" ? "PENDING" : "PENDING",
        addressJson: JSON.stringify(address),
        invoiceNumber,
        etaDate: fulfillment === "PICKUP" ? "" : new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      },
    });

    await db.orderItem.createMany({
      data: summary.lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        variantId: l.variantId,
        name: l.variantLabel ? `${l.name} (${l.variantLabel})` : l.name,
        sku: "",
        qty: l.qty,
        purity: l.purity,
        netWeightMg: l.netWeightMg,
        rateApplied: l.line.ratePerGramPaise,
        metalPaise: l.line.unitMetalPaise * l.qty,
        makingPaise: l.line.unitMakingPaise * l.qty,
        stonePaise: l.line.unitStonePaise * l.qty,
        lineSubPaise: l.line.lineSubPaise,
        discountPaise: l.line.discountPaise,
        gstPercentBp: l.line.gstPercentBp,
        gstExempt: l.line.gstExempt,
        gstPaise: l.line.gstPaise,
        lineTotalPaise: l.line.lineTotalPaise,
        hsnCode: "7113",
      })),
    });

    await db.orderEvent.create({
      data: { orderId: order.id, status: "PLACED", note: notes || `${fulfillment === "PICKUP" ? "Store pickup" : "Delivery"} via ${branch.name}`, actor: "customer" },
    });

    if (invoiceNumber) {
      await db.invoice.create({ data: { shopId: tenant.id, orderId: order.id, number: invoiceNumber } });
    }

    // coupon usage
    if (summary.coupon) {
      await db.coupon.update({ where: { shopId_code: { code: summary.coupon.code, shopId: tenant.id } }, data: { usedCount: { increment: 1 } } }).catch(() => undefined);
    }
    // gift card debit
    if (totals.giftCardPaise > 0 && summary.giftCardCode) {
      await db.giftCard.updateMany({
        where: { shopId: tenant.id, code: summary.giftCardCode },
        data: { balancePaise: { decrement: totals.giftCardPaise } },
      });
    }
    // loyalty: redeem + earn
    if (features.has("loyalty")) {
      if (totals.loyaltyPaise > 0) {
        await db.loyaltyLedger.create({
          data: { shopId: tenant.id, userId: s.uid, points: -Math.round(totals.loyaltyPaise / 100), reason: `Redeemed on ${number}`, orderId: order.id },
        });
      }
      const earn = roundHalfUp((totals.totalPaise * (shop.loyaltyEarnBp ?? 0)) / 10000 / 100);
      if (earn > 0) {
        await db.loyaltyLedger.create({
          data: { shopId: tenant.id, userId: s.uid, points: earn, reason: `Earned on ${number}`, orderId: order.id },
        });
      }
    }

    // clear cart
    await db.cart.update({
      where: { id: summary.cartId! },
      data: { couponCode: "", giftCardCode: "", useLoyalty: false },
    });
    await db.cartItem.deleteMany({ where: { cartId: summary.cartId! } });

    revalidatePath(`/${slug}/cart`);
    revalidatePath(`/${slug}/checkout`);

    // ── razorpay order ─────────────────────────────────
    if (paymentMethod === "RAZORPAY") {
      try {
        const rzp = await createRazorpayOrder({
          keyId: shop.razorpayKeyId,
          secret: shop.razorpaySecret,
          amountPaise: totals.totalPaise,
          receipt: number,
          notes: { internal_order_id: order.id, shop: shop.slug },
        });
        await db.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });
        return {
          ok: true,
          razorpay: {
            keyId: shop.razorpayKeyId,
            rzpOrderId: rzp.id,
            amountPaise: totals.totalPaise,
            internalId: order.id,
            name: s.name,
            email: s.email,
            contact: (address.phone || "").replace(/\D/g, "").slice(-10),
            notes: { shop: shop.slug, order: number },
          },
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.startsWith("RAZORPAY_ORDER_FAILED")) {
          await db.order.update({
            where: { id: order.id },
            data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment gateway error", paymentStatus: "FAILED" },
          });
          return { error: "Payment gateway error — order rolled back. Please try COD/UPI or retry later." };
        }
        throw e;
      }
    }

    redirect(`/${slug}/order/${order.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // rethrow Next redirects/errors
    const msg = e instanceof Error ? e.message : "";
    return { error: msg || "Could not place the order. Please try again." };
  }
}
