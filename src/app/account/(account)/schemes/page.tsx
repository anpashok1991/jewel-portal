import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatINR, formatWeightMg, pct } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";
import { PayDepositForm } from "@/components/store/SchemeForms";

export const metadata = { title: "Savings schemes" };

export default async function SchemesPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const accounts = await db.schemeAccount.findMany({
    where: { userId: session.uid },
    orderBy: { startedAt: "desc" },
    include: { plan: true, deposits: { orderBy: { seq: "asc" } } },
  });
  const shop = session.shopId
    ? await db.shop.findUnique({ where: { id: session.shopId }, select: { slug: true } })
    : null;
  const schemesHref = shop ? `/${shop.slug}/schemes` : "/account";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>Savings schemes</h1>
          <p className="text-sm text-muted">Your enrollments, installments and maturity value.</p>
        </div>
        <Link href={schemesHref} className="btn">Browse plans</Link>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted mb-4">You are not enrolled in any scheme yet.</p>
          <Link href={schemesHref} className="btn btn-primary">Explore schemes</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((a) => {
            const paid = a.deposits.filter((d) => d.status === "PAID").length;
            const due = a.deposits.filter((d) => d.status === "DUE").sort((x, y) => +new Date(x.dueDate) - +new Date(y.dueDate));
            const nextDue = due[0];
            const progress = a.deposits.length ? Math.round((paid / a.deposits.length) * 100) : 0;
            return (
              <section key={a.id} className="card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{a.plan.name}</p>
                    <p className="text-xs text-muted">A/c {a.accountNo} · started {new Date(a.startedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,.06)" }}>{statusLabel(a.status)}</span>
                    <p className="text-sm font-semibold mt-1">{formatINR(a.totalPaidPaise)} paid</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{paid} of {a.deposits.length} installments</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--c-primary)" }} />
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Installment</dt><dd className="font-semibold">{formatINR(a.plan.amountPaise)} / {a.plan.frequency.toLowerCase()}</dd></div>
                  <div><dt className="text-xs text-muted">Matures</dt><dd className="font-semibold">{new Date(a.maturesAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</dd></div>
                  <div><dt className="text-xs text-muted">{a.plan.mode === "ROI" ? "ROI" : "Gold bonus"}</dt><dd className="font-semibold">{a.plan.mode === "ROI" ? pct(a.plan.roiPercentBp) : pct(a.plan.goldBonusBp)}</dd></div>
                  <div><dt className="text-xs text-muted">{a.plan.mode === "GOLD" ? "Gold accrued" : "Est. value"}</dt><dd className="font-semibold">{a.plan.mode === "GOLD" ? formatWeightMg(a.goldMgAccrued) : formatINR(a.roiPaise || a.totalPaidPaise)}</dd></div>
                </dl>

                {a.status === "ACTIVE" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {nextDue ? (
                      <div className="text-sm">
                        <span className="text-muted">Next due </span>
                        <b>{new Date(nextDue.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b>
                        <span className="text-muted"> · {formatINR(nextDue.amountPaise)}</span>
                        <span className="ml-2"><PayDepositForm depositId={nextDue.id} amountPaise={nextDue.amountPaise} /></span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--c-primary)" }}>All installments paid 🎉</span>
                    )}
                  </div>
                ) : null}

                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">All installments ({a.deposits.length})</summary>
                  <ul className="mt-2 divide-y" style={{ borderColor: "rgba(0,0,0,.07)" }}>
                    {a.deposits.map((d) => (
                      <li key={d.id} className="py-2 flex items-center justify-between gap-3">
                        <span>#{d.seq} · due {new Date(d.dueDate).toLocaleDateString("en-IN")}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-muted">{formatINR(d.amountPaise)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{
                            background: d.status === "PAID" ? "rgba(21,128,61,.12)" : d.status === "SKIPPED" ? "rgba(0,0,0,.08)" : "rgba(180,83,9,.12)",
                            color: d.status === "PAID" ? "#15803d" : d.status === "SKIPPED" ? "inherit" : "#b45309",
                          }}>{d.status.toLowerCase()}</span>
                          {d.status === "DUE" ? <PayDepositForm depositId={d.id} amountPaise={d.amountPaise} /> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
