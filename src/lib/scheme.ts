import { roundHalfUp } from "./money";

export type PlanSpec = {
  frequency: string; // DAILY | WEEKLY | MONTHLY | CUSTOM
  customDays: string; // "1,15" or "MON,WED,FRI"
  amountPaise: number;
  tenureCount: number;
  mode: "ROI" | "GOLD";
  roiPercentBp: number;
  goldBonusBp: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + m);
  if (x.getDate() < day) x.setDate(0); // clamp to month end
  return x;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Generate installment due dates for a plan starting today. */
export function generateDueDates(plan: PlanSpec, start: Date = new Date()): Date[] {
  const dates: Date[] = [];
  const s = new Date(start);
  if (plan.frequency === "DAILY") {
    for (let i = 0; i < plan.tenureCount; i++) dates.push(new Date(s.getTime() + i * DAY_MS));
  } else if (plan.frequency === "WEEKLY") {
    for (let i = 0; i < plan.tenureCount; i++) dates.push(new Date(s.getTime() + i * 7 * DAY_MS));
  } else if (plan.frequency === "MONTHLY") {
    for (let i = 0; i < plan.tenureCount; i++) dates.push(addMonths(s, i));
  } else {
    // CUSTOM: day-of-month list ("1,15") or weekday list ("MON,WED")
    const tokens = plan.customDays
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const isWeekday = tokens.some((t) => WEEKDAYS.includes(t));
    const cursor = new Date(s);
    let guard = 0;
    while (dates.length < plan.tenureCount && guard++ < 4000) {
      const matches = isWeekday
        ? tokens.includes(WEEKDAYS[cursor.getDay()])
        : tokens.includes(String(cursor.getDate()));
      if (matches) dates.push(new Date(cursor));
      cursor.setTime(cursor.getTime() + DAY_MS);
    }
  }
  return dates;
}

export type DepositInfo = {
  dueDate: Date;
  paidAt: Date | null;
  amountPaise: number;
  goldMgAtPay: number;
  rateUsedPaise: number;
  status: string;
};

/**
 * ROI mode: payout = principal + simple interest on each deposit until maturity.
 * Gold mode: each deposit locked gold grams (amount ÷ rate at payment) + bonus.
 */
export function computeMaturity(
  plan: PlanSpec,
  deposits: DepositInfo[],
  maturesAt: Date,
): { totalPaise: number; goldMg: number; interestPaise: number; principalPaise: number } {
  const paid = deposits.filter((d) => d.status === "PAID" && d.paidAt);
  const principal = paid.reduce((s, d) => s + d.amountPaise, 0);

  if (plan.mode === "GOLD") {
    const baseGold = paid.reduce((s, d) => s + d.goldMgAtPay, 0);
    const bonus = roundHalfUp((baseGold * plan.goldBonusBp) / 10000);
    return { totalPaise: 0, goldMg: baseGold + bonus, interestPaise: bonus, principalPaise: principal };
  }

  let interest = 0;
  for (const d of paid) {
    const heldDays = Math.max(0, Math.round((maturesAt.getTime() - d.paidAt!.getTime()) / DAY_MS));
    interest += (d.amountPaise * (plan.roiPercentBp / 10000) * heldDays) / 365;
  }
  const interestR = roundHalfUp(interest);
  return { totalPaise: principal + interestR, goldMg: 0, interestPaise: interestR, principalPaise: principal };
}

export function nextDue(deposits: DepositInfo[]): DepositInfo | null {
  const due = deposits
    .filter((d) => d.status === "DUE")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return due[0] ?? null;
}

/** Convert money to gold milligrams at a per-gram rate (paise). */
export function moneyToGoldMg(amountPaise: number, ratePerGramPaise: number): number {
  if (ratePerGramPaise <= 0) return 0;
  return roundHalfUp((amountPaise / ratePerGramPaise) * 1000);
}
