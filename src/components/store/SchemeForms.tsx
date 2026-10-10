"use client";

import { useActionState } from "react";
import { enrollScheme, payDeposit, topUpWallet, type SchemeState } from "@/actions/scheme";
import { formatINR } from "@/lib/money";

export function EnrollForm({ planId, slug, disabledLabel }: { planId: string; slug: string; disabledLabel?: string }) {
  const [state, action, pending] = useActionState<SchemeState, FormData>(enrollScheme, {});
  if (state?.ok) {
    return <span className="btn w-full" style={{ background: "color-mix(in srgb, var(--c-primary) 18%, transparent)", color: "var(--c-primary)" }}>Enrolled ✓</span>;
  }
  return (
    <form action={action} className="w-full">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="slug" value={slug} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Enrolling…" : disabledLabel ?? "Enroll now"}</button>
      {state?.error ? <p className="text-xs text-danger mt-2">{state.error}</p> : null}
    </form>
  );
}

export function PayDepositForm({ depositId, amountPaise }: { depositId: string; amountPaise: number }) {
  const [state, action, pending] = useActionState<SchemeState, FormData>(payDeposit, {});
  return (
    <form action={action} className="inline">
      <input type="hidden" name="depositId" value={depositId} />
      <button className="btn btn-ghost !min-h-9 text-xs" disabled={pending} title={state?.error}>
        {pending ? "Paying…" : `Pay ${formatINR(amountPaise)}`}
      </button>
      {state?.error ? <span className="ml-2 text-xs text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="ml-2 text-xs" style={{ color: "var(--c-primary)" }}>Paid ✓</span> : null}
    </form>
  );
}

export function TopUpForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState<SchemeState, FormData>(topUpWallet, {});
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="shopId" value={shopId} />
      <div>
        <label className="label" htmlFor="topup">Top-up (₹)</label>
        <input id="topup" name="amount" type="number" min={100} step={100} defaultValue={1000} className="input !w-32 !min-h-10" />
      </div>
      <button className="btn btn-primary !min-h-10" disabled={pending}>{pending ? "…" : "Add money"}</button>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
    </form>
  );
}
