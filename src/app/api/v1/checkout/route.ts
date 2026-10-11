import { getTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { placeOrderCore, type CheckoutAddress } from "@/lib/checkout";
import { jsonOk, jsonErr, readJsonBody, bodyStr, bodyBool } from "@/lib/api";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.pool !== "shop" || s.role === "SUPER_ADMIN") return jsonErr(401, "Not signed in.");

  const body = await readJsonBody(req);
  if (!body) return jsonErr(400, "Invalid JSON body.");

  const slug = bodyStr(body, "slug", 200);
  const tenant = await getTenant(slug);
  if (!tenant) return jsonErr(404, "Shop not found.");

  const fulfillment = bodyStr(body, "fulfillment", 10) === "PICKUP" ? "PICKUP" : "DELIVERY";
  const paymentMethod = bodyStr(body, "paymentMethod", 20) || "COD";

  const addressObj = body.address && typeof body.address === "object" && !Array.isArray(body.address)
    ? (body.address as Record<string, unknown>)
    : {};
  const str = (key: string, max = 200) => {
    const v = addressObj[key];
    return typeof v === "string" ? v.trim().slice(0, max) : "";
  };
  const address: CheckoutAddress = {
    name: str("name"),
    phone: str("phone", 20),
    line1: str("line1"),
    line2: str("line2"),
    city: str("city"),
    state: str("state"),
    pincode: str("pincode", 10),
    label: str("label", 40) || "Home",
  };

  const res = await placeOrderCore(s, tenant, {
    slug,
    fulfillment,
    paymentMethod,
    branchId: bodyStr(body, "branchId", 100),
    addressId: bodyStr(body, "addressId", 100),
    address,
    saveAddress: bodyBool(body, "saveAddress"),
    notes: bodyStr(body, "notes", 500),
  });

  if ("error" in res) return jsonErr(400, res.error);
  return jsonOk({
    ok: true,
    order: { id: res.orderId, number: res.orderNumber, totalPaise: res.totalPaise },
    ...(res.razorpay ? { razorpay: res.razorpay } : {}),
  });
}
