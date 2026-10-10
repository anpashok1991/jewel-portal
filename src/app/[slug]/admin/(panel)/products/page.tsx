import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { deleteProduct, setProductStatus } from "@/actions/admin/catalog";
import { CategoryForm, CategoryList } from "@/components/admin/CategoryForm";

export const metadata = { title: "Catalog · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { slug } = await params;
  const { q = "", status = "" } = await searchParams;
  const tenant = await requireTenant(slug);

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: {
        shopId: tenant.id,
        ...(status ? { status } : {}),
        ...(q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 120,
      include: { inventory: { select: { qty: true } } },
    }),
    db.category.findMany({ where: { shopId: tenant.id }, orderBy: [{ axis: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted">{products.length} products · {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <form className="flex gap-2" action={`/${slug}/admin/products`} method="GET">
            <input name="q" defaultValue={q} placeholder="Search name or SKU" className="input !min-h-10 !w-48 text-sm" />
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <button className="btn btn-ghost !min-h-10 text-sm">Search</button>
          </form>
          <Link href={`/${slug}/admin/products/new`} className="btn btn-primary !min-h-10 text-sm">+ New product</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[["", "All"], ["ACTIVE", "Active"], ["DRAFT", "Draft"], ["HIDDEN", "Hidden"]].map(([value, label]) => (
          <Link
            key={label}
            href={`/${slug}/admin/products${value ? `?status=${value}` : ""}`}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={(status || "") === value ? { background: "var(--c-primary)", color: "#fff" } : { background: "rgba(0,0,0,.06)" }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted border-b" style={{ borderColor: "rgba(0,0,0,.08)" }}>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Stock</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.inventory.reduce((sum, i) => sum + i.qty, 0);
              return (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "rgba(0,0,0,.06)" }}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted">{p.sku || p.slug}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-muted">{p.metal} · {p.purity}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {p.fixedPricePaise > 0 ? formatINR(p.fixedPricePaise) : <span className="text-muted">Rate based</span>}
                  </td>
                  <td className="py-2.5 pr-3" style={stock === 0 ? { color: "var(--c-danger)" } : undefined}>{stock}</td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.status === "ACTIVE" ? "rgba(21,128,61,.12)" : "rgba(0,0,0,.07)", color: p.status === "ACTIVE" ? "#15803d" : "inherit" }}>
                      {p.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/${slug}/admin/products/${p.id}`} className="text-xs underline font-semibold">Edit</Link>
                      <form action={setProductStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={p.status === "ACTIVE" ? "HIDDEN" : "ACTIVE"} />
                        <button className="text-xs underline">{p.status === "ACTIVE" ? "Hide" : "Activate"}</button>
                      </form>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-xs underline" style={{ color: "var(--c-danger)" }}>Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted">No products yet. Create your first one.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Categories</h2>
            <p className="text-xs text-muted mt-0.5">Edit name or icon per category — icon can be an emoji, an image URL, or an upload. Blank icon = default.</p>
          </div>
          <CategoryForm />
        </div>
        <CategoryList categories={categories} />
      </section>
    </div>
  );
}
