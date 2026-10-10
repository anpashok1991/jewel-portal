import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";
import { ORDER_STATUSES } from "@/lib/constants";

export const metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { status = "", q = "" } = await searchParams;
  const tenant = await requireTenant(slug);

  const where = {
    shopId: tenant.id,
    ...(ORDER_STATUSES.includes(status as never) ? { status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, phone: true } }, branch: { select: { name: true } } },
    }),
    db.order.groupBy({ by: ["status"], where: { shopId: tenant.id }, _count: { _all: true } }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));
  const active = status || "ALL";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted">{orders.length} shown · {countMap.get("PLACED") ?? 0} awaiting confirmation</p>
        </div>
        <form className="flex gap-2" action={`/${slug}/admin/orders`} method="GET">
          <input name="q" defaultValue={q} placeholder="Search number or customer" className="input !min-h-10 !w-56 text-sm" />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <button className="btn btn-ghost !min-h-10 text-sm">Search</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/${slug}/admin/orders`}
          className="px-3 py-1.5 rounded-full text-xs font-semibold"
          style={active === "ALL" ? { background: "var(--c-primary)", color: "#fff" } : { background: "rgba(0,0,0,.06)" }}
        >
          All ({[...countMap.values()].reduce((a, b) => a + b, 0)})
        </Link>
        {ORDER_STATUSES.map((st) => (
          <Link
            key={st}
            href={`/${slug}/admin/orders?status=${st}`}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={active === st ? { background: "var(--c-primary)", color: "#fff" } : { background: "rgba(0,0,0,.06)" }}
          >
            {statusLabel(st)} ({countMap.get(st) ?? 0})
          </Link>
        ))}
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Order</th>
              <th className="py-2 pr-3">Placed</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Branch</th>
              <th className="py-2 pr-3">Payment</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                <td className="py-2.5 pr-3 font-medium">{o.number}</td>
                <td className="py-2.5 pr-3 text-muted whitespace-nowrap">
                  {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </td>
                <td className="py-2.5 pr-3">{o.user.name}</td>
                <td className="py-2.5 pr-3 text-muted">{o.branch.name}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs">
                    {o.paymentMethod} · <b>{o.paymentStatus}</b>
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-semibold whitespace-nowrap">{formatINR(o.totalPaise)}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "rgba(0,0,0,.07)" }}>
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <Link href={`/${slug}/admin/orders/${o.id}`} className="text-xs underline font-semibold">Open</Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted">No orders match this filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
