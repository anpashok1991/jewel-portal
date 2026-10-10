import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { toggleCoupon, toggleGiftCard } from "@/actions/admin/manage";
import { CouponForm, GiftCardForm, LoyaltyForm, type CouponSeed } from "@/components/admin/ManageForms";
import BannerManager from "@/components/admin/BannerManager";

export const metadata = { title: "Marketing · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMarketingPage({
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
  if (!session || !(await can(session, "coupons", "view"))) redirect(`/${slug}/admin`);

  const [coupons, giftCards, editCoupon, ledger, settings, banners] = await Promise.all([
    db.coupon.findMany({ where: { shopId: tenant.id }, orderBy: { code: "asc" } }),
    db.giftCard.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } }),
    edit ? db.coupon.findFirst({ where: { id: edit, shopId: tenant.id } }) : null,
    db.loyaltyLedger.findMany({ where: { shopId: tenant.id }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.shop.findUnique({
      where: { id: tenant.id },
      select: { loyaltyEarnBp: true, loyaltyRedeemMaxBp: true, features: { select: { key: true, enabled: true } } },
    }),
    db.banner.findMany({ where: { shopId: tenant.id }, orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] }),
  ]);
  const ledgerUsers = await db.user.findMany({
    where: { id: { in: ledger.map((l) => l.userId) } },
    select: { id: true, name: true },
  });
  const userNames = new Map(ledgerUsers.map((u) => [u.id, u.name]));

  const featureOn = (key: string) => settings?.features.some((f) => f.key === key && f.enabled) ?? false;

  const seed: CouponSeed | undefined = editCoupon
    ? {
        id: editCoupon.id,
        code: editCoupon.code,
        description: editCoupon.description,
        type: editCoupon.type,
        value: editCoupon.value,
        minOrderPaise: editCoupon.minOrderPaise,
        maxDiscountPaise: editCoupon.maxDiscountPaise,
        endsAt: editCoupon.endsAt.toISOString().slice(0, 10),
        usageLimit: editCoupon.usageLimit,
        perUserLimit: editCoupon.perUserLimit,
        active: editCoupon.active,
      }
    : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Marketing</h1>
          <p className="text-sm text-muted">
            Coupons {featureOn("coupons") ? "on" : "off"} · Gift cards {featureOn("giftcards") ? "on" : "off"} · Loyalty {featureOn("loyalty") ? "on" : "off"}
          </p>
        </div>
        {edit ? <Link href={`/${slug}/admin/marketing`} className="btn btn-ghost !min-h-10 text-sm">Cancel edit</Link> : null}
      </div>

      <BannerManager
        banners={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          videoUrl: b.videoUrl,
          href: b.href,
          placement: b.placement,
          active: b.active,
          sortOrder: b.sortOrder,
        }))}
      />

      <CouponForm coupon={seed} />

      <section className="card p-5 overflow-x-auto">
        <h2 className="font-semibold mb-3">Coupons</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Code</th>
              <th className="py-2 pr-3">Discount</th>
              <th className="py-2 pr-3">Min order</th>
              <th className="py-2 pr-3">Used</th>
              <th className="py-2 pr-3">Valid till</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                <td className="py-2.5 pr-3 font-mono font-semibold">{c.code}</td>
                <td className="py-2.5 pr-3">{c.type === "PERCENT" ? `${c.value / 100}% off` : `${formatINR(c.value)} off`}</td>
                <td className="py-2.5 pr-3">{c.minOrderPaise ? formatINR(c.minOrderPaise) : "—"}</td>
                <td className="py-2.5 pr-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="py-2.5 pr-3 text-muted">{new Date(c.endsAt).toLocaleDateString("en-IN")}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.active ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)", color: c.active ? "#15803d" : "inherit" }}>
                    {c.active ? "live" : "off"}
                  </span>
                </td>
                <td className="py-2.5 text-right whitespace-nowrap">
                  <Link href={`/${slug}/admin/marketing?edit=${c.id}`} className="text-xs underline font-semibold mr-2">Edit</Link>
                  <form action={toggleCoupon} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs underline">{c.active ? "Disable" : "Enable"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {coupons.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-muted">No coupons yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Gift cards</h2>
        <GiftCardForm />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Issued</th>
                <th className="py-2 pr-3">Balance</th>
                <th className="py-2 pr-3">Holder</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {giftCards.map((g) => (
                <tr key={g.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3 font-mono font-semibold">{g.code}</td>
                  <td className="py-2.5 pr-3 font-semibold">{formatINR(g.initialPaise)}</td>
                  <td className="py-2.5 pr-3">{formatINR(g.balancePaise)}</td>
                  <td className="py-2.5 pr-3 text-muted">{g.user?.name ?? "unassigned"}</td>
                  <td className="py-2.5 pr-3 text-muted">{g.expiresAt ? new Date(g.expiresAt).toLocaleDateString("en-IN") : "never"}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: g.active ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)" }}>
                      {g.active ? "active" : "blocked"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <form action={toggleGiftCard} className="inline">
                      <input type="hidden" name="id" value={g.id} />
                      <button className="text-xs underline">{g.active ? "Block" : "Unblock"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {giftCards.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-muted">No gift cards issued yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Loyalty points</h2>
          <p className="text-sm text-muted">
            Earn {((settings?.loyaltyEarnBp ?? 0) / 100).toFixed(2)}% of order value · redeem capped at {((settings?.loyaltyRedeemMaxBp ?? 0) / 100).toFixed(0)}% of bill (1 point = ₹1).
          </p>
        </div>
        <LoyaltyForm />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Points</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((l) => (
                <tr key={l.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2 pr-3 text-muted whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                  <td className="py-2 pr-3">{userNames.get(l.userId) ?? "—"}</td>
                  <td className="py-2 pr-3 font-semibold" style={{ color: l.points >= 0 ? "#15803d" : "#b91c1c" }}>{l.points >= 0 ? `+${l.points}` : l.points}</td>
                  <td className="py-2 text-muted">{l.reason}</td>
                </tr>
              ))}
              {ledger.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-muted">No loyalty activity yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
