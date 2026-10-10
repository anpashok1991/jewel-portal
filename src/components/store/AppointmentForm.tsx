"use client";

import { useActionState } from "react";
import { bookAppointment, type LeadState } from "@/actions/leads";

const SLOTS = ["11:00", "12:00", "13:00", "15:00", "16:00", "17:00", "18:00"];
const SERVICES = ["Consultation", "Custom design", "Bridal shopping", "Hallmark check", "Exchange / valuation", "Repair & polish"];

export default function AppointmentForm({ shopId, branches }: { shopId: string; branches: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(bookAppointment, {});

  if (state?.ok) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">📅</div>
        <h3 className="font-bold mt-2">Request received!</h3>
        <p className="text-sm text-muted mt-1">Our team will call you shortly to confirm your slot.</p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="shopId" value={shopId} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ap-name">Full name *</label>
          <input id="ap-name" name="name" required className="input" placeholder="Your name" />
        </div>
        <div>
          <label className="label" htmlFor="ap-phone">Phone *</label>
          <input id="ap-phone" name="phone" required inputMode="tel" className="input" placeholder="10-digit mobile" />
        </div>
        <div>
          <label className="label" htmlFor="ap-email">Email</label>
          <input id="ap-email" name="email" type="email" className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="ap-service">Purpose</label>
          <select id="ap-service" name="service" className="input">
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ap-branch">Branch *</label>
          <select id="ap-branch" name="branchId" required className="input">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="ap-date">Date *</label>
          <input id="ap-date" name="date" type="date" required min={today} defaultValue={today} className="input" />
        </div>
      </div>

      <div>
        <div className="label">Preferred time *</div>
        <div className="flex flex-wrap gap-2">
          {SLOTS.map((s, i) => (
            <label key={s} className="cursor-pointer">
              <input type="radio" name="slot" value={s} defaultChecked={i === 0} className="sr-only peer" />
              <span className="chip peer-checked:!border-[var(--c-primary)] peer-checked:!text-[var(--c-primary)]" style={{ borderWidth: 1 }}>
                {s} {Number(s) >= 12 ? "PM" : "AM"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="ap-msg">Notes</label>
        <textarea id="ap-msg" name="message" rows={3} className="input" placeholder="Budget, design ideas, jewellery type…" />
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>
        {pending ? "Booking…" : "Request appointment"}
      </button>
    </form>
  );
}
