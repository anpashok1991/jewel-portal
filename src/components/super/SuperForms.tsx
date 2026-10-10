"use client";

import { useActionState } from "react";
import { loginSuperAdmin, type AuthState } from "@/actions/auth";
import { createShop, updateShop, setShopFeatures, savePlan, createPlatformUser, type SuperState } from "@/actions/super";
import { FEATURE_LIST } from "@/lib/constants";

function Msg({ state }: { state: { ok?: boolean; error?: string } }) {
  if (state?.error) return <p className="text-xs" style={{ color: "#f87171" }}>{state.error}</p>;
  if (state?.ok) return <p className="text-xs" style={{ color: "#4ade80" }}>Saved ✓</p>;
  return null;
}

export function SuperLoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginSuperAdmin, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="admin@jewelportal.in" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>
      {state?.error ? <p className="text-sm" style={{ color: "#f87171" }}>{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

type Opt = { id: string; label: string };

export function CreateShopForm({ themes, plans }: { themes: Opt[]; plans: Opt[] }) {
  const [state, action, pending] = useActionState<SuperState, FormData>(createShop, {});
  return (
    <form action={action} className="card p-5 space-y-4" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">Launch a new shop</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="cs-name">Shop name</label>
          <input id="cs-name" name="name" required className="input" placeholder="Vasant Jewellers" />
        </div>
        <div>
          <label className="label" htmlFor="cs-slug">Slug (URL)</label>
          <input id="cs-slug" name="slug" className="input" placeholder="auto from name if empty" />
        </div>
        <div>
          <label className="label" htmlFor="cs-domain">Custom domain (optional)</label>
          <input id="cs-domain" name="customDomain" className="input" placeholder="maaanjani.in — leave blank to use /slug" />
        </div>
        <div>
          <label className="label" htmlFor="cs-theme">Theme</label>
          <select id="cs-theme" name="themeId" required className="input" defaultValue={themes[0]?.id ?? ""}>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cs-plan">Platform plan</label>
          <select id="cs-plan" name="planId" className="input" defaultValue="">
            <option value="">(none)</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cs-oname">Owner name</label>
          <input id="cs-oname" name="ownerName" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cs-oemail">Owner email</label>
          <input id="cs-oemail" name="ownerEmail" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="cs-opass">Owner password</label>
          <input id="cs-opass" name="ownerPassword" type="text" required minLength={6} className="input" placeholder="6+ characters" />
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Launching…" : "Launch shop"}</button>
    </form>
  );
}

export function ShopEditForm({ shop, themes, plans }: { shop: { id: string; name: string; status: string; themeId: string; planId: string | null; customDomain: string | null }; themes: Opt[]; plans: Opt[] }) {
  const [state, action, pending] = useActionState<SuperState, FormData>(updateShop, {});
  return (
    <form action={action} className="card p-5 space-y-4" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">Shop profile</h2>
      <input type="hidden" name="id" value={shop.id} />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="se-name">Name</label>
          <input id="se-name" name="name" required defaultValue={shop.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="se-status">Status</label>
          <select id="se-status" name="status" defaultValue={shop.status} className="input">
            <option value="ACTIVE">ACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="se-domain">Custom domain</label>
          <input id="se-domain" name="customDomain" defaultValue={shop.customDomain ?? ""} className="input" placeholder="maaanjani.in — blank = use /{slug} path only" />
          <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>
            Point the domain&apos;s A record at this app; the whole site serves from the domain root.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="se-theme">Theme</label>
          <select id="se-theme" name="themeId" defaultValue={shop.themeId} className="input">
            {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="se-plan">Plan</label>
          <select id="se-plan" name="planId" defaultValue={shop.planId ?? ""} className="input">
            <option value="">(none)</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save shop"}</button>
    </form>
  );
}

export function ShopFeaturesForm({ shopId, enabled }: { shopId: string; enabled: Record<string, boolean> }) {
  const [state, action, pending] = useActionState<SuperState, FormData>(setShopFeatures, {});
  return (
    <form action={action} className="card p-5 space-y-4" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">Feature flags</h2>
      <input type="hidden" name="id" value={shopId} />
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        {FEATURE_LIST.map((f) => (
          <label key={f.key} className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "rgba(255,255,255,.1)" }}>
            <input type="checkbox" name={`feat_${f.key}`} defaultChecked={enabled[f.key] ?? false} />
            <span className="text-white/85">{f.label}</span>
          </label>
        ))}
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save features"}</button>
    </form>
  );
}

export function PlanForm({ plan }: { plan?: { id: string; name: string; pricePaise: number; featuresJson: string } }) {
  const [state, action, pending] = useActionState<SuperState, FormData>(savePlan, {});
  return (
    <form action={action} className="card p-5 space-y-4" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">{plan ? "Edit plan" : "New plan"}</h2>
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="pl-name">Plan name</label>
          <input id="pl-name" name="name" required defaultValue={plan?.name ?? ""} className="input" placeholder="Gold" />
        </div>
        <div>
          <label className="label" htmlFor="pl-price">Price ₹ / month</label>
          <input id="pl-price" name="priceRs" type="number" min={0} defaultValue={plan ? plan.pricePaise / 100 : 0} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="pl-feats">Included features (JSON array of feature keys)</label>
        <textarea id="pl-feats" name="featuresJson" rows={3} className="input font-mono text-xs" defaultValue={plan?.featuresJson ?? '["storefront", "ecommerce", "invoices_gst"]'} />
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : plan ? "Update plan" : "Create plan"}</button>
    </form>
  );
}

export function PlatformUserForm() {
  const [state, action, pending] = useActionState<SuperState, FormData>(createPlatformUser, {});
  return (
    <form action={action} className="card p-5 space-y-4" style={{ background: "#161a22", borderColor: "rgba(255,255,255,.08)" }}>
      <h2 className="font-semibold text-white">Add platform user</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="pu-name">Name</label>
          <input id="pu-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pu-email">Email</label>
          <input id="pu-email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pu-pass">Password</label>
          <input id="pu-pass" name="password" type="text" required minLength={6} className="input" placeholder="6+ characters" />
        </div>
      </div>
      <Msg state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create user"}</button>
    </form>
  );
}
