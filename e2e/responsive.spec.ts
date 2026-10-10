import { test, expect } from "@playwright/test";

const SLUG = "maa-anjani-jewelers";

const mobile = { viewport: { width: 375, height: 812 } };

test.describe("responsive", () => {
  test.describe("mobile 375px", () => {
    test.use(mobile);

    test("storefront home has no horizontal overflow", async ({ page }) => {
      await page.goto(`/${SLUG}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500); // allow 3D scene to mount
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement;
        return el ? el.scrollWidth - el.clientWidth : 999;
      });
      expect(overflow).toBeLessThanOrEqual(2);
    });

    test("admin hides desktop sidebar and shows mobile header", async ({ page }) => {
      await page.goto(`/${SLUG}/admin/login`, { waitUntil: "domcontentloaded" });
      await page.fill("#email", "owner@maaanjani.in");
      await page.fill("#password", "Owner@123");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(new RegExp(`/admin`));
      const aside = page.locator("aside");
      if (await aside.count()) {
        await expect(aside.first()).toBeHidden(); // desktop sidebar hidden on mobile
      }
      await expect(page.locator("header").first()).toBeVisible();
    });
  });

  test.describe("desktop 1280px", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("admin shows sidebar nav on desktop", async ({ page }) => {
      await page.goto(`/${SLUG}/admin/login`, { waitUntil: "domcontentloaded" });
      await page.fill("#email", "owner@maaanjani.in");
      await page.fill("#password", "Owner@123");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("aside").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    });
  });
});
