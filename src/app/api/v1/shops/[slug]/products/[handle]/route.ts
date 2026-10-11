import { getTenant } from "@/lib/tenant";
import { getProduct, branchStock } from "@/lib/catalog";
import { jsonOk, jsonErr, apiProduct, type ApiProductRow } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug, handle } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const product = await getProduct(tenant.id, handle);
  if (!product || product.status !== "ACTIVE") return jsonErr(404, "Product not found.");

  const stock = await branchStock(tenant.id, product.id);

  return jsonOk({
    product: {
      ...apiProduct(product as unknown as ApiProductRow),
      rateApplied: product.rateApplied,
      variants: product.variants.map((v) => ({
        id: v.id,
        label: v.label,
        size: v.size,
        extraWeightMg: v.extraWeightMg,
      })),
      reviews: product.reviews.map((r) => ({
        rating: r.rating,
        comment: r.comment,
        customerName: r.user.name,
        createdAt: r.createdAt.toISOString(),
      })),
      stock: stock.map((s) => ({
        branchId: s.branch.id,
        branchName: s.branch.name,
        city: s.branch.city,
        isDefault: s.branch.isDefault,
        qty: s.qty,
        low: s.low,
      })),
    },
  });
}
