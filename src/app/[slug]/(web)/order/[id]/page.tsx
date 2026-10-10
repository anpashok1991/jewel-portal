import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { statusLabel, customerCanCancel } from "@/lib/order-state";
import { formatINR, formatWeightMg } from "@/lib/money";
import UpiQr from "@/components/store/UpiQr";
import { CancelButton, ReturnButton } from "@/components/store/OrderActions";

export const metadata: Metadata = { title: "Order Status" };

const STEPS = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

export default async function OrderPage(props: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session) redirect(`/account/login?next=/${slug}/order/${id}`);

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "asc" } },
      branch: true,
      shop: { select: { slug: true, upiVpa: true, upiName: true, enableUpiQr: true, name: true } },
    },
  });
  if (!order || order.shopId !== tenant.id) notFound();

  const isOwner = order.userId === session.uid;
  const isStaff = (session.role === "OWNER" || session.role === "STAFF") && session.shopId === tenant.id;
  if (!isOwner && !isStaff) redirect(`/${slug}`);

  let address: Record<string, string> = {};
  try {
    address = JSON.parse(order.addressJson);
  } catch {
    address = {};
  }

  const stepIndex = STEPS.indexOf(order.status);
  const cancelled = ["CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(order.status);
  const paid = order.paymentStatus === "PAID";

  const moneyRows: [string, number][] = [
    ["Subtotal", order.subTotalPaise],
    ...(order.couponPaise ? ([["Coupon discount", -order.couponPaise]] as [string, number][]) : []),
    ...(order.loyaltyPaise ? ([["Loyalty points", -order.loyaltyPaise]] as [string, number][]) : []),
    ...(order.giftCardPaise ? ([["Gift card", -order.giftCardPaise]] as [string, number][]) : []),
    ...(order.platformFeePaise ? ([["Platform fee", order.platformFeePaise]] as [string, number][]) : []),
    ["GST", order.gstPaise],
    ...(order.shippingPaise ? ([["Shipping", order.shippingPaise]] as [string, number][]) : []),
    ...(order.codFeePaise ? ([["COD fee", order.codFeePaise]] as [string, number][]) : []),
    ...(order.roundOffPaise ? ([["Round off", order.roundOffPaise]] as [string, number][]) : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="badge" style={cancelled ? { background: "color-mix(in srgb, var(--c-danger) 18%, transparent)", color: "var(--c-danger)" } : undefined}>
              {statusLabel(order.status)}
            </span>
            <h1 className="section-title !text-2xl mt-2">{order.number}</h1>
            <p className="text-sm text-muted mt-1">
              Placed {new Date(order.placedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              {order.etaDate ? ` · ETA ${new Date(order.etaDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Order total</div>
            <div className="text-2xl font-bold" style={{ color: "var(--c-primary)" }}>{formatINR(order.totalPaise)}</div>
            <div className="text-xs" style={{ color: paid ? "#178a50" : "var(--c-muted)" }}>
              {order.paymentMethod} · {order.paymentStatus}
            </div>
          </div>
        </div>

        {/* progress */}
        {!cancelled && order.status !== "CANCELLED" ? (
          <div className="mt-7">
            <div className="flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center relative">
                  {i > 0 ? (
                    <div
                      className="absolute top-3 right-1/2 w-full h-0.5"
                      style={{ background: i <= stepIndex ? "var(--c-primary)" : "color-mix(in srgb, var(--c-muted) 35%, transparent)" }}
                    />
                  ) : null}
                  <div
                    className="h-6 w-6 rounded-full grid place-items-center text-[11px] z-10"
                    style={{
                      background: i <= stepIndex ? "var(--c-primary)" : "color-mix(in srgb, var(--c-muted) 30%, transparent)",
                      color: i <= stepIndex ? "#fff" : "var(--c-muted)",
                    }}
                  >
                    {i < stepIndex ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] mt-1.5 text-center leading-tight">{statusLabel(s)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm" style={{ color: "var(--c-danger)" }}>
            {order.cancelReason ? `Cancellation reason: ${order.cancelReason}` : ""}
          </div>
        )}

        {/* UPI pending block */}
        {order.paymentMethod === "UPI" && !paid && order.shop.enableUpiQr && order.shop.upiVpa ? (
          <div className="mt-6 card p-4 flex flex-wrap items-center gap-5" style={{ border: "1px dashed var(--c-gold)" }}>
            <UpiQr vpa={order.shop.upiVpa} name={order.shop.upiName || order.shop.name} amountPaise={order.totalPaise} note={order.number} width={150} />
            <div className="text-sm">
              <div className="font-bold">Pay {formatINR(order.totalPaise)} via UPI</div>
              <p className="text-muted mt-1">Scan the QR with any UPI app, then share the UTR/receipt at the store — or pay at pickup.</p>
              <p className="text-xs mt-1">VPA: <b>{order.shop.upiVpa}</b></p>
            </div>
          </div>
        ) : null}

        {/* courier */}
        {order.courier || order.awb ? (
          <div className="mt-5 text-sm">
            <b>{order.courier}</b> {order.awb ? `· AWB ${order.awb}` : ""}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        {/* items + timeline */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-bold">Items</h2>
            <ul className="mt-3 divide-y" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 25%, transparent)" }}>
              {order.items.map((it) => (
                <li key={it.id} className="py-3 flex justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-muted">
                      {it.purity} · {formatWeightMg(it.netWeightMg)} × {it.qty}
                      {it.gstExempt ? " · GST exempt" : ""}
                    </div>
                  </div>
                  <div className="text-right font-semibold whitespace-nowrap">{formatINR(it.lineTotalPaise)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t space-y-1 text-sm" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 30%, transparent)" }}>
              {moneyRows.map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted">{k}</span>
                  <span>{v < 0 ? "−" : ""}{formatINR(Math.abs(v))}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2">
                <span>Total</span>
                <span style={{ color: "var(--c-primary)" }}>{formatINR(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">Timeline</h2>
            <ol className="mt-3 space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: "var(--c-primary)" }} />
                  <div>
                    <div className="font-semibold">{statusLabel(e.status)} <span className="font-normal text-muted">· {e.actor}</span></div>
                    {e.note ? <div className="text-xs text-muted">{e.note}</div> : null}
                    <div className="text-[11px] text-muted">{new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* side */}
        <div className="space-y-4">
          <div className="card p-5 text-sm space-y-2">
            <h2 className="font-bold">{order.fulfillment === "PICKUP" ? "Pickup details" : "Delivery address"}</h2>
            <p className="text-muted">{address.name} · {address.phone}</p>
            <p className="text-muted">
              {order.fulfillment === "PICKUP"
                ? `${order.branch.name}${order.branch.city ? `, ${order.branch.city}` : ""}`
                : [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
            </p>
            <p className="text-xs text-muted">{order.branch.address}{order.branch.city ? `, ${order.branch.city}` : ""} · {order.branch.phone}</p>
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="font-bold">Documents</h2>
            {order.invoiceNumber ? (
              <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer" className="btn w-full">
                Download GST invoice (PDF)
              </a>
            ) : (
              <p className="text-xs text-muted">GST invoicing is disabled for this shop.</p>
            )}
            <Link href={`/${slug}/contact`} className="btn btn-ghost w-full">Need help?</Link>
          </div>

          {isOwner && customerCanCancel(order.status) ? (
            <CancelButton orderId={order.id} slug={slug} />
          ) : null}
          {isOwner && order.status === "DELIVERED" ? (
            <ReturnButton orderId={order.id} slug={slug} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
