import { test, expect } from "@playwright/test";

test.describe("landing page (app-owner domain)", () => {
  test("root shows Jewel Portal landing with shop directory, not a shop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/One platform/i);
    await expect(page.getByText("Jewel Portal").first()).toBeVisible();
    // directory card for the seeded shop
    await expect(page.getByText("Maa Anjani Jewelers").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Visit store" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Owner login" }).first()).toBeVisible();
    // platform login entry point
    await expect(page.getByRole("link", { name: /Super admin/i }).first()).toBeVisible();
  });

  test("super admin can sign in from the landing page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Super admin/i }).first().click();
    await expect(page).toHaveURL(/\/super\/login/);
    await page.fill("#email", "admin@jewelportal.in");
    await page.fill("#password", "Admin@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/super$/);
    await expect(page.getByRole("heading", { name: "Platform dashboard" })).toBeVisible();
  });

  test("root is NOT an auto-redirect to the first shop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // still on root after load — landing content, not the tenant storefront
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/One platform/i);
  });
});
