import { db } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const shops = await db.shop.findMany({
    where: { status: "ACTIVE" },
    include: { theme: { select: { colorsJson: true } } },
    orderBy: { name: "asc" },
  });
  return jsonOk({
    shops: shops.map((s) => {
      let accent = "#c9a227";
      try {
        const colors: unknown = JSON.parse(s.theme.colorsJson ?? "{}");
        if (colors && typeof colors === "object" && typeof (colors as Record<string, unknown>).accent === "string") {
          accent = (colors as Record<string, string>).accent;
        }
      } catch {
        /* ignore */
      }
      return {
        slug: s.slug,
        name: s.name,
        tagline: s.tagline,
        logo: s.logo,
        customDomain: s.customDomain,
        accent,
      };
    }),
  });
}
