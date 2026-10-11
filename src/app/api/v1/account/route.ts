import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonErr, apiUser } from "@/lib/api";

export async function GET() {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Customer account required.");

  const [user, addresses] = await Promise.all([
    db.user.findUnique({ where: { id: s.uid } }),
    db.address.findMany({ where: { userId: s.uid }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);
  if (!user) return jsonErr(404, "Account not found.");

  return jsonOk({
    user: apiUser(user),
    addresses: addresses.map((a) => ({
      id: a.id,
      label: a.label,
      name: a.name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.isDefault,
    })),
  });
}
