import Link from "next/link";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { listProducts } from "@/lib/catalog";
import ProductCard from "@/components/store/ProductCard";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tenant = await requireTenant(slug);

  const result = q ? await listProducts(tenant.id, { q, perPage: 24 }) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="section-title !text-2xl">Search</h1>

      <form method="get" action={`/${slug}/search`} className="mt-4 flex gap-2 max-w-xl">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={`Search jewellery at ${tenant.name}…`}
          className="input flex-1"
          autoFocus
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      {!result ? (
        <p className="text-sm text-muted mt-6">Try “ring”, “mangalsutra”, “22K”, “gift”, or a category name.</p>
      ) : !result.items.length ? (
        <div className="mt-8 card p-8 text-center">
          <p className="font-semibold">No matches for “{q}”</p>
          <p className="text-sm text-muted mt-1">Check spelling, or browse the full catalogue.</p>
          <Link href={`/${slug}/shop`} className="btn btn-primary mt-4 inline-flex">Browse all jewellery</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted mt-5">{result.total} result{result.total === 1 ? "" : "s"} for “{q}”</p>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {result.items.map((p, i) => (
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
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
