import { describe, expect, it } from "vitest";
import { generateDueDates, computeMaturity, nextDue, moneyToGoldMg, type PlanSpec, type DepositInfo } from "@/lib/scheme";

function plan(overrides: Partial<PlanSpec> = {}): PlanSpec {
  return {
    frequency: "MONTHLY",
    customDays: "1,15",
    amountPaise: 100000,
    tenureCount: 12,
    mode: "ROI",
    roiPercentBp: 800,
    goldBonusBp: 500,
    ...overrides,
  };
}

describe("generateDueDates", () => {
  it("daily installs are spaced one day apart", () => {
    const dates = generateDueDates(plan({ frequency: "DAILY", tenureCount: 5 }), new Date("2026-01-01T00:00:00Z"));
    expect(dates).toHaveLength(5);
    expect(dates[0].toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(dates[4].toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("weekly installs are spaced seven days apart", () => {
    const dates = generateDueDates(plan({ frequency: "WEEKLY", tenureCount: 4 }), new Date("2026-01-01T00:00:00Z"));
    expect(dates).toHaveLength(4);
    expect(dates[1].getTime() - dates[0].getTime()).toBe(7 * 86400000);
  });

  it("monthly installs clamp month-end (Jan 31 → Feb 28)", () => {
    const dates = generateDueDates(plan({ frequency: "MONTHLY", tenureCount: 3 }), new Date(2026, 0, 31));
    expect(dates).toHaveLength(3);
    expect(dates[0].getDate()).toBe(31);
    expect(dates[1].getMonth()).toBe(1); // February
    expect(dates[1].getDate()).toBe(28);
    expect(dates[2].getMonth()).toBe(2); // March
    expect(dates[2].getDate()).toBe(31);
  });

  it("custom day-of-month list picks the right days", () => {
    const dates = generateDueDates(plan({ frequency: "CUSTOM", customDays: "1,15", tenureCount: 4 }), new Date(2026, 0, 1));
    expect(dates.map((d) => [d.getMonth() + 1, d.getDate()])).toEqual([
      [1, 1],
      [1, 15],
      [2, 1],
      [2, 15],
    ]);
  });

  it("custom weekday list picks matching weekdays only", () => {
    // 2026-01-05 is a Monday
    const dates = generateDueDates(plan({ frequency: "CUSTOM", customDays: "MON,WED", tenureCount: 4 }), new Date(2026, 0, 5));
    expect(dates.map((d) => d.getDay())).toEqual([1, 3, 1, 3]);
    expect(dates[0].getDate()).toBe(5);
    expect(dates[1].getDate()).toBe(7);
  });

  it("tenure 0 returns no dates", () => {
    expect(generateDueDates(plan({ tenureCount: 0 }))).toHaveLength(0);
  });
});

describe("computeMaturity", () => {
  it("ROI mode pays principal plus simple interest to maturity", () => {
    const deposits: DepositInfo[] = [
      { dueDate: new Date("2026-01-01"), paidAt: new Date("2026-01-01"), amountPaise: 100000, goldMgAtPay: 0, rateUsedPaise: 7000, status: "PAID" },
      { dueDate: new Date("2026-07-01"), paidAt: new Date("2026-07-01"), amountPaise: 100000, goldMgAtPay: 0, rateUsedPaise: 7000, status: "PAID" },
      { dueDate: new Date("2026-08-01"), paidAt: null, amountPaise: 100000, goldMgAtPay: 0, rateUsedPaise: 7000, status: "DUE" },
    ];
    const r = computeMaturity(plan(), deposits, new Date("2027-01-01"));
    expect(r.principalPaise).toBe(200000);
    // 8% for 365d = 8000; 8% for 184d ≈ 4032.88 → 4033? round(4032.876)=4033
    expect(r.interestPaise).toBe(8000 + Math.round((100000 * 0.08 * 184) / 365));
    expect(r.totalPaise).toBe(200000 + r.interestPaise);
    expect(r.goldMg).toBe(0);
  });

  it("GOLD mode accrues grams plus bonus and ignores unpaid dues", () => {
    const deposits: DepositInfo[] = [
      { dueDate: new Date("2026-01-01"), paidAt: new Date("2026-01-01"), amountPaise: 100000, goldMgAtPay: 5000, rateUsedPaise: 7000, status: "PAID" },
      { dueDate: new Date("2026-02-01"), paidAt: new Date("2026-02-01"), amountPaise: 100000, goldMgAtPay: 3000, rateUsedPaise: 7000, status: "PAID" },
      { dueDate: new Date("2026-03-01"), paidAt: null, amountPaise: 100000, goldMgAtPay: 9999, rateUsedPaise: 7000, status: "DUE" },
    ];
    const r = computeMaturity(plan({ mode: "GOLD" }), deposits, new Date("2027-01-01"));
    expect(r.goldMg).toBe(8000 + 400); // 5% bonus on 8000 mg
    expect(r.principalPaise).toBe(200000);
    expect(r.totalPaise).toBe(0);
  });
});

describe("nextDue", () => {
  it("returns earliest DUE deposit or null", () => {
    const mk = (date: string, status: string): DepositInfo => ({
      dueDate: new Date(date), paidAt: null, amountPaise: 100000, goldMgAtPay: 0, rateUsedPaise: 7000, status,
    });
    expect(nextDue([mk("2026-03-01", "DUE"), mk("2026-01-01", "DUE"), mk("2026-02-01", "PAID")])?.dueDate.getMonth()).toBe(0);
    expect(nextDue([mk("2026-01-01", "PAID")])).toBeNull();
    expect(nextDue([])).toBeNull();
  });
});

describe("moneyToGoldMg", () => {
  it("converts paise to milligrams at per-gram rate", () => {
    expect(moneyToGoldMg(100000, 7000)).toBe(14286); // ₹1000 at ₹70/g ≈ 14.286 g
    expect(moneyToGoldMg(140000, 7000)).toBe(20000); // exact 20 g
    expect(moneyToGoldMg(100000, 0)).toBe(0);
  });
});
