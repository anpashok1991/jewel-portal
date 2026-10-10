"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginShopAdmin, type AuthState } from "@/actions/auth";

export function AdminLoginForm({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginShopAdmin, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="shopSlug" value={shopSlug} />
      <p className="text-sm text-muted">Signing in to <b>{shopName}</b> admin</p>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="owner@shop.in" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button className="btn btn-primary w-full !min-h-12" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-xs text-muted text-center">
        Customer? <Link href="/account/login" className="underline">Customer login</Link> · <Link href={`/${shopSlug}`} className="underline">Back to store</Link>
      </p>
    </form>
  );
}
