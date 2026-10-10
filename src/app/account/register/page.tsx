import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "@/components/account/AuthForms";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; shop?: string }> }) {
  const { next = "", shop = "" } = await searchParams;
  const session = await getSession();
  if (session) redirect(next.startsWith("/") ? next : "/account");

  const shops = await db.shop.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  });
  const preferred = shops.find((s) => s.slug === shop) ?? shops[0];
  if (!preferred) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted">No stores are open for registration right now.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--c-bg, #fdfaf4)", color: "var(--c-text, #1f1a17)" }}>
      <header className="px-6 h-14 flex items-center">
        <Link href="/" className="font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>✦ Jewel Portal</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-display, serif)" }}>Create your account</h1>
          <p className="text-sm text-muted mb-6">One account for orders, wallet and savings schemes.</p>
          <div className="card p-5 sm:p-6">
            <RegisterForm
              shops={shops}
              defaultShopId={preferred.id}
              defaultShopSlug={preferred.slug}
              next={next}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
