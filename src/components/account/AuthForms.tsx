"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginCustomer, registerCustomer, type AuthState } from "@/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginCustomer, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-xs text-muted text-center">
        New here?{" "}
        <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({
  shops,
  defaultShopId,
  defaultShopSlug,
  next,
}: {
  shops: { id: string; slug: string; name: string }[];
  defaultShopId: string;
  defaultShopSlug: string;
  next: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerCustomer, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="shopId" value={defaultShopId} />
      <input type="hidden" name="shopSlug" value={defaultShopSlug} />
      <div>
        <label className="label" htmlFor="r-name">Full name</label>
        <input id="r-name" name="name" required autoComplete="name" className="input" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="r-email">Email</label>
          <input id="r-email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r-phone">Phone</label>
          <input id="r-phone" name="phone" inputMode="tel" autoComplete="tel" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="r-password">Password (6+ characters)</label>
        <input id="r-password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input" />
      </div>
      {shops.length > 1 ? (
        <div>
          <label className="label" htmlFor="r-shop">Preferred store</label>
          <select
            id="r-shop"
            className="input"
            defaultValue={defaultShopId}
            onChange={(e) => {
              const opt = e.target.selectedOptions[0];
              const slug = opt.getAttribute("data-slug") ?? "";
              const form = e.target.form;
              (form?.elements.namedItem("shopId") as HTMLInputElement | null)?.setAttribute("value", e.target.value);
              (form?.elements.namedItem("shopSlug") as HTMLInputElement | null)?.setAttribute("value", slug);
            }}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id} data-slug={s.slug}>{s.name}</option>
            ))}
          </select>
        </div>
      ) : null}
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
      <p className="text-xs text-muted text-center">
        Already registered?{" "}
        <Link href={`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Sign in</Link>
      </p>
    </form>
  );
}
