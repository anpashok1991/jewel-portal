import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { jsonErr, readJsonBody, bodyStr, apiUser } from "@/lib/api";

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const name = bodyStr(body, "name", 120);
  const email = bodyStr(body, "email", 200).toLowerCase();
  const phone = bodyStr(body, "phone", 20);
  const password = bodyStr(body, "password", 200);
  const shopSlug = bodyStr(body, "shopSlug", 200);

  if (!name || !email || password.length < 6) {
    return jsonErr(400, "Name, email and a 6+ character password are required.");
  }
  if (!shopSlug) return jsonErr(400, "shopSlug is required.");

  const shop = await db.shop.findUnique({ where: { slug: shopSlug }, select: { id: true, status: true } });
  if (!shop || shop.status === "BLOCKED") return jsonErr(404, "Shop not found.");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return jsonErr(409, "An account with this email already exists. Try logging in.");

  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: "CUSTOMER", shopId: shop.id },
  });
  await db.wallet.create({ data: { shopId: shop.id, userId: user.id } });

  const session = {
    uid: user.id, role: "CUSTOMER" as const, shopId: shop.id, name, email, pool: "shop" as const,
  };
  const token = await createSessionToken(session);
  await setSessionCookie(session);

  return NextResponse.json({ token, user: apiUser(user) }, { status: 201 });
}
