"use client";

import { useActionState, useState } from "react";
import { cancelOwnOrder, requestReturn, type OrderActionResult } from "@/actions/orders";

export function CancelButton({ orderId, slug }: { orderId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<OrderActionResult, FormData>(cancelOwnOrder, {});

  if (state?.ok) return <p className="text-sm" style={{ color: "#178a50" }}>Order cancelled. Refund (if paid) is initiated.</p>;

  if (!open) {
    return (
      <button className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(true)}>
        Cancel order
      </button>
    );
  }

  return (
    <form action={action} className="card p-3 space-y-2 w-full">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="label" htmlFor={`cancel-reason-${orderId}`}>Reason (optional)</label>
      <input id={`cancel-reason-${orderId}`} name="reason" className="input !min-h-10" placeholder="Changed my mind, found a better piece…" />
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <div className="flex gap-2">
        <button className="btn !min-h-10 flex-1" style={{ border: "1px solid var(--c-danger)", color: "var(--c-danger)" }} disabled={pending}>
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setOpen(false)}>Keep it</button>
      </div>
    </form>
  );
}

export function ReturnButton({ orderId, slug }: { orderId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<OrderActionResult, FormData>(requestReturn, {});

  if (state?.ok) return <p className="text-sm" style={{ color: "#178a50" }}>Return requested — the store will call you to arrange pickup.</p>;

  if (!open) {
    return (
      <button className="btn btn-ghost !min-h-10 text-sm" onClick={() => setOpen(true)}>
        Request return / exchange
      </button>
    );
  }

  return (
    <form action={action} className="card p-3 space-y-2 w-full">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="label" htmlFor={`return-reason-${orderId}`}>What&apos;s wrong?</label>
      <input id={`return-reason-${orderId}`} name="reason" className="input !min-h-10" placeholder="Size issue, damage, different design…" />
      {state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
      <div className="flex gap-2">
        <button className="btn !min-h-10 flex-1" disabled={pending}>{pending ? "Submitting…" : "Request return"}</button>
        <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
