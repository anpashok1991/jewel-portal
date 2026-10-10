import { requireTenant } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { waMeUrl } from "@/lib/upi";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import RateTicker from "@/components/store/RateTicker";
import WhatsAppFab from "@/components/store/WhatsAppFab";
import SamBotWidget from "@/components/store/SamBotWidget";
import OfferPopup, { type PopupCfg } from "@/components/store/OfferPopup";
import ScrollReveal from "@/components/store/ScrollReveal";

export default async function WebLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();

  const [cats, cart, popups] = await Promise.all([
    db.category.findMany({ where: { shopId: tenant.id, active: true }, orderBy: { sortOrder: "asc" } }),
    session
      ? db.cart.findUnique({
          where: { userId_shopId: { userId: session.uid, shopId: tenant.id } },
          include: { _count: { select: { items: true } } },
        })
      : null,
    db.popup.findMany({
      where: { shopId: tenant.id, active: true, startAt: { lte: new Date() }, OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const axis = (a: string) => cats.filter((c) => c.axis === a).map((c) => ({ slug: c.slug, name: c.name }));
  const userHref = session ? "/account" : `/account/login?next=${encodeURIComponent(`/${slug}`)}`;

  const popupCfgs: PopupCfg[] = popups.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    image: p.image,
    videoUrl: p.videoUrl,
    trigger: p.trigger,
    chips: (() => {
      try {
        const c = JSON.parse(p.chipsJson);
        return Array.isArray(c) ? c : [];
      } catch {
        return [];
      }
    })() as { label: string; href: string }[],
    ctaLabel: p.ctaLabel,
    ctaHref: p.ctaHref,
    frequency: p.frequency,
  }));

  const waHref = tenant.whatsappEnabled && tenant.whatsappNumber
    ? waMeUrl(tenant.whatsappNumber, tenant.whatsappGreeting)
    : "#";

  return (
    <>
      <RateTicker shopId={tenant.id} />
      <Header
        slug={slug}
        shopName={tenant.name}
        logo={tenant.logo}
        announcement={tenant.announcement}
        cartCount={cart?._count.items ?? 0}
        userName={session?.name ?? null}
        userHref={userHref}
        material={axis("MATERIAL")}
        audience={axis("AUDIENCE")}
        type={axis("TYPE")}
      />
      <main className="flex-1">{children}</main>
      <Footer tenant={tenant} whatsappLink={waHref} />
      {tenant.whatsappEnabled && tenant.whatsappNumber ? (
        <WhatsAppFab number={tenant.whatsappNumber} greeting={tenant.whatsappGreeting} />
      ) : null}
      <SamBotWidget
        slug={slug}
        shopName={tenant.name}
        enabled={tenant.features.has("sambot")}
      />
      {tenant.features.has("popups") ? <OfferPopup popups={popupCfgs} isLoggedIn={Boolean(session)} /> : null}
      <ScrollReveal />
    </>
  );
}
