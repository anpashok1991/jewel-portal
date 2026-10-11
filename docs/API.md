# Jewel Portal — JSON API (v1)

The customer-facing shopping API used by the future **Android app (AAB/APK)** and any
other native/mobile client. The web storefront keeps using React Server Components +
server actions; both share the same domain logic (`src/lib/*`), so prices, stock,
coupons and checkout rules can never drift between web and mobile.

- Base path: `https://<host>/api/v1`
- Content type: `application/json; charset=utf-8`
- Money: integer **paise**. Weight: integer **milligrams**.
- Errors: `{ "error": "<message>" }` with an appropriate HTTP status (400/401/403/404/409).

## Authentication

Signed JWT (same token the web app stores in the `jp_session` cookie), sent as:

```
Authorization: Bearer <token>
```

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/login` | POST | — | `{ email, password }` → `{ token, user }` |
| `/api/v1/auth/register` | POST | — | `{ name, email, phone?, password, shopSlug }` → `201 { token, user }` |
| `/api/v1/auth/me` | GET | Bearer | Current user profile |

The token is valid for **7 days**. Login/register also set the `jp_session` cookie
(harmless for native clients; useful for WebViews). `getSession()` on the server accepts
either the cookie or the Bearer header, so existing routes such as
`GET /api/orders/[id]/invoice` work with a Bearer token too.

## Tenancy

Multi-tenant: the shop **slug** is part of the path (`/api/v1/shops/{slug}/...`).
List shops via `GET /api/v1/shops`, or use a shop's custom domain host in the base URL.

## Endpoints

### Shops & catalog (public)

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/shops` | GET | Active shops directory |
| `/api/v1/shops/{slug}` | GET | Shop profile: branding, theme, payment/shipping settings, features. **Never includes secrets** (e.g. Razorpay secret). |
| `/api/v1/shops/{slug}/home` | GET | Home payload: hero slides, sections, categories (with icon fallbacks), featured + latest products, reviews, savings plans |
| `/api/v1/shops/{slug}/products` | GET | Product search. Query: `q, type, material, audience, purity, min, max, sort (new\|price_asc\|price_desc\|popular), featured, page, perPage (≤60)` |
| `/api/v1/shops/{slug}/products/{handle}` | GET | Product detail: pricing breakdown inputs, variants, approved reviews, per-branch stock |
| `/api/v1/shops/{slug}/branches` | GET | Active branches |
| `/api/v1/shops/{slug}/rates` | GET | Latest metal rate per metal/purity (paise per gram) |

### Cart (Bearer required)

| Endpoint | Method | Body / query | Description |
|---|---|---|---|
| `/api/v1/cart` | GET | `?slug=` | Full cart + live totals (coupon/gift card/loyalty/shipping/GST) |
| `/api/v1/cart` | POST | `{ slug, productId, variantId?, qty?, branchId? }` | Add to cart (qty capped at 10) |
| `/api/v1/cart` | PATCH | `{ slug, itemId, qty }` | Update line qty (`qty ≤ 0` removes) |
| `/api/v1/cart` | DELETE | `?slug=&itemId=` | Remove line |
| `/api/v1/cart/options` | POST | `{ slug, couponCode?, giftCardCode?, useLoyalty?, branchId? }` | Apply coupon / gift card / loyalty / branch |

All cart mutations return the refreshed `{ cart: … }` summary.

### Checkout (Bearer required)

`POST /api/v1/checkout`

```json
{
  "slug": "maa-anjani-jewelers",
  "fulfillment": "DELIVERY",
  "paymentMethod": "COD",
  "branchId": "",
  "addressId": "",
  "address": {
    "name": "Meera Sharma", "phone": "9876543210",
    "line1": "12 Park Street", "line2": "", "city": "Jaipur",
    "state": "Rajasthan", "pincode": "302001", "label": "Home"
  },
  "saveAddress": false,
  "notes": ""
}
```

- `fulfillment`: `DELIVERY` | `PICKUP`. `paymentMethod`: `COD` | `RAZORPAY` | `UPI`
  (each gated by the shop's feature flags/settings).
- Provide either `addressId` (saved address) or a full inline `address` (plus `saveAddress: true` to store it).
- Success → `{ ok: true, order: { id, number, totalPaise } }`.
- With `paymentMethod: "RAZORPAY"` the response additionally includes a `razorpay`
  hand-off (`keyId`, `rzpOrderId`, `amountPaise`, …). Open the Razorpay checkout SDK with
  it, then call the existing **public** `POST /api/payments/verify` with
  `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` to mark it paid.

### Orders, account & addresses (Bearer required)

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/orders?slug=` | GET | Recent orders (50) with items; `slug` optional |
| `/api/v1/orders/{id}` | GET | Order detail incl. line items + status events (owner only) |
| `/api/v1/account` | GET | Profile + saved addresses |
| `/api/v1/addresses` | GET / POST | List / create (`{ label?, name, phone, line1, line2?, city, state, pincode, isDefault? }`) |
| `/api/v1/addresses/{id}` | DELETE | Delete own address |

### Existing non-v1 routes usable by mobile

| Route | Notes |
|---|---|
| `POST /api/chat` | Sam Bot; body `{ slug, message }` |
| `POST /api/payments/verify` | Razorpay signature verification |
| `GET /api/orders/{id}/invoice` | GST invoice PDF (accepts Bearer auth) |
| `POST /api/upload` | Multipart image upload (Bearer auth required) |

## CORS

`/api/*` answers `OPTIONS` preflights and sends
`Access-Control-Allow-Origin: *` with `Authorization` allowed (see `src/proxy.ts`).

## Android (Kotlin) example

```kotlin
val client = OkHttpClient()
val media = "application/json; charset=utf-8".toMediaType()

// login
val loginReq = Request.Builder()
    .url("https://portal.example.com/api/v1/auth/login")
    .post("""{"email":"customer@demo.in","password":"Demo@123"}""".toRequestBody(media))
    .build()
val token = JSONTokener(client.newCall(loginReq).execute().body!!.string())
    .nextValue() as JSONObject).getString("token")

// authenticated call
val productsReq = Request.Builder()
    .url("https://portal.example.com/api/v1/shops/maa-anjani-jewelers/products")
    .header("Authorization", "Bearer $token")
    .build()
```

Razorpay's Android SDK is used for `RAZORPAY` payments; `COD`/`UPI` need no SDK.

## Development

```bash
npm run dev          # API available at http://localhost:3000/api/v1
npm test             # unit tests for the API helpers (tests/api.test.ts)
npm run test:e2e     # Playwright contract smoke (e2e/api.spec.ts)
```
