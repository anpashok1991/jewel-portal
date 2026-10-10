import { test, expect } from "@playwright/test";

const SLUG = "maa-anjani-jewelers";

test.describe("storefront", () => {
  test("home loads with theme + hero", async ({ page }) => {
    await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // hero shows jewelry line-art SVG (no more 3D canvas)
    await expect(page.locator("svg.jewel-art, section.hero-shell svg").first()).toBeAttached();
    await expect(page.getByRole("button", { name: /slide/i }).first()).toBeVisible();
  });

  test("shop listing shows products", async ({ page }) => {
    await page.goto(`/${SLUG}/shop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/jewellery|shop/i);
    const cards = page.locator('a[href*="/p/"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("product detail has price + add to cart", async ({ page }) => {
    await page.goto(`/${SLUG}/shop`, { waitUntil: "domcontentloaded" });
    await page.locator('a[href*="/p/"]').first().click();
    await expect(page).toHaveURL(/\/p\//);
    await expect(page.getByRole("button", { name: /add to cart|select a size/i })).toBeVisible();
  });

  test("rates page renders rate card", async ({ page }) => {
    await page.goto(`/${SLUG}/rates`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/₹|rate/i).first()).toBeVisible();
  });

  test("guest add-to-cart is redirected to login", async ({ page }) => {
    await page.goto(`/${SLUG}/shop`, { waitUntil: "domcontentloaded" });
    await page.locator('a[href*="/p/"]').first().click();
    await expect(page).toHaveURL(/\/p\//);
    const closeOffer = page.getByRole("button", { name: /close offer/i });
    await closeOffer.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    if (await closeOffer.isVisible().catch(() => false)) {
      await closeOffer.click();
    }
    const addBtn = page.getByRole("button", { name: /add to cart|select a size/i });
    await addBtn.waitFor({ state: "visible", timeout: 20_000 });
    if (await addBtn.isDisabled()) {
      await page.locator("button.chip").first().click();
    }
    await addBtn.click();
    await expect(page).toHaveURL(/\/account\/login/);
  });
});
