/** Money in paise (integers), weight in milligrams (integers). */

export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function formatINR(paise: number, opts: { decimals?: boolean } = {}): string {
  const rupees = paise / 100;
  const showDecimals = opts.decimals ?? false;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

export function formatWeightMg(mg: number): string {
  const g = mg / 1000;
  return `${g % 1 === 0 ? g.toFixed(0) : g.toFixed(3)}g`;
}

export function toPaise(rupees: number): number {
  return roundHalfUp(rupees * 100);
}

export function pct(bp: number): string {
  return `${(bp / 100).toFixed(2)}%`;
}

/** Sum of paise with round-off to nearest rupee; returns [totalPaise, roundOffPaise] */
export function withRoundOff(rawPaise: number): { totalPaise: number; roundOffPaise: number } {
  const rounded = roundHalfUp(rawPaise / 100) * 100;
  return { totalPaise: rounded, roundOffPaise: rounded - rawPaise };
}
