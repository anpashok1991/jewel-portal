import { getTenant } from "@/lib/tenant";
import { listProducts } from "@/lib/catalog";
import { jsonOk, jsonErr, apiProduct } from "@/lib/api";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const url = new URL(req.url);
  const num = (key: string) => {
    const v = url.searchParams.get(key);
    return v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  const sortRaw = url.searchParams.get("sort") ?? "";
  const sort = sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "popular" || sortRaw === "new" ? sortRaw : undefined;

  const result = await listProducts(tenant.id, {
    q: url.searchParams.get("q") ?? undefined,
    material: url.searchParams.get("material") ?? undefined,
    audience: url.searchParams.get("audience") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    purity: url.searchParams.get("purity") ?? undefined,
    min: num("min"),
    max: num("max"),
    sort,
    featured: url.searchParams.get("featured") === "1" || url.searchParams.get("featured") === "true",
    page: num("page"),
    perPage: Math.min(60, num("perPage") ?? 24),
  });

  return jsonOk({
    items: result.items.map(apiProduct),
    total: result.total,
    page: result.page,
    perPage: result.perPage,
    pages: result.pages,
  });
}
