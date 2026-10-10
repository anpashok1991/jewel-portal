import { db } from "./db";
import { PURITY_FINENESS } from "./constants";
import { roundHalfUp, withRoundOff } from "./money";

/** Resolve price-per-gram (paise) for metal+purity, falling back to base purity scaling. */
export async function resolveRate(
  shopId: string,
  metal: string,
  purity: string,
): Promise<number> {
  const exact = await db.metalRate.findFirst({
    where: { shopId, metal, purity },
    orderBy: { effectiveAt: "desc" },
  });
  if (exact) return exact.pricePerGramPaise;

  // derive from the highest-fineness rate on record for this metal
  const bases = await db.metalRate.findMany({
    where: { shopId, metal },
    orderBy: { effectiveAt: "desc" },
    take: 50,
  });
  if (bases.length === 0) return 0;
  const target = PURITY_FINENESS[purity] ?? 999;
  const base = bases.reduce((best, r) => {
    const f = PURITY_FINENESS[r.purity] ?? 0;
    return f > (PURITY_FINENESS[best.purity] ?? 0) ? r : best;
  }, bases[0]);
  const baseF = PURITY_FINENESS[base.purity] ?? 1000;
  return roundHalfUp((base.pricePerGramPaise * target) / baseF);
}

export type LineInput = {
  id: string;
  qty: number;
  netWeightMg: number;
  purity: string;
  metal: string;
  ratePerGramPaise: number;
  makingMode: string; // PERCENT | PER_GRAM | FLAT | NONE
  makingValue: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  gstExempt: boolean;
  fixedPricePaise: number; // 0 = rate based
};

export type PricedLine = LineInput & {
  unitMetalPaise: number;
  unitMakingPaise: number;
  unitStonePaise: number;
  unitSubPaise: number;
  lineSubPaise: number;
  discountPaise: number;
  gstPaise: number;
  lineTotalPaise: number;
};

export function priceLine(line: LineInput): PricedLine {
  let unitMetal: number;
  let unitMaking: number;
  if (line.fixedPricePaise > 0) {
    unitMetal = line.fixedPricePaise;
    unitMaking = 0;
  } else {
    unitMetal = roundHalfUp((line.netWeightMg / 1000) * line.ratePerGramPaise);
    unitMaking =
      line.makingMode === "PERCENT"
        ? roundHalfUp((unitMetal * line.makingValue) / 10000)
        : line.makingMode === "PER_GRAM"
          ? roundHalfUp((line.netWeightMg / 1000) * line.makingValue)
          : line.makingMode === "FLAT"
            ? line.makingValue
            : 0;
  }
  const unitSub = unitMetal + unitMaking + line.stoneValuePaise;
  return {
    ...line,
    unitMetalPaise: unitMetal,
    unitMakingPaise: unitMaking,
    unitStonePaise: line.stoneValuePaise,
    unitSubPaise: unitSub,
    lineSubPaise: unitSub * line.qty,
    discountPaise: 0,
    gstPaise: 0,
    lineTotalPaise: unitSub * line.qty,
  };
}

export type CouponInfo = {
  code: string;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number;
};

export type TotalsInput = {
  lines: PricedLine[];
  coupon?: CouponInfo | null;
  loyaltyPoints?: number; // 1 pt = Re1
  loyaltyRedeemMaxBp?: number;
  giftCardPaise?: number;
  platformFeePaise?: number;
  platformFeePercentBp?: number;
  shippingPaise?: number;
  freeShippingAbovePaise?: number;
  cod?: boolean;
  codFeePaise?: number;
  gstPercentBp?: number; // shop default for lines without own rate
};

export type Totals = {
  subTotalPaise: number;
  couponPaise: number;
  loyaltyPaise: number;
  giftCardPaise: number;
  platformFeePaise: number;
  gstPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  roundOffPaise: number;
  totalPaise: number;
  lines: PricedLine[];
  couponError?: string;
  giftCardError?: string;
};

export function computeTotals(input: TotalsInput): Totals {
  const lines = input.lines.map((l) => ({ ...l }));
  const subTotal = lines.reduce((s, l) => s + l.lineSubPaise, 0);

  // 1) coupon discount (proportional across lines)
  let couponPaise = 0;
  let couponError: string | undefined;
  if (input.coupon) {
    const c = input.coupon;
    if (subTotal < c.minOrderPaise) {
      couponError = "Minimum order not met for this coupon";
    } else {
      couponPaise = c.type === "PERCENT" ? roundHalfUp((subTotal * c.value) / 10000) : c.value;
      if (c.maxDiscountPaise > 0) couponPaise = Math.min(couponPaise, c.maxDiscountPaise);
      couponPaise = Math.min(couponPaise, subTotal);
    }
  }

  // 2) loyalty (cap by bp of subtotal)
  const loyaltyMax =
    input.loyaltyRedeemMaxBp && input.loyaltyRedeemMaxBp > 0
      ? roundHalfUp((subTotal * input.loyaltyRedeemMaxBp) / 10000)
      : subTotal;
  const loyaltyRequested = (input.loyaltyPoints ?? 0) * 100;
  const loyaltyPaise = Math.max(0, Math.min(loyaltyRequested, loyaltyMax, subTotal - couponPaise));

  // 3) distribute discounts to lines for GST base
  const preDiscountTotal = subTotal;
  const totalDiscount = couponPaise + loyaltyPaise;
  for (const l of lines) {
    const share = preDiscountTotal > 0 ? l.lineSubPaise / preDiscountTotal : 0;
    const lineDiscount = roundHalfUp(totalDiscount * share);
    l.discountPaise = lineDiscount;
    const taxable = l.lineSubPaise - lineDiscount;
    l.gstPaise = l.gstExempt ? 0 : roundHalfUp((taxable * (l.gstPercentBp || input.gstPercentBp || 0)) / 10000);
    l.lineTotalPaise = taxable + l.gstPaise;
  }
  const gst = lines.reduce((s, l) => s + l.gstPaise, 0);

  // 4) platform fee
  const platformFee =
    (input.platformFeePaise ?? 0) +
    roundHalfUp((Math.max(0, subTotal - totalDiscount) * (input.platformFeePercentBp ?? 0)) / 10000);

  // 5) gift card (cap at payable before shipping/cod/roundoff)
  const preGift = subTotal - totalDiscount + gst + platformFee;
  const giftCardPaise = Math.min(input.giftCardPaise ?? 0, Math.max(0, preGift));
  let giftCardError: string | undefined;
  if ((input.giftCardPaise ?? 0) > preGift) giftCardError = "Gift card balance exceeds payable amount";

  // 6) shipping
  const shipping =
    input.freeShippingAbovePaise && preGift >= input.freeShippingAbovePaise
      ? 0
      : (input.shippingPaise ?? 0);

  // 7) COD fee
  const codFee = input.cod ? (input.codFeePaise ?? 0) : 0;

  const raw = preGift - giftCardPaise + shipping + codFee;
  const { totalPaise, roundOffPaise } = withRoundOff(raw);

  return {
    subTotalPaise: subTotal,
    couponPaise,
    loyaltyPaise,
    giftCardPaise,
    platformFeePaise: platformFee,
    gstPaise: gst,
    shippingPaise: shipping,
    codFeePaise: codFee,
    roundOffPaise,
    totalPaise: Math.max(0, totalPaise),
    lines,
    couponError,
    giftCardError,
  };
}
