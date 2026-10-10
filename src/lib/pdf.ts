import PDFDocument from "pdfkit";

export type InvoiceItem = {
  name: string;
  hsn: string;
  qty: number;
  netWeightG: number;
  ratePerGram: number;
  metalPaise: number;
  makingPaise: number;
  stonePaise: number;
  discountPaise: number;
  gstPercentBp: number;
  gstExempt: boolean;
  gstPaise: number;
  totalPaise: number;
};

export type InvoiceData = {
  number: string;
  date: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  shop: { name: string; address: string; gstin: string; state: string; phone: string; email: string };
  buyer: { name: string; phone: string; address: string };
  placeOfSupply: string;
  items: InvoiceItem[];
  totals: {
    subTotalPaise: number;
    discountPaise: number;
    couponPaise: number;
    loyaltyPaise: number;
    platformFeePaise: number;
    gstPaise: number;
    shippingPaise: number;
    codFeePaise: number;
    roundOffPaise: number;
    totalPaise: number;
  };
  exemptNote?: string;
};

const rup = (p: number) => `Rs. ${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function build(data: InvoiceData, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 72;

    // Header
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a1a").text(data.shop.name, { continued: false });
    doc.fontSize(9).font("Helvetica");
    if (data.shop.address) doc.text(data.shop.address);
    doc.text([data.shop.phone, data.shop.email].filter(Boolean).join("  |  "));
    if (data.shop.gstin) doc.text(`GSTIN: ${data.shop.gstin}`);
    doc.moveDown(0.4);
    doc.moveTo(36, doc.y).lineTo(36 + W, doc.y).strokeColor("#c9a227").stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").fillColor("#7a1f2b").text(title, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").fillColor("#333");
    doc.text(`${title === "TAX INVOICE" ? "Invoice" : "Estimate"} No: ${data.number}`);
    doc.text(`Date: ${data.date}`);
    doc.text(`Order Ref: ${data.orderNumber}`);
    doc.text(`Payment: ${data.paymentMethod} (${data.paymentStatus})`);
    doc.moveDown(0.5);

    // Buyer
    doc.font("Helvetica-Bold").text("Billed To");
    doc.font("Helvetica");
    doc.text(data.buyer.name);
    if (data.buyer.phone) doc.text(data.buyer.phone);
    if (data.buyer.address) doc.text(data.buyer.address);
    doc.text(`Place of Supply: ${data.placeOfSupply}`);
    doc.moveDown(0.8);

    // Table header
    const cols = { name: 36, hsn: 250, qty: 300, wt: 335, rate: 385, taxable: 450, gst: 520, amt: 565 };
    const drawRow = (y: number, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor(bold ? "#1a1a1a" : "#333");
      return y;
    };
    let y = doc.y;
    doc.rect(36, y - 2, W, 16).fill("#f5efe3");
    drawRow(y, true);
    doc.fillColor("#1a1a1a");
    doc.text("Item", cols.name + 2, y + 3, { width: 210 });
    doc.text("HSN", cols.hsn, y + 3, { width: 48 });
    doc.text("Qty", cols.qty, y + 3, { width: 32 });
    doc.text("Wt(g)", cols.wt, y + 3, { width: 48 });
    doc.text("Rate/g", cols.rate, y + 3, { width: 62 });
    doc.text("Taxable", cols.taxable, y + 3, { width: 66 });
    doc.text("GST", cols.gst, y + 3, { width: 42 });
    doc.text("Amount", cols.amt, y + 3, { width: 60, align: "right" });
    y += 18;

    for (const it of data.items) {
      const lineHeight = 22;
      if (y > doc.page.height - 160) {
        doc.addPage();
        y = 50;
      }
      doc.font("Helvetica").fontSize(8).fillColor("#333");
      doc.text(it.name, cols.name + 2, y, { width: 210, height: lineHeight, ellipsis: true });
      doc.text(it.hsn, cols.hsn, y, { width: 48 });
      doc.text(String(it.qty), cols.qty, y, { width: 32 });
      doc.text(it.netWeightG.toFixed(3), cols.wt, y, { width: 48 });
      doc.text(it.ratePerGram ? (it.ratePerGram / 100).toFixed(2) : "-", cols.rate, y, { width: 62 });
      doc.text(rup(it.totalPaise - it.gstPaise), cols.taxable, y, { width: 66 });
      doc.text(it.gstExempt ? "EXEMPT" : `${(it.gstPercentBp / 100).toFixed(1)}%`, cols.gst, y, { width: 42 });
      doc.text(rup(it.totalPaise), cols.amt, y, { width: 60, align: "right" });
      y += lineHeight;
      doc.moveTo(36, y - 4).lineTo(36 + W, y - 4).strokeColor("#e5ddd0").stroke();
    }

    // Totals
    y += 6;
    if (y > doc.page.height - 200) {
      doc.addPage();
      y = 50;
    }
    const t = data.totals;
    const totalRow = (label: string, value: string, emphasis = false) => {
      doc.font(emphasis ? "Helvetica-Bold" : "Helvetica").fontSize(emphasis ? 10 : 8.5);
      doc.fillColor(emphasis ? "#7a1f2b" : "#333");
      doc.text(label, 400, y, { width: 130 });
      doc.text(value, 530, y, { width: 65, align: "right" });
      y += emphasis ? 16 : 13;
    };
    doc.font("Helvetica").fontSize(8.5);
    totalRow("Subtotal", rup(t.subTotalPaise));
    if (t.discountPaise) totalRow("Discount", `- ${rup(t.discountPaise)}`);
    if (t.couponPaise) totalRow("Coupon", `- ${rup(t.couponPaise)}`);
    if (t.loyaltyPaise) totalRow("Loyalty", `- ${rup(t.loyaltyPaise)}`);
    if (t.platformFeePaise) totalRow("Platform Fee", rup(t.platformFeePaise));
    const exemptAll = data.items.every((i) => i.gstExempt);
    totalRow(exemptAll ? "GST (Exempt / Nil rated)" : "GST", exemptAll ? "EXEMPT" : rup(t.gstPaise));
    if (t.shippingPaise) totalRow("Shipping", rup(t.shippingPaise));
    if (t.codFeePaise) totalRow("COD Fee", rup(t.codFeePaise));
    if (t.roundOffPaise) totalRow("Round Off", rup(t.roundOffPaise));
    doc.moveTo(400, y - 2).lineTo(595, y - 2).strokeColor("#c9a227").stroke();
    y += 6;
    totalRow("Grand Total", rup(t.totalPaise), true);

    // GST summary + exempt note
    y += 8;
    doc.fontSize(8).fillColor("#555");
    const byRate = new Map<string, number>();
    for (const it of data.items) {
      if (it.gstExempt) continue;
      const k = `${(it.gstPercentBp / 100).toFixed(1)}%`;
      byRate.set(k, (byRate.get(k) ?? 0) + it.gstPaise);
    }
    if (byRate.size) {
      doc.text("GST summary: " + [...byRate.entries()].map(([k, v]) => `${k} → ${rup(v)}`).join(",  "));
    }
    if (data.items.some((i) => i.gstExempt)) {
      doc.fillColor("#7a1f2b").text(
        data.exemptNote ?? "One or more line items are taxed under composition/exemption — shown as EXEMPT (Nil rated).",
      );
    }
    doc.fillColor("#555");
    doc.moveDown(1);
    doc
      .fontSize(7.5)
      .text(
        "This is a computer-generated invoice. E. & O.E. Goods once sold are subject to our return/exchange policy. " +
          "Weights are net of stones unless specified.",
        { align: "left" },
      );

    doc.end();
  });
}

export function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return build(data, "TAX INVOICE");
}

export function renderEstimatePdf(data: InvoiceData): Promise<Buffer> {
  return build(data, "ESTIMATE / QUOTATION");
}

export function invoiceCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
