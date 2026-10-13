import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/constants";
import { applyOrderStatus, markRefunded } from "@/actions/admin/orders";
import { requestOrigin } from "@/lib/auth";
import { purchaseDetailsMessage, waMeUrl } from "@/lib/whatsapp";

export const metadata = { title: "Order detail · Admin" };
export const dynamic = "force-dynamic";

type Addr = { name?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string };

const ACTION_LABEL: Record<string, string> = {
  CONFIRMED: "Confirm order",
  PACKED: "Mark packed",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel order",
  RETURNED: "Accept return",
  REFUNDED: "Mark refunded",
};

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const tenant = await requireTenant(slug);

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true, address: true } },
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      invoice: { select: { number: true, issuedAt: true } },
    },
  });
  if (!order || order.shopId !== tenant.id) notFound();

  const addr = (() => {
    try {
      return JSON.parse(order.addressJson) as Addr;
    } catch {
      return {} as Addr;
    }
  })();
  const transitions = ORDER_TRANSITIONS[order.status as OrderStatus] ?? [];
  const paid = order.paymentStatus === "PAID";

  const customerPhone = (order.user.phone || addr.phone || "").replace(/[^\d]/g, "");
  const waMessage = purchaseDetailsMessage({
    shopName: tenant.name,
    orderNumber: order.number,
    placedAt: order.placedAt,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items.map((it) => ({
      name: it.name,
      purity: it.purity,
      qty: it.qty,
      netWeightMg: it.netWeightMg,
      lineTotalPaise: it.lineTotalPaise,
    })),
    subTotalPaise: order.subTotalPaise,
    discountPaise: order.discountPaise + order.couponPaise + order.loyaltyPaise + order.giftCardPaise || undefined,
    shippingPaise: order.shippingPaise || undefined,
    gstPaise: order.gstPaise,
    totalPaise: order.totalPaise,
    trackUrl: `${await requestOrigin()}/${slug}/order/${order.id}`,
    intro: `Namaste ${order.user.name}, here are your purchase details from ${tenant.name}:`,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Order</p>
          <h1 className="text-2xl font-bold">{order.number}</h1>
          <p className="text-sm text-muted">
            {new Date(order.placedAt).toLocaleString("en-IN")} · {order.fulfillment} · {order.branch.name}
          </p>
        </div>
        <div className="text-right space-y-1">
          <span className="text-xs px-2.5 py-1 rounded-full inline-block" style={{ background: "rgba(0,0,0,.08)" }}>
            {statusLabel(order.status)}
          </span>
          <p className="text-2xl font-bold">{formatINR(order.totalPaise)}</p>
          <p className="text-xs text-muted">
            {order.paymentMethod} · {order.paymentStatus}
            {order.razorpayOrderId ? ` · ${order.razorpayOrderId}` : ""}
          </p>
          {order.invoice ? (
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" className="text-xs underline block">
              Invoice {order.invoice.number} (PDF)
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Purity</th>
                  <th className="py-2 pr-3">Weight</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                    <td className="py-2 pr-3">{it.name}</td>
                    <td className="py-2 pr-3 text-muted">{it.purity}</td>
                    <td className="py-2 pr-3 text-muted">{(it.netWeightMg / 1000).toFixed(3)}g</td>
                    <td className="py-2 pr-3">{it.qty}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{formatINR(it.lineTotalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="text-sm grid sm:grid-cols-2 gap-x-8 gap-y-1 max-w-lg ml-auto">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatINR(order.subTotalPaise)}</dd></div>
            {order.discountPaise ? <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{formatINR(order.discountPaise)}</dd></div> : null}
            {order.couponPaise ? <div className="flex justify-between"><dt className="text-muted">Coupon {order.couponCode}</dt><dd>−{formatINR(order.couponPaise)}</dd></div> : null}
            {order.giftCardPaise ? <div className="flex justify-between"><dt className="text-muted">Gift card</dt><dd>−{formatINR(order.giftCardPaise)}</dd></div> : null}
            {order.loyaltyPaise ? <div className="flex justify-between"><dt className="text-muted">Loyalty ({order.loyaltyPointsUsed} pts)</dt><dd>−{formatINR(order.loyaltyPaise)}</dd></div> : null}
            {order.platformFeePaise ? <div className="flex justify-between"><dt className="text-muted">Platform fee</dt><dd>{formatINR(order.platformFeePaise)}</dd></div> : null}
            {order.shippingPaise ? <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatINR(order.shippingPaise)}</dd></div> : null}
            {order.codFeePaise ? <div className="flex justify-between"><dt className="text-muted">COD fee</dt><dd>{formatINR(order.codFeePaise)}</dd></div> : null}
            <div className="flex justify-between"><dt className="text-muted">GST</dt><dd>{formatINR(order.gstPaise)}</dd></div>
            {order.roundOffPaise ? <div className="flex justify-between"><dt className="text-muted">Round off</dt><dd>{formatINR(order.roundOffPaise)}</dd></div> : null}
            <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: "rgba(0,0,0,.1)" }}>
              <dt>Total</dt><dd>{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-semibold mb-3">Customer</h2>
            <p className="text-sm font-medium">{order.user.name}</p>
            <p className="text-sm text-muted">{order.user.email}</p>
            {order.user.phone ? <p className="text-sm text-muted">{order.user.phone}</p> : null}
            {order.fulfillment === "DELIVERY" && addr.line1 ? (
              <p className="text-sm text-muted mt-2">
                {addr.name}<br />
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                {addr.city}, {addr.state} — {addr.pincode}<br />
                ☎ {addr.phone}
              </p>
            ) : (
              <p className="text-sm text-muted mt-2">Store pickup at {order.branch.name}<br />{order.branch.address}</p>
            )}
            {tenant.whatsappOrderShare && customerPhone ? (
              <a
                href={waMeUrl(customerPhone, waMessage)}
                target="_blank"
                rel="noreferrer"
                className="btn !min-h-10 text-sm w-full mt-3"
                style={{ background: "#25D366", color: "#fff" }}
              >
                Send purchase details on WhatsApp
              </a>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">Update status</h2>
            {transitions.length === 0 ? (
              <p className="text-sm text-muted">No further transitions from {statusLabel(order.status)}.</p>
            ) : (
              <form action={applyOrderStatus} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div>
                  <label className="label" htmlFor="note">Note (optional)</label>
                  <input id="note" name="note" className="input !min-h-10 text-sm" placeholder="e.g. handed to Blue Dart" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((to) => (
                    <button
                      key={to}
                      name="to"
                      value={to}
                      className="btn !min-h-10 text-sm"
                      style={
                        to === "CANCELLED"
                          ? { background: "#fee2e2", color: "#991b1b" }
                          : { background: "rgba(29,78,216,.1)", color: "#1d4ed8" }
                      }
                    >
                      {ACTION_LABEL[to] ?? statusLabel(to)}
                    </button>
                  ))}
                </div>
              </form>
            )}

            {paid && (order.status === "CANCELLED" || order.status === "RETURNED") ? (
              <form action={markRefunded} className="mt-3 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,.1)" }}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="btn btn-primary !min-h-10 text-sm w-full">Confirm refund received</button>
                <p className="text-xs text-muted mt-1">Marks the payment as refunded and closes the order.</p>
              </form>
            ) : null}
            {order.refundStatus ? (
              <p className="text-xs text-muted mt-2">Refund: {order.refundStatus} · {formatINR(order.refundPaise)}</p>
            ) : null}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold mb-3">Timeline</h2>
            <ul className="space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: "var(--c-primary)" }} />
                  <div>
                    <p className="font-medium">{statusLabel(e.status)}</p>
                    {e.note ? <p className="text-xs text-muted">{e.note}</p> : null}
                    <p className="text-xs text-muted">
                      {new Date(e.createdAt).toLocaleString("en-IN")} · {e.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <Link href={`/${slug}/admin/orders`} className="btn btn-ghost w-full text-sm">← Back to orders</Link>
        </div>
      </div>
    </div>
  );
}
