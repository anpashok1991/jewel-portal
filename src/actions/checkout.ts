"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requireTenant } from "@/lib/tenant";
import { placeOrderCore, type RazorpayHandoff } from "@/lib/checkout";

export type CheckoutState = {
  error?: string;
  ok?: boolean;
  razorpay?: RazorpayHandoff;
};

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const s = await getSession();
  if (!s) redirect("/account/login");

  const slug = String(formData.get("slug") ?? "");
  const tenant = await requireTenant(slug);

  const res = await placeOrderCore(s, tenant, {
    slug,
    fulfillment: String(formData.get("fulfillment") ?? "DELIVERY") === "PICKUP" ? "PICKUP" : "DELIVERY",
    paymentMethod: String(formData.get("paymentMethod") ?? "COD"),
    branchId: String(formData.get("branchId") ?? ""),
    addressId: String(formData.get("addressId") ?? ""),
    notes: String(formData.get("notes") ?? "").slice(0, 500),
    saveAddress: formData.get("saveAddress") === "on",
    address: {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      line1: String(formData.get("line1") ?? "").trim(),
      line2: String(formData.get("line2") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      state: String(formData.get("state") ?? "").trim(),
      pincode: String(formData.get("pincode") ?? "").trim(),
      label: String(formData.get("label") ?? "Home"),
    },
  });

  if ("error" in res) return { error: res.error };
  if (res.razorpay) return { ok: true, razorpay: res.razorpay };
  redirect(`/${slug}/order/${res.orderId}`);
}
