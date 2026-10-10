import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getProduct, branchStock, listProducts } from "@/lib/catalog";
import { formatINR, formatWeightMg } from "@/lib/money";
import { waMeUrl } from "@/lib/upi";
import Gallery from "@/components/store/Gallery";
import AddToCart from "@/components/store/AddToCart";
import SizeGuide from "@/components/store/SizeGuide";
import WishButton from "@/components/store/WishButton";
import ProductCard from "@/components/store/ProductCard";
import ProductViewer360 from "@/components/three/ProductViewer";

export async function generateMetadata(props: { params: Promise<{ handle: string; slug: string }> }): Promise<Metadata> {
  const { slug, handle } = await props.params;
  const t = await requireTenant(slug).catch(() => null);
  if (!t) return {};
  const p = await getProduct(t.id, handle);
  return p ? { title: p.name, description: p.description.slice(0, 160) } : {};
}

const METAL_COLOR: Record<string, string> = {
  GOLD: "#d9b64e", SILVER: "#c7ccd4", PLATINUM: "#dfe4ea", DIAMOND: "#e8eefc", GEMSTONE: "#2f9e77",
};

export default async function ProductPage(props: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug, handle } = await props.params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  const product = await getProduct(tenant.id, handle);
  if (!product) notFound();

  const [stock, related, wishedRow] = await Promise.all([
    branchStock(tenant.id, product.id),
    listProducts(tenant.id, { type: product.typeCat.slug, perPage: 4 }),
    session ? db.wishlist.findFirst({ where: { userId: session.uid, productId: product.id } }) : Promise.resolve(null),
  ]);

  const images = product.images;
  const gstEst = product.gstExempt ? 0 : Math.round((product.pricePaise * product.gstPercentBp) / 10000);
  const metalColor = METAL_COLOR[product.metal] ?? "#d9b64e";
  const wa = tenant.whatsappEnabled && tenant.whatsappNumber
    ? waMeUrl(tenant.whatsappNumber, `Hi ${tenant.name}, I'm interested in "${product.name}" (${slug}/p/${handle})`)
    : null;

  const breakup = [
    { label: product.fixedPricePaise > 0 ? "Item price" : `Metal (${product.purity})`, value: product.fixedPricePaise > 0 ? product.pricePaise - product.stoneValuePaise : Math.round(product.pricePaise * 0.78) },
    { label: "Making charges", value: product.fixedPricePaise > 0 ? 0 : product.pricePaise - product.stoneValuePaise - Math.round(product.pricePaise * 0.78) },
    ...(product.stoneValuePaise ? [{ label: "Stone value", value: product.stoneValuePaise }] : []),
    { label: product.gstExempt ? "GST — Exempt (Nil rated)" : `GST @ ${(product.gstPercentBp / 100).toFixed(0)}%`, value: gstEst },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
      <nav className="text-xs text-muted mb-5">
        <Link href={`/${slug}`} className="hover:underline">Home</Link> /{" "}
        <Link href={`/${slug}/shop?type=${product.typeCat.slug}`} className="hover:underline">{product.typeCat.name}</Link> /{" "}
        <span>{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
        <Gallery
          images={images}
          videoUrl={product.videoUrl}
          name={product.name}
          viewer={
            <ProductViewer360
              metalColor={metalColor}
              gemColor={product.metal === "DIAMOND" || product.stoneValuePaise > 0 ? "#eaf4ff" : "#f5d76e"}
              hasGem={product.stoneValuePaise > 0}
              label={product.name}
            />
          }
        />

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              {product.featured ? <span className="badge">Featured</span> : null}
              <h1 className="section-title !text-2xl sm:!text-3xl mt-1">{product.name}</h1>
            </div>
            <WishButton productId={product.id} slug={slug} active={Boolean(wishedRow)} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-sm text-muted">
            <span className="text-gold">{"★".repeat(Math.round((product.reviews.reduce((s, r) => s + r.rating, 0) || 5) / (product.reviews.length || 1)))}</span>
            <span>{product.reviews.length} reviews</span>
            <span>·</span>
            <span>{product.soldCount > 0 ? `${product.soldCount} sold` : "In stock"}</span>
          </div>

          {/* price */}
          <div className="mt-4 card p-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-bold" style={{ color: "var(--c-primary)" }}>{formatINR(product.pricePaise)}</span>
              <span className="text-xs text-muted">incl. making · {product.gstExempt ? "GST exempt" : `+ GST @ ${(product.gstPercentBp / 100).toFixed(0)}%`}</span>
            </div>
            <div className="text-xs text-muted mt-1">
              {product.fixedPricePaise === 0 && product.rateApplied
                ? `Priced at ₹${(product.rateApplied / 100).toFixed(2)}/g for ${product.purity} · live rate`
                : "Fixed price"}
            </div>

            <div className="mt-3 hairline" />
            <table className="w-full text-sm mt-3">
              <tbody>
                {breakup.map((b) => (
                  <tr key={b.label}>
                    <td className="py-1 text-muted">{b.label}</td>
                    <td className="py-1 text-right font-medium">{b.value ? formatINR(b.value) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 30%, transparent)" }}>
                  <td className="pt-2 font-bold">Total</td>
                  <td className="pt-2 text-right font-bold">{formatINR(product.pricePaise + gstEst)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* specs */}
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="card p-3"><dt className="text-xs text-muted">Purity</dt><dd className="font-semibold">{product.purity}{product.metal === "SILVER" ? " Sterling" : ""}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Net weight</dt><dd className="font-semibold">{formatWeightMg(product.netWeightMg)}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">Category</dt><dd className="font-semibold">{product.typeCat.name}</dd></div>
            <div className="card p-3"><dt className="text-xs text-muted">SKU / HSN</dt><dd className="font-semibold">{product.sku || product.hsnCode}</dd></div>
          </dl>

          <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
            <span className="badge">🏛️ BIS Hallmarked</span>
            {product.certificateImg ? <span className="badge">📜 Certificate available</span> : null}
            <SizeGuide type={product.typeCat.name} />
          </div>

          <div className="mt-5">
            <AddToCart
              productId={product.id}
              slug={slug}
              variants={product.variants.map((v) => ({ id: v.id, label: v.label, size: v.size }))}
              branches={stock.map((s) => s.branch)}
              requireSize={product.variants.length > 0}
            />
          </div>

          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="btn w-full mt-3" style={{ background: "#25D366", color: "#0b3d22" }}>
              Enquire on WhatsApp
            </a>
          ) : null}

          {/* branch stock */}
          <div className="mt-5 card p-4">
            <div className="label !mb-2">Availability</div>
            <ul className="text-sm space-y-1.5">
              {stock.map((s) => (
                <li key={s.branch.id} className="flex justify-between gap-2">
                  <span>{s.branch.name}{s.branch.city ? `, ${s.branch.city}` : ""}</span>
                  <span className={s.qty > 0 ? "" : "text-danger"}>
                    {s.qty > 0 ? (s.low ? `Only ${s.qty} left` : `${s.qty} in stock`) : "Out of stock"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-2">Free store pickup · insured home delivery · ETA 2–5 days</p>
          </div>
        </div>
      </div>

      {/* description + reviews */}
      <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="card p-5 sm:p-6">
          <h2 className="section-title !text-xl">Description</h2>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted">
            {product.description || "Handcrafted with care by our master artisans."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(product.tags ? product.tags.split(/[,\s]+/).filter(Boolean) : []).map((t) => (
              <span key={t} className="chip !min-h-8 !text-xs !py-1 !px-3 cursor-default">#{t}</span>
            ))}
          </div>

          <div className="mt-6 hairline" />
          <h3 className="font-bold mt-5">Customer reviews</h3>
          {product.reviews.length === 0 ? (
            <p className="text-sm text-muted mt-2">No reviews yet — be the first to review this piece.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {product.reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  <div className="text-gold text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                  <p className="mt-1">{r.comment}</p>
                  <div className="text-xs text-muted mt-0.5">— {r.user.name}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 sm:p-6 h-max">
          <h3 className="font-bold">Good to know</h3>
          <ul className="mt-3 text-sm space-y-2.5 text-muted">
            <li>✓ GST invoice with your GSTIN (or exempt line where applicable)</li>
            <li>✓ 7-day return / size exchange with invoice</li>
            <li>✓ Free exchange at live gold rate for old gold</li>
            <li>✓ Insured packaging + tracking on every order</li>
            <li>✓ Pay by UPI QR, Razorpay or Cash on Delivery</li>
          </ul>
          <Link href={`/${slug}/appointment`} className="btn btn-ghost w-full mt-4">Book a viewing</Link>
        </div>
      </div>

      {/* related */}
      {related.items.filter((r) => r.id !== product.id).length ? (
        <div className="mt-12">
          <h2 className="section-title !text-xl">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
            {related.items
              .filter((r) => r.id !== product.id)
              .slice(0, 4)
              .map((p, i) => (
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
        </div>
      ) : null}
    </div>
  );
}
