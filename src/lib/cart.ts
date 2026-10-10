import "server-only";
import { db } from "./db";
import { computeTotals, priceLine, resolveRate, type CouponInfo, type PricedLine } from "./pricing";
import type { LineInput } from "./pricing";
import { hasFeature, type Tenant } from "./tenant";

export type CartLine = {
  itemId: string;
  qty: number;
  variantId: string;
  variantLabel: string;
  branchId: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  purity: string;
  netWeightMg: number;
  line: PricedLine;
};

export type CartSummary = {
  cartId: string | null;
  lines: CartLine[];
  coupon: CouponInfo | null;
  couponError?: string;
  giftCardPaise: number;
  giftCardError?: string;
  giftCardCode: string;
  loyaltyPoints: number;
  loyaltyUsable: boolean;
  couponCode: string;
  useLoyalty: boolean;
  branchId: string;
  totals: ReturnType<typeof computeTotals>;
  itemCount: number;
};

function toLineInput(product: {
  id: string; netWeightMg: number; purity: string; metal: string; makingMode: string;
  makingValue: number; stoneValuePaise: number; gstPercentBp: number; gstExempt: boolean;
  fixedPricePaise: number;
}, qty: number, ratePerGramPaise: number): LineInput {
  return {
    id: product.id,
    qty,
    netWeightMg: product.netWeightMg,
    purity: product.purity,
    metal: product.metal,
    ratePerGramPaise,
    makingMode: product.makingMode,
    makingValue: product.makingValue,
    stoneValuePaise: product.stoneValuePaise,
    gstPercentBp: product.gstPercentBp,
    gstExempt: product.gstExempt,
    fixedPricePaise: product.fixedPricePaise,
  };
}

export async function cartSummary(tenant: Tenant, userId: string): Promise<CartSummary> {
  const [cart, loyaltyAgg, shop] = await Promise.all([
    db.cart.findUnique({ where: { userId_shopId: { userId, shopId: tenant.id } } }),
    db.loyaltyLedger.aggregate({ where: { shopId: tenant.id, userId }, _sum: { points: true } }),
    db.shop.findUnique({ where: { id: tenant.id } }),
  ]);

  const items = cart
    ? await db.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: true },
      })
    : [];

  const variantIds = [...new Set(items.map((i) => i.variantId).filter(Boolean))];
  const variants = variantIds.length
    ? await db.productVariant.findMany({ where: { id: { in: variantIds } } })
    : [];
  const variantMap = new Map(variants.map((v) => [v.id, v.label]));

  const lines: CartLine[] = [];
  for (const item of items) {
    const rate =
      item.product.fixedPricePaise > 0
        ? 0
        : await resolveRate(tenant.id, item.product.metal, item.product.purity);
    const priced = priceLine(toLineInput(item.product, item.qty, rate));
    const firstImage = (() => {
      try {
        const arr = JSON.parse(item.product.imagesJson);
        return Array.isArray(arr) && typeof arr[0] === "string" ? arr[0] : null;
      } catch {
        return null;
      }
    })();
    lines.push({
      itemId: item.id,
      qty: item.qty,
      variantId: item.variantId,
      variantLabel: variantMap.get(item.variantId) ?? "",
      branchId: item.branchId,
      productId: item.productId,
      slug: item.product.slug,
      name: item.product.name,
      image: firstImage,
      purity: item.product.purity,
      netWeightMg: item.product.netWeightMg,
      line: priced,
    });
  }

  // coupon
  let coupon: CouponInfo | null = null;
  let couponError: string | undefined;
  const couponCode = (cart?.couponCode ?? "").trim();
  if (couponCode) {
    const c = await db.coupon.findFirst({ where: { shopId: tenant.id, code: couponCode } });
    const now = new Date();
    if (!c || !c.active) couponError = "Invalid coupon code";
    else if (c.startsAt > now || c.endsAt < now) couponError = "This coupon has expired";
    else if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) couponError = "Coupon usage limit reached";
    else {
      const usedByUser = await db.order.count({
        where: { shopId: tenant.id, userId, couponCode: c.code, status: { notIn: ["CANCELLED"] } },
      });
      if (usedByUser >= c.perUserLimit) couponError = "You have already used this coupon";
      else
        coupon = { code: c.code, type: c.type, value: c.value, minOrderPaise: c.minOrderPaise, maxDiscountPaise: c.maxDiscountPaise };
    }
  }

  // gift card
  const giftCardCode = (cart?.giftCardCode ?? "").trim();
  let giftCardPaise = 0;
  let giftCardError: string | undefined;
  if (giftCardCode) {
    const g = await db.giftCard.findFirst({ where: { shopId: tenant.id, code: giftCardCode } });
    if (!g || !g.active) giftCardError = "Invalid gift card";
    else if (g.expiresAt && g.expiresAt < new Date()) giftCardError = "Gift card expired";
    else if (g.userId && g.userId !== userId) giftCardError = "This gift card belongs to another account";
    else if (g.balancePaise <= 0) giftCardError = "Gift card balance is empty";
    else giftCardPaise = g.balancePaise;
  }

  const loyaltyPoints = loyaltyAgg._sum.points ?? 0;
  const loyaltyEnabled = Boolean(shop) && hasFeature(tenant, "loyalty");
  const useLoyalty = Boolean(cart?.useLoyalty) && loyaltyEnabled && loyaltyPoints > 0;

  const totals = computeTotals({
    lines: lines.map((l) => l.line),
    coupon: coupon && hasFeature(tenant, "coupons") ? coupon : null,
    loyaltyPoints: useLoyalty ? loyaltyPoints : 0,
    loyaltyRedeemMaxBp: shop?.loyaltyRedeemMaxBp ?? 0,
    giftCardPaise: hasFeature(tenant, "giftcards") ? giftCardPaise : 0,
    platformFeePaise: shop?.platformFeePaise ?? 0,
    platformFeePercentBp: shop?.platformFeePercentBp ?? 0,
    shippingPaise: shop?.shippingFlatPaise ?? 0,
    freeShippingAbovePaise: shop?.freeShippingAbovePaise ?? 0,
    gstPercentBp: shop?.gstPercentBp ?? 1800,
  });

  if (couponError) totals.couponError = couponError;
  if (giftCardError) totals.giftCardError = giftCardError;

  return {
    cartId: cart?.id ?? null,
    lines,
    coupon,
    couponError,
    giftCardPaise: hasFeature(tenant, "giftcards") ? giftCardPaise : 0,
    giftCardError,
    giftCardCode,
    loyaltyPoints,
    loyaltyUsable: loyaltyEnabled && loyaltyPoints > 0,
    couponCode,
    useLoyalty,
    branchId: cart?.branchId ?? "",
    totals,
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
  };
}
