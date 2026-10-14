import { test, expect } from "@playwright/test";

const SHOP_A = "maa-anjani-jewelers";
const SHOP_B = "vasant-jewellers";

test.describe("cross-tenant isolation", () => {
  test("shop-B owner cannot open shop-A admin panel", async ({ page }) => {
    await page.goto(`/${SHOP_B}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", "owner@vasantjewels.in");
    await page.fill("#password", "Owner@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(new RegExp(`/${SHOP_B}/admin$`));

    await page.goto(`/${SHOP_A}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/${SHOP_A}/admin/login`));
    await expect(page.locator("#email")).toBeVisible();
  });

  test("shop-B owner cannot download shop-A report CSVs", async ({ page }) => {
    await page.goto(`/${SHOP_B}/admin/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", "owner@vasantjewels.in");
    await page.fill("#password", "Owner@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(new RegExp(`/${SHOP_B}/admin$`));

    for (const kind of ["sales", "gst", "inventory", "rates"]) {
      const res = await page.request.get(`/${SHOP_A}/admin/reports/csv?kind=${kind}`);
      expect(res.status(), `kind=${kind}`).toBe(403);
    }

    const own = await page.request.get(`/${SHOP_B}/admin/reports/csv?kind=sales`);
    expect(own.status()).toBe(200);
    expect(own.headers()["content-type"]).toContain("text/csv");
  });

  test("customer orders are invisible to another shop's owner", async ({ request }) => {
    const loginA = await request.post("/api/v1/auth/login", {
      data: { email: "customer@demo.in", password: "Demo@123" },
    });
    expect(loginA.status()).toBe(200);
    const { token: tokenA } = await loginA.json();

    const ordersA = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(ordersA.status()).toBe(200);
    const list = (await ordersA.json()).orders as { id: string; number: string; shop: { slug: string } }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((o) => o.shop.slug === SHOP_A)).toBe(true);
    const victimOrderId = list[0].id;
    const victimOrderNumber = list[0].number;

    // Shop-B owner cannot read the shop-A order by id.
    const loginB = await request.post("/api/v1/auth/login", {
      data: { email: "owner@vasantjewels.in", password: "Owner@123" },
    });
    expect(loginB.status()).toBe(200);
    const { token: tokenB } = await loginB.json();

    const crossRead = await request.get(`/api/v1/orders/${victimOrderId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(crossRead.status()).toBe(403);

    // Shop-B owner's own order list never contains shop-A orders.
    const ordersB = await request.get("/api/v1/orders", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(ordersB.status()).toBe(200);
    const listB = (await ordersB.json()).orders as { id: string }[];
    expect(listB.some((o) => o.id === victimOrderId)).toBe(false);

    // Sam Bot only answers order questions for the shop that owns the order.
    const chat = async (slug: string, message: string) => {
      const res = await request.post("/api/chat", { data: { slug, message } });
      expect(res.status()).toBe(200);
      return ((await res.json()) as { text: string }).text;
    };

    const needVerify = await chat(SHOP_A, victimOrderNumber);
    expect(needVerify).toContain("last 4 digits");

    const wrongDigits = await chat(SHOP_A, `${victimOrderNumber} 0000`);
    expect(wrongDigits).toContain("couldn't verify");

    const crossShop = await chat(SHOP_B, `${victimOrderNumber} 6780`);
    expect(crossShop).toContain("couldn't verify");

    const verified = await chat(SHOP_A, `${victimOrderNumber} 6780`);
    expect(verified).toContain("Status:");
    expect(verified).toContain(victimOrderNumber);
  });
});
