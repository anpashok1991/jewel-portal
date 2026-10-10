import Link from "next/link";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { listProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/money";
import HeroCarousel from "@/components/store/HeroCarousel";
import ProductCard from "@/components/store/ProductCard";
import { defaultCategoryIcon } from "@/lib/category-icons";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const t = await requireTenant(slug).catch(() => null);
  if (!t) return {};
  return { title: t.name, description: t.tagline || `Shop jewellery online at ${t.name}` };
}

function CategoryIcon({ image, fallback }: { image: string; fallback: string }) {
  if (image && /^(https?:\/\/|\/)/.test(image)) {
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded category icon; arbitrary URLs need plain img
    return <img src={image} alt="" className="mx-auto h-8 w-8 sm:h-9 sm:w-9 object-contain" loading="lazy" />;
  }
  return <>{image || fallback}</>;
}

export default async function HomePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  const [banners, sections, cats, featured, latest, reviews, plans, wishlist] = await Promise.all([
    db.banner.findMany({ where: { shopId: tenant.id, active: true, placement: "HERO" }, orderBy: { sortOrder: "asc" } }),
    db.banner.findMany({ where: { shopId: tenant.id, active: true, placement: "SECTION" }, orderBy: { sortOrder: "asc" } }),
    db.category.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { sortOrder: "asc" } }),
    listProducts(tenant.id, { featured: true, perPage: 8 }),
    listProducts(tenant.id, { perPage: 8, sort: "new" }),
    db.review.findMany({
      where: { product: { shopId: tenant.id }, approved: true },
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    tenant.features.has("schemes")
      ? db.savingsPlan.findMany({ where: { shopId: tenant.id, active: true }, take: 3 })
      : Promise.resolve([]),
    session
      ? db.wishlist.findMany({ where: { userId: session.uid }, select: { productId: true } })
      : Promise.resolve([]),
  ]);

  const wished = new Set(wishlist.map((w) => w.productId));
  const slides = banners.length
    ? banners.map((b) => ({ title: b.title, subtitle: b.subtitle, image: b.image, videoUrl: b.videoUrl, href: b.href }))
    : [
        {
          title: `${tenant.name} — Jewellery that feels like home`,
          subtitle: "Hallmarked gold, certified diamonds and bespoke designs.",
          image: "",
          videoUrl: "",
          href: `/${slug}/shop`,
        },
        {
          title: "Rings for every promise",
          subtitle: "Solitaires, bands and daily-wear classics.",
          image: "",
          videoUrl: "",
          href: `/${slug}/shop?type=ring`,
        },
        {
          title: "Chains & mangalsutra",
          subtitle: "Woven in gold, blessed for a lifetime.",
          image: "",
          videoUrl: "",
          href: `/${slug}/shop?type=chain`,
        },
      ];

  const types = cats.filter((c) => c.axis === "TYPE");
  const materials = cats.filter((c) => c.axis === "MATERIAL");
  const audiences = cats.filter((c) => c.axis === "AUDIENCE");

  const cardHref = (h: string) => `/${slug}/p/${h}`;

  return (
    <>
      <HeroCarousel
        slides={slides}
        accent={tenant.theme.colors.accent}
      />

      {/* trust strip */}
      <section className="border-y" style={{ background: "var(--c-surface)", borderColor: "color-mix(in srgb, var(--c-muted) 25%, transparent)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs sm:text-sm">
          <div className="reveal">🚚 <b>Insured Delivery</b><div className="text-muted">Free above ₹5,000</div></div>
          <div className="reveal">🏛️ <b>BIS Hallmark</b><div className="text-muted">HUID verified</div></div>
          <div className="reveal">🧾 <b>GST Invoice</b><div className="text-muted">Every purchase</div></div>
          <div className="reveal">🔄 <b>Easy Exchange</b><div className="text-muted">Old gold at live rate</div></div>
        </div>
      </section>

      {/* shop by type */}
      <section id="collections" className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="section-title">Shop by Category</h2>
            <p className="text-muted text-sm mt-1">Rings, chains, mangal sutra and more — designed for every occasion.</p>
          </div>
          <Link href={`/${slug}/shop`} className="btn btn-ghost text-sm">View all →</Link>
        </div>
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {types.map((t, i) => (
            <Link
              key={t.id}
              href={`/${slug}/shop?type=${t.slug}`}
              className="card p-3 text-center hover:-translate-y-1 transition-transform reveal"
              style={{ transitionDelay: `${i * 30}ms` }}
            >
              <div className="text-2xl sm:text-3xl mb-1"><CategoryIcon image={t.image} fallback={defaultCategoryIcon(t.slug, "TYPE")} /></div>
              <div className="text-[11px] sm:text-xs font-semibold leading-tight">{t.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* featured */}
      {featured.items.length ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-10 sm:pb-14">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="section-title">Featured Pieces</h2>
            <Link href={`/${slug}/shop?sort=popular`} className="btn btn-ghost text-sm">See more →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {featured.items.map((p, i) => (
              <ProductCard
                key={p.id}
                index={i}
                productId={p.id}
                slug={slug}
                href={cardHref(p.slug)}
                name={p.name}
                image={p.images[0]}
                pricePaise={p.pricePaise}
                purity={p.purity}
                weightMg={p.netWeightMg}
                wished={wished.has(p.id)}
                badge={p.stoneValuePaise > 0 ? "Diamond" : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* section banner with optional youtube video */}
      {sections[0] ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-10 sm:pb-14">
          <div className="card overflow-hidden reveal relative">
            {sections[0].videoUrl ? (
              <div className="aspect-[16/7] w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${sections[0].videoUrl.split("v=")[1]?.split("&")[0] ?? ""}`}
                  title={sections[0].title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : sections[0].image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sections[0].image} alt={sections[0].title} className="w-full h-56 sm:h-80 object-cover" />
            ) : null}
            <div className="absolute bottom-0 left-0 p-5 sm:p-8" style={{ color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,.6)" }}>
              <h3 className="section-title !text-xl sm:!text-3xl">{sections[0].title}</h3>
              <p className="text-sm max-w-md mt-1 opacity-90">{sections[0].subtitle}</p>
              {sections[0].href ? (
                <Link href={sections[0].href} className="btn btn-gold mt-3 text-sm">Discover</Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* shop by material + audience */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-10 sm:pb-14 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="section-title !text-xl sm:!text-2xl">Shop by Material</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {materials.map((m) => (
              <Link key={m.id} href={`/${slug}/shop?material=${m.slug}`} className="card p-4 hover:-translate-y-0.5 transition reveal text-center">
                <div className="text-xl mb-1"><CategoryIcon image={m.image} fallback={defaultCategoryIcon(m.slug, "MATERIAL")} /></div>
                <div className="text-sm font-semibold">{m.name}</div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title !text-xl sm:!text-2xl">Shop for</h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {audiences.map((a) => (
              <Link key={a.id} href={`/${slug}/shop?audience=${a.slug}`} className="card p-4 hover:-translate-y-0.5 transition reveal text-center">
                <div className="text-xl mb-1"><CategoryIcon image={a.image} fallback={defaultCategoryIcon(a.slug, "AUDIENCE")} /></div>
                <div className="text-sm font-semibold">{a.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* schemes teaser */}
      {plans.length ? (
        <section className="py-10 sm:py-14" style={{ background: "color-mix(in srgb, var(--c-gold) 14%, var(--c-bg))" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="section-title">Save Today, Shine Tomorrow</h2>
              <p className="text-muted text-sm mt-2">
                Daily, weekly or monthly deposits — mature into <b>gold grams</b> or <b>ROI payouts</b> you can spend on anything in the store.
              </p>
            </div>
            <div className="mt-7 grid sm:grid-cols-3 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="card p-5 reveal">
                  <div className="badge">{p.frequency} plan</div>
                  <h3 className="font-theme-display text-lg font-bold mt-2">{p.name}</h3>
                  <div className="text-2xl font-bold mt-1" style={{ color: "var(--c-primary)" }}>
                    {formatINR(p.amountPaise)}
                    <span className="text-sm font-medium text-muted">/{p.frequency.toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-muted mt-2 min-h-8">{p.description}</p>
                  <div className="mt-3 text-sm font-semibold" style={{ color: "var(--c-gold)" }}>
                    {p.mode === "GOLD" ? `Gold accrual + ${(p.goldBonusBp / 100).toFixed(1)}% bonus` : `${(p.roiPercentBp / 100).toFixed(1)}% ROI at maturity`}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link href={`/${slug}/schemes`} className="btn btn-primary">Explore schemes</Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* latest */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="section-title">New Arrivals</h2>
          <Link href={`/${slug}/shop?sort=new`} className="btn btn-ghost text-sm">All new →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {latest.items.map((p, i) => (
            <ProductCard
              key={p.id}
              index={i}
              productId={p.id}
              slug={slug}
              href={cardHref(p.slug)}
              name={p.name}
              image={p.images[0]}
              pricePaise={p.pricePaise}
              purity={p.purity}
              weightMg={p.netWeightMg}
              wished={wished.has(p.id)}
            />
          ))}
        </div>
      </section>

      {/* reviews */}
      {reviews.length ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
          <h2 className="section-title">Loved by our customers</h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5 reveal">
                <div className="text-gold text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                <p className="mt-2 text-sm leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                <div className="mt-3 text-xs text-muted">
                  — {r.user.name} · <Link href={`/${slug}/p/${r.product.slug}`} className="underline">{r.product.name}</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-14">
        <div className="card p-6 sm:p-10 text-center reveal" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--c-primary) 92%, black), var(--c-primary))", color: "#fff" }}>
          <h2 className="section-title !text-2xl sm:!text-3xl">Visit us or book a private consultation</h2>
          <p className="mt-2 text-sm opacity-90 max-w-xl mx-auto">
            Experience the collection in person — pick a branch, choose a slot, and our team will keep your favourites ready.
          </p>
          <div className="mt-5 flex justify-center gap-3 flex-wrap">
            <Link href={`/${slug}/appointment`} className="btn btn-gold">Book appointment</Link>
            <Link href={`/${slug}/exchange`} className="btn btn-ghost !text-white !border-white/50">Exchange old gold</Link>
          </div>
        </div>
      </section>
    </>
  );
}
