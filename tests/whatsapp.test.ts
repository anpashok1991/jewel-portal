import { describe, expect, it } from "vitest";
import {
  purchaseDetailsMessage,
  waMeUrl,
  whatsappPageType,
  parseWhatsappPages,
  WHATSAPP_PAGE_TYPES,
  type PurchaseDetailsInput,
} from "@/lib/whatsapp";

const placed = new Date("2026-10-13T09:30:00+05:30");

const base: PurchaseDetailsInput = {
  shopName: "Maa Anjani Jewellers",
  orderNumber: "MAJ-20261013-0001",
  placedAt: placed,
  status: "CONFIRMED",
  paymentMethod: "UPI",
  paymentStatus: "PAID",
  items: [
    { name: "Divine Lotus Gold Ring", purity: "22K", qty: 1, netWeightMg: 10500, lineTotalPaise: 6234000 },
    { name: "Silver Charm Bracelet", purity: "925", qty: 2, netWeightMg: 4000, lineTotalPaise: 480000 },
  ],
  subTotalPaise: 6714000,
  gstPaise: 1208520,
  totalPaise: 7922520,
  trackUrl: "https://jewelportal.example/maa-anjani-jewelers/order/abc123",
};

describe("purchaseDetailsMessage", () => {
  it("renders shop, order, items with purity/weight and money lines", () => {
    const msg = purchaseDetailsMessage(base);
    expect(msg).toContain("*Purchase details — Maa Anjani Jewellers*");
    expect(msg).toContain("Order: MAJ-20261013-0001");
    expect(msg).toContain(placed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
    expect(msg).toContain("Status: Confirmed");
    expect(msg).toContain("Payment: UPI · PAID");
    expect(msg).toContain("• Divine Lotus Gold Ring (22K · 10.500g) × 1 — ₹62,340");
    expect(msg).toContain("• Silver Charm Bracelet (925 · 4g) × 2 — ₹4,800");
    expect(msg).toContain("Subtotal: ₹67,140");
    expect(msg).toContain("GST: ₹12,085");
    expect(msg).toContain("*Total: ₹79,225*");
    expect(msg).toContain("Track order: https://jewelportal.example/maa-anjani-jewelers/order/abc123");
  });

  it("prepends the intro line only when provided", () => {
    const withIntro = purchaseDetailsMessage({ ...base, intro: "Namaste Aarti, here are your purchase details:" });
    expect(withIntro.startsWith("Namaste Aarti, here are your purchase details:\n\n*Purchase details")).toBe(true);
    expect(purchaseDetailsMessage(base).startsWith("*Purchase details")).toBe(true);
  });

  it("humanizes raw status codes and includes discount/shipping when present", () => {
    const msg = purchaseDetailsMessage({ ...base, status: "RETURN_REQUESTED", discountPaise: 50000, shippingPaise: 15000 });
    expect(msg).toContain("Status: Return Requested");
    expect(msg).toContain("Discount: −₹500");
    expect(msg).toContain("Shipping: ₹150");
  });

  it("omits optional money lines and track link when absent", () => {
    const msg = purchaseDetailsMessage({
      shopName: "Vasant Jewellers",
      orderNumber: "VAS-1",
      placedAt: placed,
      status: "PLACED",
      items: [{ name: "Ring", qty: 1, lineTotalPaise: 100000 }],
      totalPaise: 100000,
    });
    expect(msg).not.toContain("Subtotal:");
    expect(msg).not.toContain("GST:");
    expect(msg).not.toContain("Payment:");
    expect(msg).not.toContain("Track order:");
    expect(msg).toContain("*Total: ₹1,000*");
  });

  it("encodes into a wa.me deep link without raw newlines", () => {
    const href = waMeUrl("9123456780", purchaseDetailsMessage(base));
    expect(href.startsWith("https://wa.me/919123456780?text=")).toBe(true);
    expect(href).not.toContain("\n");
    expect(href).toContain("%0A");
    expect(decodeURIComponent(href.split("?text=")[1])).toContain("Order: MAJ-20261013-0001");
  });
});

describe("whatsappPageType", () => {
  const slug = "maa-anjani-jewelers";
  it("classifies slug-prefixed storefront paths", () => {
    expect(whatsappPageType(`/${slug}`, slug)).toBe("home");
    expect(whatsappPageType(`/${slug}/`, slug)).toBe("home");
    expect(whatsappPageType(`/${slug}/shop`, slug)).toBe("shop");
    expect(whatsappPageType(`/${slug}/search`, slug)).toBe("shop");
    expect(whatsappPageType(`/${slug}/p/divine-lotus-ring`, slug)).toBe("product");
    expect(whatsappPageType(`/${slug}/cart`, slug)).toBe("checkout");
    expect(whatsappPageType(`/${slug}/checkout`, slug)).toBe("checkout");
    expect(whatsappPageType(`/${slug}/order/abc123`, slug)).toBe("order");
    expect(whatsappPageType(`/${slug}/rates`, slug)).toBe("other");
    expect(whatsappPageType(`/${slug}/contact`, slug)).toBe("other");
  });
  it("classifies custom-domain paths (no slug prefix)", () => {
    expect(whatsappPageType("/", slug)).toBe("home");
    expect(whatsappPageType("/p/x", slug)).toBe("product");
    expect(whatsappPageType("/cart", slug)).toBe("checkout");
    expect(whatsappPageType("/order/xyz", slug)).toBe("order");
    expect(whatsappPageType("/schemes", slug)).toBe("other");
  });
});

describe("parseWhatsappPages", () => {
  it("keeps known types in canonical order and drops unknown keys", () => {
    expect(parseWhatsappPages("product,home,bogus,order")).toEqual(["home", "product", "order"]);
  });
  it("returns empty for a blank CSV", () => {
    expect(parseWhatsappPages("")).toEqual([]);
    expect(parseWhatsappPages(" , ")).toEqual([]);
  });
  it("the schema default enables every page type", () => {
    expect(parseWhatsappPages(WHATSAPP_PAGE_TYPES.join(","))).toEqual([...WHATSAPP_PAGE_TYPES]);
  });
});
