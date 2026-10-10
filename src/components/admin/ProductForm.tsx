"use client";

import { useActionState, useState } from "react";
import { saveProduct, type ProductState } from "@/actions/admin/catalog";

type Cat = { id: string; name: string };
type Branch = { id: string; name: string };
type Variant = { label: string; size: string; sku: string; extraWeightMg: number };

export type ProductSeed = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  typeId: string;
  materialId: string | null;
  audienceId: string | null;
  metal: string;
  purity: string;
  netWeightMg: number;
  grossWeightMg: number;
  fixedPricePaise: number;
  costPaise: number;
  makingMode: string;
  makingValue: number;
  stoneValuePaise: number;
  gstPercentBp: number;
  gstExempt: boolean;
  hsnCode: string;
  imagesJson: string;
  videoUrl: string;
  status: string;
  featured: boolean;
  tags: string;
};

function parseImages(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ProductForm({
  slug,
  product,
  categories,
  branches,
  branchQty,
  initialVariants,
}: {
  slug: string;
  product: ProductSeed | null;
  categories: { type: Cat[]; material: Cat[]; audience: Cat[] };
  branches: Branch[];
  branchQty: Record<string, number>;
  initialVariants: Variant[];
}) {
  const [state, action, pending] = useActionState<ProductState, FormData>(saveProduct, {});
  const [images, setImages] = useState<string[]>(product ? parseImages(product.imagesJson) : []);
  const [imagesText, setImagesText] = useState(product ? parseImages(product.imagesJson).join("\n") : "");
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const syncImages = (next: string[]) => {
    setImages(next);
    setImagesText(next.join("\n"));
  };

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadErr("");
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string };
        if (json.url) setImages((prev) => {
          const next = [...prev, json.url!];
          setImagesText(next.join("\n"));
          return next;
        });
        else setUploadErr(json.error ?? "Upload failed.");
      } catch {
        setUploadErr("Upload failed. Check your connection.");
      }
    }
    setUploading(false);
  }

  const mode = product?.makingMode ?? "PERCENT";
  const makingDisplay = product ? product.makingValue / 100 : mode === "PERCENT" ? 12 : 0;

  const setV = (i: number, patch: Partial<Variant>) =>
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  return (
    <form action={action} className="space-y-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="imagesText" value={imagesText} />
      <input type="hidden" name="variantsJson" value={JSON.stringify(variants)} />
      <input type="hidden" name="branchIds" value={branches.map((b) => b.id).join(",")} />

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Basics</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="p-name">Name *</label>
            <input id="p-name" name="name" required defaultValue={product?.name ?? ""} className="input" placeholder="Divine Lotus Gold Ring" />
          </div>
          <div>
            <label className="label" htmlFor="p-slug">URL slug</label>
            <input id="p-slug" name="slug" defaultValue={product?.slug ?? ""} className="input" placeholder="auto from name" />
          </div>
          <div>
            <label className="label" htmlFor="p-sku">SKU</label>
            <input id="p-sku" name="sku" defaultValue={product?.sku ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-status">Status</label>
            <select id="p-status" name="status" defaultValue={product?.status ?? "ACTIVE"} className="input">
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" name="description" rows={3} defaultValue={product?.description ?? ""} className="input" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />
            Featured on home page
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="p-tags">Tags</label>
            <input id="p-tags" name="tags" defaultValue={product?.tags ?? ""} className="input !min-h-9 !w-52 text-sm" placeholder="bridal, gift" />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Classification</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="p-type">Type / category *</label>
            <select id="p-type" name="typeId" required defaultValue={product?.typeId ?? ""} className="input">
              <option value="" disabled>Select…</option>
              {categories.type.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-material">Material</label>
            <select id="p-material" name="materialId" defaultValue={product?.materialId ?? ""} className="input">
              <option value="">—</option>
              {categories.material.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-audience">Audience</label>
            <select id="p-audience" name="audienceId" defaultValue={product?.audienceId ?? ""} className="input">
              <option value="">—</option>
              {categories.audience.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="p-metal">Metal</label>
            <select id="p-metal" name="metal" defaultValue={product?.metal ?? "GOLD"} className="input">
              <option>GOLD</option><option>SILVER</option><option>DIAMOND</option><option>PLATINUM</option><option>GEMSTONE</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-purity">Purity</label>
            <select id="p-purity" name="purity" defaultValue={product?.purity ?? "22K"} className="input">
              <option>24K</option><option>22K</option><option>18K</option><option>14K</option><option>925</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-video">Video URL (YouTube)</label>
            <input id="p-video" name="videoUrl" defaultValue={product?.videoUrl ?? ""} className="input" />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Weight & pricing</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label" htmlFor="p-net">Net weight (g)</label>
            <input id="p-net" name="netWeightG" type="number" step="0.001" min={0} defaultValue={product ? product.netWeightMg / 1000 : ""} className="input" placeholder="0.000" />
          </div>
          <div>
            <label className="label" htmlFor="p-gross">Gross weight (g)</label>
            <input id="p-gross" name="grossWeightG" type="number" step="0.001" min={0} defaultValue={product ? product.grossWeightMg / 1000 : ""} className="input" placeholder="0.000" />
          </div>
          <div>
            <label className="label" htmlFor="p-fixed">Fixed price (₹, 0 = rate based)</label>
            <input id="p-fixed" name="fixedPriceRs" type="number" step="1" min={0} defaultValue={product ? product.fixedPricePaise / 100 : 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-cost">Purchase cost (₹)</label>
            <input id="p-cost" name="costRs" type="number" step="1" min={0} defaultValue={product ? product.costPaise / 100 : 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-stone">Stone value (₹)</label>
            <input id="p-stone" name="stoneValueRs" type="number" step="1" min={0} defaultValue={product ? product.stoneValuePaise / 100 : 0} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-making">Making charge mode</label>
            <select id="p-making" name="makingMode" defaultValue={product?.makingMode ?? "PERCENT"} className="input">
              <option value="PERCENT">Percent of metal</option>
              <option value="PER_GRAM">Per gram (₹)</option>
              <option value="FLAT">Flat (₹)</option>
              <option value="NONE">None</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-makingv">Making value (% or ₹)</label>
            <input id="p-makingv" name="makingValue" type="number" step="0.01" min={0} defaultValue={makingDisplay} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-gst">GST %</label>
            <input id="p-gst" name="gstPercent" type="number" step="0.01" min={0} defaultValue={product ? product.gstPercentBp / 100 : 18} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p-hsn">HSN code</label>
            <input id="p-hsn" name="hsnCode" defaultValue={product?.hsnCode ?? "7113"} className="input" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gstExempt" defaultChecked={product?.gstExempt ?? false} />
          GST exempt (e.g. raw silver handicraft under composition)
        </label>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Images</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border" style={{ borderColor: "rgba(0,0,0,.12)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => syncImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 text-xs w-5 h-5 rounded-full bg-black/60 text-white leading-none"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="text-sm"
            onChange={(e) => handleUpload(e.target.files)}
          />
          {uploading ? <span className="text-sm text-muted">Uploading…</span> : null}
          {uploadErr ? <span className="text-sm" style={{ color: "var(--c-danger)" }}>{uploadErr}</span> : null}
        </div>
        <div>
          <label className="label" htmlFor="p-imgs">…or image URLs, one per line</label>
          <textarea
            id="p-imgs"
            rows={2}
            className="input text-sm"
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
          />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Variants</h2>
          <button
            type="button"
            className="btn btn-ghost !min-h-9 text-sm"
            onClick={() => setVariants([...variants, { label: "", size: "", sku: "", extraWeightMg: 0 }])}
          >
            + Add variant
          </button>
        </div>
        {variants.length === 0 ? (
          <p className="text-sm text-muted">No variants. Customers will buy the base product.</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 text-xs uppercase text-muted">
              <span>Label</span><span>Size</span><span>SKU</span><span>Extra weight (mg)</span><span />
            </div>
            {variants.map((v, i) => (
              <div key={i} className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input className="input !min-h-9 text-sm" placeholder="Size 12" value={v.label} onChange={(e) => setV(i, { label: e.target.value })} />
                <input className="input !min-h-9 text-sm" placeholder="12" value={v.size} onChange={(e) => setV(i, { size: e.target.value })} />
                <input className="input !min-h-9 text-sm" placeholder="SKU" value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} />
                <input className="input !min-h-9 text-sm" type="number" min={0} value={v.extraWeightMg || ""} onChange={(e) => setV(i, { extraWeightMg: Number(e.target.value) || 0 })} />
                <button type="button" className="btn btn-ghost !min-h-9 text-xs" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Inventory by branch</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id}>
              <label className="label" htmlFor={`inv-${b.id}`}>{b.name}</label>
              <input id={`inv-${b.id}`} name={`inv_${b.id}`} type="number" min={0} defaultValue={branchQty[b.id] ?? 0} className="input" />
            </div>
          ))}
          {branches.length === 0 ? <p className="text-sm text-muted">No branches configured.</p> : null}
        </div>
        <p className="text-xs text-muted">Quantity sold online is reserved from the branch stock automatically.</p>
      </section>

      {state?.error ? (
        <p className="text-sm font-medium" style={{ color: "var(--c-danger)" }}>{state.error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button>
        <a href={`/${slug}/admin/products`} className="btn btn-ghost">Cancel</a>
      </div>
    </form>
  );
}
