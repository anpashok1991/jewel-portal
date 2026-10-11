import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { jsonOk, jsonErr, readJsonBody, bodyStr, apiUser } from "@/lib/api";

export async function POST(req: Request) {
  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const email = bodyStr(body, "email", 200).toLowerCase();
  const password = bodyStr(body, "password", 200);
  if (!email || !password) return jsonErr(400, "Email and password are required.");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return jsonErr(401, "Invalid email or password.");
  }
  if (!user.active) return jsonErr(403, "This account has been deactivated.");
  if (user.role !== "CUSTOMER" && user.role !== "OWNER" && user.role !== "STAFF") {
    return jsonErr(403, "Invalid account type.");
  }

  const session = {
    uid: user.id,
    role: user.role as "CUSTOMER" | "OWNER" | "STAFF",
    shopId: user.shopId ?? "",
    name: user.name,
    email: user.email,
    pool: "shop" as const,
  };
  const token = await createSessionToken(session);
  // Also set the cookie so WebView-based flows share the web session.
  await setSessionCookie(session);

  return jsonOk({ token, user: apiUser(user) });
}
