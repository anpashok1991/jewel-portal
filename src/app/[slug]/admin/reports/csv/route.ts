import { requireTenant } from "@/lib/tenant";
import { getSession, can } from "@/lib/auth";
import { salesReportRows, gstReportRows, inventoryReportRows, rateCardRows } from "@/lib/reports";
import { invoiceCsv } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await requireTenant(slug);
  const session = await getSession();
  if (!session || session.pool !== "shop" || !(await can(session, "reports", "view"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "sales";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const parse = (v: string | null, fallback: Date): Date => {
    if (!v) return fallback;
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? fallback : d;
  };
  const from = parse(url.searchParams.get("from"), monthStart);
  const to = parse(url.searchParams.get("to"), now);

  let rows: Record<string, string | number>[];
  let filename: string;
  switch (kind) {
    case "gst":
      rows = await gstReportRows(tenant.id, from, to);
      filename = `gst-report-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`;
      break;
    case "inventory":
      rows = await inventoryReportRows(tenant.id);
      filename = "inventory-report.csv";
      break;
    case "rates":
      rows = await rateCardRows(tenant.id);
      filename = "rate-card.csv";
      break;
    default:
      rows = await salesReportRows(tenant.id, from, to);
      filename = `sales-report-${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`;
  }

  return new Response(invoiceCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
