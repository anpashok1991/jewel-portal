import { describe, expect, it } from "vitest";
import { buildUpiUrl, waMeUrl, youtubeId } from "@/lib/upi";

describe("buildUpiUrl", () => {
  it("builds a payable UPI intent with amount in rupees", () => {
    const url = buildUpiUrl({ vpa: "maaanjani@upi", name: "Maa Anjani", amountPaise: 15050, note: "Order MAA-1", transactionRef: "MAA-1" });
    expect(url.startsWith("upi://pay?")).toBe(true);
    const q = new URL(url.replace("upi://pay?", "https://x/?"));
    // URLSearchParams is already decoded by URL parsing
    expect(url).toContain("pa=maaanjani%40upi");
    expect(url).toContain("am=150.50");
    expect(url).toContain("cu=INR");
    expect(url).toContain("tr=MAA-1");
    expect(q.searchParams.get("pn")).toBe("Maa Anjani");
  });

  it("truncates notes to 50 chars and omits optional params", () => {
    const url = buildUpiUrl({ vpa: "a@b", name: "N", amountPaise: 100, note: "x".repeat(80) });
    const q = new URL(url.replace("upi://pay?", "https://x/?"));
    expect(q.searchParams.get("tn")).toHaveLength(50);
    expect(url).not.toContain("tr=");
  });
});

describe("waMeUrl", () => {
  it("prefixes country code 91 when missing", () => {
    expect(waMeUrl("9876543210", "hi there")).toBe("https://wa.me/919876543210?text=hi%20there");
  });
  it("keeps existing country code", () => {
    expect(waMeUrl("919876543210", "help")).toBe("https://wa.me/919876543210?text=help");
  });
  it("strips formatting characters", () => {
    expect(waMeUrl("+91 98765-43210", "ok")).toBe("https://wa.me/919876543210?text=ok");
  });
});

describe("youtubeId", () => {
  it("extracts ids from common URL shapes", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("returns empty string otherwise", () => {
    expect(youtubeId("")).toBe("");
    expect(youtubeId("https://example.com")).toBe("");
  });
});

