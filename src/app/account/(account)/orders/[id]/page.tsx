import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function OrderRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/account/login");

  const order = await db.order.findUnique({ where: { id }, select: { id: true, userId: true, shop: { select: { slug: true } } } });
  if (!order || order.userId !== session.uid) redirect("/account/orders");

  redirect(`/${order.shop.slug}/order/${order.id}`);
}
