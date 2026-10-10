import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR, formatWeightMg, pct } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";
import { togglePlan } from "@/actions/admin/manage";
import { PlanForm, type PlanSeed } from "@/components/admin/ManageForms";

export const metadata = { title: "Schemes · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSchemesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { slug } = await params;
  const { edit = "" } = await searchParams;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || !(await can(session, "schemes", "view"))) redirect(`/${slug}/admin`);

  const [plans, accounts, editPlan] = await Promise.all([
    db.savingsPlan.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "desc" } }),
    db.schemeAccount.findMany({
      where: { shopId: tenant.id },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: { plan: { select: { name: true } }, user: { select: { name: true, phone: true } } },
    }),
    edit ? db.savingsPlan.findFirst({ where: { id: edit, shopId: tenant.id } }) : null,
  ]);

  const seed: PlanSeed | undefined = editPlan
    ? {
        id: editPlan.id,
        name: editPlan.name,
        description: editPlan.description,
        frequency: editPlan.frequency,
        customDays: editPlan.customDays,
        amountPaise: editPlan.amountPaise,
        tenureCount: editPlan.tenureCount,
        mode: editPlan.mode,
        roiPercentBp: editPlan.roiPercentBp,
        goldBonusBp: editPlan.goldBonusBp,
        minJoinPaise: editPlan.minJoinPaise,
        active: editPlan.active,
      }
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Savings schemes</h1>
          <p className="text-sm text-muted">{plans.length} plans · {accounts.filter((a) => a.status === "ACTIVE").length} active accounts</p>
        </div>
        {edit ? (
          <Link href={`/${slug}/admin/schemes`} className="btn btn-ghost !min-h-10 text-sm">Cancel edit</Link>
        ) : null}
      </div>

      <PlanForm plan={seed} />

      <section className="card p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Plans</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Cadence</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Tenure</th>
              <th className="py-2 pr-3">Bonus</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted">{p.description}</p>
                </td>
                <td className="py-2.5 pr-3">{p.frequency.toLowerCase()}{p.customDays ? ` (${p.customDays})` : ""}</td>
                <td className="py-2.5 pr-3 font-semibold">{formatINR(p.amountPaise)}</td>
                <td className="py-2.5 pr-3">{p.tenureCount} ×</td>
                <td className="py-2.5 pr-3">{p.mode === "ROI" ? pct(p.roiPercentBp) : `${pct(p.goldBonusBp)} gold`}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.active ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)", color: p.active ? "#15803d" : "inherit" }}>
                    {p.active ? "open" : "closed"}
                  </span>
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <Link href={`/${slug}/admin/schemes?edit=${p.id}`} className="text-xs underline font-semibold mr-2">Edit</Link>
                  <form action={togglePlan} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs underline">{p.active ? "Close" : "Open"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {plans.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-muted">No plans yet — create the first one above.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Enrolled accounts</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Account</th>
              <th className="py-2 pr-3">Customer</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Paid</th>
              <th className="py-2 pr-3">Gold accrued</th>
              <th className="py-2 pr-3">Matures</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                <td className="py-2.5 pr-3 font-medium">{a.accountNo}</td>
                <td className="py-2.5 pr-3">{a.user.name}<span className="block text-xs text-muted">{a.user.phone}</span></td>
                <td className="py-2.5 pr-3">{a.plan.name}</td>
                <td className="py-2.5 pr-3 font-semibold">{formatINR(a.totalPaidPaise)}</td>
                <td className="py-2.5 pr-3">{a.goldMgAccrued ? formatWeightMg(a.goldMgAccrued) : "—"}</td>
                <td className="py-2.5 pr-3 text-muted">{new Date(a.maturesAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                <td className="py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,.07)" }}>{statusLabel(a.status)}</span>
                </td>
              </tr>
            ))}
            {accounts.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-muted">No enrollments yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
