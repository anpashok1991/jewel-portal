"use client";

import { useActionState } from "react";
import { applyCartOptions, type CartState } from "@/actions/cart";

export default function CartOptions({
  shopId,
  slug,
  couponCode,
  giftCardCode,
  useLoyalty,
  loyaltyPoints,
  redeemMaxBp,
  features,
}: {
  shopId: string;
  slug: string;
  couponCode: string;
  giftCardCode: string;
  useLoyalty: boolean;
  loyaltyPoints: number;
  redeemMaxBp: number;
  features: { coupons: boolean; giftcards: boolean; loyalty: boolean };
}) {
  const [state, action, pending] = useActionState<CartState, FormData>(applyCartOptions, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="shopId" value={shopId} />
      <input type="hidden" name="slug" value={slug} />

      {features.coupons || features.giftcards || features.loyalty ? (
        <div className="label">Offers & rewards</div>
      ) : null}

      {features.coupons ? (
        <div>
          <label className="label" htmlFor="couponCode">Coupon code</label>
          <div className="flex gap-2">
            <input
              id="couponCode"
              name="couponCode"
              className="input flex-1 uppercase"
              placeholder="e.g. DIWALI10"
              defaultValue={couponCode}
            />
          </div>
        </div>
      ) : null}

      {features.giftcards ? (
        <div>
          <label className="label" htmlFor="giftCardCode">Gift card code</label>
          <input
            id="giftCardCode"
            name="giftCardCode"
            className="input uppercase"
            placeholder="GIFT-XXXX-0000"
            defaultValue={giftCardCode}
          />
        </div>
      ) : null}

      {features.loyalty && loyaltyPoints > 0 ? (
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="useLoyalty"
            defaultChecked={useLoyalty}
            className="mt-0.5 h-4 w-4"
            style={{ accentColor: "var(--c-primary)" }}
          />
          <span>
            Use {loyaltyPoints} loyalty points
            <span className="text-muted"> (worth ₹{loyaltyPoints}, up to {(redeemMaxBp / 100).toFixed(0)}% of order value)</span>
          </span>
        </label>
      ) : null}

      <button className="btn btn-ghost !min-h-10 w-full" disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </button>
      {state?.ok ? <p className="text-xs" style={{ color: "#178a50" }}>Applied ✓</p> : null}
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
