import { describe, expect, it } from "vitest";
import {
  bearerToken,
  jsonOk,
  jsonErr,
  bodyStr,
  bodyInt,
  bodyBool,
  apiProduct,
  apiOrder,
  apiUser,
  type ApiProductRow,
} from "@/lib/api";

describe("bearerToken", () => {
  it("parses a standard Bearer header", () => {
    expect(bearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(bearerToken("  bearer   tok  ")).toBe("tok");
  });

  it("returns null for missing/empty/other schemes", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(bearerToken("Bearer    ")).toBeNull();
  });
});

describe("json helpers", () => {
  it("jsonOk returns 200 with payload", async () => {
    const res = jsonOk({ hello: "world" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("jsonErr returns status + error message", async () => {
    const res = jsonErr(401, "Not signed in.");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Not signed in." });
  });
});

describe("body helpers", () => {
  it("bodyStr trims and caps length", () => {
    expect(bodyStr({ name: "  Meera  " }, "name")).toBe("Meera");
    expect(bodyStr({ name: "x".repeat(50) }, "name", 5)).toBe("xxxxx");
    expect(bodyStr({ name: 42 }, "name")).toBe("");
    expect(bodyStr({}, "name")).toBe("");
  });

  it("bodyInt accepts numbers and numeric strings", () => {
    expect(bodyInt({ qty: 3 }, "qty")).toBe(3);
    expect(bodyInt({ qty: "7" }, "qty")).toBe(7);
    expect(bodyInt({ qty: "abc" }, "qty")).toBeUndefined();
    expect(bodyInt({}, "qty")).toBeUndefined();
  });

  it("bodyBool treats true / \"true\" / \"on\" as true", () => {
    expect(bodyBool({ f: true }, "f")).toBe(true);
    expect(bodyBool({ f: "true" }, "f")).toBe(true);
    expect(bodyBool({ f: "on" }, "f")).toBe(true);
    expect(bodyBool({ f: "false" }, "f")).toBe(false);
    expect(bodyBool({}, "f")).toBe(false);
  });
});

const productRow: ApiProductRow = {
  id: "p1",
  slug: "gold-ring",
  name: "Gold Ring",
  description: "Pretty",
  sku: "GR-1",
  metal: "GOLD",
  purity: "22K",
  netWeightMg: 5000,
  grossWeightMg: 5200,
  fixedPricePaise: 0,
  makingMode: "PERCENT",
  makingValue: 1200,
  stoneValuePaise: 0,
  gstPercentBp: 1800,
  gstExempt: false,
  hsnCode: "7113",
  featured: true,
  soldCount: 3,
  status: "ACTIVE",
  videoUrl: "",
  certificateImg: "",
  images: ["/uploads/ring.jpg"],
  pricePaise: 4500000,
  createdAt: new Date("2026-01-15T10:00:00Z"),
  typeCat: { slug: "ring", name: "Rings" },
  materialCat: { slug: "gold", name: "Gold" },
  audienceCat: null,
};

describe("apiProduct whitelist", () => {
  it("serializes safe fields and never leaks private columns", () => {
    const out = apiProduct({
      ...productRow,
      // private columns that a raw Prisma spread would leak:
      costPaise: 3000000,
      imagesJson: '["/uploads/ring.jpg"]',
      shopId: "shop-secret",
    } as unknown as ApiProductRow);

    expect(out.slug).toBe("gold-ring");
    expect(out.pricePaise).toBe(4500000);
    expect(out.images).toEqual(["/uploads/ring.jpg"]);
    expect(out.type).toEqual({ slug: "ring", name: "Rings" });
    expect(out.audience).toBeNull();
    expect(out.createdAt).toBe("2026-01-15T10:00:00.000Z");
    expect(Object.keys(out)).not.toContain("costPaise");
    expect(Object.keys(out)).not.toContain("imagesJson");
    expect(Object.keys(out)).not.toContain("shopId");
  });
});

describe("apiOrder whitelist", () => {
  it("parses address JSON and nests totals; safe on bad JSON", () => {
    const base = {
      id: "o1",
      number: "MA-1001",
      status: "PLACED",
      fulfillment: "DELIVERY",
      subTotalPaise: 4500000,
      discountPaise: 0,
      couponCode: "",
      couponPaise: 0,
      giftCardPaise: 0,
      loyaltyPointsUsed: 0,
      loyaltyPaise: 0,
      platformFeePaise: 0,
      gstPaise: 810000,
      shippingPaise: 0,
      codFeePaise: 0,
      roundOffPaise: 0,
      totalPaise: 5310000,
      paymentMethod: "COD",
      paymentStatus: "PENDING",
      addressJson: JSON.stringify({ name: "Meera", city: "Jaipur" }),
      courier: "",
      awb: "",
      etaDate: "2026-01-20",
      cancelReason: "",
      invoiceNumber: "INV-1001",
      placedAt: new Date("2026-01-15T12:00:00Z"),
      shop: { slug: "maa-anjani-jewelers", name: "Maa Anjani Jewellers" },
      items: [],
      events: [],
    };
    const out = apiOrder(base);
    expect(out.address).toEqual({ name: "Meera", city: "Jaipur" });
    expect(out.totals.totalPaise).toBe(5310000);
    expect(out.placedAt).toBe("2026-01-15T12:00:00.000Z");
    expect(Object.keys(out)).not.toContain("addressJson");

    const bad = apiOrder({ ...base, addressJson: "not-json" });
    expect(bad.address).toEqual({});
  });
});

describe("apiUser whitelist", () => {
  it("never leaks passwordHash", () => {
    const out = apiUser({
      id: "u1",
      email: "customer@demo.in",
      phone: "9999999999",
      name: "Demo",
      role: "CUSTOMER",
      shopId: "shop1",
      avatar: "",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      passwordHash: "$2b$10$secret",
    } as never);
    expect(out.email).toBe("customer@demo.in");
    expect(Object.keys(out)).not.toContain("passwordHash");
  });
});
