import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { samBotReply } from "@/lib/sambot";

export async function POST(req: Request) {
  let body: { slug?: string; message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ text: "Invalid request." }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const message = String(body.message ?? "").slice(0, 500);
  if (!slug || !message) return NextResponse.json({ text: "Say something first!" }, { status: 400 });

  const shop = await db.shop.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, whatsappNumber: true, whatsappEnabled: true, status: true },
  });
  if (!shop || shop.status !== "ACTIVE") return NextResponse.json({ text: "Store unavailable." }, { status: 404 });

  const flag = await db.featureFlag.findUnique({
    where: { shopId_key: { shopId: shop.id, key: "sambot" } },
  });
  if (flag && !flag.enabled) return NextResponse.json({ text: "Chat is disabled for this store." }, { status: 403 });

  const reply = await samBotReply(
    { id: shop.id, slug: shop.slug, name: shop.name, whatsapp: shop.whatsappNumber, whatsappEnabled: shop.whatsappEnabled },
    message,
  );
  return NextResponse.json(reply);
}
