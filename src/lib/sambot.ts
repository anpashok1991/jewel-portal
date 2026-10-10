import "server-only";
import { db } from "./db";
import { resolveRate } from "./pricing";
import { computeMaturity } from "./scheme";
import { waMeUrl } from "./upi";
import { formatINR } from "./money";

export type ChatReply = {
  text: string;
  chips?: { label: string; href?: string; say?: string }[];
  escalate?: boolean;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9₹/\s.-]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreOverlap(tokens: string[], text: string): number {
  const t = norm(text);
  let hits = 0;
  for (const tok of tokens) if (tok.length > 2 && t.includes(tok)) hits++;
  return hits;
}

/** Shop-scoped deterministic assistant. No external LLM required. */
export async function samBotReply(
  shop: { id: string; slug: string; name: string; whatsapp: string; whatsappEnabled: boolean },
  message: string,
): Promise<ChatReply> {
  const m = norm(message);
  const tokens = m.split(" ");

  // ---- rate intent
  if (/\b(gold|silver|platinum|rate|rates|price today|today rate|bhav)\b/.test(m) && !m.includes("order")) {
    const metals = m.includes("silver")
      ? [["SILVER", "925"]]
      : m.includes("platinum")
        ? [["PLATINUM", "999"]]
        : [["GOLD", "999"], ["GOLD", "916"], ["GOLD", "750"]];
    const lines: string[] = [];
    for (const [metal, purity] of metals) {
      const rate = await resolveRate(shop.id, metal, purity);
      if (rate > 0) lines.push(`${metal} ${purity}: ₹${(rate / 100).toFixed(2)}/g`);
    }
    if (lines.length) {
      return {
        text: `Today's rates at ${shop.name}:\n${lines.join("\n")}\n\nRates are updated daily by the shop and apply to live pricing across the store.`,
        chips: [
          { label: "Full rate card", href: `/${shop.slug}/rates` },
          { label: "Browse gold jewellery", href: `/${shop.slug}/shop?material=gold` },
        ],
      };
    }
    return { text: `Rates for ${shop.name} haven't been published yet. Please try again later or ask the shop directly.` };
  }

  // ---- order status
  const orderMatch = message.match(/\b([A-Za-z]{2,5}-\d{6,8}-\d{1,5})\b/) ?? message.match(/\border\s*#?\s*([A-Za-z0-9-]{5,})\b/i);
  if (orderMatch || /\b(track|order status|my order|where is my order|delivery status)\b/.test(m)) {
    if (orderMatch) {
      const order = await db.order.findFirst({
        where: { shopId: shop.id, number: orderMatch[1].toUpperCase() },
        include: { branch: { select: { name: true } }, items: { select: { name: true, qty: true } } },
      });
      if (!order) return { text: `I couldn't find order \`${orderMatch[1]}\` at ${shop.name}. Please check the order number (it looks like MAJ-20251008-0001).` };
      const eta = order.etaDate ? `\nExpected: ${order.etaDate}` : "";
      const courier = order.awb ? `\nCourier: ${order.courier} • AWB ${order.awb}` : "";
      return {
        text: `Order ${order.number}\nStatus: ${order.status.replace("_", " ")}\nItems: ${order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}${courier}${eta}`,
        chips: [
          { label: "Open tracking page", href: `/account/orders/${order.id}` },
          { label: "Need help?", say: "talk to staff" },
        ],
      };
    }
    return {
      text: `Share your order number (e.g. MAJ-20251008-0001) and I'll pull live status for you. You can also see all orders in your account.`,
      chips: [{ label: "My orders", href: "/account/orders" }],
    };
  }

  // ---- scheme / savings / deposit / ROI / gold scheme
  if (/\b(scheme|savings|deposit|roi|maturity|installment|emd|gold plan|daily deposit)\b/.test(m)) {
    const plans = await db.savingsPlan.findMany({ where: { shopId: shop.id, active: true }, take: 4 });
    if (!plans.length) return { text: `${shop.name} has no active savings plans right now. Check back soon!` };

    // calculator: amounts like 5000 / 5,000 / 50000 with frequency word
    const amountMatch = m.match(/(?:₹|rs\.?|inr)?\s*(\d{3,7})/);
    const freq = m.includes("daily") ? "DAILY" : m.includes("weekly") ? "WEEKLY" : m.includes("monthly") ? "MONTHLY" : null;
    if (amountMatch && freq) {
      const amt = Math.round(Number(amountMatch[1]) * 100);
      const plan = plans.find((p) => p.frequency === freq);
      if (plan) {
        const sample = Math.min(plan.tenureCount, freq === "DAILY" ? 30 : 12);
        const res = computeMaturity(
          { ...plan, customDays: plan.customDays, mode: plan.mode as "ROI" | "GOLD" } as never,
          Array.from({ length: sample }, () => ({
            dueDate: new Date(),
            paidAt: new Date(),
            amountPaise: amt,
            goldMgAtPay: 0,
            rateUsedPaise: 0,
            status: "PAID",
          })),
          new Date(Date.now() + (freq === "DAILY" ? sample : freq === "WEEKLY" ? sample * 7 : sample * 30) * 86400000),
        );
        const detail =
          plan.mode === "GOLD"
            ? `≈ ${(res.goldMg / 1000).toFixed(3)} g gold at maturity`
            : `maturity value ${formatINR(res.totalPaise)} (interest ${formatINR(res.interestPaise)})`;
        return {
          text: `For "${plan.name}" at ₹${amountMatch[1]}/${freq.toLowerCase()} (${sample} installments):\n${detail}.\n\nJoin from the schemes page — deposits can be paid from your wallet or online.`,
          chips: [{ label: "View all plans", href: `/${shop.slug}/schemes` }],
        };
      }
    }

    return {
      text: `Active savings plans at ${shop.name}:\n${plans.map((p) => `• ${p.name} — ₹${(p.amountPaise / 100).toLocaleString("en-IN")} ${p.frequency.toLowerCase()}, ${p.tenureCount} installments (${p.mode === "GOLD" ? "gold grams" : "ROI"}).`).join("\n")}\n\nAsk me e.g. "5000 monthly scheme maturity".`,
      chips: [{ label: "Schemes", href: `/${shop.slug}/schemes` }],
    };
  }

  // ---- product search
  if (/\b(show|find|search|ring|rings|chain|earring|necklace|mangalsutra|bangle|pendant|bracelet|gift|buy|jewellery|jewelry)\b/.test(m)) {
    const words = tokens.filter((t) => t.length > 2);
    const products = await db.product.findMany({
      where: {
        shopId: shop.id,
        status: "ACTIVE",
        OR: words.map((w) => ({
          OR: [
            { name: { contains: w } },
            { tags: { contains: w } },
            { description: { contains: w } },
            { typeCat: { name: { contains: w } } },
          ],
        })),
      },
      take: 5,
      select: { name: true, slug: true, purity: true, netWeightMg: true, fixedPricePaise: true, typeCat: { select: { name: true } } },
    });
    if (products.length) {
      const list = await Promise.all(
        products.map(async (p) => {
          if (p.fixedPricePaise > 0) return `• ${p.name} — ${formatINR(p.fixedPricePaise)}`;
          const rate = await resolveRate(shop.id, "GOLD", p.purity);
          const approx = rate > 0 ? Math.round(((p.netWeightMg / 1000) * rate) / 100) * 100 : 0;
          return `• ${p.name} (${p.purity}${p.netWeightMg ? `, ${(p.netWeightMg / 1000).toFixed(1)}g` : ""})${approx ? ` — from ${formatINR(approx)}` : ""}`;
        }),
      );
      return {
        text: `Here's what I found at ${shop.name}:\n${list.join("\n")}\n\nPrices shown are indicative at today's rate — open a product for the exact breakup.`,
        chips: [
          { label: "See all results", href: `/${shop.slug}/shop?q=${encodeURIComponent(words.join(" "))}` },
        ],
      };
    }
    return {
      text: `I couldn't find that at ${shop.name} right now. Try "ring", "chain", "mangalsutra" — or browse categories.`,
      chips: [{ label: "Browse all", href: `/${shop.slug}/shop` }],
    };
  }

  // ---- appointment / visit
  if (/\b(appointment|visit|showroom|store|branch|address|directions|timing|open|location)\b/.test(m)) {
    const branches = await db.branch.findMany({ where: { shopId: shop.id, active: true }, take: 4 });
    const list = branches.map((b) => `• ${b.name}${b.city ? `, ${b.city}` : ""} — ${b.hours}${b.phone ? ` • ${b.phone}` : ""}`).join("\n");
    return {
      text: `${shop.name} locations:\n${list || "Contact the store for branch details."}\n\nYou can book a free consultation online — pick a branch, date and slot.`,
      chips: [
        { label: "Book appointment", href: `/${shop.slug}/appointment` },
        { label: "Exchange old gold", href: `/${shop.slug}/exchange` },
      ],
    };
  }

  // ---- contact / human / whatsapp
  if (/\b(talk|human|staff|call|contact|whatsapp|support|help|query|complaint)\b/.test(m)) {
    if (shop.whatsappEnabled && shop.whatsapp) {
      return {
        text: `Sure — I'll connect you to the ${shop.name} team on WhatsApp. You can also call the store or drop a query from the contact page.`,
        escalate: true,
        chips: [
          { label: "Chat on WhatsApp", href: waMeUrl(shop.whatsapp, `Hi ${shop.name}, I need help (via Sam Bot).`) },
          { label: "Leave a query", href: `/${shop.slug}/contact` },
        ],
      };
    }
    return { text: `Please reach ${shop.name} from the contact page — the team will get back to you shortly.`, chips: [{ label: "Contact", href: `/${shop.slug}/contact` }] };
  }

  // ---- payment / gst / invoice / return policy intents
  if (/\b(pay|payment|upi|razorpay|cod|cash on delivery|invoice|gst|return|refund|exchange policy|shipping|delivery charge)\b/.test(m)) {
    const bits: string[] = [];
    if (/\b(upi)\b/.test(m)) bits.push("Pay instantly by UPI QR (scan & pay) or cards/netbanking via Razorpay.");
    if (/\b(cod|cash)\b/.test(m)) bits.push("Cash on Delivery is available on eligible orders (a small fee may apply).");
    if (/\b(invoice|gst)\b/.test(m)) bits.push("Every order gets a GST invoice with your GSTIN and HSN breakup; some artisan items are exempt (nil-rated).");
    if (/\b(return|refund)\b/.test(m)) bits.push("Cancel anytime before packing for a full refund. Returns/exchanges accepted within 7 days of delivery (hallmarked items with invoice).");
    if (/\b(shipping|delivery)\b/.test(m)) bits.push("Insured home delivery or free store pickup; delivery charges shown at checkout and waived above ₹5,000.");
    if (bits.length) return { text: `${shop.name} — ${bits.join("\n")}` };
  }

  // ---- greeting
  if (/^(hi|hello|hey|namaste|good morning|good evening|hola)\b/.test(m) || m.length < 4) {
    return {
      text: `Namaste! I'm Sam Bot, your assistant at ${shop.name}. I can share today's gold rates, find jewellery, check your order, explain savings schemes or connect you to the store.`,
      chips: [
        { label: "Today's rates", say: "gold rate today" },
        { label: "Savings schemes", say: "show schemes" },
        { label: "Talk to staff", say: "talk to staff" },
      ],
    };
  }

  // ---- owner FAQ fallback (keyword scoring)
  const faqs = await db.botFaq.findMany({ where: { shopId: shop.id, active: true } });
  let best: { q: string; a: string; score: number } | null = null;
  for (const f of faqs) {
    const hay = `${f.question} ${f.keywords}`;
    const score = scoreOverlap(tokens, hay);
    if (score > 0 && (!best || score > best.score)) best = { q: f.question, a: f.answer, score };
  }
  if (best && best.score >= 1) {
    return { text: best.a, chips: [{ label: "Still need help?", say: "talk to staff" }] };
  }

  // ---- final fallback → WhatsApp handoff
  if (shop.whatsappEnabled && shop.whatsapp) {
    return {
      text: `I'm not sure about that one, but the ${shop.name} team can help instantly on WhatsApp. Or ask me about rates, products, orders, schemes, payments or store visits.`,
      escalate: true,
      chips: [{ label: "WhatsApp the store", href: waMeUrl(shop.whatsapp, `Hi, I have a question (via Sam Bot): ${message.slice(0, 120)}`) }],
    };
  }
  return {
    text: `Try asking me about today's rates, products, your order status, savings schemes or store information.`,
    chips: [{ label: "Browse catalogue", href: `/${shop.slug}/shop` }],
  };
}
