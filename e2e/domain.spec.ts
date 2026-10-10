import { test, expect } from "@playwright/test";

const DOMAIN = "http://maaanjani.in.localhost:3100";

test.describe("custom domain tenancy (maaanjani.in)", () => {
  test("domain root serves the mapped shop storefront", async ({ page }) => {
    await page.goto(`${DOMAIN}/`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Maa Anjani Jewelers").first()).toBeVisible();
  });

  test("clean URLs work without the slug prefix", async ({ page }) => {
    await page.goto(`${DOMAIN}/shop`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/jewellery|shop/i);
    expect(await page.locator('a[href*="/p/"]').count()).toBeGreaterThan(0);

    await page.goto(`${DOMAIN}/rates`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/rate/i);
  });

  test("admin works at domain root too", async ({ page }) => {
    await page.goto(`${DOMAIN}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp("/admin/login"));
    await page.fill("#email", "owner@maaanjani.in");
    await page.fill("#password", "Owner@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/admin$/);
    await expect(page.getByText(/Today revenue/i)).toBeVisible();
  });

  test("/super is not served on a custom domain", async ({ page }) => {
    await page.goto(`${DOMAIN}/super`, { waitUntil: "domcontentloaded" });
    // redirected to the tenant home (platform console lives on app-owner domain)
    await expect(page).not.toHaveURL(/\/super/);
  });

  test("default-domain slug path still works alongside", async ({ page }) => {
    await page.goto("http://localhost:3100/maa-anjani-jewelers", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
