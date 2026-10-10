import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Jewel Portal — one platform, every jeweller",
  description: "Discover jewellers on Jewel Portal, or sign in to your shop console.",
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const shops = await db.shop.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      slug: true,
      name: true,
      tagline: true,
      customDomain: true,
      theme: { select: { colorsJson: true } },
    },
  });

  const cards = shops.map((s) => {
    let accent = "#c9a227";
    try {
      accent = (JSON.parse(s.theme.colorsJson) as { accent?: string }).accent ?? accent;
    } catch {
      /* keep default */
    }
    return { slug: s.slug, name: s.name, tagline: s.tagline, customDomain: s.customDomain, accent };
  });

  return (
    <div style={{ background: "#0c0d12", color: "#f5f1e8", minHeight: "100vh" }}>
      {/* header */}
      <header className="border-b" style={{ borderColor: "rgba(255,255,255,.08)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center h-9 w-9 rounded-xl font-bold" style={{ background: "linear-gradient(135deg,#c9a227,#8a6d1d)", color: "#1a1408" }}>✦</span>
            <span className="text-lg font-bold" style={{ fontFamily: "var(--font-display, serif)" }}>Jewel Portal</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
            <a href="#shops" className="px-3 py-2 rounded-lg hover:bg-white/5">Shops</a>
            <Link href="/account/login" className="px-3 py-2 rounded-lg hover:bg-white/5">Customer</Link>
            <Link href="/super/login" className="btn btn-primary !min-h-10 text-sm">Super admin</Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
        <span className="inline-block text-xs uppercase tracking-[0.25em] px-3 py-1 rounded-full" style={{ background: "rgba(201,162,39,.12)", color: "#c9a227" }}>
          Multi-tenant jewellery commerce
        </span>
        <h1 className="mt-6 text-4xl sm:text-6xl font-bold leading-tight" style={{ fontFamily: "var(--font-display, serif)" }}>
          One platform.<br />
          <span style={{ color: "#c9a227" }}>Every jeweller.</span>
        </h1>
        <p className="mt-5 text-white/60 max-w-xl mx-auto text-sm sm:text-base">
          Each jeweller gets their own themed storefront, admin console and custom domain —
          all powered by Jewel Portal.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#shops" className="btn btn-primary !min-h-12 px-6">Explore shops</a>
          <Link href="/super/login" className="btn !min-h-12 px-6" style={{ border: "1px solid rgba(255,255,255,.2)", color: "#f5f1e8" }}>
            Platform login
          </Link>
        </div>
      </section>

      {/* shop directory */}
      <section id="shops" className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <h2 className="text-xl sm:text-2xl font-bold mb-1">Our jewellers</h2>
        <p className="text-sm text-white/50 mb-6">Visit a storefront — or sign in to its admin console.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((s) => (
            <div key={s.slug} className="rounded-2xl border p-5 flex flex-col" style={{ background: "#14161d", borderColor: "rgba(255,255,255,.08)" }}>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center h-11 w-11 rounded-xl text-lg font-bold shrink-0" style={{ background: `linear-gradient(135deg, ${s.accent}, color-mix(in srgb, ${s.accent} 55%, black))`, color: "#14100a" }}>
                  {s.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-white/45 truncate">{s.customDomain ?? `/${s.slug}`}</p>
                </div>
              </div>
              <p className="text-sm text-white/55 mt-3 line-clamp-2 flex-1">{s.tagline || "Handcrafted jewellery, online."}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/${s.slug}`} className="btn btn-primary !min-h-9 text-xs flex-1 text-center">Visit store</Link>
                <Link href={`/${s.slug}/admin/login`} className="btn !min-h-9 text-xs flex-1 text-center" style={{ border: "1px solid rgba(255,255,255,.15)", color: "#f5f1e8" }}>
                  Owner login
                </Link>
              </div>
            </div>
          ))}
          {cards.length === 0 ? (
            <p className="text-sm text-white/40 col-span-full text-center py-10">No shops yet — launch one from the platform console.</p>
          ) : null}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-white/40" style={{ borderColor: "rgba(255,255,255,.08)" }}>
        Jewel Portal · Jeweller commerce platform
      </footer>
    </div>
  );
}
