const TYPE_ICONS: Record<string, string> = {
  ring: "💍", chain: "📿", earring: "✨", necklace: "📿", mangalsutra: "🕉️",
  bangle: "⭕", bracelet: "⌚", pendant: "🔶", nosepin: "✦", coin: "🪙",
};

export function defaultCategoryIcon(slug: string, axis: string): string {
  if (axis === "TYPE") return TYPE_ICONS[slug] ?? "✦";
  if (axis === "MATERIAL") return slug === "gold" ? "🥇" : slug === "silver" ? "🥈" : slug === "diamond" ? "💎" : "⬡";
  if (axis === "AUDIENCE") return slug === "female" ? "Women" : slug === "male" ? "Men" : slug === "kids" ? "Kids" : "Unisex";
  return "✦";
}
