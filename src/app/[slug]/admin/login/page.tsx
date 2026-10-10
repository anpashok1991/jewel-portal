import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = { title: "Admin sign in" };

export default async function AdminLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);

  const session = await getSession();
  if (session && session.pool === "shop" && session.shopId === tenant.id) {
    redirect(`/${slug}/admin`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0f1115" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display, serif)" }}>{tenant.name}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">Shop admin</p>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "#171a21" }}>
          <AdminLoginForm shopSlug={tenant.slug} shopName={tenant.name} />
        </div>
      </div>
    </div>
  );
}
