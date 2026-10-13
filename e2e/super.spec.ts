import { test, expect } from "@playwright/test";

test.describe("platform console", () => {
  test("anon /super redirects to login", async ({ page }) => {
    await page.goto("/super", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/super\/login/);
  });

  test("shop-owner cookie cannot open platform console", async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto("/maa-anjani-jewelers/admin/login", { waitUntil: "domcontentloaded" });
    await p.fill("#email", "owner@maaanjani.in");
    await p.fill("#password", "Owner@123");
    await p.getByRole("button", { name: "Sign in" }).click();
    await expect(p).toHaveURL(/\/admin/);
    await p.goto("/super", { waitUntil: "domcontentloaded" });
    await expect(p).toHaveURL(/\/super\/login/);
    await ctx.close();
  });

  test("super admin: login, dashboard, shops, flow page", async ({ page }) => {
    await page.goto("/super/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@jewelportal.in");
    await page.fill("#password", "Admin@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/super");
    await expect(page.getByRole("heading", { name: "Platform dashboard" })).toBeVisible();
    await expect(page.getByText(/Maa Anjani Jewelers/i).first()).toBeVisible();

    await page.goto("/super/shops", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Launch a new shop/i)).toBeVisible();

    // application-flow page: owner-facing docs + credentials
    await page.goto("/super/flow", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /Application flow/i })).toBeVisible();
    await expect(page.getByText(/admin@jewelportal.in/)).toBeVisible();
    await expect(page.getByText(/Order lifecycle/i)).toBeVisible();
    await expect(page.getByText(/SQLite/).first()).toBeVisible();

    // plans + users pages load
    await page.goto("/super/plans", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/plan/i);
    await page.goto("/super/users", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/user/i);

    // handover guide: checklist + feature walkthrough per shop
    await page.goto("/super/handover", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /handover/i })).toBeVisible();
    await expect(page.getByText(/Before you hand over/i)).toBeVisible();
    await expect(page.getByText(/Feature walkthrough for the owner/i)).toBeVisible();
    await expect(page.getByText(/Handover script/i)).toBeVisible();
  });

  test("delete a shop with the 2-click red danger zone", async ({ page }) => {
    // 1. login
    await page.goto("/super/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@jewelportal.in");
    await page.fill("#password", "Admin@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/super$/);

    // 2. create a throwaway shop via the console
    const name = `E2E Temp Delete ${Date.now()}`;
    await page.goto("/super/shops", { waitUntil: "domcontentloaded" });
    await page.fill("#cs-name", name);
    await page.fill("#cs-oname", "Temp Owner");
    await page.fill("#cs-oemail", `temp-${Date.now()}@e2e.test`);
    await page.fill("#cs-opass", "Temp@123");
    await page.getByRole("button", { name: "Launch shop" }).click();
    await expect(page.getByText("Saved ✓").first()).toBeVisible({ timeout: 20_000 });

    // 3. open its detail page
    const row = page.getByRole("row", { name: new RegExp(name) });
    await row.getByRole("link", { name: "Manage" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    // 4. danger zone — step 1: red Delete button opens red confirmation panel
    await expect(page.getByText("Danger zone")).toBeVisible();
    await page.getByRole("button", { name: "Delete shop…" }).click();
    await expect(page.getByText(/permanently deletes/)).toBeVisible();

    // confirm button stays disabled until the name is typed
    const confirmBtn = page.getByRole("button", { name: "Yes, delete permanently" });
    await expect(confirmBtn).toBeDisabled();
    await page.getByPlaceholder(name).fill(name);
    await expect(confirmBtn).toBeEnabled();

    // 5. step 2: confirm → shop is gone
    await confirmBtn.click();
    await page.waitForURL(/\/super\/shops$/);
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
