import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const orders = await db.order.findMany({
    where: { userId: session.uid },
    orderBy: { placedAt: "desc" },
    include: { items: { select: { name: true, qty: true } }, shop: { select: { slug: true, name: true } }, branch: { select: { name: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>My orders</h1>
        <p className="text-sm text-muted">{orders.length} order{orders.length === 1 ? "" : "s"}</p>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted mb-4">No orders yet.</p>
          <Link href="/" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/${o.shop.slug}/order/${o.id}`} className="card p-4 block hover:-translate-y-0.5 transition-transform">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{o.number}</p>
                  <p className="text-xs text-muted truncate">
                    {o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{o.shop.name} · {o.branch.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded-full block w-fit ml-auto mb-1" style={{ background: "rgba(0,0,0,.06)" }}>
                    {statusLabel(o.status)}
                  </span>
                  <p className="font-bold">{formatINR(o.totalPaise)}</p>
                  <p className="text-xs" style={{ color: o.paymentStatus === "PAID" ? "var(--c-primary, #15803d)" : "#b45309" }}>
                    {o.paymentStatus === "PAID" ? "Paid" : `Payment ${o.paymentStatus.toLowerCase()}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
