import { test, expect } from "@playwright/test";

const SLUG = "maa-anjani-jewelers";

async function adminLogin(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto(`/${SLUG}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(new RegExp(`/${SLUG}/admin$`));
}

test.describe("shop admin", () => {
  test("anon is redirected to login", async ({ page }) => {
    await page.goto(`/${SLUG}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/admin/login`));
  });

  test("owner sees dashboard KPIs and can open orders", async ({ page }) => {
    await adminLogin(page, "owner@maaanjani.in", "Owner@123");
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/admin`));
    await expect(page.getByText(/Today revenue/i)).toBeVisible();

    await page.goto(`/${SLUG}/admin/orders`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/order/i);
    const open = page.getByRole("link", { name: "Open" }).first();
    expect(await open.count()).toBeGreaterThan(0);
    await open.click();
    await expect(page).toHaveURL(/\/admin\/orders\//);
    // order detail shows transition controls or a "no further transitions" note
    await expect(page.getByText(/status|transition|timeline/i).first()).toBeVisible();
  });

  // PLACED→CONFIRMED transition is covered in customer.spec.ts (fresh order each run).

  test("staff nav is permission-gated (no Settings link)", async ({ page }) => {
    await adminLogin(page, "staff@maaanjani.in", "Staff@123");
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/admin`));
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  });

  test("owner can set a category icon and it appears on the storefront", async ({ page }) => {
    const MARKER = "🔮";
    // ensure a clean slate regardless of prior run state
    const clearIcon = async () => {
      await page.goto(`/${SLUG}/admin/products`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
      await page.locator("li", { hasText: "Rings" }).first().getByRole("button", { name: "Edit" }).click();
      const f = page.locator("form").filter({ has: page.locator("input[name=name][id^=name-]") }).first();
      await f.locator("input[name=icon]").fill("");
      await f.getByRole("button", { name: "Save" }).click();
    };

    await adminLogin(page, "owner@maaanjani.in", "Owner@123");
    await clearIcon();
    await page.goto(`/${SLUG}/admin/products`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();

    const ringRow = page.locator("li", { hasText: "Rings" }).first();
    await ringRow.getByRole("button", { name: "Edit" }).click();
    const form = page.locator("form").filter({ has: page.locator("input[name=name][id^=name-]") }).first();
    await form.locator("input[name=icon]").fill(MARKER);
    await form.getByRole("button", { name: "Save" }).click();
    await expect(ringRow.getByText("Saved ✓")).toBeVisible();

    await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`a[href*="type=ring"]`).first()).toContainText(MARKER);

    // reset so other tests / future runs see the default icon
    await clearIcon();
    await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`a[href*="type=ring"]`).first()).not.toContainText(MARKER);
  });

  test("settings page requires permission — staff redirected", async ({ page }) => {
    await adminLogin(page, "staff@maaanjani.in", "Staff@123");
    await page.goto(`/${SLUG}/admin/settings`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/settings$/);
  });
});
