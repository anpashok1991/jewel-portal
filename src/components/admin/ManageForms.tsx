"use client";

import { useActionState } from "react";
import {
  setMetalRate,
  savePlan,
  saveCoupon,
  createGiftCard,
  grantLoyalty,
  type ManageState,
} from "@/actions/admin/manage";

function OkMsg({ state }: { state: ManageState }) {
  if (state?.error) return <p className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</p>;
  if (state?.ok) return <p className="text-xs" style={{ color: "var(--c-primary)" }}>Saved ✓</p>;
  return null;
}

export function RateForm() {
  const [state, action, pending] = useActionState<ManageState, FormData>(setMetalRate, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="rate-metal">Metal</label>
        <select id="rate-metal" name="metal" className="input !min-h-9 text-sm !w-32" defaultValue="GOLD">
          <option>GOLD</option><option>SILVER</option><option>PLATINUM</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rate-purity">Purity</label>
        <select id="rate-purity" name="purity" className="input !min-h-9 text-sm !w-28" defaultValue="916">
          <option value="999">999</option><option value="916">916</option><option value="750">750</option>
          <option value="640">640</option><option value="925">925</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="rate-price">₹ / gram</label>
        <input id="rate-price" name="priceRs" type="number" step="1" min={1} required className="input !min-h-9 text-sm !w-36" placeholder="7250" />
      </div>
      <button className="btn btn-primary !min-h-9 text-sm" disabled={pending}>{pending ? "…" : "Set rate"}</button>
      <OkMsg state={state} />
    </form>
  );
}

export type PlanSeed = {
  id: string;
  name: string;
  description: string;
  frequency: string;
  customDays: string;
  amountPaise: number;
  tenureCount: number;
  mode: string;
  roiPercentBp: number;
  goldBonusBp: number;
  minJoinPaise: number;
  active: boolean;
};

export function PlanForm({ plan }: { plan?: PlanSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(savePlan, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <h3 className="font-semibold">{plan ? `Edit “${plan.name}”` : "New savings plan"}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="pl-name">Plan name</label>
          <input id="pl-name" name="name" required defaultValue={plan?.name ?? ""} className="input" placeholder="Gold Addhar 8%" />
        </div>
        <div>
          <label className="label" htmlFor="pl-freq">Frequency</label>
          <select id="pl-freq" name="frequency" defaultValue={plan?.frequency ?? "MONTHLY"} className="input">
            <option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>CUSTOM</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="pl-desc">Description</label>
          <input id="pl-desc" name="description" defaultValue={plan?.description ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pl-custom">Custom days (for CUSTOM)</label>
          <input id="pl-custom" name="customDays" defaultValue={plan?.customDays ?? ""} className="input" placeholder="1,15 or MON,WED" />
        </div>
        <div>
          <label className="label" htmlFor="pl-amt">Installment ₹</label>
          <input id="pl-amt" name="amountRs" type="number" min={1} required defaultValue={plan ? plan.amountPaise / 100 : 1000} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pl-tenure">Installments</label>
          <input id="pl-tenure" name="tenure" type="number" min={1} required defaultValue={plan?.tenureCount ?? 11} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pl-mode">Mode</label>
          <select id="pl-mode" name="mode" defaultValue={plan?.mode ?? "ROI"} className="input">
            <option value="ROI">ROI — bonus on maturity</option>
            <option value="GOLD">GOLD — accumulate gold weight</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pl-roi">ROI bonus %</label>
          <input id="pl-roi" name="roiPercent" type="number" step="0.01" min={0} defaultValue={plan ? plan.roiPercentBp / 100 : 8} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pl-gold">Gold bonus %</label>
          <input id="pl-gold" name="goldBonusPercent" type="number" step="0.01" min={0} defaultValue={plan ? plan.goldBonusBp / 100 : 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pl-join">Min join amount ₹</label>
          <input id="pl-join" name="minJoinRs" type="number" min={0} defaultValue={plan ? plan.minJoinPaise / 100 : 0} className="input" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={plan?.active ?? true} />
        Plan is open for enrollment
      </label>
      <OkMsg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : plan ? "Save plan" : "Create plan"}</button>
    </form>
  );
}

export type CouponSeed = {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number;
  endsAt: string;
  usageLimit: number;
  perUserLimit: number;
  active: boolean;
};

export function CouponForm({ coupon }: { coupon?: CouponSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveCoupon, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      {coupon ? <input type="hidden" name="id" value={coupon.id} /> : null}
      <h3 className="font-semibold">{coupon ? `Edit ${coupon.code}` : "New coupon"}</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="c-code">Code</label>
          <input id="c-code" name="code" required defaultValue={coupon?.code ?? ""} className="input uppercase" placeholder="FESTIVE10" />
        </div>
        <div>
          <label className="label" htmlFor="c-type">Type</label>
          <select id="c-type" name="type" defaultValue={coupon?.type ?? "PERCENT"} className="input">
            <option value="PERCENT">Percent off</option>
            <option value="FLAT">Flat ₹ off</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="c-value">Value (% or ₹)</label>
          <input id="c-value" name="value" type="number" step="0.01" min={0.01} required defaultValue={coupon ? coupon.value / 100 : 10} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-min">Min order ₹</label>
          <input id="c-min" name="minOrderRs" type="number" min={0} defaultValue={coupon ? coupon.minOrderPaise / 100 : 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-max">Max discount ₹ (0 = no cap)</label>
          <input id="c-max" name="maxDiscountRs" type="number" min={0} defaultValue={coupon ? coupon.maxDiscountPaise / 100 : 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-ends">Valid till</label>
          <input id="c-ends" name="endsAt" type="date" required defaultValue={coupon?.endsAt ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-usage">Usage limit (0 = ∞)</label>
          <input id="c-usage" name="usageLimit" type="number" min={0} defaultValue={coupon?.usageLimit ?? 0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-per">Per-user limit</label>
          <input id="c-per" name="perUserLimit" type="number" min={1} defaultValue={coupon?.perUserLimit ?? 1} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-desc">Description</label>
          <input id="c-desc" name="description" defaultValue={coupon?.description ?? ""} className="input" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={coupon?.active ?? true} />
        Coupon is live
      </label>
      <OkMsg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : coupon ? "Save coupon" : "Create coupon"}</button>
    </form>
  );
}

export function GiftCardForm() {
  const [state, action, pending] = useActionState<ManageState, FormData>(createGiftCard, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="g-code">Code</label>
        <input id="g-code" name="code" required className="input !min-h-9 text-sm !w-40 uppercase" placeholder="GIFT2026" />
      </div>
      <div>
        <label className="label" htmlFor="g-amt">Value ₹</label>
        <input id="g-amt" name="amountRs" type="number" min={100} required defaultValue={5000} className="input !min-h-9 text-sm !w-28" />
      </div>
      <div>
        <label className="label" htmlFor="g-exp">Expires (optional)</label>
        <input id="g-exp" name="expiresAt" type="date" className="input !min-h-9 text-sm !w-40" />
      </div>
      <button className="btn btn-primary !min-h-9 text-sm" disabled={pending}>{pending ? "…" : "Issue card"}</button>
      <OkMsg state={state} />
    </form>
  );
}

export function LoyaltyForm() {
  const [state, action, pending] = useActionState<ManageState, FormData>(grantLoyalty, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="l-email">Customer email</label>
        <input id="l-email" name="email" type="email" required className="input !min-h-9 text-sm !w-56" />
      </div>
      <div>
        <label className="label" htmlFor="l-pts">Points (+/−)</label>
        <input id="l-pts" name="points" type="number" required defaultValue={100} className="input !min-h-9 text-sm !w-28" />
      </div>
      <div>
        <label className="label" htmlFor="l-reason">Reason</label>
        <input id="l-reason" name="reason" className="input !min-h-9 text-sm !w-56" placeholder="Festive bonus" />
      </div>
      <button className="btn btn-primary !min-h-9 text-sm" disabled={pending}>{pending ? "…" : "Adjust points"}</button>
      <OkMsg state={state} />
    </form>
  );
}
