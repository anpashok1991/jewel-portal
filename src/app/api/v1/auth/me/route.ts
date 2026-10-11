import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { jsonOk, jsonErr, apiUser } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s) return jsonErr(401, "Not signed in.");

  if (s.pool === "platform") {
    return jsonOk({ user: { id: s.uid, name: s.name, email: s.email, role: s.role, shopId: "" } });
  }

  const user = await db.user.findUnique({ where: { id: s.uid } });
  if (!user) return jsonOk({ user: { id: s.uid, name: s.name, email: s.email, role: s.role, shopId: s.shopId } });
  return jsonOk({ user: apiUser(user) });
}
