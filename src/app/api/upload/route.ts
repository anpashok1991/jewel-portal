import { NextResponse } from "next/server";
import { getSession, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.pool !== "shop" || (s.role !== "OWNER" && s.role !== "STAFF")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (!(await can(s, "media", "create"))) {
    return NextResponse.json({ error: "You cannot upload media." }, { status: 403 });
  }

  const shop = await db.shop.findUnique({ where: { id: s.shopId }, select: { slug: true } });
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image first." }, { status: 400 });
  }

  try {
    const url = await saveUpload(file, "products", shop.slug);
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
    const error = msg === "FILE_TOO_LARGE" ? "Image is larger than 8 MB." : "Only JPG, PNG, WebP, GIF or AVIF images are allowed.";
    return NextResponse.json({ error }, { status: 400 });
  }
}
