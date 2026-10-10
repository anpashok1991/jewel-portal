import Link from "next/link";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseImages, estimatePrice } from "@/lib/catalog";
import ProductCard from "@/components/store/ProductCard";
import WishButton from "@/components/store/WishButton";

export const metadata: Metadata = { title: "My Wishlist" };

export default async function WishlistPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="section-title !text-2xl">Your wishlist</h1>
        <p className="text-muted mt-3">Login to save favourites and sync them across devices.</p>
        <Link href={`/account/login?next=/${slug}/wishlist`} className="btn btn-primary mt-6">Login</Link>
      </div>
    );
  }

  const items = await db.wishlist.findMany({
    where: { userId: session.uid, shopId: tenant.id },
    include: { product: { include: { typeCat: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    items.map(async (w) => ({ w, pricePaise: await estimatePrice(tenant.id, w.product) })),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="section-title !text-2xl">My Wishlist</h1>
        <span className="text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>

      {!items.length ? (
        <div className="mt-8 card p-10 text-center">
          <div className="text-4xl">♡</div>
          <p className="font-semibold mt-2">Nothing saved yet</p>
          <p className="text-sm text-muted mt-1">Tap the heart on any product to save it here.</p>
          <Link href={`/${slug}/shop`} className="btn btn-primary mt-5 inline-flex">Discover jewellery</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {rows.map(({ w, pricePaise }, i) => (
            <div key={w.id} className="relative">
              <ProductCard
                index={i}
                productId={w.productId}
                slug={slug}
                href={`/${slug}/p/${w.product.slug}`}
                name={w.product.name}
                image={parseImages(w.product.imagesJson)[0]}
                pricePaise={pricePaise}
                purity={w.product.purity}
                weightMg={w.product.netWeightMg}
              />
              <div className="absolute top-2 right-2 z-10">
                <WishButton productId={w.productId} slug={slug} active />
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length ? (
        <p className="text-xs text-muted mt-6">
          Prices shown include making charges and refresh live with {tenant.name}&apos;s daily rate.
        </p>
      ) : null}
    </div>
  );
}
