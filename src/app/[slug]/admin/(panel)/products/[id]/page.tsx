import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { ProductForm, type ProductSeed } from "@/components/admin/ProductForm";

export const metadata = { title: "Edit product · Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const tenant = await requireTenant(slug);

  const [product, cats, branches, inventory] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { shopId: tenant.id }, orderBy: { name: "asc" } }),
    db.inventory.findMany({ where: { shopId: tenant.id, productId: id, variantId: "" } }),
  ]);
  if (!product || product.shopId !== tenant.id) notFound();

  const variants = await db.productVariant.findMany({ where: { productId: id }, orderBy: { label: "asc" } });

  const seed: ProductSeed = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    typeId: product.typeId,
    materialId: product.materialId,
    audienceId: product.audienceId,
    metal: product.metal,
    purity: product.purity,
    netWeightMg: product.netWeightMg,
    grossWeightMg: product.grossWeightMg,
    fixedPricePaise: product.fixedPricePaise,
    costPaise: product.costPaise,
    makingMode: product.makingMode,
    makingValue: product.makingValue,
    stoneValuePaise: product.stoneValuePaise,
    gstPercentBp: product.gstPercentBp,
    gstExempt: product.gstExempt,
    hsnCode: product.hsnCode,
    imagesJson: product.imagesJson,
    videoUrl: product.videoUrl,
    status: product.status,
    featured: product.featured,
    tags: product.tags,
  };

  const branchQty: Record<string, number> = {};
  for (const inv of inventory) branchQty[inv.branchId] = inv.qty;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Catalog · editing</p>
        <h1 className="text-2xl font-bold">{product.name}</h1>
      </div>
      <ProductForm
        slug={slug}
        product={seed}
        categories={{
          type: cats.filter((c) => c.axis === "TYPE").map((c) => ({ id: c.id, name: c.name })),
          material: cats.filter((c) => c.axis === "MATERIAL").map((c) => ({ id: c.id, name: c.name })),
          audience: cats.filter((c) => c.axis === "AUDIENCE").map((c) => ({ id: c.id, name: c.name })),
        }}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        branchQty={branchQty}
        initialVariants={variants.map((v) => ({ label: v.label, size: v.size, sku: v.sku, extraWeightMg: v.extraWeightMg }))}
      />
    </div>
  );
}
