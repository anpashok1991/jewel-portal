"use client";

import { useActionState } from "react";
import { saveShopProfile, savePayments, saveCommercials, saveWhatsApp, setFeatures, setTheme, saveBranch, toggleBranch, type ManageState } from "@/actions/admin/settings";
import { saveStaff, deleteStaff, type StaffState } from "@/actions/admin/catalog";
import { resetStaffPassword, type ManageState as M2 } from "@/actions/admin/manage";
import { FEATURE_LIST } from "@/lib/constants";

function Msg({ state }: { state: { ok?: boolean; error?: string } }) {
  if (state?.error) return <p className="text-xs" style={{ color: "var(--c-danger)" }}>{state.error}</p>;
  if (state?.ok) return <p className="text-xs" style={{ color: "var(--c-primary)" }}>Saved ✓</p>;
  return null;
}

export type ShopSeed = {
  name: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  address: string;
  state: string;
  gstin: string;
  pan: string;
  announcement: string;
  whatsappNumber: string;
  whatsappGreeting: string;
  whatsappEnabled: boolean;
  upiVpa: string;
  upiName: string;
  razorpayKeyId: string;
  razorpaySecret: string;
  enableRazorpay: boolean;
  enableCod: boolean;
  enableUpiQr: boolean;
  codFeePaise: number;
  codMaxPaise: number;
  platformFeePaise: number;
  platformFeePercentBp: number;
  gstPercentBp: number;
  freeShippingAbovePaise: number;
  shippingFlatPaise: number;
  loyaltyEarnBp: number;
  loyaltyRedeemMaxBp: number;
};

export function ProfileForm({ shop }: { shop: ShopSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveShopProfile, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Shop profile</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="sp-name">Shop name</label>
          <input id="sp-name" name="name" required defaultValue={shop.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-tag">Tagline</label>
          <input id="sp-tag" name="tagline" defaultValue={shop.tagline} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-email">Contact email</label>
          <input id="sp-email" name="contactEmail" type="email" defaultValue={shop.contactEmail} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-phone">Phone</label>
          <input id="sp-phone" name="phone" defaultValue={shop.phone} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sp-addr">Address</label>
          <input id="sp-addr" name="address" defaultValue={shop.address} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-state">State</label>
          <input id="sp-state" name="state" defaultValue={shop.state} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-gstin">GSTIN</label>
          <input id="sp-gstin" name="gstin" defaultValue={shop.gstin} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sp-pan">PAN</label>
          <input id="sp-pan" name="pan" defaultValue={shop.pan} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sp-ann">Announcement bar</label>
          <input id="sp-ann" name="announcement" defaultValue={shop.announcement} className="input" placeholder="Diwali offer — up to 30% off making charges" />
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

export function PaymentsForm({ shop }: { shop: ShopSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(savePayments, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Payments</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="pay-vpa">UPI VPA</label>
          <input id="pay-vpa" name="upiVpa" defaultValue={shop.upiVpa} className="input" placeholder="shop@upi" />
        </div>
        <div>
          <label className="label" htmlFor="pay-vpaname">UPI payee name</label>
          <input id="pay-vpaname" name="upiName" defaultValue={shop.upiName} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-key">Razorpay key id</label>
          <input id="pay-key" name="razorpayKeyId" defaultValue={shop.razorpayKeyId} className="input" placeholder="rzp_live_…" />
        </div>
        <div>
          <label className="label" htmlFor="pay-secret">Razorpay key secret</label>
          <input id="pay-secret" name="razorpaySecret" type="password" defaultValue={shop.razorpaySecret} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-codfee">COD fee ₹</label>
          <input id="pay-codfee" name="codFeeRs" type="number" min={0} defaultValue={shop.codFeePaise / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-codmax">COD order limit ₹</label>
          <input id="pay-codmax" name="codMaxRs" type="number" min={0} defaultValue={shop.codMaxPaise / 100} className="input" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="enableRazorpay" defaultChecked={shop.enableRazorpay} /> Razorpay online</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="enableCod" defaultChecked={shop.enableCod} /> Cash on delivery</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="enableUpiQr" defaultChecked={shop.enableUpiQr} /> Static UPI QR</label>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save payment settings"}</button>
    </form>
  );
}

export function CommercialsForm({ shop }: { shop: ShopSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveCommercials, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Commercials</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="cm-gst">Default GST %</label>
          <input id="cm-gst" name="gstPercent" type="number" step="0.01" min={0} defaultValue={shop.gstPercentBp / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-pf">Platform fee ₹</label>
          <input id="cm-pf" name="platformFeeRs" type="number" min={0} defaultValue={shop.platformFeePaise / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-pfp">Platform fee %</label>
          <input id="cm-pfp" name="platformFeePercent" type="number" step="0.01" min={0} defaultValue={shop.platformFeePercentBp / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-free">Free shipping above ₹</label>
          <input id="cm-free" name="freeShippingRs" type="number" min={0} defaultValue={shop.freeShippingAbovePaise / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-flat">Flat shipping ₹</label>
          <input id="cm-flat" name="shippingFlatRs" type="number" min={0} defaultValue={shop.shippingFlatPaise / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-loyalty">Loyalty earn %</label>
          <input id="cm-loyalty" name="loyaltyEarnPercent" type="number" step="0.01" min={0} defaultValue={shop.loyaltyEarnBp / 100} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cm-redeem">Loyalty redeem cap % of bill</label>
          <input id="cm-redeem" name="loyaltyRedeemMaxPercent" type="number" step="0.01" min={0} defaultValue={shop.loyaltyRedeemMaxBp / 100} className="input" />
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save commercials"}</button>
    </form>
  );
}

export function WhatsAppForm({ shop }: { shop: ShopSeed }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveWhatsApp, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">WhatsApp</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="wa-num">Number (with country code)</label>
          <input id="wa-num" name="whatsappNumber" defaultValue={shop.whatsappNumber} className="input" placeholder="919876543210" />
        </div>
        <div>
          <label className="label" htmlFor="wa-greet">Greeting message</label>
          <input id="wa-greet" name="whatsappGreeting" defaultValue={shop.whatsappGreeting} className="input" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="whatsappEnabled" defaultChecked={shop.whatsappEnabled} /> Show WhatsApp button on storefront
      </label>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save WhatsApp"}</button>
    </form>
  );
}

export function FeaturesForm({ enabled }: { enabled: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(setFeatures, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Features</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        {FEATURE_LIST.map((f) => (
          <label key={f.key} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "rgba(0,0,0,.1)" }}>
            <input type="checkbox" name={`feat_${f.key}`} defaultChecked={enabled[f.key] ?? false} />
            <span>{f.label}</span>
          </label>
        ))}
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save features"}</button>
    </form>
  );
}

export function ThemeForm({ themes, currentId }: { themes: { id: string; name: string; key: string; description: string }[]; currentId: string }) {
  const [state, action, pending] = useActionState<ManageState, FormData>(setTheme, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Storefront theme</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {themes.map((t) => (
          <label
            key={t.id}
            className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer"
            style={{ borderColor: currentId === t.id ? "var(--c-primary)" : "rgba(0,0,0,.12)", background: currentId === t.id ? "rgba(29,78,216,.05)" : undefined }}
          >
            <input type="radio" name="themeId" value={t.id} defaultChecked={t.id === currentId} className="mt-1" />
            <span>
              <b className="block text-sm">{t.name}</b>
              <span className="text-xs text-muted">{t.description}</span>
            </span>
          </label>
        ))}
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Apply theme"}</button>
    </form>
  );
}

export function BranchForm() {
  const [state, action, pending] = useActionState<ManageState, FormData>(saveBranch, {});
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="label" htmlFor="br-name">Branch name</label>
        <input id="br-name" name="name" required className="input" placeholder="Main showroom" />
      </div>
      <div>
        <label className="label" htmlFor="br-city">City</label>
        <input id="br-city" name="city" className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="br-addr">Address</label>
        <input id="br-addr" name="address" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="br-phone">Phone</label>
        <input id="br-phone" name="phone" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="br-hours">Hours</label>
        <input id="br-hours" name="hours" defaultValue="10:00 AM - 9:00 PM" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="br-gstin">GSTIN (optional)</label>
        <input id="br-gstin" name="gstin" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="br-map">Map URL (optional)</label>
        <input id="br-map" name="mapUrl" className="input" />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button className="btn btn-primary !min-h-10" disabled={pending}>{pending ? "Adding…" : "Add branch"}</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export { toggleBranch };

const STAFF_MODULES = [
  ["products", "Catalog"],
  ["orders", "Orders"],
  ["inventory", "Inventory"],
  ["queries", "Leads"],
  ["appointments", "Appointments"],
  ["schemes", "Schemes"],
  ["coupons", "Marketing"],
  ["reports", "Reports"],
  ["settings", "Settings"],
  ["media", "Media"],
];

export function StaffAddForm() {
  const [state, action, pending] = useActionState<StaffState, FormData>(saveStaff, {});
  return (
    <form action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Add staff login</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="st-name">Name</label>
          <input id="st-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="st-email">Email</label>
          <input id="st-email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="st-pass">Temp password</label>
          <input id="st-pass" name="password" type="text" required minLength={6} className="input" />
        </div>
      </div>
      <div>
        <p className="label">Modules this staff can access</p>
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          {STAFF_MODULES.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "rgba(0,0,0,.1)" }}>
              <input type="checkbox" name="modules" value={key} /> {label}
            </label>
          ))}
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create staff login"}</button>
    </form>
  );
}

export function StaffResetForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState<M2, FormData>(resetStaffPassword, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={userId} />
      <div>
        <label className="label" htmlFor={`rp-${userId}`}>New password for {name}</label>
        <input id={`rp-${userId}`} name="password" type="text" required minLength={6} className="input !min-h-9 text-sm !w-44" />
      </div>
      <button className="btn btn-ghost !min-h-9 text-sm" disabled={pending}>{pending ? "…" : "Reset"}</button>
      <Msg state={state} />
    </form>
  );
}

export function StaffDeactivateButton({ userId }: { userId: string }) {
  return (
    <form action={deleteStaff}>
      <input type="hidden" name="id" value={userId} />
      <button className="text-xs underline" style={{ color: "var(--c-danger)" }}>Deactivate</button>
    </form>
  );
}
