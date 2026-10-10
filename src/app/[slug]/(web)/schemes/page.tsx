import Link from "next/link";
import type { Metadata } from "next";
import { requireTenant, hasFeature } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatINR, formatWeightMg } from "@/lib/money";
import { computeMaturity } from "@/lib/scheme";
import { resolveRate } from "@/lib/pricing";
import SchemeCalculator from "@/components/store/SchemeCalculator";
import { EnrollForm, PayDepositForm, TopUpForm } from "@/components/store/SchemeForms";

export const metadata: Metadata = { title: "Savings Schemes" };

const FREQ_LABEL: Record<string, string> = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", CUSTOM: "Custom days" };

export default async function SchemesPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  const allowed = hasFeature(tenant, "schemes");

  const [plans, goldRate, accounts, wallet] = await Promise.all([
    db.savingsPlan.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { amountPaise: "asc" } }),
    resolveRate(tenant.id, "GOLD", "916"),
    session
      ? db.schemeAccount.findMany({
          where: { shopId: tenant.id, userId: session.uid },
          include: { plan: true, deposits: { orderBy: { seq: "asc" } } },
        })
      : Promise.resolve([]),
    session
      ? db.wallet.findUnique({ where: { userId_shopId: { userId: session.uid, shopId: tenant.id } } })
      : Promise.resolve(null),
  ]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="section-title">Savings schemes are coming soon</h1>
        <p className="text-muted mt-3">This shop hasn&apos;t enabled savings plans yet. Check back soon!</p>
        <Link href={`/${slug}`} className="btn btn-primary mt-6">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <span className="badge">Save gold, bit by bit</span>
      <h1 className="section-title mt-2">Savings Schemes</h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Fixed installments, transparent maturity — either a guaranteed interest payout or locked gold grams with a bonus. Pay installments from your wallet in one tap.
      </p>

      {/* my accounts */}
      {session && accounts.length ? (
        <section className="mt-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="section-title !text-xl">My accounts</h2>
            <TopUpForm shopId={tenant.id} />
          </div>
          <p className="text-xs text-muted mt-1">Wallet balance: <b>{formatINR(wallet?.balancePaise ?? 0)}</b></p>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const maturity = computeMaturity(
                {
                  frequency: acc.plan.frequency,
                  customDays: acc.plan.customDays,
                  amountPaise: acc.plan.amountPaise,
                  tenureCount: acc.plan.tenureCount,
                  mode: acc.plan.mode as "ROI" | "GOLD",
                  roiPercentBp: acc.plan.roiPercentBp,
                  goldBonusBp: acc.plan.goldBonusBp,
                },
                acc.deposits.map((d) => ({
                  dueDate: d.dueDate,
                  paidAt: d.paidAt,
                  amountPaise: d.amountPaise,
                  goldMgAtPay: d.goldMgAtPay,
                  rateUsedPaise: d.rateUsedPaise,
                  status: d.status,
                })),
                acc.maturesAt,
              );
              const paidCount = acc.deposits.filter((d) => d.status === "PAID").length;
              const progress = Math.round((paidCount / acc.deposits.length) * 100);
              const dueDeposit = [...acc.deposits]
                .filter((d) => d.status === "DUE")
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
              return (
                <div key={acc.id} className="card p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold">{acc.plan.name}</div>
                      <div className="text-xs text-muted">{acc.accountNo} · {acc.status}</div>
                    </div>
                    <span className="badge">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--c-muted) 35%, transparent)" }}>
                    <div className="h-full" style={{ width: `${progress}%`, background: "var(--c-primary)" }} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
                    <dt className="text-muted">Paid</dt>
                    <dd className="text-right font-medium">{formatINR(acc.totalPaidPaise)}</dd>
                    <dt className="text-muted">Matures</dt>
                    <dd className="text-right font-medium">{new Date(acc.maturesAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</dd>
                    <dt className="text-muted">{acc.plan.mode === "GOLD" ? "Gold accrued" : "Projected payout"}</dt>
                    <dd className="text-right font-bold" style={{ color: "var(--c-primary)" }}>
                      {acc.plan.mode === "GOLD" ? formatWeightMg(acc.goldMgAccrued || maturity.goldMg) : formatINR(maturity.totalPaise)}
                    </dd>
                  </dl>
                  {dueDeposit && acc.status === "ACTIVE" ? (
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-danger">#{dueDeposit.seq} due {new Date(dueDeposit.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                      <PayDepositForm depositId={dueDeposit.id} amountPaise={dueDeposit.amountPaise} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* plans */}
      <section className="mt-10">
        <h2 className="section-title !text-xl">Available plans</h2>
        <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const enrolled =
              session && accounts.some((a) => a.planId === plan.id && ["ACTIVE", "MATURED"].includes(a.status));
            return (
              <div key={plan.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <span className="badge">{plan.mode === "GOLD" ? "Gold" : "Interest"}</span>
                </div>
                <p className="text-xs text-muted mt-1 line-clamp-2">{plan.description}</p>
                <div className="mt-3 text-2xl font-bold" style={{ color: "var(--c-primary)" }}>
                  {formatINR(plan.amountPaise)}
                  <span className="text-sm font-normal text-muted">
                    /{FREQ_LABEL[plan.frequency]?.toLowerCase() ?? "inst."} × {plan.tenureCount}
                  </span>
                </div>

                <SchemeCalculator
                  amountPaise={plan.amountPaise}
                  tenureCount={plan.tenureCount}
                  frequency={plan.frequency}
                  mode={plan.mode}
                  roiPercentBp={plan.roiPercentBp}
                  goldBonusBp={plan.goldBonusBp}
                  ratePerGramPaise={goldRate}
                />

                <div className="mt-auto pt-4">
                  {session ? (
                    enrolled ? (
                      <span className="btn btn-ghost w-full" aria-disabled>Already enrolled ✓</span>
                    ) : (
                      <EnrollForm planId={plan.id} slug={slug} />
                    )
                  ) : (
                    <Link href={`/account/login?next=/${slug}/schemes`} className="btn w-full" style={{ border: "1px solid var(--c-primary)", color: "var(--c-primary)" }}>
                      Login to enroll
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
          {!plans.length ? <p className="text-muted text-sm">No active plans right now.</p> : null}
        </div>
      </section>
    </div>
  );
}
