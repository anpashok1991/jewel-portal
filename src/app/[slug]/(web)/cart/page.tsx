import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireTenant, hasFeature } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartSummary } from "@/lib/cart";
import { formatINR, formatWeightMg } from "@/lib/money";
import { removeCartItem, updateCartQty } from "@/actions/cart";
import OrderSummary from "@/components/store/OrderSummary";
import CartOptions from "@/components/store/CartOptions";

export const metadata: Metadata = { title: "Shopping Cart" };

export default async function CartPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  if (!session) redirect(`/account/login?next=/${slug}/cart`);

  const [summary, shop] = await Promise.all([
    cartSummary(tenant, session.uid),
    db.shop.findUnique({ where: { id: tenant.id }, select: { loyaltyRedeemMaxBp: true } }),
  ]);

  if (!summary.lines.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-5xl">🛍️</div>
        <h1 className="section-title !text-2xl mt-3">Your cart is empty</h1>
        <p className="text-muted mt-2">Discover handcrafted pieces at live gold rates.</p>
        <Link href={`/${slug}/shop`} className="btn btn-primary mt-6">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h1 className="section-title !text-2xl">Shopping Cart</h1>
        <span className="text-sm text-muted">{summary.itemCount} item{summary.itemCount === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.5fr_1fr] gap-6 lg:gap-8 items-start">
        {/* items */}
        <div className="space-y-4">
          {summary.lines.map((l) => (
            <div key={l.itemId} className="card p-4 flex gap-4">
              <Link href={`/${slug}/p/${l.slug}`} className="shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-lg overflow-hidden" style={{ background: "color-mix(in srgb, var(--c-gold) 12%, var(--c-surface))" }}>
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image} alt={l.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-2xl opacity-40">✦</span>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <Link href={`/${slug}/p/${l.slug}`} className="font-semibold leading-snug hover:underline">
                    {l.name}
                  </Link>
                  <span className="font-bold whitespace-nowrap">{formatINR(l.line.lineTotalPaise)}</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  {l.purity} · {formatWeightMg(l.netWeightMg)}{l.variantLabel ? ` · ${l.variantLabel}` : ""}
                </div>
                <div className="text-xs text-muted">
                  {formatINR(l.line.unitSubPaise)} × {l.qty}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <form action={updateCartQty}>
                      <input type="hidden" name="itemId" value={l.itemId} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="qty" value={l.qty - 1} />
                      <button className="chip !min-h-9 !min-w-9 justify-center" aria-label="Decrease quantity" disabled={l.qty <= 1}>−</button>
                    </form>
                    <span className="w-9 text-center text-sm font-semibold">{l.qty}</span>
                    <form action={updateCartQty}>
                      <input type="hidden" name="itemId" value={l.itemId} />
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="qty" value={l.qty + 1} />
                      <button className="chip !min-h-9 !min-w-9 justify-center" aria-label="Increase quantity" disabled={l.qty >= 10}>+</button>
                    </form>
                  </div>
                  <form action={removeCartItem}>
                    <input type="hidden" name="itemId" value={l.itemId} />
                    <input type="hidden" name="slug" value={slug} />
                    <button className="text-xs underline text-muted hover:text-danger">Remove</button>
                  </form>
                </div>
              </div>
            </div>
          ))}

          <Link href={`/${slug}/shop`} className="inline-block text-sm underline text-muted">← Continue shopping</Link>
        </div>

        {/* summary */}
        <div className="card p-5 lg:sticky lg:top-24 space-y-5">
          <OrderSummary totals={summary.totals} itemCount={summary.itemCount} />

          <div className="hairline" />

          <CartOptions
            shopId={tenant.id}
            slug={slug}
            couponCode={summary.couponCode}
            giftCardCode={summary.giftCardCode}
            useLoyalty={summary.useLoyalty}
            loyaltyPoints={summary.loyaltyPoints}
            redeemMaxBp={shop?.loyaltyRedeemMaxBp ?? 0}
            features={{
              coupons: hasFeature(tenant, "coupons"),
              giftcards: hasFeature(tenant, "giftcards"),
              loyalty: hasFeature(tenant, "loyalty"),
            }}
          />

          <Link href={`/${slug}/checkout`} className="btn btn-primary w-full !min-h-12 text-center block">
            Proceed to checkout
          </Link>
          <p className="text-[11px] text-muted text-center">Secure checkout · GST invoice · insured delivery</p>
        </div>
      </div>
    </div>
  );
}
