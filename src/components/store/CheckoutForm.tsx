"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder, type CheckoutState } from "@/actions/checkout";
import { formatINR } from "@/lib/money";

type Props = {
  slug: string;
  totalPaise: number;
  itemCount: number;
  methods: { cod: boolean; razorpay: boolean; upi: boolean };
  defaultMethod: string;
  branches: { id: string; name: string; city: string }[];
  children?: React.ReactNode;
};

export default function CheckoutForm({ slug, totalPaise, itemCount, methods, defaultMethod, branches, children }: Props) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [method, setMethod] = useState(defaultMethod);
  const [rzpBusy, setRzpBusy] = useState(false);
  const router = useRouter();

  const startRazorpay = (data: NonNullable<CheckoutState["razorpay"]>) => {
    const w = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };
    const finish = (resp: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) => {
      setRzpBusy(true);
      fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: resp.razorpay_order_id ?? data.rzpOrderId,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
          internalOrderId: data.internalId,
        }),
      })
        .then((r) => r.json())
        .then((j: { ok?: boolean; url?: string; error?: string }) => {
          if (j.ok && j.url) router.push(j.url);
          else alert(j.error ?? "Payment verification failed");
        })
        .catch(() => alert("Could not verify payment. Please contact the store."))
        .finally(() => setRzpBusy(false));
    };

    const load = () => {
      if (!w.Razorpay) return alert("Payment library failed to load. Please refresh.");
      const rzp = new w.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: "INR",
        name: "Jewel Portal",
        order_id: data.rzpOrderId,
        prefill: { name: data.name, email: data.email, contact: data.contact },
        notes: data.notes,
        theme: { color: "#7a1f2b" },
        handler: finish,
        modal: { ondismiss: () => setRzpBusy(false) },
      });
      rzp.open();
    };

    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      load();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = load;
    s.onerror = () => alert("Could not load Razorpay. Please try another payment method.");
    document.body.appendChild(s);
  };

  // once placeOrder returns a razorpay payload, open checkout
  const rzpPayload = state?.razorpay;
  useEffect(() => {
    if (rzpPayload) startRazorpay(rzpPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open exactly when payload arrives
  }, [rzpPayload]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="paymentMethod" value={method} />

      {children}

      {/* fulfilment */}
      <fieldset>
        <legend className="label">How would you like to get it?</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="card p-3 cursor-pointer flex items-start gap-2">
            <input type="radio" name="fulfillment" value="DELIVERY" defaultChecked className="mt-1" style={{ accentColor: "var(--c-primary)" }} />
            <span className="text-sm"><b>Home delivery</b><br /><span className="text-xs text-muted">Insured, 2–5 days</span></span>
          </label>
          <label className="card p-3 cursor-pointer flex items-start gap-2">
            <input type="radio" name="fulfillment" value="PICKUP" className="mt-1" style={{ accentColor: "var(--c-primary)" }} />
            <span className="text-sm"><b>Store pickup</b><br /><span className="text-xs text-muted">Ready in 24 hours</span></span>
          </label>
        </div>
        {branches.length ? (
          <div className="mt-3">
            <label className="label" htmlFor="branchId">Branch {branches.length > 1 ? "*" : ""}</label>
            <select id="branchId" name="branchId" className="input" defaultValue={branches[0]?.id}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ""}</option>
              ))}
            </select>
          </div>
        ) : null}
      </fieldset>

      {/* payment */}
      <fieldset>
        <legend className="label">Payment method</legend>
        <div className="space-y-2">
          {methods.razorpay ? (
            <MethodRow
              id="RAZORPAY"
              active={method === "RAZORPAY"}
              onSelect={setMethod}
              title="Card / Netbanking / UPI"
              subtitle="Pay securely via Razorpay"
            />
          ) : null}
          {methods.upi ? (
            <MethodRow
              id="UPI"
              active={method === "UPI"}
              onSelect={setMethod}
              title="UPI QR code"
              subtitle="Scan & pay from any UPI app"
            />
          ) : null}
          {methods.cod ? (
            <MethodRow
              id="COD"
              active={method === "COD"}
              onSelect={setMethod}
              title="Cash on delivery"
              subtitle="Pay at your door / counter"
            />
          ) : null}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">Order notes (optional)</label>
        <textarea id="notes" name="notes" rows={2} className="input" placeholder="Gift wrap, preferred delivery time…" />
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        className="btn btn-primary w-full !min-h-13 text-base"
        disabled={pending || rzpBusy}
      >
        {pending || rzpBusy
          ? "Processing…"
          : method === "COD"
            ? `Place order · ${formatINR(totalPaise)} (Pay on delivery)`
            : method === "UPI"
              ? `Place order · ${formatINR(totalPaise)} (Show QR)`
              : `Pay ${formatINR(totalPaise)} securely`}
      </button>
      <p className="text-[11px] text-muted text-center">
        {itemCount} item{itemCount === 1 ? "" : "s"} · GST invoice included · 7-day returns
      </p>
    </form>
  );
}

function MethodRow({
  id, active, onSelect, title, subtitle,
}: {
  id: string;
  active: boolean;
  onSelect: (v: string) => void;
  title: string;
  subtitle: string;
}) {
  return (
    <label
      className="card p-3 flex items-start gap-3 cursor-pointer"
      style={active ? { borderColor: "var(--c-primary)", borderWidth: 2 } : undefined}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={id}
        checked={active}
        onChange={() => onSelect(id)}
        className="mt-1"
        style={{ accentColor: "var(--c-primary)" }}
      />
      <span className="text-sm"><b>{title}</b><br /><span className="text-xs text-muted">{subtitle}</span></span>
    </label>
  );
}
