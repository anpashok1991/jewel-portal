"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, can } from "@/lib/auth";

export type ProductState = { error?: string };

async function requireEditor(module: string, action: "create" | "edit" | "delete") {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) return null;
  if (!(await can(s, module, action))) return null;
  return s;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

async function uniqueSlug(shopId: string, base: string, ignoreId = ""): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await db.product.findFirst({ where: { shopId, slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
}

type VariantInput = { label: string; size?: string; sku?: string; extraWeightMg?: number; active?: boolean };

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const s = await requireEditor("products", formData.get("id") ? "edit" : "create");
  if (!s) return { error: "You do not have permission to manage the catalog." };

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const typeId = String(formData.get("typeId") ?? "");
  if (!name) return { error: "Product name is required." };
  if (!typeId) return { error: "Pick a product type/category." };

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueSlug(s.shopId, rawSlug ? slugify(rawSlug) : slugify(name), id);

  const num = (key: string) => {
    const v = String(formData.get(key) ?? "").replace(/,/g, "").trim();
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const makingMode = String(formData.get("makingMode") ?? "PERCENT");
  const makingEntered = num("makingValue");
  const makingValue =
    makingMode === "NONE" ? 0 : Math.round(makingEntered * 100);

  const imagesText = String(formData.get("imagesText") ?? "");
  const images = imagesText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const variants = parseJson<VariantInput[]>(String(formData.get("variantsJson") ?? "[]"), [])
    .filter((v) => v && typeof v.label === "string" && v.label.trim())
    .map((v) => ({
      label: v.label.trim(),
      size: (v.size ?? "").trim(),
      sku: (v.sku ?? "").trim(),
      extraWeightMg: Math.max(0, Math.round(Number(v.extraWeightMg) || 0)),
      active: v.active !== false,
    }));

  const branchIds = String(formData.get("branchIds") ?? "").split(",").filter(Boolean);
  const inventory: { branchId: string; qty: number }[] = [];
  for (const b of branchIds) {
    const raw = formData.get(`inv_${b}`);
    if (raw !== null) inventory.push({ branchId: b, qty: Math.max(0, Math.round(Number(raw) || 0)) });
  }

  const data = {
    name,
    slug,
    description: String(formData.get("description") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    typeId,
    materialId: String(formData.get("materialId") ?? "") || null,
    audienceId: String(formData.get("audienceId") ?? "") || null,
    metal: String(formData.get("metal") ?? "GOLD"),
    purity: String(formData.get("purity") ?? "22K"),
    netWeightMg: Math.max(0, Math.round(num("netWeightG") * 1000)),
    grossWeightMg: Math.max(0, Math.round(num("grossWeightG") * 1000)),
    fixedPricePaise: Math.max(0, Math.round(num("fixedPriceRs") * 100)),
    costPaise: Math.max(0, Math.round(num("costRs") * 100)),
    makingMode,
    makingValue,
    stoneValuePaise: Math.max(0, Math.round(num("stoneValueRs") * 100)),
    gstPercentBp: Math.max(0, Math.round(num("gstPercent") * 100)),
    gstExempt: formData.get("gstExempt") === "on",
    hsnCode: String(formData.get("hsnCode") ?? "").trim() || "7113",
    imagesJson: JSON.stringify(images),
    videoUrl: String(formData.get("videoUrl") ?? "").trim(),
    status: String(formData.get("status") ?? "ACTIVE"),
    featured: formData.get("featured") === "on",
    tags: String(formData.get("tags") ?? "").trim(),
  };

  let productId = id;
  if (id) {
    const existing = await db.product.findFirst({ where: { id, shopId: s.shopId } });
    if (!existing) return { error: "Product not found." };
    await db.product.update({ where: { id }, data });
  } else {
    const created = await db.product.create({ data: { ...data, shopId: s.shopId } });
    productId = created.id;
  }

  // reconcile variants
  const existingVariants = await db.productVariant.findMany({ where: { productId } });
  const keepLabels = new Set(variants.map((v) => v.label));
  for (const ev of existingVariants) {
    if (!keepLabels.has(ev.label)) await db.productVariant.delete({ where: { id: ev.id } });
  }
  for (const v of variants) {
    const match = existingVariants.find((e) => e.label === v.label);
    if (match) {
      await db.productVariant.update({ where: { id: match.id }, data: { ...v } });
    } else {
      await db.productVariant.create({ data: { ...v, productId } });
    }
  }

  // upsert inventory (base rows, variantId "")
  for (const inv of inventory) {
    await db.inventory.upsert({
      where: { productId_variantId_branchId: { productId, variantId: "", branchId: inv.branchId } },
      create: { shopId: s.shopId, productId, variantId: "", branchId: inv.branchId, qty: inv.qty },
      update: { qty: inv.qty },
    });
  }

  revalidateCatalog(s.shopId);
  if (formData.get("saveAndContinue") === "1") return {};
  redirect(`/${await shopSlug(s.shopId)}/admin/products`);
}

async function shopSlug(shopId: string): Promise<string> {
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  return shop?.slug ?? "shop";
}

async function revalidateCatalog(shopId: string): Promise<void> {
  const slug = await shopSlug(shopId);
  revalidatePath(`/${slug}/admin/products`);
}

export async function setProductStatus(formData: FormData): Promise<void> {
  const s = await requireEditor("products", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["DRAFT", "ACTIVE", "HIDDEN"].includes(status)) return;
  const product = await db.product.findFirst({ where: { id, shopId: s.shopId } });
  if (!product) return;
  await db.product.update({ where: { id }, data: { status } });
  await revalidateCatalog(s.shopId);
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const s = await requireEditor("products", "delete");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const product = await db.product.findFirst({ where: { id, shopId: s.shopId } });
  if (!product) return;

  const orderCount = await db.orderItem.count({ where: { productId: id } });

  if (orderCount > 0) {
    await db.product.update({ where: { id }, data: { status: "HIDDEN" } });
  } else {
    await db.cartItem.deleteMany({ where: { productId: id } });
    await db.wishlist.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });
  }
  await revalidateCatalog(s.shopId);
}

export type CategoryState = { error?: string; ok?: boolean };

function cleanIcon(raw: string): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.length > 300) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
  if ([...v].length > 16) return null;
  return v;
}

export async function saveCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const s = await requireEditor("products", "create");
  if (!s) return { error: "You do not have permission to manage categories." };

  const name = String(formData.get("name") ?? "").trim();
  const axis = String(formData.get("axis") ?? "");
  if (!name || !["TYPE", "MATERIAL", "AUDIENCE", "OCCASION"].includes(axis)) {
    return { error: "Name and a valid axis are required." };
  }
  const icon = cleanIcon(String(formData.get("icon") ?? ""));
  if (icon === null) return { error: "Icon must be a short emoji or an image URL." };

  const slug = slugify(name);
  const existing = await db.category.findFirst({ where: { shopId: s.shopId, slug, axis } });
  if (existing) return { error: "That category already exists on this axis." };

  await db.category.create({ data: { shopId: s.shopId, name, axis, slug, image: icon } });
  await revalidateCatalog(s.shopId);
  return { ok: true };
}

export async function updateCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const s = await requireEditor("products", "edit");
  if (!s) return { error: "You do not have permission to manage categories." };

  const id = String(formData.get("id") ?? "");
  const cat = await db.category.findFirst({ where: { id, shopId: s.shopId } });
  if (!cat) return { error: "Category not found." };

  const name = String(formData.get("name") ?? "").trim() || cat.name;
  const icon = cleanIcon(String(formData.get("icon") ?? ""));
  if (icon === null) return { error: "Icon must be a short emoji or an image URL. Leave blank for the default." };

  await db.category.update({ where: { id }, data: { name, image: icon } });
  await revalidateCatalog(s.shopId);
  return { ok: true };
}

export async function toggleCategory(formData: FormData): Promise<void> {
  const s = await requireEditor("products", "edit");
  if (!s) return;
  const id = String(formData.get("id") ?? "");
  const cat = await db.category.findFirst({ where: { id, shopId: s.shopId } });
  if (!cat) return;
  await db.category.update({ where: { id }, data: { active: !cat.active } });
  await revalidateCatalog(s.shopId);
}

export type UploadState = { error?: string; url?: string };

export async function uploadImage(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) {
    return { error: "Not authorized." };
  }
  if (!(await can(s, "media", "create"))) return { error: "You cannot upload media." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image first." };
  const { saveUpload } = await import("@/lib/storage");
  try {
    const url = await saveUpload(file, "products", await shopSlug(s.shopId));
    return { url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    return { error: msg === "FILE_TOO_LARGE" ? "Image is larger than 8 MB." : "Only JPG, PNG, WebP, GIF or AVIF images are allowed." };
  }
}

export type StaffState = { error?: string; ok?: boolean };

export async function saveStaff(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const s = await getSession();
  if (!s || s.role !== "OWNER") return { error: "Only the owner can manage staff." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 6) return { error: "Name, email and a 6+ character password are required." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "That email is already registered." };

  const { hashPassword } = await import("@/lib/auth");
  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "STAFF", shopId: s.shopId },
  });

  const modules = formData.getAll("modules").map(String).filter(Boolean);
  const base = ["products", "orders", "customers", "inventory", "queries", "reports", "schemes", "coupons", "staff", "settings", "popups", "media", "appointments"];
  const rows = base.map((m) => ({
    userId: user.id,
    module: m,
    canView: modules.includes(m),
    canCreate: modules.includes(m),
    canEdit: modules.includes(m),
    canDelete: false,
  }));
  await db.permission.createMany({ data: rows });
  return { ok: true };
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const s = await getSession();
  if (!s || s.role !== "OWNER") return;
  const id = String(formData.get("id") ?? "");
  const user = await db.user.findFirst({ where: { id, shopId: s.shopId, role: "STAFF" } });
  if (!user) return;
  await db.user.update({ where: { id }, data: { active: false } });
  const slug = await shopSlug(s.shopId);
  revalidatePath(`/${slug}/admin/settings`);
}
