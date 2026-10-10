import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireTenant, themeCssVars } from "@/lib/tenant";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const t = await requireTenant(slug).catch(() => null);
  if (!t) return {};
  return {
    title: { default: t.name, template: `%s · ${t.name}` },
    description: t.tagline || `Shop hallmarked jewellery online at ${t.name}.`,
  };
}

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  if (!tenant) notFound();

  return (
    <div
      data-layout={tenant.theme.layoutVariant}
      data-theme={tenant.theme.key}
      style={themeCssVars(tenant) as React.CSSProperties}
      className="min-h-screen flex flex-col"
    >
      {children}
    </div>
  );
}
