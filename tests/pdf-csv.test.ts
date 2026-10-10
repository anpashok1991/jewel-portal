import { describe, expect, it } from "vitest";
import { invoiceCsv } from "@/lib/pdf";

describe("invoiceCsv", () => {
  it("returns empty string for no rows", () => {
    expect(invoiceCsv([])).toBe("");
  });

  it("writes header from first row keys and one line per row", () => {
    const csv = invoiceCsv([
      { order: "MAA-1", total: 100 },
      { order: "MAA-2", total: 250 },
    ]);
    expect(csv.split("\n")).toEqual(["order,total", "MAA-1,100", "MAA-2,250"]);
  });

  it("quotes commas, quotes and newlines", () => {
    const csv = invoiceCsv([{ name: 'Sharma, "Aarti"', note: "line1\nline2" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,note");
    expect(lines[1]).toBe('"Sharma, ""Aarti""","line1');
    expect(lines[2]).toBe('line2"');
  });
});
