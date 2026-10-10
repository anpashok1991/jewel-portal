import "server-only";
import { db } from "./db";
import type { OrderStatus } from "./constants";
export { canTransition, assertTransition, customerCanCancel, statusLabel } from "./order-state";
import { assertTransition } from "./order-state";

export async function applyStatus(
  orderId: string,
  to: OrderStatus,
  opts: { note?: string; actor?: string; extra?: Record<string, unknown> } = {},
): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found");
  assertTransition(order.status as OrderStatus, to);

  const now = new Date();
  await db.order.update({
    where: { id: orderId },
    data: {
      status: to,
      ...(opts.extra ?? {}),
      ...(to === "SHIPPED" ? { shippedAt: now } : {}),
      ...(to === "DELIVERED" ? { deliveredAt: now } : {}),
      ...(to === "CANCELLED" ? { cancelledAt: now } : {}),
    },
  });

  await db.orderEvent.create({
    data: { orderId, status: to, note: opts.note ?? "", actor: opts.actor ?? "system" },
  });

  await db.notification.create({
    data: {
      shopId: order.shopId,
      userId: order.userId,
      orderId,
      title: `Order ${order.number} — ${to.replace("_", " ").toLowerCase()}`,
      body: opts.note ?? "",
      link: `/account/orders/${order.id}`,
    },
  });
}

export async function restockOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  for (const item of order.items) {
    const inv =
      (await db.inventory.findFirst({
        where: { shopId: order.shopId, productId: item.productId, variantId: item.variantId, branchId: order.branchId },
      })) ??
      (await db.inventory.findFirst({
        where: { shopId: order.shopId, productId: item.productId, variantId: "", branchId: order.branchId },
      }));
    if (inv) {
      await db.inventory.update({ where: { id: inv.id }, data: { qty: { increment: item.qty } } });
    } else {
      await db.inventory.create({
        data: {
          shopId: order.shopId,
          productId: item.productId,
          variantId: item.variantId,
          branchId: order.branchId,
          qty: item.qty,
        },
      });
    }
  }
}

/** Reserve stock at branch; throws when insufficient. Variant rows fall back to the base (variantId "") row. */
export async function reserveStock(
  shopId: string,
  branchId: string,
  items: { productId: string; variantId: string; qty: number }[],
): Promise<void> {
  const targets: { qty: number; row: { id: string } }[] = [];
  for (const item of items) {
    const inv =
      (await db.inventory.findFirst({
        where: { shopId, productId: item.productId, variantId: item.variantId, branchId },
      })) ??
      (await db.inventory.findFirst({
        where: { shopId, productId: item.productId, variantId: "", branchId },
      }));
    if (!inv || inv.qty < item.qty) {
      throw new Error(`OUT_OF_STOCK:${item.productId}`);
    }
    targets.push({ qty: item.qty, row: inv });
  }
  for (const t of targets) {
    await db.inventory.update({ where: { id: t.row.id }, data: { qty: { decrement: t.qty } } });
  }
}

export async function nextOrderNumber(shopId: string): Promise<string> {
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const count = await db.order.count({
    where: { shopId, placedAt: { gte: new Date(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`) } },
  });
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { slug: true } });
  const prefix = (shop?.slug ?? "shop").slice(0, 3).toUpperCase();
  return `${prefix}-${ymd}-${String(count + 1).padStart(4, "0")}`;
}
