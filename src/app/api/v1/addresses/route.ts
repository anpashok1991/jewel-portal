import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonOk, jsonErr, readJsonBody, bodyStr, bodyBool } from "@/lib/api";

function apiAddress(a: {
  id: string; label: string; name: string; phone: string; line1: string; line2: string;
  city: string; state: string; pincode: string; isDefault: boolean;
}) {
  return { ...a };
}

export async function GET() {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const addresses = await db.address.findMany({
    where: { userId: s.uid },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return jsonOk({ addresses: addresses.map(apiAddress) });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const name = bodyStr(body, "name");
  const phone = bodyStr(body, "phone", 20);
  const line1 = bodyStr(body, "line1");
  const line2 = bodyStr(body, "line2");
  const city = bodyStr(body, "city");
  const state = bodyStr(body, "state");
  const pincode = bodyStr(body, "pincode", 10);
  const label = bodyStr(body, "label", 40) || "Home";

  if (!name || !line1 || !city || !state || !pincode) {
    return jsonErr(400, "Please fill the complete delivery address.");
  }
  if (phone.replace(/\D/g, "").length < 10) return jsonErr(400, "Enter a valid 10-digit phone number.");

  const address = await db.address.create({
    data: {
      userId: s.uid,
      label,
      name,
      phone,
      line1,
      line2,
      city,
      state,
      pincode,
      isDefault: bodyBool(body, "isDefault"),
    },
  });
  return jsonOk({ address: apiAddress(address) }, { status: 201 });
}
