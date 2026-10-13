import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/actions/auth";
import { AdminNav, type NavItem } from "@/components/admin/AdminNav";

const NAV: NavItem[] = [
  { href: "/super", label: "Dashboard" },
  { href: "/super/shops", label: "Shops" },
  { href: "/super/handover", label: "Handover" },
  { href: "/super/plans", label: "Plans" },
  { href: "/super/users", label: "Users" },
  { href: "/super/flow", label: "App flow" },
];

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.pool !== "platform" || session.role !== "SUPER_ADMIN") redirect("/super/login");

  return (
    <div className="min-h-screen" style={{ background: "#0f1115", color: "#e7e9ee" }}>
      <div className="lg:grid lg:grid-cols-[232px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col gap-6 p-4 border-r" style={{ borderColor: "rgba(255,255,255,.08)", background: "#12151c" }}>
          <div>
            <Link href="/super" className="block font-bold text-white leading-tight">JewelPortal</Link>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 mt-1">Platform console</p>
          </div>
          <AdminNav items={NAV} />
          <div className="mt-auto space-y-2 text-sm">
            <p className="px-3 text-white/40 truncate">
              {session.name}
              <br />
              <span className="text-[11px] uppercase">super admin</span>
            </p>
            <form action={logout}>
              <button className="w-full text-left px-3 py-2 rounded-lg text-white/65 hover:text-white">Sign out</button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="lg:hidden sticky top-0 z-30 pt-3" style={{ background: "#12151c" }}>
            <div className="flex items-center justify-between px-3 pb-2">
              <Link href="/super" className="font-bold text-white text-sm">JewelPortal · Console</Link>
              <form action={logout}>
                <button className="text-xs px-2.5 py-1.5 rounded-lg border border-white/20 text-white/70">Sign out</button>
              </form>
            </div>
            <AdminNav items={NAV} orientation="top" />
          </header>
          <main
            className="p-4 sm:p-6 lg:p-8 max-w-6xl min-h-screen"
            style={
              {
                background: "#0f1115",
                color: "#e7e9ee",
                "--c-bg": "#0f1115",
                "--c-surface": "#161a22",
                "--c-text": "#e7e9ee",
                "--c-muted": "#8b93a7",
                "--c-primary": "#3b82f6",
                "--c-accent": "#38bdf8",
                "--c-gold": "#fbbf24",
                "--c-danger": "#f87171",
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
