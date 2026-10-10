import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatINR, formatWeightMg } from "@/lib/money";
import { TopUpForm } from "@/components/store/SchemeForms";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect("/account/login");
  if (!session.shopId) redirect("/account");

  const wallet = await db.wallet.findUnique({
    where: { userId_shopId: { userId: session.uid, shopId: session.shopId } },
    include: { txns: { orderBy: { createdAt: "desc" }, take: 30 } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>Wallet</h1>
          <p className="text-sm text-muted">Pay for scheme installments and orders from your balance.</p>
        </div>
        <TopUpForm shopId={session.shopId} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Cash balance</p>
          <p className="text-3xl font-bold mt-1">{formatINR(wallet?.balancePaise ?? 0)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Gold balance</p>
          <p className="text-3xl font-bold mt-1">{formatWeightMg(wallet?.goldMg ?? 0)}</p>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Transactions</h2>
        {!wallet || wallet.txns.length === 0 ? (
          <p className="text-sm text-muted">No transactions yet.</p>
        ) : (
          <ul className="divide-y text-sm" style={{ borderColor: "rgba(0,0,0,.07)" }}>
            {wallet.txns.map((t) => {
              const credit = t.type === "CREDIT" || t.type === "GOLD_CREDIT";
              return (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.reason}</p>
                    <p className="text-xs text-muted">
                      {new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold" style={{ color: credit ? "var(--c-primary, #15803d)" : "#b91c1c" }}>
                      {credit ? "+" : "−"}
                      {t.goldMg > 0 ? formatWeightMg(t.goldMg) : formatINR(t.amountPaise)}
                    </p>
                    <p className="text-xs text-muted">{t.type.replace("_", " ").toLowerCase()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
