import { formatINR } from "@/lib/money";
import type { computeTotals } from "@/lib/pricing";

type Totals = ReturnType<typeof computeTotals>;

export default function OrderSummary({
  totals,
  itemCount,
  showGift = true,
  compact = false,
}: {
  totals: Totals;
  itemCount?: number;
  showGift?: boolean;
  compact?: boolean;
}) {
  const rows: [string, number, string?][] = [
    ["Subtotal", totals.subTotalPaise],
    ...(totals.couponPaise ? ([["Coupon discount", -totals.couponPaise, "green"]] as [string, number, string][]) : []),
    ...(totals.loyaltyPaise ? ([["Loyalty points", -totals.loyaltyPaise, "green"]] as [string, number, string][]) : []),
    ...(showGift && totals.giftCardPaise ? ([["Gift card", -totals.giftCardPaise, "green"]] as [string, number, string][]) : []),
    ...(totals.platformFeePaise ? ([["Platform fee", totals.platformFeePaise]] as [string, number][]) : []),
    ["GST (incl. lines)", totals.gstPaise],
    ["Shipping", totals.shippingPaise],
    ...(totals.codFeePaise ? ([["COD fee", totals.codFeePaise]] as [string, number][]) : []),
    ...(totals.roundOffPaise ? ([["Round off", totals.roundOffPaise]] as [string, number][]) : []),
  ];

  return (
    <div className={compact ? "text-sm" : ""}>
      <table className="w-full">
        <tbody>
          {rows.map(([label, value, tone]) => (
            <tr key={label}>
              <td className="py-1.5 text-muted">{label}</td>
              <td
                className="py-1.5 text-right font-medium"
                style={tone === "green" ? { color: "#178a50" } : undefined}
              >
                {value < 0 ? "−" : ""}{formatINR(Math.abs(value))}
              </td>
            </tr>
          ))}
          {totals.couponError ? (
            <tr><td colSpan={2} className="pt-1 text-xs text-danger">{totals.couponError}</td></tr>
          ) : null}
          {totals.giftCardError ? (
            <tr><td colSpan={2} className="pt-1 text-xs text-danger">{totals.giftCardError}</td></tr>
          ) : null}
        </tbody>
      </table>
      <div className="mt-3 pt-3 border-t flex justify-between items-baseline" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 35%, transparent)" }}>
        <span className="font-bold">{itemCount != null ? `Total (${itemCount} item${itemCount === 1 ? "" : "s"})` : "Total payable"}</span>
        <span className="text-xl font-bold" style={{ color: "var(--c-primary)" }}>{formatINR(totals.totalPaise)}</span>
      </div>
      <p className="text-[11px] text-muted mt-1">All prices in ₹. Inclusive of making charges & GST.</p>
    </div>
  );
}
