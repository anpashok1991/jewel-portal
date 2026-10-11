import { getTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/catalog";
import { jsonOk, jsonErr, apiProduct } from "@/lib/api";
import { defaultCategoryIcon } from "@/lib/category-icons";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const [banners, sections, cats, featured, latest, reviews, plans] = await Promise.all([
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
  ]);

  const slides = banners.length
    ? banners.map((b) => ({ title: b.title, subtitle: b.subtitle, image: b.image, videoUrl: b.videoUrl, href: b.href }))
    : [
        {
          title: `${tenant.name} — Jewellery that feels like home`,
          subtitle: "Hallmarked gold, certified diamonds and bespoke designs.",
          image: "", videoUrl: "", href: `/${slug}/shop`,
        },
        {
          title: "Rings for every promise",
          subtitle: "Solitaires, bands and daily-wear classics.",
          image: "", videoUrl: "", href: `/${slug}/shop?type=ring`,
        },
        {
          title: "Chains & mangalsutra",
          subtitle: "Woven in gold, blessed for a lifetime.",
          image: "", videoUrl: "", href: `/${slug}/shop?type=chain`,
        },
      ];

  const categories = cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    axis: c.axis,
    icon: c.image || defaultCategoryIcon(c.slug, c.axis),
    customIcon: Boolean(c.image),
  }));

  return jsonOk({
    shop: { slug: tenant.slug, name: tenant.name },
    slides,
    sections: sections.map((s) => ({ title: s.title, subtitle: s.subtitle, image: s.image, videoUrl: s.videoUrl, href: s.href })),
    categories,
    featured: { items: featured.items.map(apiProduct), total: featured.total },
    latest: { items: latest.items.map(apiProduct), total: latest.total },
    reviews: reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      customerName: r.user.name,
      productName: r.product.name,
      productSlug: r.product.slug,
      createdAt: r.createdAt.toISOString(),
    })),
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      amountPaise: p.amountPaise,
      frequency: p.frequency,
      mode: p.mode,
      roiPercentBp: p.roiPercentBp,
      goldBonusBp: p.goldBonusBp,
    })),
  });
}
