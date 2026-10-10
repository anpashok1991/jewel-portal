import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "./db";
import type { FeatureKey } from "./constants";

export type ThemeColors = {
  primary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  gold: string;
  danger: string;
};

export type TenantTheme = {
  id: string;
  key: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fonts: { display: string; body: string };
  radius: string;
  layoutVariant: string;
  sceneVariant: string;
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  phone: string;
  address: string;
  state: string;
  gstin: string;
  status: string;
  announcement: string;
  whatsappNumber: string;
  whatsappGreeting: string;
  whatsappEnabled: boolean;
  upiVpa: string;
  upiName: string;
  razorpayKeyId: string;
  razorpaySecret: string;
  enableRazorpay: boolean;
  enableCod: boolean;
  codFeePaise: number;
  codMaxPaise: number;
  enableUpiQr: boolean;
  platformFeePaise: number;
  platformFeePercentBp: number;
  gstPercentBp: number;
  freeShippingAbovePaise: number;
  shippingFlatPaise: number;
  loyaltyEarnBp: number;
  loyaltyRedeemMaxBp: number;
  theme: TenantTheme;
  features: Set<string>;
};

function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function hasFeature(tenant: Tenant, key: FeatureKey): boolean {
  return tenant.features.has(key);
}

export const getTenant = cache(async function getTenant(slug: string): Promise<Tenant | null> {
  const shop = await db.shop.findUnique({
    where: { slug },
    include: { theme: true, features: true },
  });
  if (!shop || shop.status === "BLOCKED") return null;

  const features = new Set<string>();
  for (const f of shop.features) if (f.enabled) features.add(f.key);

  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    tagline: shop.tagline,
    logo: shop.logo,
    favicon: shop.favicon,
    contactEmail: shop.contactEmail,
    phone: shop.phone,
    address: shop.address,
    state: shop.state,
    gstin: shop.gstin,
    status: shop.status,
    announcement: shop.announcement,
    whatsappNumber: shop.whatsappNumber,
    whatsappGreeting: shop.whatsappGreeting,
    whatsappEnabled: shop.whatsappEnabled,
    upiVpa: shop.upiVpa,
    upiName: shop.upiName,
    razorpayKeyId: shop.razorpayKeyId,
    razorpaySecret: shop.razorpaySecret,
    enableRazorpay: shop.enableRazorpay,
    enableCod: shop.enableCod,
    codFeePaise: shop.codFeePaise,
    codMaxPaise: shop.codMaxPaise,
    enableUpiQr: shop.enableUpiQr,
    platformFeePaise: shop.platformFeePaise,
    platformFeePercentBp: shop.platformFeePercentBp,
    gstPercentBp: shop.gstPercentBp,
    freeShippingAbovePaise: shop.freeShippingAbovePaise,
    shippingFlatPaise: shop.shippingFlatPaise,
    loyaltyEarnBp: shop.loyaltyEarnBp,
    loyaltyRedeemMaxBp: shop.loyaltyRedeemMaxBp,
    theme: {
      id: shop.theme.id,
      key: shop.theme.key,
      name: shop.theme.name,
      description: shop.theme.description,
      colors: safeParse<ThemeColors>(shop.theme.colorsJson, {
        primary: "#7a1f2b",
        accent: "#c9a227",
        bg: "#fdfaf4",
        surface: "#ffffff",
        text: "#1f1a17",
        muted: "#7a716a",
        gold: "#c9a227",
        danger: "#b3261e",
      }),
      fonts: safeParse(shop.theme.fontsJson, { display: "serif", body: "sans-serif" }),
      radius: shop.theme.radius,
      layoutVariant: shop.theme.layoutVariant,
      sceneVariant: shop.theme.sceneVariant,
    },
    features,
  };
});

export async function requireTenant(slug: string): Promise<Tenant> {
  const t = await getTenant(slug);
  if (!t) notFound();
  return t;
}

/** Theme CSS variables for storefront rendering. */
export function themeCssVars(t: Tenant): Record<string, string> {
  const c = t.theme.colors;
  return {
    "--c-primary": c.primary,
    "--c-accent": c.accent,
    "--c-bg": c.bg,
    "--c-surface": c.surface,
    "--c-text": c.text,
    "--c-muted": c.muted,
    "--c-gold": c.gold,
    "--c-danger": c.danger,
    "--font-display": t.theme.fonts.display,
    "--font-body": t.theme.fonts.body,
    "--radius": t.theme.radius === "pill" ? "999px" : t.theme.radius === "soft" ? "18px" : t.theme.radius === "sharp" ? "4px" : "10px",
  };
}
