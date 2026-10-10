import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product · Admin" };
export const dynamic = "force-dynamic";

export default async function NewProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);

  const [cats, branches] = await Promise.all([
    db.category.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ where: { shopId: tenant.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">Catalog</p>
        <h1 className="text-2xl font-bold">New product</h1>
      </div>
      <ProductForm
        slug={slug}
        product={null}
        categories={{
          type: cats.filter((c) => c.axis === "TYPE").map((c) => ({ id: c.id, name: c.name })),
          material: cats.filter((c) => c.axis === "MATERIAL").map((c) => ({ id: c.id, name: c.name })),
          audience: cats.filter((c) => c.axis === "AUDIENCE").map((c) => ({ id: c.id, name: c.name })),
        }}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        branchQty={{}}
        initialVariants={[]}
      />
    </div>
  );
}
