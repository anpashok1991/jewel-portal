import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "@/actions/auth";

export const metadata = { title: "My Account" };

const NAV = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/wallet", label: "Wallet" },
  { href: "/account/schemes", label: "Schemes" },
  { href: "/account/addresses", label: "Addresses" },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/account/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg, #fdfaf4)", color: "var(--c-text, #1f1a17)" }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: "var(--c-surface, #fff)", borderColor: "rgba(0,0,0,.08)" }}>
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-bold tracking-tight" style={{ fontFamily: "var(--font-display, serif)" }}>
            ✦ Jewel Portal
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="px-3 py-2 rounded-lg hover:bg-black/5">
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button className="text-sm px-3 py-2 rounded-lg border" style={{ borderColor: "rgba(0,0,0,.15)" }}>
              Logout
            </button>
          </form>
        </div>
        <nav className="sm:hidden flex overflow-x-auto gap-1 px-3 pb-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: "rgba(0,0,0,.05)" }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
