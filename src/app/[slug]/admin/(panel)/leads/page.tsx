import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";
import { appointmentStatus, exchangeStatus, queryStatus } from "@/actions/admin/manage";

export const metadata = { title: "Leads · Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "appointments", label: "Appointments" },
  { key: "exchange", label: "Exchange requests" },
  { key: "queries", label: "Queries" },
] as const;

export default async function AdminLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "appointments" } = await searchParams;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || !(await can(session, "queries", "view"))) redirect(`/${slug}/admin`);

  const active = TABS.some((t) => t.key === tab) ? tab : "appointments";

  const [appointments, exchanges, queries] = await Promise.all([
    db.appointment.findMany({
      where: { shopId: tenant.id },
      orderBy: [{ status: "asc" }, { date: "asc" }],
      take: 60,
      include: { branch: { select: { name: true } } },
    }),
    db.exchangeRequest.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "desc" }, take: 60 }),
    db.query.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "desc" }, take: 60 }),
  ]);

  const counts = { appointments: appointments.length, exchange: exchanges.length, queries: queries.length };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Leads & enquiries</h1>
        <p className="text-sm text-muted">Appointments, gold-exchange requests and store queries.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/${slug}/admin/leads?tab=${t.key}`}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold"
            style={active === t.key ? { background: "var(--c-primary)", color: "#fff" } : { background: "rgba(0,0,0,.06)" }}
          >
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </div>

      {active === "appointments" ? (
        <section className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Service</th>
                <th className="py-2 pr-3">Branch</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{a.date} · {a.slot}</td>
                  <td className="py-2.5 pr-3">{a.name}<span className="block text-xs text-muted">{a.phone}</span></td>
                  <td className="py-2.5 pr-3">{a.service}{a.message ? <span className="block text-xs text-muted max-w-[220px] truncate">{a.message}</span> : null}</td>
                  <td className="py-2.5 pr-3 text-muted">{a.branch.name}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: a.status === "COMPLETED" ? "rgba(21,128,61,.12)" : a.status === "CANCELLED" ? "rgba(0,0,0,.07)" : "rgba(180,83,9,.12)" }}>
                      {statusLabel(a.status)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      {a.status === "PENDING" ? (
                        <form action={appointmentStatus} className="inline">
                          <input type="hidden" name="id" value={a.id} />
                          <button name="status" value="CONFIRMED" className="text-xs underline font-semibold">Confirm</button>
                        </form>
                      ) : null}
                      {a.status !== "COMPLETED" && a.status !== "CANCELLED" ? (
                        <form action={appointmentStatus} className="inline">
                          <input type="hidden" name="id" value={a.id} />
                          <button name="status" value="COMPLETED" className="text-xs underline">Complete</button>
                        </form>
                      ) : null}
                      {a.status !== "CANCELLED" ? (
                        <form action={appointmentStatus} className="inline">
                          <input type="hidden" name="id" value={a.id} />
                          <button name="status" value="CANCELLED" className="text-xs underline" style={{ color: "var(--c-danger)" }}>Cancel</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No appointments yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {active === "exchange" ? (
        <section className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Received</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Est. value</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exchanges.map((x) => (
                <tr key={x.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3 text-muted whitespace-nowrap">{new Date(x.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                  <td className="py-2.5 pr-3">{x.name}<span className="block text-xs text-muted">{x.phone}</span></td>
                  <td className="py-2.5 pr-3">{x.metal} · {x.purity} · {x.grossWeightG}g{x.note ? <span className="block text-xs text-muted max-w-[200px] truncate">{x.note}</span> : null}</td>
                  <td className="py-2.5 pr-3 font-semibold">{x.estValuePaise ? formatINR(x.estValuePaise) : "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,.07)" }}>{statusLabel(x.status)}</span>
                  </td>
                  <td className="py-2.5 text-right">
                    <form action={exchangeStatus} className="flex justify-end items-center gap-1.5">
                      <input type="hidden" name="id" value={x.id} />
                      <input
                        name="estValueRs"
                        type="number"
                        min={0}
                        defaultValue={x.estValuePaise ? x.estValuePaise / 100 : ""}
                        placeholder="₹ quote"
                        className="input !min-h-8 !w-24 text-xs"
                      />
                      <button name="status" value="QUOTED" className="text-xs underline font-semibold">Quote</button>
                      <button name="status" value="ACCEPTED" className="text-xs underline">Accept</button>
                      <button name="status" value="REJECTED" className="text-xs underline" style={{ color: "var(--c-danger)" }}>Reject</button>
                    </form>
                  </td>
                </tr>
              ))}
              {exchanges.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No exchange requests yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {active === "queries" ? (
        <section className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Received</th>
                <th className="py-2 pr-3">From</th>
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3 text-muted whitespace-nowrap">{new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                  <td className="py-2.5 pr-3">{q.name}<span className="block text-xs text-muted">{q.phone || q.email}</span></td>
                  <td className="py-2.5 pr-3 max-w-[280px]">
                    {q.subject ? <b className="block text-xs">{q.subject}</b> : null}
                    <span className="text-muted text-xs line-clamp-2">{q.message}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{q.source}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: q.status === "RESOLVED" ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)" }}>
                      {statusLabel(q.status)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      {q.status !== "IN_PROGRESS" && q.status !== "RESOLVED" ? (
                        <form action={queryStatus} className="inline">
                          <input type="hidden" name="id" value={q.id} />
                          <button name="status" value="IN_PROGRESS" className="text-xs underline">In progress</button>
                        </form>
                      ) : null}
                      {q.status !== "RESOLVED" ? (
                        <form action={queryStatus} className="inline">
                          <input type="hidden" name="id" value={q.id} />
                          <button name="status" value="RESOLVED" className="text-xs underline font-semibold">Resolve</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {queries.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center text-muted">No queries yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
