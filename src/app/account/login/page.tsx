import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, nonCustomerHome } from "@/lib/auth";
import { LoginForm } from "@/components/account/AuthForms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  const session = await getSession();
  if (session) {
    const home = await nonCustomerHome(session);
    if (home) redirect(home);
    const user = await db.user.findUnique({ where: { id: session.uid }, select: { id: true } });
    if (user) redirect(next.startsWith("/") ? next : "/account");
  }
  const staffShop = await db.shop.findFirst({ where: { status: "ACTIVE" }, select: { slug: true } });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--c-bg, #fdfaf4)", color: "var(--c-text, #1f1a17)" }}>
      <header className="px-6 h-14 flex items-center">
        <Link href="/" className="font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>✦ Jewel Portal</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display, serif)" }}>Welcome back</h1>
          <p className="text-sm text-muted mb-6">Sign in to track orders, wallets and savings schemes.</p>
          <div className="card p-5 sm:p-6">
            <LoginForm next={next} />
          </div>
          {staffShop ? (
            <p className="text-xs text-muted mt-4 text-center">
              Shop owner? <Link href={`/${staffShop.slug}/admin/login`} className="underline">Staff login</Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
