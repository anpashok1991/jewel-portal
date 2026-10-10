import "server-only";
import { db } from "./db";
import { roundHalfUp } from "./money";
import { resolveRate } from "./pricing";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const PAID_LIKE = ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "RETURNED"];

export type Kpis = {
  todayRevenuePaise: number;
  monthRevenuePaise: number;
  todayOrders: number;
  monthOrders: number;
  totalCustomers: number;
  newCustomersMonth: number;
  openQueries: number;
  pendingAppointments: number;
  inventoryValuePaise: number;
  lowStockCount: number;
  pnlPct: number;
  profitPaise: number;
  revenueExGstPaise: number;
};

export async function dashboardKpis(shopId: string): Promise<Kpis> {
  const today = startOfToday();
  const month = startOfMonth();

  const [todayAgg, monthAgg, todayOrders, monthOrders, totalCustomers, newCustomers, openQueries, pendingAppts] =
    await Promise.all([
      db.order.aggregate({
        where: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: today } },
        _sum: { totalPaise: true },
      }),
      db.order.aggregate({
        where: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: month } },
        _sum: { totalPaise: true },
      }),
      db.order.count({ where: { shopId, placedAt: { gte: today } } }),
      db.order.count({ where: { shopId, placedAt: { gte: month } } }),
      db.user.count({ where: { shopId, role: "CUSTOMER" } }),
      db.user.count({ where: { shopId, role: "CUSTOMER", createdAt: { gte: month } } }),
      db.query.count({ where: { shopId, status: { in: ["NEW", "IN_PROGRESS"] } } }),
      db.appointment.count({ where: { shopId, status: "PENDING" } }),
    ]);

  const inv = await inventoryStats(shopId);
  const pnl = await pnlSummary(shopId, month, new Date());

  return {
    todayRevenuePaise: todayAgg._sum.totalPaise ?? 0,
    monthRevenuePaise: monthAgg._sum.totalPaise ?? 0,
    todayOrders,
    monthOrders,
    totalCustomers,
    newCustomersMonth: newCustomers,
    openQueries: openQueries,
    pendingAppointments: pendingAppts,
    inventoryValuePaise: inv.costValuePaise,
    lowStockCount: inv.lowStockCount,
    pnlPct: pnl.percent,
    profitPaise: pnl.profitPaise,
    revenueExGstPaise: pnl.revenuePaise,
  };
}

export async function inventoryStats(shopId: string) {
  const rows = await db.inventory.findMany({
    where: { shopId },
    include: { product: { select: { name: true, costPaise: true, fixedPricePaise: true, purity: true } } },
  });
  let costValuePaise = 0;
  let retailValuePaise = 0;
  let lowStockCount = 0;
  for (const r of rows) {
    costValuePaise += r.qty * r.product.costPaise;
    if (r.qty <= r.lowStockAt) lowStockCount++;
    if (r.product.costPaise === 0) retailValuePaise += 0;
  }
  return { costValuePaise, retailValuePaise, lowStockCount, rows };
}

export type PnlSummary = { revenuePaise: number; cogsPaise: number; profitPaise: number; percent: number };

export async function pnlSummary(shopId: string, from: Date, to: Date): Promise<PnlSummary> {
  const items = await db.orderItem.findMany({
    where: { order: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: from, lte: to } } },
    select: { qty: true, lineTotalPaise: true, gstPaise: true, product: { select: { costPaise: true } } },
  });
  let revenue = 0;
  let cogs = 0;
  for (const it of items) {
    revenue += it.lineTotalPaise - it.gstPaise;
    cogs += it.qty * it.product.costPaise;
  }
  const profit = revenue - cogs;
  return { revenuePaise: revenue, cogsPaise: cogs, profitPaise: profit, percent: revenue > 0 ? roundHalfUp((profit / revenue) * 10000) / 100 : 0 };
}

export async function revenueSeries(shopId: string, days: number): Promise<{ date: string; revenue: number; orders: number }[]> {
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  const orders = await db.order.findMany({
    where: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: from } },
    select: { placedAt: true, totalPaise: true },
  });
  const map = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    map.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    const k = o.placedAt.toISOString().slice(0, 10);
    const bucket = map.get(k);
    if (bucket) {
      bucket.revenue += o.totalPaise;
      bucket.orders += 1;
    }
  }
  return [...map.entries()].map(([date, v]) => ({ date, revenue: Math.round(v.revenue / 100), orders: v.orders }));
}

export async function collectionSplit(shopId: string, from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: from, lte: to } },
    select: { paymentMethod: true, totalPaise: true },
  });
  const out: Record<string, number> = { RAZORPAY: 0, COD: 0, UPI: 0 };
  for (const o of orders) out[o.paymentMethod] = (out[o.paymentMethod] ?? 0) + o.totalPaise;
  return Object.entries(out).map(([method, paise]) => ({ method, paise }));
}

export async function salesReportRows(shopId: string, from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: { shopId, placedAt: { gte: from, lte: to } },
    include: { user: { select: { name: true, phone: true } }, branch: { select: { name: true } } },
    orderBy: { placedAt: "desc" },
  });
  return orders.map((o) => ({
    order: o.number,
    date: o.placedAt.toISOString().slice(0, 10),
    customer: o.user.name,
    phone: o.user.phone,
    branch: o.branch.name,
    status: o.status,
    payment: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    total: (o.totalPaise / 100).toFixed(2),
  }));
}

export async function gstReportRows(shopId: string, from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: { shopId, status: { in: PAID_LIKE }, placedAt: { gte: from, lte: to } },
    include: { items: true, invoice: true, user: { select: { name: true } } },
    orderBy: { placedAt: "asc" },
  });
  return orders.map((o) => {
    const taxable = o.items.reduce((s, i) => s + i.lineTotalPaise - i.gstPaise, 0);
    const gst = o.items.reduce((s, i) => s + i.gstPaise, 0);
    return {
      invoice: o.invoice?.number ?? o.number,
      date: o.placedAt.toISOString().slice(0, 10),
      customer: o.user.name,
      taxable: (taxable / 100).toFixed(2),
      cgst: (gst / 200).toFixed(2),
      sgst: (gst / 200).toFixed(2),
      totalGst: (gst / 100).toFixed(2),
      exemptLines: o.items.filter((i) => i.gstExempt).length,
    };
  });
}

export async function inventoryReportRows(shopId: string) {
  const inv = await db.inventory.findMany({
    where: { shopId },
    include: {
      product: { select: { name: true, sku: true, purity: true, netWeightMg: true, costPaise: true, status: true } },
      branch: { select: { name: true } },
    },
    orderBy: { product: { name: "asc" } },
  });
  return inv.map((r) => ({
    product: r.product.name,
    sku: r.product.sku,
    branch: r.branch.name,
    purity: r.product.purity,
    qty: r.qty,
    lowStockAt: r.lowStockAt,
    costValue: ((r.qty * r.product.costPaise) / 100).toFixed(2),
    status: r.qty <= r.lowStockAt ? "LOW" : "OK",
  }));
}

/** Current shop rate card row builder (uses latest rate per purity) */
export async function rateCardRows(shopId: string) {
  const rates = await db.metalRate.findMany({
    where: { shopId },
    orderBy: { effectiveAt: "desc" },
    take: 100,
  });
  const seen = new Set<string>();
  const rows: { metal: string; purity: string; rate: number; at: string }[] = [];
  for (const r of rates) {
    const key = `${r.metal}-${r.purity}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ metal: r.metal, purity: r.purity, rate: r.pricePerGramPaise / 100, at: r.effectiveAt.toISOString() });
  }
  return rows;
}

export { resolveRate };
