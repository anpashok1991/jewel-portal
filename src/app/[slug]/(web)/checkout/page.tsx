import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireTenant, hasFeature } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartSummary } from "@/lib/cart";
import { formatINR } from "@/lib/money";
import OrderSummary from "@/components/store/OrderSummary";
import CheckoutForm from "@/components/store/CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session) redirect(`/account/login?next=/${slug}/checkout`);

  const [summary, addresses, shop, branches] = await Promise.all([
    cartSummary(tenant, session.uid),
    db.address.findMany({ where: { userId: session.uid }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    db.shop.findUnique({ where: { id: tenant.id } }),
    db.branch.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { isDefault: "desc" } }),
  ]);

  if (!summary.lines.length) redirect(`/${slug}/cart`);
  if (!shop) redirect(`/${slug}/cart`);

  const methods = {
    cod: shop.enableCod && hasFeature(tenant, "cod") && summary.totals.totalPaise <= shop.codMaxPaise,
    razorpay: shop.enableRazorpay && hasFeature(tenant, "razorpay") && Boolean(shop.razorpayKeyId),
    upi: shop.enableUpiQr && hasFeature(tenant, "upi_qr") && Boolean(shop.upiVpa),
  };
  const defaultMethod = methods.razorpay ? "RAZORPAY" : methods.upi ? "UPI" : methods.cod ? "COD" : "";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-xs text-muted mb-4">
        <Link href={`/${slug}/cart`} className="hover:underline">Cart</Link> / <span>Checkout</span>
      </nav>
      <h1 className="section-title !text-2xl">Checkout</h1>

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8 items-start">
        <div className="space-y-6">
          <section className="card p-5">
            <CheckoutForm
              slug={slug}
              totalPaise={summary.totals.totalPaise}
              itemCount={summary.itemCount}
              methods={methods}
              defaultMethod={defaultMethod}
              branches={branches.map((b) => ({ id: b.id, name: b.name, city: b.city }))}
            >
              <div>
                <h2 className="font-bold">Delivery address</h2>
                {addresses.length ? (
                  <div className="mt-3 space-y-2">
                    {addresses.map((a, i) => (
                      <label key={a.id} className="card p-3 flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="addressId"
                          value={a.id}
                          defaultChecked={i === 0}
                          className="mt-1"
                          style={{ accentColor: "var(--c-primary)" }}
                        />
                        <span className="text-sm">
                          <b>{a.name}</b> · {a.label}<br />
                          <span className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}</span><br />
                          <span className="text-muted">{a.phone}</span>
                        </span>
                      </label>
                    ))}
                    <details className="card p-3">
                      <summary className="text-sm font-semibold cursor-pointer">+ Ship to a new address</summary>
                      <div className="mt-3 grid sm:grid-cols-2 gap-3">
                        <input name="name" className="input" placeholder="Full name" />
                        <input name="phone" className="input" inputMode="tel" placeholder="10-digit phone" />
                        <input name="line1" className="input sm:col-span-2" placeholder="House no, street, area" />
                        <input name="line2" className="input sm:col-span-2" placeholder="Landmark (optional)" />
                        <input name="city" className="input" placeholder="City" />
                        <input name="state" className="input" placeholder="State" />
                        <input name="pincode" className="input" placeholder="PIN code" />
                        <label className="flex items-center gap-2 text-xs self-center">
                          <input type="checkbox" name="saveAddress" defaultChecked style={{ accentColor: "var(--c-primary)" }} />
                          Save this address
                        </label>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <input name="name" className="input" placeholder="Full name" required />
                    <input name="phone" className="input" inputMode="tel" placeholder="10-digit phone" required />
                    <input name="line1" className="input sm:col-span-2" placeholder="House no, street, area" required />
                    <input name="line2" className="input sm:col-span-2" placeholder="Landmark (optional)" />
                    <input name="city" className="input" placeholder="City" required />
                    <input name="state" className="input" placeholder="State" required />
                    <input name="pincode" className="input" placeholder="PIN code" required />
                    <label className="flex items-center gap-2 text-xs self-center">
                      <input type="checkbox" name="saveAddress" defaultChecked style={{ accentColor: "var(--c-primary)" }} />
                      Save this address
                    </label>
                  </div>
                )}
              </div>
            </CheckoutForm>
          </section>
        </div>

        {/* summary */}
        <div className="card p-5 lg:sticky lg:top-24">
          <h2 className="font-bold mb-3">Order summary</h2>
          <ul className="space-y-2 mb-4">
            {summary.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between gap-3 text-sm">
                <span className="text-muted">
                  {l.name} {l.variantLabel ? `(${l.variantLabel})` : ""} × {l.qty}
                </span>
                <span className="font-medium whitespace-nowrap">{formatINR(l.line.lineTotalPaise)}</span>
              </li>
            ))}
          </ul>
          <div className="hairline mb-3" />
          <OrderSummary totals={summary.totals} itemCount={summary.itemCount} />
        </div>
      </div>
    </div>
  );
}
