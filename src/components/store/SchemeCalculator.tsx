"use client";

import { useState } from "react";
import { formatINR, formatWeightMg } from "@/lib/money";

type Props = {
  amountPaise: number;
  tenureCount: number;
  frequency: string;
  mode: string;
  roiPercentBp: number;
  goldBonusBp: number;
  ratePerGramPaise: number;
};

const FREQ_DAYS: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, CUSTOM: 7 };

export default function SchemeCalculator(p: Props) {
  const [amount, setAmount] = useState(p.amountPaise);
  const total = amount * p.tenureCount;
  const tenureDays = (FREQ_DAYS[p.frequency] ?? 7) * p.tenureCount;
  const avgDays = tenureDays / 2;

  if (p.mode === "GOLD") {
    const baseGoldMg = p.ratePerGramPaise > 0 ? Math.round((total / p.ratePerGramPaise) * 1000) : 0;
    const bonus = Math.round((baseGoldMg * p.goldBonusBp) / 10000);
    return (
      <CalculatorShell
        amount={amount}
        setAmount={setAmount}
        min={100 * 100}
        rows={[
          ["You invest", formatINR(total)],
          ["Gold locked today", formatWeightMg(baseGoldMg)],
          [`Bonus @ ${(p.goldBonusBp / 100).toFixed(1)}%`, `+${formatWeightMg(bonus)}`],
          ["You receive", <b key="g" style={{ color: "var(--c-primary)" }}>{formatWeightMg(baseGoldMg + bonus)} of gold</b>],
        ]}
        note="Gold weight is locked at each installment's live rate; shop may allow exchange or cash payout at maturity."
      />
    );
  }

  const interest = Math.round((total * (p.roiPercentBp / 10000) * avgDays) / 365);
  return (
    <CalculatorShell
      amount={amount}
      setAmount={setAmount}
      min={100 * 100}
      rows={[
        ["Total deposits", formatINR(total)],
        [`Expected interest @ ${(p.roiPercentBp / 100).toFixed(1)}% p.a.*`, `+${formatINR(interest)}`],
        ["You receive at maturity", <b key="r" style={{ color: "var(--c-primary)" }}>{formatINR(total + interest)}</b>],
      ]}
      note="*Simple interest approximation on average balance; final payout computed per deposit at settlement."
    />
  );
}

function CalculatorShell({
  amount, setAmount, min, rows, note,
}: {
  amount: number;
  setAmount: (n: number) => void;
  min: number;
  rows: (string | React.ReactNode)[][];
  note: string;
}) {
  const step = min;
  const max = min * 100;
  return (
    <div className="mt-4 pt-4 hairline">
      <label className="label" htmlFor="calc-amount">Installment calculator</label>
      <div className="flex items-center gap-3">
        <input
          id="calc-amount"
          type="range"
          min={min}
          max={max}
          step={step}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="flex-1 accent-current"
          style={{ accentColor: "var(--c-primary)" }}
        />
        <span className="text-sm font-bold w-24 text-right">{formatINR(amount)}</span>
      </div>
      <table className="w-full text-sm mt-3">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={i}>
              <td className="py-1 text-muted">{k}</td>
              <td className="py-1 text-right font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted mt-2">{note}</p>
    </div>
  );
}
