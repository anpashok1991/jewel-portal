/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { FEATURE_LIST } from "../src/lib/constants";
import { priceLine, computeTotals, type LineInput, type PricedLine } from "../src/lib/pricing";
import { generateDueDates } from "../src/lib/scheme";

const db = new PrismaClient();

const IMG_DIR = path.join(process.cwd(), "public", "uploads", "seed");

async function svg(name: string, from: string, to: string, label: string, w = 900, h = 900): Promise<string> {
  await fs.mkdir(IMG_DIR, { recursive: true });
  const file = path.join(IMG_DIR, `${name}.svg`);
  // Keep the label centered on both axes so object-cover crops (banners/popups) never cut it.
  const text = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="shine" cx="30%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#shine)"/>
  <circle cx="${w / 2}" cy="${h / 2}" r="150" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="3"/>
  <circle cx="${w / 2}" cy="${h / 2}" r="110" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1.5"/>
  <text x="50%" y="${h / 2 + 14}" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#ffffff" fill-opacity="0.95">${text}</text>
</svg>`;
  await fs.writeFile(file, svgText, "utf8");
  return `/uploads/seed/${name}.svg`;
}

const R = {
  gold: { from: "#5c1f28", to: "#c9a227" },
  ivory: { from: "#e9ddc9", to: "#b98a6a" },
  noir: { from: "#101014", to: "#5a5a66" },
  emerald: { from: "#0b3d2e", to: "#2f7d5c" },
  rose: { from: "#8e4557", to: "#e8a5b3" },
  ocean: { from: "#0d2340", to: "#3d6ea5" },
  festive: { from: "#a3341f", to: "#f0a92e" },
  silver: { from: "#5b6470", to: "#c7ccd4" },
};

const THEMES = [
  { key: "royal-gold", name: "Royal Gold", desc: "Deep maroon & gold with ornate serif luxury", layout: "royal", scene: "rings", colors: { primary: "#7a1f2b", accent: "#c9a227", bg: "#fdfaf4", surface: "#ffffff", text: "#20140f", muted: "#7d6f66", gold: "#c9a227", danger: "#b3261e" }, fonts: { display: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "ivory-heritage", name: "Ivory Heritage", desc: "Ivory & rose gold, classic heritage storytelling", layout: "editorial", scene: "pearls", colors: { primary: "#8a5a3b", accent: "#c98f74", bg: "#faf6ef", surface: "#ffffff", text: "#2c211a", muted: "#8b7d70", gold: "#b98a4a", danger: "#a63d2f" }, fonts: { display: "'Cormorant Garamond', Georgia, serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "noir-diamond", name: "Noir Diamond", desc: "Black luxury minimal with diamond sparkle", layout: "minimal", scene: "diamond", colors: { primary: "#111116", accent: "#d8d8e0", bg: "#0c0c10", surface: "#17171d", text: "#f2f2f5", muted: "#9a9aa6", gold: "#cfc4a3", danger: "#e05a52" }, fonts: { display: "'Bodoni Moda', Georgia, serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "emerald-classic", name: "Emerald Classic", desc: "Emerald green & brass, regal and timeless", layout: "regal", scene: "gem", colors: { primary: "#0b3d2e", accent: "#b98a4a", bg: "#f6f8f5", surface: "#ffffff", text: "#12221c", muted: "#6c7a72", gold: "#b98a4a", danger: "#a83428" }, fonts: { display: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "rose-blush", name: "Rose Blush", desc: "Blush pink & rose gold, soft feminine glow", layout: "soft", scene: "petals", colors: { primary: "#a34c63", accent: "#e0a3ae", bg: "#fff7f8", surface: "#ffffff", text: "#33222a", muted: "#95808a", gold: "#c9a06a", danger: "#c0392b" }, fonts: { display: "'Cormorant Garamond', Georgia, serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "ocean-platinum", name: "Ocean Platinum", desc: "Navy & platinum, modern geometric", layout: "modern", scene: "waves", colors: { primary: "#123153", accent: "#8fa9c4", bg: "#f4f7fa", surface: "#ffffff", text: "#13202e", muted: "#66798c", gold: "#b6a06a", danger: "#b3372e" }, fonts: { display: "'Sora', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" } },
  { key: "festive-marigold", name: "Festive Marigold", desc: "Marigold & red, high-energy festive vibe", layout: "festive", scene: "diyas", colors: { primary: "#b23a1f", accent: "#f0a92e", bg: "#fffaf0", surface: "#ffffff", text: "#2c1a10", muted: "#8a7461", gold: "#e0a126", danger: "#8e1f16" }, fonts: { display: "'Yatra One', 'Playfair Display', serif", body: "'Inter', system-ui, sans-serif" } },
];

async function wipe() {
  const order: any[] = [
    db.notification, db.walletTxn, db.wallet, db.deposit, db.schemeAccount, db.savingsPlan,
    db.orderEvent, db.invoice, db.estimate, db.orderItem, db.order,
    db.cartItem, db.cart, db.wishlist, db.review, db.loyaltyLedger, db.giftCard, db.coupon,
    db.inventory, db.productVariant, db.product, db.category, db.metalRate,
    db.popup, db.banner, db.appointment, db.exchangeRequest, db.query, db.botFaq, db.mediaAsset,
    db.permission, db.address, db.user, db.featureFlag, db.branch, db.platformUser, db.shop, db.theme, db.platformPlan,
  ];
  for (const m of order) await m.deleteMany();
}

function makeLines(
  items: { product: any; qty: number; variantId?: string }[],
  rates: Map<string, number>,
): { lines: PricedLine[]; refs: { product: any; qty: number; variantId: string; line: PricedLine }[] } {
  const lines: PricedLine[] = [];
  const refs: { product: any; qty: number; variantId: string; line: PricedLine }[] = [];
  for (const it of items) {
    const p = it.product;
    const rate = p.fixedPricePaise > 0 ? 0 : (rates.get(`${p.metal}-${p.purity}`) ?? 0);
    const input: LineInput = {
      id: p.id,
      qty: it.qty,
      netWeightMg: p.netWeightMg,
      purity: p.purity,
      metal: p.metal,
      ratePerGramPaise: rate,
      makingMode: p.makingMode,
      makingValue: p.makingValue,
      stoneValuePaise: p.stoneValuePaise,
      gstPercentBp: p.gstPercentBp,
      gstExempt: p.gstExempt,
      fixedPricePaise: p.fixedPricePaise,
    };
    const line = priceLine(input);
    lines.push(line);
    refs.push({ product: p, qty: it.qty, variantId: it.variantId ?? "", line });
  }
  return { lines, refs };
}

async function seedRates(shopId: string) {
  const rows = [
    { metal: "GOLD", purity: "999", price: 925000 },
    { metal: "GOLD", purity: "916", price: 847300 },
    { metal: "GOLD", purity: "750", price: 693750 },
    { metal: "SILVER", purity: "925", price: 11500 },
    { metal: "PLATINUM", purity: "999", price: 365000 },
  ];
  for (const r of rows) {
    await db.metalRate.create({
      data: { shopId, metal: r.metal, purity: r.purity, pricePerGramPaise: r.price, effectiveAt: new Date(Date.now() - 86400000) },
    });
    await db.metalRate.create({
      data: { shopId, metal: r.metal, purity: r.purity, pricePerGramPaise: r.price + 800, effectiveAt: new Date() },
    });
  }
  return new Map(rows.map((r) => [`${r.metal}-${r.purity}`, r.price + 800]));
}

async function enableAllFeatures(shopId: string, disabled: string[] = []) {
  for (const f of FEATURE_LIST) {
    await db.featureFlag.create({
      data: { shopId, key: f.key, enabled: !disabled.includes(f.key), note: disabled.includes(f.key) ? "Blocked by super admin" : "" },
    });
  }
}

const CATEGORIES = {
  MATERIAL: [["gold", "Gold"], ["silver", "Silver"], ["diamond", "Diamond"], ["platinum", "Platinum"]],
  AUDIENCE: [["female", "Female"], ["male", "Male"], ["kids", "Kids"], ["unisex", "Unisex"]],
  TYPE: [
    ["ring", "Rings"], ["chain", "Chains"], ["earring", "Earrings"], ["necklace", "Necklaces"],
    ["mangalsutra", "Mangal Sutra"], ["bangle", "Bangles"], ["bracelet", "Bracelets"],
    ["pendant", "Pendants"], ["nosepin", "Nose Pins"], ["coin", "Coins"],
  ],
} as const;

async function seedCategories(shopId: string) {
  let order = 0;
  for (const [axis, list] of Object.entries(CATEGORIES)) {
    for (const [slug, name] of list) {
      await db.category.create({ data: { shopId, axis, slug, name, sortOrder: order++ } });
    }
  }
}

type PDef = {
  slug: string; name: string; type: string; material: string; audience: string;
  metal: string; purity: string; weightG: number; makingMode?: string; makingBp?: number;
  stone?: number; cost?: number; fixed?: number; tags?: string; desc?: string; featured?: boolean; exempt?: boolean; sizes?: boolean;
};

const SHOP1_PRODUCTS: PDef[] = [
  { slug: "divine-lotus-gold-ring", name: "Divine Lotus Gold Ring", type: "ring", material: "gold", audience: "female", metal: "GOLD", purity: "22K", weightG: 6.2, makingBp: 1400, stone: 80000, cost: 480000, tags: "ring gold lotus dailywear", desc: "Hand-finished lotus motif ring in 22K hallmark gold with micro-set brilliant stones.", featured: true, sizes: true },
  { slug: "classic-rope-chain", name: "Classic Rope Chain", type: "chain", material: "gold", audience: "male", metal: "GOLD", purity: "22K", weightG: 22.5, makingBp: 1200, cost: 1650000, tags: "chain gold rope men", desc: "Solid rope-link chain, machine-cut and hand-polished. Ideal daily wear.", featured: true },
  { slug: "kundan-jhumka", name: "Kundan Jhumka Earrings", type: "earring", material: "gold", audience: "female", metal: "GOLD", purity: "22K", weightG: 14.8, makingBp: 1500, stone: 65000, cost: 1180000, tags: "earring jhumka kundan wedding", desc: "Traditional kundan jhumka with pearl drops — festive statement piece.", featured: true },
  { slug: "bridal-mangalsutra", name: "Bridal Mangalsutra", type: "mangalsutra", material: "gold", audience: "female", metal: "GOLD", purity: "22K", weightG: 32.4, makingBp: 1300, stone: 95000, cost: 2550000, tags: "mangalsutra bridal gold", desc: "Ceremonial mangalsutra with black bead chain and carved gold pendant." },
  { slug: "heritage-gold-bangle", name: "Heritage Gold Bangle", type: "bangle", material: "gold", audience: "female", metal: "GOLD", purity: "22K", weightG: 45.2, makingBp: 1100, cost: 3350000, tags: "bangle gold heritage", desc: "Temple-inspired bangle with hand-engraved paisley borders." },
  { slug: "diamond-solitaire-ring", name: "Diamond Solitaire Ring", type: "ring", material: "diamond", audience: "female", metal: "GOLD", purity: "18K", weightG: 4.4, makingBp: 1600, stone: 550000, cost: 480000, tags: "ring diamond solitaire engagement", desc: "IGI-certified 0.5ct solitaire in an 18K claw setting.", featured: true, sizes: true },
  { slug: "mens-signet-ring", name: "Gentleman's Signet Ring", type: "ring", material: "gold", audience: "male", metal: "GOLD", purity: "22K", weightG: 9.1, makingBp: 1200, cost: 680000, tags: "ring signet men gold", desc: "Bold signet with brushed face, ready for monogram engraving.", sizes: true },
  { slug: "silver-ganesha-pendant", name: "Silver Ganesha Pendant", type: "pendant", material: "silver", audience: "unisex", metal: "SILVER", purity: "925", weightG: 25, fixed: 275000, cost: 150000, tags: "pendant silver ganesha", desc: "Oxidised 925 silver Ganesha pendant with adjustable chain.", exempt: true },
  { slug: "silver-payal-anklet", name: "Silver Payal Anklets", type: "bracelet", material: "silver", audience: "female", metal: "SILVER", purity: "925", weightG: 62, fixed: 549000, cost: 310000, tags: "anklet payal silver bracelet", desc: "Pair of traditional payal anklets with ghungroo charms.", exempt: true },
  { slug: "rose-gold-hoop-earrings", name: "Rose Gold Hoop Earrings", type: "earring", material: "gold", audience: "female", metal: "GOLD", purity: "18K", weightG: 7.3, makingBp: 1700, cost: 560000, tags: "earring hoop rose gold", desc: "Featherweight rose-gold hoops with latch-back closure." },
  { slug: "platinum-band", name: "Platinum Wedding Band", type: "ring", material: "platinum", audience: "unisex", metal: "PLATINUM", purity: "999", weightG: 5.6, makingBp: 1500, cost: 240000, tags: "ring platinum band wedding", desc: "Comfort-fit platinum band with brushed centre and polished edges.", sizes: true },
  { slug: "meenakari-pendant", name: "Meenakari Pendant", type: "pendant", material: "silver", audience: "female", metal: "SILVER", purity: "925", weightG: 18, fixed: 195000, cost: 95000, tags: "pendant meenakari silver", desc: "Hand-painted meenakari enamel pendant in 925 silver.", exempt: true },
  { slug: "kids-coin-chain", name: "Kids Coin Chain", type: "chain", material: "gold", audience: "kids", metal: "GOLD", purity: "22K", weightG: 8.2, makingBp: 1400, cost: 610000, tags: "chain kids gold coin", desc: "Lightweight chain with secure clasp, designed for children." },
  { slug: "daily-wear-studs", name: "Daily Wear Diamond Studs", type: "earring", material: "diamond", audience: "unisex", metal: "GOLD", purity: "18K", weightG: 3.2, makingBp: 1800, stone: 120000, cost: 98000, tags: "earring studs diamond dailywear", desc: "Pair of 0.25ct total-weight studs — effortless everyday sparkle." },
  { slug: "diamond-tennis-bracelet", name: "Diamond Tennis Bracelet", type: "bracelet", material: "diamond", audience: "female", metal: "GOLD", purity: "18K", weightG: 12.5, makingBp: 1500, stone: 1350000, cost: 1150000, tags: "bracelet tennis diamond", desc: "Line bracelet of 42 brilliant-cut diamonds in 18K white gold.", featured: true },
];

const SHOP2_PRODUCTS: PDef[] = [
  { slug: "silver-lakshmi-coin", name: "Silver Lakshmi Coin", type: "coin", material: "silver", audience: "unisex", metal: "SILVER", purity: "925", weightG: 50, fixed: 650000, cost: 480000, tags: "coin silver lakshmi", desc: "925 silver Lakshmi coin for festive gifting.", exempt: true },
  { slug: "silver-om-chain", name: "Silver Om Chain", type: "chain", material: "silver", audience: "male", metal: "SILVER", purity: "925", weightG: 35, fixed: 385000, cost: 240000, tags: "chain silver om", desc: "Oxidised om-detail chain, 925 sterling.", exempt: true },
  { slug: "gold-stud-set", name: "Gold Stud Set", type: "earring", material: "gold", audience: "female", metal: "GOLD", purity: "22K", weightG: 4.1, makingBp: 1500, cost: 320000, tags: "earring studs gold", desc: "Classic 22K studs for daily wear." },
  { slug: "silver-toe-ring", name: "Silver Toe Rings", type: "ring", material: "silver", audience: "female", metal: "SILVER", purity: "925", weightG: 8, fixed: 75000, cost: 38000, tags: "ring toe silver", desc: "Adjustable pair of 925 silver toe rings.", exempt: true, sizes: true },
  { slug: "gold-baby-bangle", name: "Gold Baby Bangle", type: "bangle", material: "gold", audience: "kids", metal: "GOLD", purity: "22K", weightG: 12.3, makingBp: 1300, cost: 920000, tags: "bangle baby gold kids", desc: "Soft-edged baby bangle with safety lock." },
  { slug: "silver-chai-diyas", name: "Silver Diya Set", type: "coin", material: "silver", audience: "unisex", metal: "SILVER", purity: "925", weightG: 120, fixed: 1450000, cost: 1050000, tags: "diya silver festive", desc: "Set of four hand-carved silver diyas.", exempt: true },
];

async function seedProducts(shopId: string, slug: string, defs: PDef[]) {
  const cats = await db.category.findMany({ where: { shopId } });
  const byAxis = (axis: string, s: string) => cats.find((c) => c.axis === axis && c.slug === s);
  const created: any[] = [];

  for (const d of defs) {
    const imgs = await Promise.all([
      svg(`${slug}-${d.slug}-1`, R[d.material === "silver" ? "silver" : d.material === "platinum" ? "noir" : d.material === "diamond" ? "noir" : "gold"].from, R[d.material === "silver" ? "silver" : d.material === "platinum" ? "noir" : d.material === "diamond" ? "noir" : "gold"].to, d.name),
      svg(`${slug}-${d.slug}-2`, "#241b16", "#7a5c3a", d.name),
    ]);
    const p = await db.product.create({
      data: {
        shopId,
        slug: d.slug,
        name: d.name,
        description: d.desc ?? "",
        sku: `SKU-${d.slug.slice(0, 10).toUpperCase()}`,
        typeId: byAxis("TYPE", d.type)!.id,
        materialId: byAxis("MATERIAL", d.material)?.id,
        audienceId: byAxis("AUDIENCE", d.audience)?.id,
        metal: d.metal,
        purity: d.purity,
        netWeightMg: Math.round(d.weightG * 1000),
        grossWeightMg: Math.round(d.weightG * 1000 * 1.05),
        fixedPricePaise: d.fixed ?? 0,
        costPaise: d.cost ?? 0,
        makingMode: d.fixed ? "NONE" : "PERCENT",
        makingValue: d.makingBp ?? 1200,
        stoneValuePaise: d.stone ?? 0,
        gstExempt: d.exempt ?? false,
        hsnCode: d.exempt ? "7113" : d.metal === "SILVER" ? "7113" : "7113",
        imagesJson: JSON.stringify(imgs),
        videoUrl: d.featured ? "https://www.youtube.com/watch?v=aqz-KE-bpKQ" : "",
        certificateImg: "",
        status: "ACTIVE",
        featured: d.featured ?? false,
        tags: d.tags ?? "",
      },
    });
    if (d.sizes) {
      for (const size of ["8", "10", "12", "14", "16"]) {
        await db.productVariant.create({ data: { productId: p.id, label: `Size ${size}`, size, sku: `${p.sku}-${size}` } });
      }
    }
    // inventory at each branch
    const branches = await db.branch.findMany({ where: { shopId, active: true } });
    for (const b of branches) {
      await db.inventory.create({
        data: { shopId, productId: p.id, variantId: "", branchId: b.id, qty: b.isDefault ? 4 : 2, lowStockAt: 2 },
      });
      if (d.sizes) {
        const variants = await db.productVariant.findMany({ where: { productId: p.id } });
        for (const v of variants) {
          await db.inventory.create({
            data: { shopId, productId: p.id, variantId: v.id, branchId: b.id, qty: 2, lowStockAt: 1 },
          });
        }
      }
    }
    created.push(p);
  }
  return created;
}

async function main() {
  console.log("Seeding…");
  await wipe();

  // ---- themes
  const themeIds: Record<string, string> = {};
  let tOrder = 0;
  for (const t of THEMES) {
    const row = await db.theme.create({
      data: {
        key: t.key, name: t.name, description: t.desc,
        colorsJson: JSON.stringify(t.colors), fontsJson: JSON.stringify(t.fonts),
        radius: t.key === "noir-diamond" ? "sharp" : t.key === "rose-blush" || t.key === "ivory-heritage" ? "soft" : t.key === "festive-marigold" ? "pill" : "md",
        layoutVariant: t.layout, sceneVariant: t.scene, sortOrder: tOrder++,
        previewJson: JSON.stringify({ from: THEMES[tOrder - 1].colors.primary, to: THEMES[tOrder - 1].colors.accent }),
      },
    });
    themeIds[t.key] = row.id;
  }

  // ---- platform plans
  const planBasic = await db.platformPlan.create({
    data: { name: "Starter", pricePaise: 0, featuresJson: JSON.stringify(["storefront", "ecommerce", "reports"]) },
  });
  const planPro = await db.platformPlan.create({
    data: { name: "Professional", pricePaise: 499000, featuresJson: JSON.stringify(FEATURE_LIST.map((f) => f.key)) },
  });

  // ---- super admin
  await db.platformUser.create({
    data: {
      email: "admin@jewelportal.in",
      name: "Platform Super Admin",
      passwordHash: await bcrypt.hash("Admin@123", 10),
      role: "SUPER_ADMIN",
    },
  });

  // =========================================================
  // SHOP 1 — MAA ANJANI JEWELERS (primary tenant)
  // =========================================================
  const shop1 = await db.shop.create({
    data: {
      slug: "maa-anjani-jewelers",
      customDomain: "maaanjani.in",
      name: "Maa Anjani Jewelers",
      tagline: "Tradition crafted in gold, trust built over generations",
      contactEmail: "hello@maaanjani.in",
      phone: "9876543210",
      address: "Shop 12, Ganga Bazaar Road, Varanasi, Uttar Pradesh 221001",
      state: "Uttar Pradesh",
      gstin: "09AAACM1234A1Z5",
      pan: "AAACM1234A",
      themeId: themeIds["royal-gold"],
      planId: planPro.id,
      announcement: " festive offer — up to 25% off on making charges · Book a free consultation today",
      whatsappNumber: "919876543210",
      whatsappGreeting: "Namaste! Ask about today's gold rates, offers or your order.",
      upiVpa: "maaanjani@okhdfcbank",
      upiName: "Maa Anjani Jewelers",
      razorpayKeyId: "",
      razorpaySecret: "",
      platformFeePaise: 0,
      platformFeePercentBp: 50,
      gstPercentBp: 1800,
      freeShippingAbovePaise: 500000,
      shippingFlatPaise: 15000,
      codFeePaise: 4900,
      loyaltyEarnBp: 100,
      loyaltyRedeemMaxBp: 50,
    },
  });
  await enableAllFeatures(shop1.id);

  const b1 = await db.branch.create({
    data: { shopId: shop1.id, name: "Ganga Bazaar (Main)", address: "Shop 12, Ganga Bazaar Road", city: "Varanasi", phone: "9876543210", gstin: "09AAACM1234A1Z5", isDefault: true, hours: "10:00 AM - 9:00 PM" },
  });
  const b2 = await db.branch.create({
    data: { shopId: shop1.id, name: "Godowlia Flagship", address: "45, Godowlia Crossing", city: "Varanasi", phone: "9876543211", gstin: "09AAACM1234A1Z5", hours: "10:30 AM - 9:30 PM" },
  });

  const ownerHash = await bcrypt.hash("Owner@123", 10);
  const owner1 = await db.user.create({
    data: { email: "owner@maaanjani.in", name: "Ramesh Kumar", phone: "9876543210", passwordHash: ownerHash, role: "OWNER", shopId: shop1.id },
  });
  const staff1 = await db.user.create({
    data: { email: "staff@maaanjani.in", name: "Sunita Devi", phone: "9876543212", passwordHash: await bcrypt.hash("Staff@123", 10), role: "STAFF", shopId: shop1.id },
  });
  const staffModules: Record<string, [boolean, boolean, boolean, boolean]> = {
    dashboard: [true, false, false, false],
    products: [true, true, true, false],
    orders: [true, true, true, false],
    customers: [true, false, false, false],
    inventory: [true, false, true, false],
    queries: [true, true, true, false],
    appointments: [true, true, false, false],
    reports: [false, false, false, false],
    schemes: [true, false, false, false],
    coupons: [false, false, false, false],
    staff: [false, false, false, false],
    branches: [false, false, false, false],
    settings: [false, false, false, false],
    popups: [false, false, false, false],
    media: [true, true, true, false],
    bot: [false, false, false, false],
  };
  for (const [module, [v, c, e, d]] of Object.entries(staffModules)) {
    await db.permission.create({
      data: { userId: staff1.id, module, canView: v, canCreate: c, canEdit: e, canDelete: d },
    });
  }

  const cust1 = await db.user.create({
    data: { email: "customer@demo.in", name: "Aarti Sharma", phone: "9123456780", passwordHash: await bcrypt.hash("Demo@123", 10), role: "CUSTOMER", shopId: shop1.id },
  });
  await db.address.create({
    data: { userId: cust1.id, label: "Home", name: "Aarti Sharma", phone: "9123456780", line1: "78 Lanka Post", line2: "Near Assi Ghat", city: "Varanasi", state: "Uttar Pradesh", pincode: "221005", isDefault: true },
  });

  await seedCategories(shop1.id);
  await seedRates(shop1.id);
  const rates1 = new Map([
    ["GOLD-999", 925800], ["GOLD-916", 848100], ["GOLD-750", 694550],
    ["SILVER-925", 11700], ["PLATINUM-999", 365800],
  ]);
  await seedProducts(shop1.id, "maa-anjani", SHOP1_PRODUCTS);

  // coupons
  await db.coupon.create({
    data: { shopId: shop1.id, code: "WELCOME10", description: "10% off first order", type: "PERCENT", value: 1000, minOrderPaise: 200000, maxDiscountPaise: 250000, endsAt: new Date(Date.now() + 90 * 86400000), active: true },
  });
  await db.coupon.create({
    data: { shopId: shop1.id, code: "GOLD500", description: "Flat ₹500 off above ₹25,000", type: "FLAT", value: 50000, minOrderPaise: 2500000, endsAt: new Date(Date.now() + 45 * 86400000), active: true },
  });
  // gift card
  await db.giftCard.create({
    data: { shopId: shop1.id, code: "GIFT-2026-5000", initialPaise: 500000, balancePaise: 500000, userId: cust1.id },
  });

  // savings plans
  const planGold = await db.savingsPlan.create({
    data: { shopId: shop1.id, name: "Dhanvardhan Daily Gold", description: "Save daily, get gold grams at maturity with bonus.", frequency: "DAILY", amountPaise: 10000, tenureCount: 200, mode: "GOLD", goldBonusBp: 500, active: true },
  });
  const planRoi = await db.savingsPlan.create({
    data: { shopId: shop1.id, name: "Varshik Nidhi Monthly", description: "Monthly deposits with 8% ROI paid to your wallet at maturity.", frequency: "MONTHLY", amountPaise: 500000, tenureCount: 12, mode: "ROI", roiPercentBp: 800, active: true },
  });
  const planWeekly = await db.savingsPlan.create({
    data: { shopId: shop1.id, name: "Saptahik Swarna", description: "Weekly gold accumulation with 3% bonus grams.", frequency: "WEEKLY", amountPaise: 51000, tenureCount: 52, mode: "GOLD", goldBonusBp: 300, active: true },
  });
  void planGold; void planWeekly;

  // demo scheme account with paid deposits
  const acc1 = await db.schemeAccount.create({
    data: {
      shopId: shop1.id, planId: planRoi.id, userId: cust1.id, accountNo: `MAJ-SCH-${Date.now().toString().slice(-6)}`,
      startedAt: new Date(Date.now() - 180 * 86400000), maturesAt: new Date(Date.now() + 185 * 86400000),
    },
  });
  const dues = generateDueDates({ frequency: "MONTHLY", customDays: "", amountPaise: 500000, tenureCount: 6, mode: "ROI", roiPercentBp: 800, goldBonusBp: 0 }, new Date(Date.now() - 180 * 86400000));
  let seq = 1;
  for (const d of dues) {
    const paid = d < new Date();
    await db.deposit.create({
      data: {
        accountId: acc1.id, seq: seq++, dueDate: d, paidAt: paid ? d : null,
        amountPaise: 500000, status: paid ? "PAID" : "DUE", method: paid ? "WALLET" : "",
        rateUsedPaise: 848100,
      },
    });
    if (paid) await db.schemeAccount.update({ where: { id: acc1.id }, data: { totalPaidPaise: { increment: 500000 } } });
  }

  // bot FAQs
  const faqs: [string, string, string][] = [
    ["Do you provide BIS hallmark certificates?", "Every gold piece is BIS hallmarked and comes with a HUID-tagged certificate. You can verify the hallmark at any BIS centre.", "hallmark bis huid certificate purity"],
    ["What are the delivery charges?", "Insured delivery is free above ₹5,000, otherwise a flat ₹150 applies. Store pickup is always free.", "delivery shipping charge free"],
    ["Can I exchange my old gold?", "Yes — bring your old gold for a same-day exchange at live rates. You can also file an exchange request online.", "exchange old gold trade"],
    ["Do you offer making charge discounts?", "Festive offers run through the year — currently up to 25% off making charges on selected designs.", "making charge discount offer"],
    ["Is online payment secure?", "Payments run on Razorpay (UPI, cards, netbanking) with bank-grade encryption. You can also pay by UPI QR or Cash on Delivery.", "payment secure razorpay upi cod"],
    ["Can I book the shop for a wedding purchase?", "Absolutely — book a free consultation and our team will reserve designs for your family viewing.", "appointment wedding booking consultation"],
  ];
  for (let i = 0; i < faqs.length; i++) {
    await db.botFaq.create({ data: { shopId: shop1.id, question: faqs[i][0], answer: faqs[i][1], keywords: faqs[i][2], sortOrder: i } });
  }

  // banners + popups (HERO slides use the built-in jewelry artwork carousel;
  // owners can paste an image URL or upload media from Admin → Marketing)
  const stripImg = await svg("banner-strip-1", "#5b1b24", "#d9b45a", "Diamond Vault", 1400, 500);
  await db.banner.create({ data: { shopId: shop1.id, title: "Festive Gold Festival", subtitle: "Up to 25% off making charges · New arrivals", href: "/maa-anjani-jewelers/shop?material=gold", placement: "HERO", sortOrder: 0 } });
  await db.banner.create({ data: { shopId: shop1.id, title: "Bridal Heirlooms", subtitle: "Handcrafted for the big day", href: "/maa-anjani-jewelers/shop?type=mangalsutra", placement: "HERO", sortOrder: 1 } });
  await db.banner.create({ data: { shopId: shop1.id, title: "Chains & Mangalsutra", subtitle: "Woven in gold, blessed for a lifetime", href: "/maa-anjani-jewelers/shop?type=chain", placement: "HERO", sortOrder: 2 } });
  await db.banner.create({ data: { shopId: shop1.id, title: "The Diamond Vault", subtitle: "Certified brilliance, everyday prices", image: stripImg, href: "/maa-anjani-jewelers/shop?material=diamond", placement: "SECTION", sortOrder: 3 } });

  const popImg = await svg("popup-budget", "#4a1520", "#e6c46a", "Best Picks for Your Budget", 900, 520);
  await db.popup.create({
    data: {
      shopId: shop1.id, title: "Best Picks for Your Budget",
      body: "Choose your budget and be among the first to hear about our festive offer.",
      image: popImg, trigger: "LOGIN", frequency: "SESSION",
      chipsJson: JSON.stringify([
        { label: "Less than ₹25k", href: "/maa-anjani-jewelers/shop?max=25000" },
        { label: "Less than ₹50k", href: "/maa-anjani-jewelers/shop?max=50000" },
        { label: "Less than ₹1 Lakh", href: "/maa-anjani-jewelers/shop?max=100000" },
        { label: "More than ₹1 Lakh", href: "/maa-anjani-jewelers/shop?min=100000" },
      ]),
      ctaLabel: "Explore offers", ctaHref: "/maa-anjani-jewelers/shop", sortOrder: 0,
    },
  });
  const popImg2 = await svg("popup-visit", "#122a1f", "#caa25a", "Visit Our Flagship", 900, 520);
  await db.popup.create({
    data: {
      shopId: shop1.id, title: "Free Jewellery Consultation",
      body: "Book a 1:1 styling session at our Godowlia flagship — gifts for every booking.",
      image: popImg2, trigger: "VISIT", frequency: "DAILY",
      chipsJson: JSON.stringify([]),
      ctaLabel: "Book now", ctaHref: "/maa-anjani-jewelers/appointment", sortOrder: 1,
    },
  });

  // =========================================================
  // SHOP 2 — demo second tenant (theme Ivory Heritage, some features blocked)
  // =========================================================
  const shop2 = await db.shop.create({
    data: {
      slug: "vasant-jewellers",
      name: "Vasant Jewellers",
      tagline: "Silver stories since 1972",
      contactEmail: "care@vasantjewels.in",
      phone: "9123450001",
      address: "22 MG Road, Indore, Madhya Pradesh 452001",
      state: "Madhya Pradesh",
      gstin: "23AABCV9876B1Z2",
      themeId: themeIds["ivory-heritage"],
      planId: planBasic.id,
      whatsappNumber: "919123450001",
      upiVpa: "vasantjewels@ybl",
      upiName: "Vasant Jewellers",
      gstPercentBp: 1800,
      freeShippingAbovePaise: 1000000,
      shippingFlatPaise: 20000,
    },
  });
  await enableAllFeatures(shop2.id, ["giftcards", "loyalty", "schemes", "razorpay"]);
  const b3 = await db.branch.create({
    data: { shopId: shop2.id, name: "MG Road Showroom", address: "22 MG Road", city: "Indore", phone: "9123450001", gstin: "23AABCV9876B1Z2", isDefault: true },
  });
  const owner2 = await db.user.create({
    data: { email: "owner@vasantjewels.in", name: "Suresh Vasant", phone: "9123450001", passwordHash: ownerHash, role: "OWNER", shopId: shop2.id },
  });
  void owner2;
  const cust2 = await db.user.create({
    data: { email: "customer2@demo.in", name: "Mehul Jain", phone: "9123450002", passwordHash: await bcrypt.hash("Demo@123", 10), role: "CUSTOMER", shopId: shop2.id },
  });
  void cust2;
  await seedCategories(shop2.id);
  await seedRates(shop2.id);
  await seedProducts(shop2.id, "vasant", SHOP2_PRODUCTS);
  await db.botFaq.create({ data: { shopId: shop2.id, question: "Do you make custom silver items?", answer: "Yes — custom silver idols and frames on request with 7 day delivery.", keywords: "custom silver order" } });
  const vHero = await svg("vasant-hero", "#e9ddc9", "#8a5a3b", "Vasant Silver Collection", 1600, 720);
  await db.banner.create({ data: { shopId: shop2.id, title: "Silver Season", subtitle: "Handcrafted 925 silver, made in Indore", image: vHero, placement: "HERO", sortOrder: 0 } });

  void b3; void owner1; void staff1;

  // =========================================================
  // Sample orders for shop 1 (dashboard + reports + tracking demo)
  // =========================================================
  const allProducts1 = await db.product.findMany({ where: { shopId: shop1.id } });
  const pick = (slug: string) => allProducts1.find((p) => p.slug === slug)!;

  type SeedOrder = {
    daysAgo: number; status: string; payment: "RAZORPAY" | "COD"; method?: string;
    items: { slug: string; qty: number }[]; user?: string;
  };
  const orderPlan: SeedOrder[] = [
    { daysAgo: 0, status: "PLACED", payment: "RAZORPAY", items: [{ slug: "divine-lotus-gold-ring", qty: 1 }] },
    { daysAgo: 0, status: "CONFIRMED", payment: "COD", items: [{ slug: "silver-ganesha-pendant", qty: 2 }] },
    { daysAgo: 1, status: "PACKED", payment: "RAZORPAY", items: [{ slug: "classic-rope-chain", qty: 1 }, { slug: "daily-wear-studs", qty: 1 }] },
    { daysAgo: 2, status: "SHIPPED", payment: "RAZORPAY", items: [{ slug: "kundan-jhumka", qty: 1 }] },
    { daysAgo: 3, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "diamond-solitaire-ring", qty: 1 }] },
    { daysAgo: 5, status: "DELIVERED", payment: "COD", items: [{ slug: "heritage-gold-bangle", qty: 1 }] },
    { daysAgo: 7, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "rose-gold-hoop-earrings", qty: 1 }, { slug: "meenakari-pendant", qty: 1 }] },
    { daysAgo: 9, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "mens-signet-ring", qty: 1 }] },
    { daysAgo: 11, status: "CANCELLED", payment: "COD", items: [{ slug: "kids-coin-chain", qty: 1 }] },
    { daysAgo: 13, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "diamond-tennis-bracelet", qty: 1 }] },
    { daysAgo: 16, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "silver-payal-anklet", qty: 2 }] },
    { daysAgo: 18, status: "DELIVERED", payment: "COD", items: [{ slug: "platinum-band", qty: 1 }] },
    { daysAgo: 20, status: "DELIVERED", payment: "RAZORPAY", items: [{ slug: "bridal-mangalsutra", qty: 1 }] },
  ];

  let invSeq = 1;
  let orderIdx = 1;
  for (const plan of orderPlan) {
    const placedAt = new Date(Date.now() - plan.daysAgo * 86400000 - 3600000 * (orderIdx % 9));
    const itemDefs = plan.items.map((i) => ({ product: pick(i.slug), qty: i.qty }));
    const { lines, refs } = makeLines(itemDefs, rates1);
    const totals = computeTotals({
      lines,
      gstPercentBp: shop1.gstPercentBp,
      platformFeePaise: shop1.platformFeePaise,
      platformFeePercentBp: shop1.platformFeePercentBp,
      shippingPaise: 0,
      cod: plan.payment === "COD",
      codFeePaise: plan.payment === "COD" ? shop1.codFeePaise : 0,
      freeShippingAbovePaise: shop1.freeShippingAbovePaise,
    });
    const number = `MAJ-${placedAt.getFullYear()}${String(placedAt.getMonth() + 1).padStart(2, "0")}${String(placedAt.getDate()).padStart(2, "0")}-${String(orderIdx).padStart(4, "0")}`;
    const paidStatuses = ["DELIVERED", "SHIPPED", "PACKED", "CONFIRMED", "PLACED", "CANCELLED"];
    const order = await db.order.create({
      data: {
        number,
        shopId: shop1.id,
        branchId: orderIdx % 3 === 0 ? b2.id : b1.id,
        userId: orderIdx % 4 === 0 ? cust1.id : cust1.id,
        status: plan.status,
        fulfillment: orderIdx % 3 === 1 ? "PICKUP" : "DELIVERY",
        subTotalPaise: totals.subTotalPaise,
        discountPaise: 0,
        platformFeePaise: totals.platformFeePaise,
        gstPaise: totals.gstPaise,
        shippingPaise: totals.shippingPaise,
        codFeePaise: totals.codFeePaise,
        roundOffPaise: totals.roundOffPaise,
        totalPaise: totals.totalPaise,
        paymentMethod: plan.payment,
        paymentStatus: plan.payment === "RAZORPAY" || plan.status === "DELIVERED" ? "PAID" : plan.status === "CANCELLED" ? "REFUNDED" : "PENDING",
        razorpayOrderId: plan.payment === "RAZORPAY" ? `order_DEMO${orderIdx}000000` : "",
        addressJson: JSON.stringify({ name: "Aarti Sharma", phone: "9123456780", line1: "78 Lanka Post", city: "Varanasi", state: "Uttar Pradesh", pincode: "221005" }),
        courier: plan.status === "SHIPPED" || plan.status === "DELIVERED" ? "Blue Dart" : "",
        awb: plan.status === "SHIPPED" || plan.status === "DELIVERED" ? `BD${70000000 + orderIdx}` : "",
        etaDate: new Date(placedAt.getTime() + 4 * 86400000).toISOString().slice(0, 10),
        cancelReason: plan.status === "CANCELLED" ? "Changed my mind" : "",
        placedAt,
        shippedAt: ["SHIPPED", "DELIVERED"].includes(plan.status) ? new Date(placedAt.getTime() + 86400000) : null,
        deliveredAt: plan.status === "DELIVERED" ? new Date(placedAt.getTime() + 3 * 86400000) : null,
        cancelledAt: plan.status === "CANCELLED" ? new Date(placedAt.getTime() + 43200000) : null,
      },
    });

    for (const r of refs) {
      await db.orderItem.create({
        data: {
          orderId: order.id, productId: r.product.id, variantId: r.variantId,
          name: r.product.name, sku: r.product.sku, qty: r.qty, purity: r.product.purity,
          netWeightMg: r.product.netWeightMg, rateApplied: r.line.unitMetalPaise > 0 ? Math.round((r.line.unitMetalPaise / r.product.netWeightMg) * 1000) : 0,
          metalPaise: r.line.unitMetalPaise * r.qty, makingPaise: r.line.unitMakingPaise * r.qty,
          stonePaise: r.line.unitStonePaise * r.qty, lineSubPaise: r.line.lineSubPaise,
          discountPaise: r.line.discountPaise, gstPercentBp: r.product.gstPercentBp,
          gstExempt: r.product.gstExempt, gstPaise: r.line.gstPaise, lineTotalPaise: r.line.lineTotalPaise,
          hsnCode: r.product.hsnCode,
        },
      });
    }

    // events trail
    await db.orderEvent.create({ data: { orderId: order.id, status: "PLACED", note: "Order placed online", actor: "customer", createdAt: placedAt } });
    if (paidStatuses.includes(plan.status) && plan.status !== "PLACED") {
      await db.orderEvent.create({ data: { orderId: order.id, status: "CONFIRMED", note: "Payment confirmed", actor: "system" } });
    }
    if (["PACKED", "SHIPPED", "DELIVERED"].includes(plan.status)) {
      await db.orderEvent.create({ data: { orderId: order.id, status: "PACKED", note: "Packed & hallmark verified", actor: "staff" } });
    }
    if (["SHIPPED", "DELIVERED"].includes(plan.status)) {
      await db.orderEvent.create({ data: { orderId: order.id, status: "SHIPPED", note: `Shipped via ${order.courier} AWB ${order.awb}`, actor: "staff" } });
    }
    if (plan.status === "DELIVERED") {
      await db.orderEvent.create({ data: { orderId: order.id, status: "DELIVERED", note: "Delivered & signed", actor: "courier" } });
    }
    if (plan.status === "CANCELLED") {
      await db.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: "Cancelled by customer", actor: "customer" } });
    }

    if (["DELIVERED", "SHIPPED", "PACKED"].includes(plan.status)) {
      const invNumber = `INV-2026-${String(invSeq++).padStart(4, "0")}`;
      await db.invoice.create({ data: { shopId: shop1.id, orderId: order.id, number: invNumber } });
      await db.order.update({ where: { id: order.id }, data: { invoiceNumber: invNumber } });
    }

    // customer notification
    await db.notification.create({
      data: { shopId: shop1.id, userId: cust1.id, orderId: order.id, title: `Order ${number} — ${plan.status.toLowerCase()}`, link: `/account/orders/${order.id}` },
    });
    orderIdx++;
  }

  // loyalty points for delivered spend
  await db.loyaltyLedger.create({ data: { shopId: shop1.id, userId: cust1.id, points: 750, reason: "Welcome bonus + delivered orders", } });
  // wallet with money + gold
  await db.wallet.create({ data: { shopId: shop1.id, userId: cust1.id, balancePaise: 125000, goldMg: 1500 } });
  const wallet = await db.wallet.findFirst({ where: { shopId: shop1.id, userId: cust1.id } });
  if (wallet) {
    await db.walletTxn.create({ data: { walletId: wallet.id, type: "CREDIT", amountPaise: 125000, reason: "Refund credit + welcome" } });
    await db.walletTxn.create({ data: { walletId: wallet.id, type: "GOLD_CREDIT", goldMg: 1500, reason: "Scheme accrual" } });
  }

  // reviews
  const reviewData: [string, number, string][] = [
    ["divine-lotus-gold-ring", 5, "Absolutely love the finish — exactly like the photo."],
    ["kundan-jhumka", 5, "Wore it at a wedding, got so many compliments!"],
    ["classic-rope-chain", 4, "Solid weight and great polish. Delivery was quick."],
  ];
  for (const [slug, rating, comment] of reviewData) {
    const p = allProducts1.find((x) => x.slug === slug);
    if (p) await db.review.create({ data: { shopId: shop1.id, productId: p.id, userId: cust1.id, rating, comment } });
  }

  // queries + appointments + exchange
  await db.query.create({ data: { shopId: shop1.id, userId: cust1.id, name: "Aarti Sharma", phone: "9123456780", email: "customer@demo.in", subject: "Customization query", message: "Can the lotus ring be made in 18K?", source: "CONTACT", status: "NEW" } });
  await db.query.create({ data: { shopId: shop1.id, name: "Vikram Singh", phone: "9811122233", subject: "Wedding order", message: "Need 22K sets for 40 guests, budget ₹15L.", source: "SAMBOT", status: "IN_PROGRESS" } });
  await db.appointment.create({ data: { shopId: shop1.id, branchId: b2.id, userId: cust1.id, name: "Aarti Sharma", phone: "9123456780", date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), slot: "17:00", service: "Bridal consultation", message: "Looking for mangalsutra + bangles.", status: "PENDING" } });
  await db.exchangeRequest.create({ data: { shopId: shop1.id, userId: cust1.id, name: "Aarti Sharma", phone: "9123456780", metal: "GOLD", purity: "22K", grossWeightG: 18, note: "Old chain, want to exchange for ring.", status: "NEW" } });

  // wishlist
  const wl = await db.product.findFirst({ where: { shopId: shop1.id, slug: "diamond-solitaire-ring" } });
  if (wl) await db.wishlist.create({ data: { shopId: shop1.id, userId: cust1.id, productId: wl.id } });

  console.log("Seed complete.");
  console.log("  Super admin : admin@jewelportal.in / Admin@123       → /super/login");
  console.log("  Shop owner  : owner@maaanjani.in / Owner@123          → /maa-anjani-jewelers/admin/login");
  console.log("  Staff       : staff@maaanjani.in / Staff@123          → /maa-anjani-jewelers/admin/login");
  console.log("  Customer    : customer@demo.in / Demo@123             → /account/login");
  console.log("  Shop 2 owner: owner@vasantjewels.in / Owner@123       → /vasant-jewellers/admin/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
