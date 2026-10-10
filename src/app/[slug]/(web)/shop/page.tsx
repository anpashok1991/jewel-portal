import Link from "next/link";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { listProducts, categoryTree } from "@/lib/catalog";
import ProductCard from "@/components/store/ProductCard";

export const metadata: Metadata = { title: "Shop Jewellery" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ShopPage(props: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  const filters = {
    q: one(sp.q),
    material: one(sp.material),
    audience: one(sp.audience),
    type: one(sp.type),
    purity: one(sp.purity),
    min: one(sp.min) ? Number(one(sp.min)) : undefined,
    max: one(sp.max) ? Number(one(sp.max)) : undefined,
    sort: (one(sp.sort) as "new" | "price_asc" | "price_desc" | "popular") || "new",
    page: one(sp.page) ? Number(one(sp.page)) : 1,
  };

  const [{ items, total, page, pages }, cats, wishlist, purityRows] = await Promise.all([
    listProducts(tenant.id, filters),
    categoryTree(tenant.id),
    session ? db.wishlist.findMany({ where: { userId: session.uid }, select: { productId: true } }) : Promise.resolve([]),
    db.product.findMany({ where: { shopId: tenant.id, status: "ACTIVE" }, select: { purity: true }, distinct: ["purity"] }),
  ]);
  const wished = new Set(wishlist.map((w) => w.productId));

  const buildQuery = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = {
      q: filters.q, material: filters.material, audience: filters.audience, type: filters.type,
      purity: filters.purity, min: filters.min ? String(filters.min) : undefined,
      max: filters.max ? String(filters.max) : undefined, sort: filters.sort, page: undefined,
    };
    for (const [k, v] of Object.entries(patch)) next[k] = v;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
    const s = qs.toString();
    return `/${slug}/shop${s ? `?${s}` : ""}`;
  };

  const activeCount = [filters.material, filters.audience, filters.type, filters.purity, filters.min, filters.max, filters.q].filter(Boolean).length;

  const filterProps = { buildQuery };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
      {/* breadcrumb */}
      <nav className="text-xs text-muted mb-4">
        <Link href={`/${slug}`} className="hover:underline">Home</Link> / <span>Shop</span>
        {filters.type ? <> / <span>{cats.type.find((c) => c.slug === filters.type)?.name}</span></> : null}
      </nav>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="section-title !text-2xl sm:!text-3xl">
            {filters.type
              ? cats.type.find((c) => c.slug === filters.type)?.name ?? "Jewellery"
              : filters.material
                ? `${cats.material.find((c) => c.slug === filters.material)?.name ?? ""} Jewellery`
                : filters.audience
                  ? `Jewellery for ${cats.audience.find((c) => c.slug === filters.audience)?.name ?? ""}`
                  : "All Jewellery"}
          </h1>
          <p className="text-sm text-muted mt-1">{total} designs · live-rate pricing</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={buildQuery({})} method="get" className="flex items-center gap-2">
            <input type="hidden" name="q" value={filters.q ?? ""} />
            <input type="hidden" name="material" value={filters.material ?? ""} />
            <input type="hidden" name="type" value={filters.type ?? ""} />
            <input type="hidden" name="audience" value={filters.audience ?? ""} />
            <select name="sort" className="input !min-h-10 !w-auto text-sm" defaultValue={filters.sort}>
              <option value="new">Newest</option>
              <option value="popular">Popular</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>
          </form>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[260px_1fr] gap-6">
        {/* filters */}
        <aside className="lg:sticky lg:top-24 h-max">
          <details className="card p-4 lg:hidden" open={activeCount > 0}>
            <summary className="font-semibold text-sm cursor-pointer">Filters {activeCount ? `(${activeCount} active)` : ""}</summary>
            <div className="mt-2">
              <FilterBlock title="Material" options={cats.material} activeKey="material" activeVal={filters.material} {...filterProps} />
              <FilterBlock title="Category" options={cats.type} activeKey="type" activeVal={filters.type} {...filterProps} />
              <FilterBlock title="Shop for" options={cats.audience} activeKey="audience" activeVal={filters.audience} {...filterProps} />
              <FilterBlock title="Purity" options={purityRows.map((p) => ({ slug: p.purity, name: p.purity }))} activeKey="purity" activeVal={filters.purity} {...filterProps} />
              <PriceFilter slug={slug} filters={filters} />
            </div>
          </details>

          <div className="hidden lg:block card p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Filters</span>
              {activeCount ? <Link href={`/${slug}/shop`} className="text-xs underline text-danger">Clear</Link> : null}
            </div>
            <FilterBlock title="Material" options={cats.material} activeKey="material" activeVal={filters.material} {...filterProps} />
            <FilterBlock title="Category" options={cats.type} activeKey="type" activeVal={filters.type} {...filterProps} />
            <FilterBlock title="Shop for" options={cats.audience} activeKey="audience" activeVal={filters.audience} {...filterProps} />
            <FilterBlock title="Purity" options={purityRows.map((p) => ({ slug: p.purity, name: p.purity }))} activeKey="purity" activeVal={filters.purity} {...filterProps} />
            <PriceFilter slug={slug} filters={filters} />
          </div>
        </aside>

        {/* grid */}
        <div>
          {items.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">✦</div>
              <p className="font-semibold">No designs match these filters</p>
              <p className="text-sm text-muted mt-1">Try widening the price range or clearing filters.</p>
              <Link href={`/${slug}/shop`} className="btn btn-primary mt-4">Clear filters</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {items.map((p, i) => (
                <ProductCard
                  key={p.id}
                  index={i}
                  productId={p.id}
                  slug={slug}
                  href={`/${slug}/p/${p.slug}`}
                  name={p.name}
                  image={p.images[0]}
                  pricePaise={p.pricePaise}
                  purity={p.purity}
                  weightMg={p.netWeightMg}
                  wished={wished.has(p.id)}
                  badge={p.featured ? "Featured" : undefined}
                />
              ))}
            </div>
          )}

          {pages > 1 ? (
            <div className="mt-8 flex justify-center gap-2 flex-wrap">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={buildQuery({ page: n === 1 ? undefined : String(n) })}
                  className="chip !min-h-10 !min-w-10 justify-center"
                  data-active={n === page}
                >
                  {n}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type QueryBuilder = (patch: Record<string, string | undefined>) => string;
type ShopFilterState = {
  q?: string; material?: string; audience?: string; type?: string; purity?: string;
  sort?: string; min?: number; max?: number;
};

function FilterBlock({
  title, options, activeKey, activeVal, buildQuery,
}: {
  title: string;
  options: { slug: string; name: string }[];
  activeKey: string;
  activeVal?: string;
  buildQuery: QueryBuilder;
}) {
  return (
    <div className="py-3 border-b" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 25%, transparent)" }}>
      <div className="label !mb-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        <Link href={buildQuery({ [activeKey]: undefined })} className="chip !min-h-8 !text-xs !py-1 !px-3" data-active={!activeVal}>
          All
        </Link>
        {options.map((o) => (
          <Link key={o.slug} href={buildQuery({ [activeKey]: o.slug })} className="chip !min-h-8 !text-xs !py-1 !px-3" data-active={activeVal === o.slug}>
            {o.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PriceFilter({ slug, filters }: { slug: string; filters: ShopFilterState }) {
  return (
    <form method="get" action={`/${slug}/shop`} className="py-3">
      <input type="hidden" name="q" value={filters.q ?? ""} />
      <input type="hidden" name="material" value={filters.material ?? ""} />
      <input type="hidden" name="audience" value={filters.audience ?? ""} />
      <input type="hidden" name="type" value={filters.type ?? ""} />
      <input type="hidden" name="purity" value={filters.purity ?? ""} />
      <input type="hidden" name="sort" value={filters.sort ?? "new"} />
      <div className="label !mb-2">Price (₹)</div>
      <div className="flex items-center gap-2">
        <input type="number" name="min" className="input !min-h-9 !py-1 text-xs" placeholder="Min" defaultValue={filters.min ?? ""} min={0} />
        <span className="text-muted">–</span>
        <input type="number" name="max" className="input !min-h-9 !py-1 text-xs" placeholder="Max" defaultValue={filters.max ?? ""} min={0} />
      </div>
      <button type="submit" className="btn btn-ghost w-full mt-2 !min-h-9 text-xs">Apply price</button>
    </form>
  );
}
