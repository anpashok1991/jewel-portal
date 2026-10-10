import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatINR, formatWeightMg } from "@/lib/money";
import { statusLabel } from "@/lib/order-state";

export const metadata = { title: "Account overview" };

const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED"];

export default async function AccountOverview() {
  const session = await getSession();
  if (!session) redirect("/account/login");

  const [user, wallet, loyalty, shop, notifications] = await Promise.all([
    db.user.findUnique({ where: { id: session.uid }, select: { name: true, email: true, phone: true, createdAt: true } }),
    session.shopId
      ? db.wallet.findUnique({ where: { userId_shopId: { userId: session.uid, shopId: session.shopId } } })
      : null,
    session.shopId
      ? db.loyaltyLedger.aggregate({ where: { userId: session.uid, shopId: session.shopId }, _sum: { points: true } })
      : null,
    session.shopId ? db.shop.findUnique({ where: { id: session.shopId }, select: { slug: true, name: true } }) : null,
    db.notification.findMany({ where: { userId: session.uid, read: false }, take: 5, orderBy: { createdAt: "desc" } }),
  ]);

  if (!user) redirect("/account/login");

  const [totalOrders, activeOrders, schemeAccounts] = await Promise.all([
    db.order.count({ where: { userId: session.uid } }),
    db.order.count({ where: { userId: session.uid, status: { in: ACTIVE_STATUSES } } }),
    db.schemeAccount.count({ where: { userId: session.uid, status: "ACTIVE" } }),
  ]);

  const cards = [
    { label: "Orders", value: String(totalOrders), sub: activeOrders ? `${activeOrders} active` : "None active", href: "/account/orders" },
    { label: "Wallet", value: wallet ? formatINR(wallet.balancePaise) : "—", sub: wallet && wallet.goldMg ? `${formatWeightMg(wallet.goldMg)} gold` : "No balance", href: "/account/wallet" },
    { label: "Loyalty points", value: String(loyalty?._sum.points ?? 0), sub: "1 point = ₹1", href: shop ? `/${shop.slug}` : "/account" },
    { label: "Schemes", value: String(schemeAccounts), sub: schemeAccounts ? "Active savings plans" : "No active plans", href: "/account/schemes" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>
            Namaste, {user?.name ?? session.name}
          </h1>
          <p className="text-sm text-muted">{user?.email} {user?.phone ? `· ${user.phone}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/account/addresses" className="btn">Addresses</Link>
          <Link href="/account/orders" className="btn btn-primary">My orders</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-4 hover:-translate-y-0.5 transition-transform">
            <p className="text-xs uppercase tracking-wide text-muted">{c.label}</p>
            <p className="text-xl font-bold mt-1">{c.value}</p>
            <p className="text-xs text-muted mt-1">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Profile</h2>
            {user ? (
              <span className="text-xs text-muted">
                Member since {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </span>
            ) : null}
          </div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between gap-4"><dt className="text-muted">Name</dt><dd className="font-medium">{user?.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Phone</dt><dd className="font-medium">{user?.phone || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Store</dt><dd className="font-medium">{shop?.name ?? "—"}</dd></div>
          </dl>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Notifications</h2>
            <span className="text-xs text-muted">{notifications.length} unread</span>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted">You are all caught up.</p>
          ) : (
            <ul className="text-sm space-y-3">
              {notifications.map((n) => (
                <li key={n.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: "var(--c-primary)" }} />
                  <div>
                    <p className="font-medium">{n.title}</p>
                    {n.body ? <p className="text-muted text-xs">{n.body}</p> : null}
                    {n.link ? <Link href={n.link} className="text-xs underline">View</Link> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {activeOrders > 0 && shop ? <RecentOrders userId={session.uid} slug={shop.slug} /> : null}
    </div>
  );
}

async function RecentOrders({ userId, slug }: { userId: string; slug: string }) {
  const orders = await db.order.findMany({
    where: { userId, status: { in: ACTIVE_STATUSES } },
    orderBy: { placedAt: "desc" },
    take: 3,
    select: { id: true, number: true, status: true, totalPaise: true, placedAt: true },
  });
  if (orders.length === 0) return null;
  return (
    <section className="card p-5">
      <h2 className="font-semibold mb-3">Recent orders</h2>
      <ul className="divide-y" style={{ borderColor: "rgba(0,0,0,.07)" }}>
        {orders.map((o) => (
          <li key={o.id} className="py-3 flex items-center justify-between gap-3 text-sm">
            <div>
              <p className="font-medium">{o.number}</p>
              <p className="text-xs text-muted">{new Date(o.placedAt).toLocaleDateString("en-IN")}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,.06)" }}>{statusLabel(o.status)}</span>
              <span className="font-semibold">{formatINR(o.totalPaise)}</span>
              <Link href={`/${slug}/order/${o.id}`} className="btn btn-ghost !min-h-8 text-xs">Track</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
