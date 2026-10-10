import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { dashboardKpis, revenueSeries } from "@/lib/reports";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";

export const metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  const [kpis, series, recent, pendingAppts, openQueries] = await Promise.all([
    dashboardKpis(tenant.id),
    revenueSeries(tenant.id, 14),
    db.order.findMany({
      where: { shopId: tenant.id },
      orderBy: { placedAt: "desc" },
      take: 6,
      include: { user: { select: { name: true } }, items: { select: { name: true } } },
    }),
    db.appointment.count({ where: { shopId: tenant.id, status: "PENDING" } }),
    db.query.count({ where: { shopId: tenant.id, status: { in: ["NEW", "IN_PROGRESS"] } } }),
  ]);

  const cards = [
    { label: "Today revenue", value: formatINR(kpis.todayRevenuePaise), sub: `${kpis.todayOrders} orders` },
    { label: "Month revenue", value: formatINR(kpis.monthRevenuePaise), sub: `${kpis.monthOrders} orders` },
    { label: "Profit (month)", value: formatINR(kpis.profitPaise), sub: `${kpis.pnlPct}% margin` },
    { label: "Customers", value: String(kpis.totalCustomers), sub: `+${kpis.newCustomersMonth} this month` },
    { label: "Inventory value", value: formatINR(kpis.inventoryValuePaise), sub: `${kpis.lowStockCount} low stock` },
    { label: "Open queries", value: String(openQueries), sub: "Need replies" },
    { label: "Appointments", value: String(pendingAppts), sub: "Pending confirmation" },
    { label: "Revenue ex-GST", value: formatINR(kpis.revenueExGstPaise), sub: "Month, net of tax" },
  ];

  const max = Math.max(...series.map((s) => s.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted">
            {tenant.name} · {session?.name} ({session?.role.toLowerCase()})
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${slug}/admin/reports`} className="btn btn-ghost !min-h-10 text-sm">Reports</Link>
          <Link href={`/${slug}/admin/orders`} className="btn btn-primary !min-h-10 text-sm">Orders</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{c.label}</p>
            <p className="text-lg font-bold mt-1 truncate">{c.value}</p>
            <p className="text-xs text-muted mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Revenue · last 14 days</h2>
          <span className="text-xs text-muted">peak {formatINR(max)}</span>
        </div>
        <div className="flex items-end gap-1.5 h-36">
          {series.map((s) => {
            const h = Math.max(2, Math.round((s.revenue / max) * 100));
            return (
              <div key={s.date} className="flex-1 group relative flex flex-col justify-end h-full">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${h}%`, background: "var(--c-primary)", opacity: 0.85 }}
                  title={`${s.date}: ${formatINR(s.revenue)} (${s.orders} orders)`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted mt-2">
          <span>{series[0]?.date.slice(5)}</span>
          <span>{series[series.length - 1]?.date.slice(5)}</span>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href={`/${slug}/admin/orders`} className="text-sm underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Order</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Items</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3 font-medium">{o.number}</td>
                  <td className="py-2.5 pr-3">{o.user.name}</td>
                  <td className="py-2.5 pr-3 text-muted max-w-[220px] truncate">
                    {o.items.map((i) => i.name).join(", ")}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold">{formatINR(o.totalPaise)}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,.07)" }}>
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <Link href={`/${slug}/admin/orders/${o.id}`} className="text-xs underline">Open</Link>
                  </td>
                </tr>
              ))}
              {recent.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No orders yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
