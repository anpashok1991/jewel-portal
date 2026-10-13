import { test, expect } from "@playwright/test";

const SLUG = "maa-anjani-jewelers";

/**
 * Android-readiness smoke: the JSON API v1 is what the mobile app calls.
 * Auth uses Authorization: Bearer <token> (no cookies).
 */
test.describe("api v1 (mobile client contract)", () => {
  test("login → me → shop → products → cart → checkout → orders", async ({ request }) => {
    // unauthenticated cart access is rejected (fresh context — no session yet)
    const noAuth = await request.get(`/api/v1/cart?slug=${SLUG}`);
    expect(noAuth.status()).toBe(401);

    // ── auth ───────────────────────────────────────────
    const badLogin = await request.post("/api/v1/auth/login", { data: { email: "customer@demo.in", password: "wrong" } });
    expect(badLogin.status()).toBe(401);

    const login = await request.post("/api/v1/auth/login", {
      data: { email: "customer@demo.in", password: "Demo@123" },
    });
    expect(login.status()).toBe(200);
    const { token, user } = await login.json();
    expect(token).toBeTruthy();
    expect(user.email).toBe("customer@demo.in");
    expect(user).not.toHaveProperty("passwordHash");

    const auth = { Authorization: `Bearer ${token}` };

    const me = await request.get("/api/v1/auth/me", { headers: auth });
    expect(me.status()).toBe(200);
    expect((await me.json()).user.email).toBe("customer@demo.in");

    // ── public shop data ───────────────────────────────
    const shops = await request.get("/api/v1/shops");
    expect(shops.status()).toBe(200);
    const shopList = (await shops.json()).shops as { slug: string }[];
    expect(shopList.some((s) => s.slug === SLUG)).toBe(true);

    const profile = await request.get(`/api/v1/shops/${SLUG}`);
    expect(profile.status()).toBe(200);
    const profileBody = await profile.json();
    expect(profileBody.name).toBeTruthy();
    expect(profileBody).not.toHaveProperty("razorpaySecret");
    expect(profileBody.whatsapp.orderShare).toBe(true);
    expect(typeof profileBody.whatsapp.number).toBe("string");

    const home = await request.get(`/api/v1/shops/${SLUG}/home`);
    expect(home.status()).toBe(200);
    const homeBody = await home.json();
    expect(homeBody.slides.length).toBeGreaterThan(0);
    expect(Array.isArray(homeBody.categories)).toBe(true);

    const products = await request.get(`/api/v1/shops/${SLUG}/products?perPage=5`);
    expect(products.status()).toBe(200);
    const { items } = await products.json();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).not.toHaveProperty("costPaise");
    const product = items[0] as { id: string; slug: string };

    const detail = await request.get(`/api/v1/shops/${SLUG}/products/${product.slug}`);
    expect(detail.status()).toBe(200);
    expect((await detail.json()).product.id).toBe(product.id);

    const branches = await request.get(`/api/v1/shops/${SLUG}/branches`);
    expect(branches.status()).toBe(200);
    expect((await branches.json()).branches.length).toBeGreaterThan(0);

    const rates = await request.get(`/api/v1/shops/${SLUG}/rates`);
    expect(rates.status()).toBe(200);

    // ── cart ───────────────────────────────────────────
    const add = await request.post("/api/v1/cart", {
      headers: auth,
      data: { slug: SLUG, productId: product.id, qty: 1 },
    });
    expect(add.status()).toBe(200);
    const added = await add.json();
    expect(added.cart.itemCount).toBeGreaterThanOrEqual(1);
    const line = added.cart.lines.find((l: { productId: string }) => l.productId === product.id);
    expect(line).toBeTruthy();

    const patch = await request.patch("/api/v1/cart", {
      headers: auth,
      data: { slug: SLUG, itemId: line.itemId, qty: 2 },
    });
    expect(patch.status()).toBe(200);
    expect((await patch.json()).cart.lines.find((l: { itemId: string }) => l.itemId === line.itemId).qty).toBe(2);

    // ── checkout (COD) ─────────────────────────────────
    const checkout = await request.post("/api/v1/checkout", {
      headers: auth,
      data: {
        slug: SLUG,
        fulfillment: "DELIVERY",
        paymentMethod: "COD",
        address: {
          name: "API Customer",
          phone: "9876543210",
          line1: "1 API Street",
          city: "Jaipur",
          state: "Rajasthan",
          pincode: "302001",
        },
      },
    });
    expect(checkout.status()).toBe(200);
    const order = await checkout.json();
    expect(order.ok).toBe(true);
    expect(order.order.id).toBeTruthy();
    expect(order.order.totalPaise).toBeGreaterThan(0);

    // cart is now empty
    const cartAfter = await request.get(`/api/v1/cart?slug=${SLUG}`, { headers: auth });
    expect((await cartAfter.json()).cart.itemCount).toBe(0);

    // ── orders ─────────────────────────────────────────
    const orders = await request.get(`/api/v1/orders?slug=${SLUG}`, { headers: auth });
    expect(orders.status()).toBe(200);
    const orderList = (await orders.json()).orders as { id: string }[];
    expect(orderList.some((o) => o.id === order.order.id)).toBe(true);

    const orderDetail = await request.get(`/api/v1/orders/${order.order.id}`, { headers: auth });
    expect(orderDetail.status()).toBe(200);
    const detailBody = await orderDetail.json();
    expect(detailBody.order.number).toBe(order.order.number);
    expect(detailBody.order.items.length).toBeGreaterThan(0);
  });

  test("CORS preflight is answered for API routes", async ({ request }) => {
    const res = await request.fetch("/api/v1/shops", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3100",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    expect(res.headers()["access-control-allow-headers"]).toContain("Authorization");
  });

  test("register creates a customer and returns a token", async ({ request }) => {
    const email = `api-e2e-${Date.now()}@example.in`;
    const res = await request.post("/api/v1/auth/register", {
      data: {
        name: "API E2E",
        email,
        phone: "9812345678",
        password: "secret123",
        shopSlug: SLUG,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(email);

    const me = await request.get("/api/v1/auth/me", { headers: { Authorization: `Bearer ${body.token}` } });
    expect((await me.json()).user.email).toBe(email);
  });
});
