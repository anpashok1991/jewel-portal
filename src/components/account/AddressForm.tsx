"use client";

import { useActionState } from "react";
import { addAddress, type AddressState } from "@/actions/account";

export function AddressForm() {
  const [state, action, pending] = useActionState<AddressState, FormData>(addAddress, {});

  return (
    <form action={action} className="card space-y-4 p-4">
      <p className="font-semibold text-sm">Add a new address</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="a-label">Label</label>
          <select id="a-label" name="label" className="input" defaultValue="Home">
            <option>Home</option>
            <option>Work</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="a-name">Full name</label>
          <input id="a-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="a-phone">Phone</label>
          <input id="a-phone" name="phone" inputMode="tel" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="a-pin">Pincode</label>
          <input id="a-pin" name="pincode" inputMode="numeric" pattern="\d{6}" maxLength={6} required className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="a-line1">Address line 1</label>
        <input id="a-line1" name="line1" required className="input" placeholder="House no., street" />
      </div>
      <div>
        <label className="label" htmlFor="a-line2">Address line 2 (optional)</label>
        <input id="a-line2" name="line2" className="input" placeholder="Area, landmark" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="a-city">City</label>
          <input id="a-city" name="city" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="a-state">State</label>
          <input id="a-state" name="state" required className="input" />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save address"}</button>
        {state?.ok ? <span className="self-center text-sm" style={{ color: "var(--c-primary)" }}>Saved ✓</span> : null}
      </div>
    </form>
  );
}
