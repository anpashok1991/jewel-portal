"use client";

import { useActionState } from "react";
import { requestExchange, submitQuery, type LeadState } from "@/actions/leads";

export function ExchangeForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(requestExchange, {});
  if (state?.ok) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">⚖️</div>
        <h3 className="font-bold mt-2">Valuation requested!</h3>
        <p className="text-sm text-muted mt-1">Bring your gold to any branch — or wait for our call to arrange a home pickup.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ex-name">Name *</label>
          <input id="ex-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex-phone">Phone *</label>
          <input id="ex-phone" name="phone" required inputMode="tel" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="ex-metal">Metal</label>
          <select id="ex-metal" name="metal" className="input" defaultValue="GOLD">
            <option value="GOLD">Gold</option>
            <option value="SILVER">Silver</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ex-purity">Approx purity</label>
          <select id="ex-purity" name="purity" className="input" defaultValue="22K">
            <option>24K</option><option>22K</option><option>18K</option><option>14K</option><option>Unknown</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ex-weight">Gross weight (grams) *</label>
          <input id="ex-weight" name="grossWeightG" type="number" min={1} required className="input" placeholder="e.g. 12" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ex-note">Notes</label>
        <textarea id="ex-note" name="note" rows={3} className="input" placeholder="Items: bangles, chain…, any stones?" />
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Submitting…" : "Get exchange valuation"}</button>
    </form>
  );
}

export function ContactForm({ shopId }: { shopId: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitQuery, {});
  if (state?.ok) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">✉️</div>
        <h3 className="font-bold mt-2">Message sent!</h3>
        <p className="text-sm text-muted mt-1">We usually reply within one business day.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-name">Name *</label>
          <input id="c-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Phone</label>
          <input id="c-phone" name="phone" inputMode="tel" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="c-subject">Subject</label>
          <input id="c-subject" name="subject" className="input" placeholder="Custom order, repair, bulk…" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message *</label>
        <textarea id="c-msg" name="message" rows={4} required className="input" />
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
