import { getTenant } from "@/lib/tenant";
import { jsonOk, jsonErr } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const t = await getTenant(slug);
  if (!t) return jsonErr(404, "Shop not found.");

  // Whitelist — never expose razorpaySecret / razorpayKeyId here.
  return jsonOk({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    logo: t.logo,
    favicon: t.favicon,
    announcement: t.announcement,
    contactEmail: t.contactEmail,
    phone: t.phone,
    address: t.address,
    state: t.state,
    gstin: t.gstin,
    status: t.status,
    whatsapp: { number: t.whatsappNumber, enabled: t.whatsappEnabled, greeting: t.whatsappGreeting, orderShare: t.whatsappOrderShare, pages: t.whatsappPages },
    upi: { vpa: t.upiVpa, name: t.upiName },
    payments: {
      cod: t.enableCod,
      codFeePaise: t.codFeePaise,
      codMaxPaise: t.codMaxPaise,
      razorpay: t.enableRazorpay,
      upiQr: t.enableUpiQr,
    },
    fees: { platformFeePaise: t.platformFeePaise, platformFeePercentBp: t.platformFeePercentBp, gstPercentBp: t.gstPercentBp },
    shipping: { freeAbovePaise: t.freeShippingAbovePaise, flatPaise: t.shippingFlatPaise },
    loyalty: { earnBp: t.loyaltyEarnBp, redeemMaxBp: t.loyaltyRedeemMaxBp },
    theme: {
      key: t.theme.key,
      name: t.theme.name,
      description: t.theme.description,
      colors: t.theme.colors,
      fonts: t.theme.fonts,
      radius: t.theme.radius,
      layoutVariant: t.theme.layoutVariant,
    },
    features: [...t.features],
  });
}
