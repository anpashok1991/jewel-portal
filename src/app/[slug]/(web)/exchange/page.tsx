import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { ExchangeForm } from "@/components/store/LeadForms";
import { rateCardRows } from "@/lib/reports";

export const metadata: Metadata = { title: "Gold Exchange" };

export default async function ExchangePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const rates = await rateCardRows(tenant.id);
  const gold = rates.find((r) => r.metal === "GOLD" && r.purity === "916");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <span className="badge">Old gold welcome</span>
      <h1 className="section-title mt-2">Exchange & Sell Gold</h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Bring any old gold jewellery — broken chains, unused bangles, inherited pieces. We assay it at the counter, deduct melt charges transparently, and the value goes straight against your new purchase or into your wallet.
      </p>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <span className="chip !cursor-default">Today 22K buyback: <b className="ml-1">₹{(gold ? gold.rate * 0.97 : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g*</b></span>
        <span className="chip !cursor-default">Melt & assay fee: <b className="ml-1">₹0</b></span>
        <span className="chip !cursor-default">Instant wallet credit</span>
      </div>
      <p className="text-[11px] text-muted mt-2">*Indicative; final rate after purity test at branch. Rates shown on this page are sell-side rates.</p>

      <div className="mt-8 grid lg:grid-cols-[1.1fr_1fr] gap-8">
        <ExchangeForm shopId={tenant.id} />

        <div className="card p-5">
          <h3 className="font-bold">How it works</h3>
          <ol className="mt-3 text-sm space-y-3 text-muted list-decimal list-inside">
            <li>Request a valuation online or walk in with your gold.</li>
            <li>Watch the assay — XRF test + touchstone in front of you.</li>
            <li>Get an itemised quote: gross weight, purity, melt deduction, final value.</li>
            <li>Accept to credit your wallet instantly, or add it to any purchase.</li>
            <li>Prefer cash? Withdraw at the counter for sales above ₹2,000.</li>
          </ol>
          <div className="mt-5 hairline" />
          <p className="text-xs text-muted mt-4">
            As per RBI norms we buy gold only from individuals (no business entities), PAN required above ₹50,000.
          </p>
        </div>
      </div>

      <div className="mt-8 card p-5">
        <h3 className="font-bold">Recent exchange requests</h3>
        <p className="text-xs text-muted mt-1">Track your submitted valuations from your account dashboard.</p>
        <a href={`/account/login?next=/${slug}/exchange`} className="btn btn-ghost mt-3 inline-flex !min-h-10">Sign in to track</a>
      </div>
    </div>
  );
}
