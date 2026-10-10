"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart, type CartState } from "@/actions/cart";

type Branch = { id: string; name: string; city: string };
type Variant = { id: string; label: string; size: string };

export default function AddToCart({
  productId,
  slug,
  variants,
  branches,
  requireSize,
}: {
  productId: string;
  slug: string;
  variants: Variant[];
  branches: Branch[];
  requireSize: boolean;
}) {
  const [state, formAction, pending] = useActionState<CartState, FormData>(addToCart, {});
  const [variant, setVariant] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(() => router.push(`/${slug}/cart`), 600);
      return () => clearTimeout(t);
    }
  }, [state, router, slug]);

  const sizeRequired = requireSize && !variant;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="variantId" value={variant} />

      {variants.length ? (
        <div>
          <div className="label">Select size</div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className="chip"
                data-active={variant === v.id}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {branches.length > 1 ? (
        <div>
          <label className="label" htmlFor="branchId">Preferred branch</label>
          <select id="branchId" name="branchId" className="input" defaultValue={branches.find((b) => !b.city || true)?.id ?? ""}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.city ? ` — ${b.city}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : branches.length === 1 ? (
        <input type="hidden" name="branchId" value={branches[0].id} />
      ) : null}

      <div className="flex items-center gap-3">
        <div>
          <label className="label" htmlFor="qty">Qty</label>
          <input id="qty" name="qty" type="number" min={1} max={5} defaultValue={1} className="input !w-20 !min-h-11" />
        </div>
        <button type="submit" className="btn btn-primary flex-1 !min-h-12" disabled={pending || sizeRequired}>
          {pending ? "Adding…" : sizeRequired ? "Select a size" : "Add to cart"}
        </button>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm" style={{ color: "var(--c-primary)" }}>Added! Taking you to cart…</p> : null}
    </form>
  );
}
