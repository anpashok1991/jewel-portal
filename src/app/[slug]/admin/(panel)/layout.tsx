import { redirect } from "next/navigation";
import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  if (!session || session.pool !== "shop" || session.shopId !== tenant.id) {
    redirect(`/${slug}/admin/login`);
  }
  if (session.role !== "OWNER" && session.role !== "STAFF") {
    redirect("/account/login");
  }

  const all: { item: NavItem; module: string }[] = [
    { item: { href: `/${slug}/admin`, label: "Dashboard" }, module: "orders" },
    { item: { href: `/${slug}/admin/orders`, label: "Orders" }, module: "orders" },
    { item: { href: `/${slug}/admin/products`, label: "Catalog" }, module: "products" },
    { item: { href: `/${slug}/admin/rates`, label: "Rates" }, module: "settings" },
    { item: { href: `/${slug}/admin/leads`, label: "Leads" }, module: "queries" },
    { item: { href: `/${slug}/admin/schemes`, label: "Schemes" }, module: "schemes" },
    { item: { href: `/${slug}/admin/marketing`, label: "Marketing" }, module: "coupons" },
    { item: { href: `/${slug}/admin/reports`, label: "Reports" }, module: "reports" },
    { item: { href: `/${slug}/admin/settings`, label: "Settings" }, module: "settings" },
  ];

  const visible: NavItem[] = [];
  for (const entry of all) {
    if (await can(session, entry.module, "view")) visible.push(entry.item);
  }

  return (
    <div className="min-h-screen" style={{ background: "#0f1115", color: "#e7e9ee" }}>
      <div className="lg:grid lg:grid-cols-[232px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col gap-6 p-4 border-r" style={{ borderColor: "rgba(255,255,255,.08)", background: "#12151c" }}>
          <div>
            <Link href={`/${slug}`} className="block font-bold text-white leading-tight">
              {tenant.name}
            </Link>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mt-1">Shop admin</p>
          </div>
          <AdminNav items={visible} />
          <div className="mt-auto space-y-2 text-sm">
            <p className="px-3 text-white/40 truncate">
              {session.name}
              <br />
              <span className="text-[11px] uppercase">{session.role.toLowerCase()}</span>
            </p>
            <Link href={`/${slug}`} className="block px-3 py-2 rounded-lg text-white/65 hover:text-white">
              ← View store
            </Link>
            <form action={logout}>
              <button className="w-full text-left px-3 py-2 rounded-lg text-white/65 hover:text-white">Sign out</button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="lg:hidden sticky top-0 z-30 pt-3" style={{ background: "#12151c" }}>
            <div className="flex items-center justify-between px-3 pb-2">
              <Link href={`/${slug}/admin`} className="font-bold text-white text-sm">{tenant.name} · Admin</Link>
              <form action={logout}>
                <button className="text-xs px-2.5 py-1.5 rounded-lg border border-white/20 text-white/70">Sign out</button>
              </form>
            </div>
            <AdminNav items={visible} orientation="top" />
          </header>
          <main
            className="p-4 sm:p-6 lg:p-8 max-w-6xl min-h-screen"
            style={
              {
                background: "#f4f5f9",
                color: "#16181d",
                "--c-bg": "#f4f5f9",
                "--c-surface": "#ffffff",
                "--c-text": "#16181d",
                "--c-muted": "#5b6172",
                "--c-primary": "#1d4ed8",
                "--c-accent": "#0f766e",
                "--c-gold": "#a16207",
                "--c-danger": "#b3261e",
                "--radius": "12px",
                "--font-display": "inherit",
              } as React.CSSProperties
            }
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
