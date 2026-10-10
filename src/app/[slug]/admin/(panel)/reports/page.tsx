import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { pnlSummary, collectionSplit, salesReportRows, gstReportRows, inventoryReportRows, inventoryStats } from "@/lib/reports";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Reports · Admin" };
export const dynamic = "force-dynamic";

type Sp = { from?: string; to?: string };

function parseRange(sp: Sp): { from: Date; to: Date; label: string } {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let from = monthStart;
  let to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (sp.from) {
    const d = new Date(`${sp.from}T00:00:00`);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (sp.to) {
    const d = new Date(`${sp.to}T23:59:59`);
    if (!Number.isNaN(d.getTime())) to = d;
  }
  const label = `${from.toLocaleDateString("en-IN")} – ${to.toLocaleDateString("en-IN")}`;
  return { from, to, label };
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-2 pr-3 text-left text-xs uppercase text-muted border-b whitespace-nowrap" style={{ borderColor: "rgba(0,0,0,.08)" }}>
      {children}
    </th>
  );
}

export default async function AdminReportsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Sp> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || !(await can(session, "reports", "view"))) redirect(`/${slug}/admin`);

  const { from, to, label } = parseRange(sp);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const [pnl, split, sales, gst, invRows, invStats, orderCount] = await Promise.all([
    pnlSummary(tenant.id, from, to),
    collectionSplit(tenant.id, from, to),
    salesReportRows(tenant.id, from, to),
    gstReportRows(tenant.id, from, to),
    inventoryReportRows(tenant.id),
    inventoryStats(tenant.id),
    db.order.count({ where: { shopId: tenant.id, placedAt: { gte: from, lte: to } } }),
  ]);
  const lowStock = invRows.filter((r) => r.status === "LOW");
  const base = `/slug/admin/reports/csv`.replace("/slug", `/${slug}`);

  const kpis = [
    { label: "Revenue (ex-GST)", value: formatINR(pnl.revenuePaise) },
    { label: "Cost of goods", value: formatINR(pnl.cogsPaise) },
    { label: "Gross profit", value: formatINR(pnl.profitPaise) },
    { label: "Margin", value: `${pnl.percent}%` },
    { label: "Orders", value: String(orderCount) },
    { label: "Inventory value", value: formatINR(invStats.costValuePaise) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted">{label}</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div>
            <label className="label" htmlFor="rp-from">From</label>
            <input id="rp-from" type="date" name="from" defaultValue={fromStr} className="input !min-h-9 w-40 text-sm" />
          </div>
          <div>
            <label className="label" htmlFor="rp-to">To</label>
            <input id="rp-to" type="date" name="to" defaultValue={toStr} className="input !min-h-9 w-40 text-sm" />
          </div>
          <button className="btn btn-ghost !min-h-9 text-sm">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="text-lg font-bold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold mb-3">Collections by method</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {split.map((c) => (
              <div key={c.method} className="rounded-lg border px-4 py-3" style={{ borderColor: "rgba(0,0,0,.1)" }}>
                <p className="text-xs text-muted">{c.method}</p>
                <p className="font-semibold">{formatINR(c.paise)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5 space-y-2">
          <h2 className="font-semibold">CSV downloads</h2>
          <a className="btn btn-ghost !min-h-9 text-sm w-full text-center" href={`${base}?kind=sales&from=${fromStr}&to=${toStr}`}>Sales report</a>
          <a className="btn btn-ghost !min-h-9 text-sm w-full text-center" href={`${base}?kind=gst&from=${fromStr}&to=${toStr}`}>GST report</a>
          <a className="btn btn-ghost !min-h-9 text-sm w-full text-center" href={`${base}?kind=inventory`}>Inventory report</a>
          <a className="btn btn-ghost !min-h-9 text-sm w-full text-center" href={`${base}?kind=rates`}>Rate card</a>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Sales ({sales.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Order</Th><Th>Date</Th><Th>Customer</Th><Th>Phone</Th><Th>Branch</Th><Th>Status</Th><Th>Payment</Th><Th>Total ₹</Th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 200).map((r) => (
                <tr key={r.order} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.order}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                  <td className="py-2 pr-3">{r.customer}</td>
                  <td className="py-2 pr-3 text-muted">{r.phone}</td>
                  <td className="py-2 pr-3">{r.branch}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3">{r.payment} · {r.paymentStatus}</td>
                  <td className="py-2 font-semibold">{Number(r.total).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {sales.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-muted">No orders in this range.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {sales.length > 200 ? <p className="text-xs text-muted mt-2">Showing first 200 — download the CSV for the full range.</p> : null}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">GST summary ({gst.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Invoice</Th><Th>Date</Th><Th>Customer</Th><Th>Taxable ₹</Th><Th>CGST ₹</Th><Th>SGST ₹</Th><Th>Total GST ₹</Th><Th>Exempt lines</Th>
              </tr>
            </thead>
            <tbody>
              {gst.slice(0, 200).map((r) => (
                <tr key={r.invoice} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.invoice}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>
                  <td className="py-2 pr-3">{r.customer}</td>
                  <td className="py-2 pr-3">{Number(r.taxable).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3">{Number(r.cgst).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3">{Number(r.sgst).toLocaleString("en-IN")}</td>
                  <td className="py-2 pr-3 font-semibold">{Number(r.totalGst).toLocaleString("en-IN")}</td>
                  <td className="py-2">{r.exemptLines}</td>
                </tr>
              ))}
              {gst.length === 0 ? (
                <tr><td colSpan={8} className="py-6 text-center text-muted">No GST rows in this range.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Low stock ({lowStock.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Product</Th><Th>SKU</Th><Th>Branch</Th><Th>Purity</Th><Th>Qty</Th><Th>Low at</Th><Th>Value ₹</Th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((r) => (
                <tr key={`${r.sku}-${r.branch}`} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 font-medium">{r.product}</td>
                  <td className="py-2 pr-3 text-muted">{r.sku}</td>
                  <td className="py-2 pr-3">{r.branch}</td>
                  <td className="py-2 pr-3">{r.purity}</td>
                  <td className="py-2 pr-3 font-semibold" style={{ color: "var(--c-danger)" }}>{r.qty}</td>
                  <td className="py-2 pr-3">{r.lowStockAt}</td>
                  <td className="py-2">{Number(r.costValue).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {lowStock.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-muted">All inventory levels are healthy.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
