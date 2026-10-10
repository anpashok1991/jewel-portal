import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildInvoiceData } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/pdf";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const isOwner = order.userId === s.uid;
  const isStaff =
    (s.role === "OWNER" || s.role === "STAFF") && s.shopId === order.shopId;
  if (!isOwner && !isStaff && s.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data = await buildInvoiceData(order.id);
  if (!data) return NextResponse.json({ error: "Invoice unavailable." }, { status: 404 });

  const pdf = await renderInvoicePdf(data);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
