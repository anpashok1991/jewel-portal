import { describe, expect, it } from "vitest";
import { roundHalfUp, formatINR, formatWeightMg, toPaise, pct, withRoundOff } from "@/lib/money";

describe("roundHalfUp", () => {
  it("rounds .5 away from zero", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(-2.5)).toBe(-3);
  });
  it("rounds toward nearest", () => {
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(2.6)).toBe(3);
    expect(roundHalfUp(0)).toBe(0);
  });
});

describe("toPaise", () => {
  it("converts rupees to integer paise", () => {
    expect(toPaise(12.345)).toBe(1235);
    expect(toPaise(0.999)).toBe(100);
    expect(toPaise(0)).toBe(0);
  });
});

describe("formatINR", () => {
  it("groups with Indian numbering, no decimals by default", () => {
    expect(formatINR(12345678)).toBe("₹1,23,457");
    expect(formatINR(50000)).toBe("₹500");
    expect(formatINR(0)).toBe("₹0");
  });
  it("shows decimals when asked", () => {
    expect(formatINR(15050, { decimals: true })).toBe("₹150.50");
  });
});

describe("formatWeightMg", () => {
  it("formats grams", () => {
    expect(formatWeightMg(10000)).toBe("10g");
    expect(formatWeightMg(1234)).toBe("1.234g");
  });
});

describe("pct", () => {
  it("renders basis points as percent", () => {
    expect(pct(1800)).toBe("18.00%");
    expect(pct(50)).toBe("0.50%");
    expect(pct(0)).toBe("0.00%");
  });
});

describe("withRoundOff", () => {
  it("rounds to nearest rupee and reports the difference", () => {
    expect(withRoundOff(123456)).toEqual({ totalPaise: 123500, roundOffPaise: 44 });
    expect(withRoundOff(123449)).toEqual({ totalPaise: 123400, roundOffPaise: -49 });
    expect(withRoundOff(123500)).toEqual({ totalPaise: 123500, roundOffPaise: 0 });
  });
});
