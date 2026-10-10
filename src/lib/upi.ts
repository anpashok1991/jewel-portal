/** UPI deep-link + QR payload helpers (pure, unit-testable). */

export function buildUpiUrl(opts: {
  vpa: string;
  name: string;
  amountPaise: number;
  note?: string;
  transactionRef?: string;
}): string {
  const params = new URLSearchParams({
    pa: opts.vpa,
    pn: opts.name,
    am: (opts.amountPaise / 100).toFixed(2),
    cu: "INR",
  });
  if (opts.note) params.set("tn", opts.note.slice(0, 50));
  if (opts.transactionRef) params.set("tr", opts.transactionRef);
  return `upi://pay?${params.toString()}`;
}

export function waMeUrl(number: string, message: string): string {
  const digits = number.replace(/[^\d]/g, "");
  const withCountry = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function youtubeId(url: string): string {
  if (!url) return "";
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{6,})/,
    /(?:youtu\.be\/)([\w-]{6,})/,
    /(?:youtube\.com\/embed\/)([\w-]{6,})/,
    /(?:youtube\.com\/shorts\/)([\w-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return "";
}
