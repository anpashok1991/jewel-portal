import { test, expect } from "@playwright/test";

const SLUG = "maa-anjani-jewelers";

test.describe("customer journey", () => {
  test("login → add to cart → COD checkout → order success", async ({ page, browser }) => {
    // customer login
    await page.goto("/account/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "customer@demo.in");
    await page.fill("#password", "Demo@123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).not.toHaveURL(/\/account\/login/);

    // product → add to cart (wait for hydration; dismiss marketing popup)
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
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/cart`));

    // cart → checkout
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/cart/i);
    await page.goto(`/${SLUG}/checkout`, { waitUntil: "domcontentloaded" });
    // dismiss popup again if it reappears on checkout
    const closeOffer2 = page.getByRole("button", { name: /close offer/i });
    if (await closeOffer2.isVisible().catch(() => false)) {
      await closeOffer2.click();
    }

    // select first saved address if radios exist, else fill inline form
    const addressRadio = page.locator('input[name="addressId"]').first();
    if (await addressRadio.count()) {
      await addressRadio.check();
    } else {
      await page.fill('input[name="name"]', "Demo Customer");
      await page.fill('input[name="phone"]', "9876543210");
      await page.fill('input[name="line1"]', "12 Test Lane");
      await page.fill('input[name="city"]', "Jaipur");
      await page.fill('input[name="state"]', "Rajasthan");
      await page.fill('input[name="pincode"]', "302001");
    }

    // choose COD if offered
    const cod = page.locator('input[name="paymentMethod"][value="COD"]');
    if (await cod.count()) await cod.check();

    // place order
    await page.getByRole("button", { name: /place order/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/order/`), { timeout: 30_000 });
    await expect(page.getByText(/MAA-|order/i).first()).toBeVisible();

    // order appears in account (cards, not a table)
    await page.goto("/account/orders", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/order/i);
    await expect(page.getByRole("link", { name: /MAA-/ }).first()).toBeVisible();

    // owner then progresses a PLACED order to CONFIRMED (isolated context)
    const ownerCtx = await browser.newContext();
    const op = await ownerCtx.newPage();
    await op.goto(`/${SLUG}/admin/login`, { waitUntil: "domcontentloaded" });
    await op.fill("#email", "owner@maaanjani.in");
    await op.fill("#password", "Owner@123");
    await op.getByRole("button", { name: "Sign in" }).click();
    await op.waitForURL(new RegExp(`/${SLUG}/admin$`));
    await op.goto(`/${SLUG}/admin/orders?status=PLACED`, { waitUntil: "domcontentloaded" });
    const open = op.getByRole("link", { name: "Open" }).first();
    await expect(open).toBeVisible({ timeout: 20_000 });
    await open.click();
    await op.getByRole("button", { name: /^Confirm order/i }).click();
    await expect(op.getByText("Confirmed").first()).toBeVisible({ timeout: 20_000 });
    await ownerCtx.close();
  });
});
