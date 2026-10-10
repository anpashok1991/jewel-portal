import "server-only";
import { db } from "./db";
import { priceLine, resolveRate, type PricedLine } from "./pricing";
import type { LineInput } from "./pricing";

export type ProductFilters = {
  q?: string;
  material?: string;
  audience?: string;
  type?: string;
  purity?: string;
  min?: number; // rupees
  max?: number; // rupees
  sort?: "new" | "price_asc" | "price_desc" | "popular";
  featured?: boolean;
  page?: number;
  perPage?: number;
};

export function parseImages(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function lineForProduct(shopId: string, product: {
  id: string; netWeightMg: number; purity: string; metal: string; makingMode: string;
  makingValue: number; stoneValuePaise: number; gstPercentBp: number; gstExempt: boolean;
  fixedPricePaise: number;
}): Promise<PricedLine> {
  const rate = product.fixedPricePaise > 0 ? 0 : await resolveRate(shopId, product.metal, product.purity);
  const input: LineInput = {
    id: product.id,
    qty: 1,
    netWeightMg: product.netWeightMg,
    purity: product.purity,
    metal: product.metal,
    ratePerGramPaise: rate,
    makingMode: product.makingMode,
    makingValue: product.makingValue,
    stoneValuePaise: product.stoneValuePaise,
    gstPercentBp: product.gstPercentBp,
    gstExempt: product.gstExempt,
    fixedPricePaise: product.fixedPricePaise,
  };
  return priceLine(input);
}

/** Estimated display price (unit) including making + stones, before tax. */
export async function estimatePrice(shopId: string, product: Parameters<typeof lineForProduct>[1]): Promise<number> {
  const line = await lineForProduct(shopId, product);
  return line.unitSubPaise;
}

const PRODUCT_INCLUDE = {
  typeCat: { select: { slug: true, name: true } },
  materialCat: { select: { slug: true, name: true } },
  audienceCat: { select: { slug: true, name: true } },
} as const;

export async function listProducts(shopId: string, f: ProductFilters) {
  const where = {
    shopId,
    status: "ACTIVE" as const,
    ...(f.type ? { typeCat: { slug: f.type } } : {}),
    ...(f.material ? { materialCat: { slug: f.material } } : {}),
    ...(f.audience ? { audienceCat: { slug: f.audience } } : {}),
    ...(f.purity ? { purity: f.purity } : {}),
    ...(f.featured ? { featured: true } : {}),
    ...(f.q
      ? {
          OR: [
            { name: { contains: f.q } },
            { tags: { contains: f.q } },
            { description: { contains: f.q } },
          ],
        }
      : {}),
  };

  let products = await db.product.findMany({ where, include: PRODUCT_INCLUDE, take: 400 });

  // price band filter (computed at live rate)
  if (f.min != null || f.max != null) {
    const priced = await Promise.all(
      products.map(async (p) => ({ p, price: await estimatePrice(shopId, p) })),
    );
    products = priced
      .filter(({ price }) => (f.min == null || price >= f.min * 100) && (f.max == null || price <= f.max * 100))
      .map(({ p }) => p);
  }

  if (f.sort === "price_asc" || f.sort === "price_desc") {
    const priced = await Promise.all(products.map(async (p) => ({ p, price: await estimatePrice(shopId, p) })));
    priced.sort((a, b) => (f.sort === "price_asc" ? a.price - b.price : b.price - a.price));
    products = priced.map(({ p }) => p);
  } else if (f.sort === "popular") {
    products = [...products].sort((a, b) => b.soldCount - a.soldCount);
  } else {
    products = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  const perPage = f.perPage ?? 24;
  const page = Math.max(1, f.page ?? 1);
  const total = products.length;
  const start = (page - 1) * perPage;
  const items = products.slice(start, start + perPage);

  const withPrice = await Promise.all(
    items.map(async (p) => ({ ...p, pricePaise: await estimatePrice(shopId, p), images: parseImages(p.imagesJson) })),
  );

  return { items: withPrice, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getProduct(shopId: string, slug: string) {
  const p = await db.product.findFirst({
    where: { shopId, slug },
    include: { ...PRODUCT_INCLUDE, variants: { where: { active: true } }, reviews: { where: { approved: true }, include: { user: { select: { name: true } } } } },
  });
  if (!p) return null;
  const price = await estimatePrice(shopId, p);
  const rate = p.fixedPricePaise > 0 ? 0 : await resolveRate(shopId, p.metal, p.purity);
  return {
    ...p,
    pricePaise: price,
    rateApplied: rate,
    images: parseImages(p.imagesJson),
  };
}

export async function categoryTree(shopId: string) {
  const cats = await db.category.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } });
  return {
    material: cats.filter((c) => c.axis === "MATERIAL"),
    audience: cats.filter((c) => c.axis === "AUDIENCE"),
    type: cats.filter((c) => c.axis === "TYPE"),
  };
}

export async function branchStock(shopId: string, productId: string, variantId = "") {
  const rows = await db.inventory.findMany({
    where: { shopId, productId, ...(variantId ? { variantId } : { variantId: "" }) },
    include: { branch: { select: { id: true, name: true, city: true, isDefault: true } } },
  });
  return rows.map((r) => ({ branch: r.branch, qty: r.qty, low: r.qty <= r.lowStockAt }));
}
