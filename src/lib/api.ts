/**
 * Helpers for the JSON API (v1). Pure — no server-only imports — so unit tests can use them.
 * Security: serializers below are whitelists. Never expose passwordHash, costPaise,
 * razorpaySecret or other private columns to API clients.
 */

/** Extract a JWT from an `Authorization: Bearer <token>` header value. */
export function bearerToken(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) return null;
  const m = /^Bearer[ ]+(.+)$/i.exec(authorizationHeader.trim());
  const token = m?.[1]?.trim() ?? "";
  return token || null;
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function jsonErr(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** Parse a JSON object body; returns null for invalid/empty/array bodies. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function bodyStr(body: Record<string, unknown>, key: string, max = 500): string {
  const v = body[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function bodyInt(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return undefined;
}

export function bodyBool(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true || body[key] === "true" || body[key] === "on";
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

type CategoryRef = { slug: string; name: string } | null | undefined;

export type ApiProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sku: string;
  metal: string;
  purity: string;
  netWeightMg: number;
  grossWeightMg: number;
  fixedPricePaise: number;
  makingMode: string;
  makingValue: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  gstExempt: boolean;
  hsnCode: string;
  featured: boolean;
  soldCount: number;
  status: string;
  videoUrl: string;
  certificateImg: string;
  images: string[];
  pricePaise: number;
  createdAt: Date | string;
  typeCat?: CategoryRef;
  materialCat?: CategoryRef;
  audienceCat?: CategoryRef;
};

function categoryRef(c: CategoryRef) {
  return c ? { slug: c.slug, name: c.name } : null;
}

/** Customer-safe product payload (no costPaise / imagesJson / shopId). */
export function apiProduct(p: ApiProductRow) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    sku: p.sku,
    metal: p.metal,
    purity: p.purity,
    netWeightMg: p.netWeightMg,
    grossWeightMg: p.grossWeightMg,
    fixedPricePaise: p.fixedPricePaise,
    makingMode: p.makingMode,
    makingValue: p.makingValue,
    stoneValuePaise: p.stoneValuePaise,
    gstPercentBp: p.gstPercentBp,
    gstExempt: p.gstExempt,
    hsnCode: p.hsnCode,
    featured: p.featured,
    soldCount: p.soldCount,
    images: p.images,
    pricePaise: p.pricePaise,
    videoUrl: p.videoUrl,
    certificateImg: p.certificateImg,
    type: categoryRef(p.typeCat),
    material: categoryRef(p.materialCat),
    audience: categoryRef(p.audienceCat),
    createdAt: iso(p.createdAt),
  };
}

export type ApiOrderItemRow = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  qty: number;
  purity: string;
  netWeightMg: number;
  rateApplied: number;
  metalPaise: number;
  makingPaise: number;
  stonePaise: number;
  lineSubPaise: number;
  discountPaise: number;
  gstPercentBp: number;
  gstExempt: boolean;
  gstPaise: number;
  lineTotalPaise: number;
  hsnCode: string;
};

export function apiOrderItem(item: ApiOrderItemRow) {
  return { ...item };
}

export type ApiOrderRow = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  subTotalPaise: number;
  discountPaise: number;
  couponCode: string;
  couponPaise: number;
  giftCardPaise: number;
  loyaltyPointsUsed: number;
  loyaltyPaise: number;
  platformFeePaise: number;
  gstPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  roundOffPaise: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  addressJson: string;
  courier: string;
  awb: string;
  etaDate: string;
  cancelReason: string;
  invoiceNumber: string;
  placedAt: Date | string;
  shippedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  shop?: { slug: string; name: string } | null;
  items?: ApiOrderItemRow[];
  events?: { id: string; status: string; note: string; actor: string; createdAt: Date | string }[];
};

function parseAddress(json: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(json || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Customer-safe order payload. */
export function apiOrder(o: ApiOrderRow) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    fulfillment: o.fulfillment,
    totals: {
      subTotalPaise: o.subTotalPaise,
      discountPaise: o.discountPaise,
      couponCode: o.couponCode,
      couponPaise: o.couponPaise,
      giftCardPaise: o.giftCardPaise,
      loyaltyPointsUsed: o.loyaltyPointsUsed,
      loyaltyPaise: o.loyaltyPaise,
      platformFeePaise: o.platformFeePaise,
      gstPaise: o.gstPaise,
      shippingPaise: o.shippingPaise,
      codFeePaise: o.codFeePaise,
      roundOffPaise: o.roundOffPaise,
      totalPaise: o.totalPaise,
    },
    payment: { method: o.paymentMethod, status: o.paymentStatus },
    address: parseAddress(o.addressJson),
    courier: o.courier,
    awb: o.awb,
    etaDate: o.etaDate,
    cancelReason: o.cancelReason,
    invoiceNumber: o.invoiceNumber,
    shop: o.shop ?? null,
    placedAt: iso(o.placedAt),
    shippedAt: iso(o.shippedAt),
    deliveredAt: iso(o.deliveredAt),
    cancelledAt: iso(o.cancelledAt),
    items: (o.items ?? []).map(apiOrderItem),
    events: (o.events ?? []).map((e) => ({ ...e, createdAt: iso(e.createdAt) })),
  };
}

export type ApiUserRow = {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: string;
  shopId: string | null;
  avatar: string;
  createdAt: Date | string;
};

/** Customer-safe user profile (no passwordHash). */
export function apiUser(u: ApiUserRow) {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    shopId: u.shopId ?? "",
    avatar: u.avatar,
    createdAt: iso(u.createdAt),
  };
}
