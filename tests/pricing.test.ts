import { describe, expect, it } from "vitest";
import { priceLine, computeTotals, type LineInput, type PricedLine } from "@/lib/pricing";

function line(overrides: Partial<LineInput> = {}): LineInput {
  return {
    id: "l1",
    qty: 1,
    netWeightMg: 10000, // 10 g
    purity: "22K",
    metal: "GOLD",
    ratePerGramPaise: 7000, // ₹70 / g
    makingMode: "PERCENT",
    makingValue: 1500, // 15% (bp)
    stoneValuePaise: 0,
    gstPercentBp: 1800,
    gstExempt: false,
    fixedPricePaise: 0,
    ...overrides,
  };
}

describe("priceLine", () => {
  it("prices rate-based gold with percent making", () => {
    const p = priceLine(line({ qty: 2 }));
    expect(p.unitMetalPaise).toBe(70000);
    expect(p.unitMakingPaise).toBe(10500);
    expect(p.unitSubPaise).toBe(80500);
    expect(p.lineSubPaise).toBe(161000);
    expect(p.lineTotalPaise).toBe(161000);
  });

  it("supports per-gram, flat and none making modes", () => {
    expect(priceLine(line({ makingMode: "PER_GRAM", makingValue: 250 })).unitMakingPaise).toBe(2500);
    expect(priceLine(line({ makingMode: "FLAT", makingValue: 99900 })).unitMakingPaise).toBe(99900);
    expect(priceLine(line({ makingMode: "NONE" })).unitMakingPaise).toBe(0);
  });

  it("fixed price ignores rate and making, keeps stones", () => {
    const p = priceLine(line({ fixedPricePaise: 50000, makingValue: 1500, stoneValuePaise: 1000 }));
    expect(p.unitMetalPaise).toBe(50000);
    expect(p.unitMakingPaise).toBe(0);
    expect(p.unitSubPaise).toBe(51000);
  });
});

describe("computeTotals", () => {
  const base: PricedLine = priceLine(line());

  it("adds GST and shipping with round-off", () => {
    const t = computeTotals({ lines: [base], gstPercentBp: 1800, shippingPaise: 15000, freeShippingAbovePaise: 500000 });
    expect(t.subTotalPaise).toBe(80500);
    expect(t.gstPaise).toBe(14490);
    expect(t.shippingPaise).toBe(15000);
    expect(t.totalPaise).toBe(110000); // 109990 → 110000
    expect(t.roundOffPaise).toBe(10);
  });

  it("waives shipping above threshold", () => {
    const t = computeTotals({ lines: [base], gstPercentBp: 1800, shippingPaise: 15000, freeShippingAbovePaise: 50000 });
    expect(t.shippingPaise).toBe(0);
    expect(t.totalPaise).toBe(95000); // 94990 → 95000
  });

  it("applies percent coupon in basis points with cap", () => {
    const t = computeTotals({
      lines: [base],
      gstPercentBp: 1800,
      coupon: { code: "OFF20", type: "PERCENT", value: 2000, minOrderPaise: 0, maxDiscountPaise: 0 },
    });
    expect(t.couponPaise).toBe(16100);
    expect(t.lines[0].discountPaise).toBe(16100);
    expect(t.lines[0].gstPaise).toBe(11592); // 18% of 64400
    expect(t.gstPaise).toBe(11592);
    expect(t.totalPaise).toBe(76000); // 75992 → 76000
  });

  it("caps coupon at maxDiscountPaise", () => {
    const t = computeTotals({
      lines: [base],
      gstPercentBp: 1800,
      coupon: { code: "CAP", type: "PERCENT", value: 2000, minOrderPaise: 0, maxDiscountPaise: 5000 },
    });
    expect(t.couponPaise).toBe(5000);
  });

  it("rejects coupon below minimum order", () => {
    const t = computeTotals({
      lines: [base],
      gstPercentBp: 1800,
      coupon: { code: "BIG", type: "PERCENT", value: 1000, minOrderPaise: 100000, maxDiscountPaise: 0 },
    });
    expect(t.couponError).toMatch(/Minimum order/);
    expect(t.couponPaise).toBe(0);
  });

  it("caps loyalty redemption at percent of bill", () => {
    const t = computeTotals({ lines: [base], gstPercentBp: 1800, loyaltyPoints: 100, loyaltyRedeemMaxBp: 500 });
    expect(t.loyaltyPaise).toBe(4025); // 5% of 80500
    const uncapped = computeTotals({ lines: [base], gstPercentBp: 1800, loyaltyPoints: 100 });
    expect(uncapped.loyaltyPaise).toBe(10000);
  });

  it("gift card never exceeds payable and flags overflow", () => {
    const t = computeTotals({ lines: [base], gstPercentBp: 1800, giftCardPaise: 999999 });
    expect(t.giftCardError).toMatch(/exceeds/);
    expect(t.giftCardPaise).toBe(94990); // sub + gst
    expect(t.totalPaise).toBe(0);
  });

  it("adds COD fee only when cod is selected", () => {
    const withCod = computeTotals({ lines: [base], gstPercentBp: 1800, cod: true, codFeePaise: 15000 });
    expect(withCod.codFeePaise).toBe(15000);
    const noCod = computeTotals({ lines: [base], gstPercentBp: 1800, cod: false, codFeePaise: 15000 });
    expect(noCod.codFeePaise).toBe(0);
  });

  it("platform fee percent applies on discounted subtotal", () => {
    const t = computeTotals({
      lines: [base],
      gstPercentBp: 1800,
      coupon: { code: "FLAT100", type: "FLAT", value: 10000, minOrderPaise: 0, maxDiscountPaise: 0 },
      platformFeePercentBp: 150,
      platformFeePaise: 100,
    });
    // 1.5% of (80500 - 10000) = 1057.5 → 1058, plus ₹1 flat
    expect(t.platformFeePaise).toBe(100 + 1058);
  });

  it("exempt lines carry no GST", () => {
    const exempt = priceLine(line({ gstExempt: true }));
    const t = computeTotals({ lines: [exempt], gstPercentBp: 1800 });
    expect(t.gstPaise).toBe(0);
    expect(t.totalPaise).toBe(80500);
  });

  it("distributes discounts across multiple lines", () => {
    const l2 = priceLine(line({ id: "l2", fixedPricePaise: 50000, makingMode: "NONE", stoneValuePaise: 0 }));
    const t = computeTotals({
      lines: [base, l2],
      gstPercentBp: 1800,
      coupon: { code: "FLAT100", type: "FLAT", value: 10000, minOrderPaise: 0, maxDiscountPaise: 0 },
    });
    expect(t.subTotalPaise).toBe(130500);
    expect(t.couponPaise).toBe(10000);
    expect(t.lines[0].discountPaise + t.lines[1].discountPaise).toBe(10000);
    expect(t.gstPaise).toBe(13380 + 8310);
    expect(t.totalPaise).toBe(142200); // 142190 → 142200
  });
});
