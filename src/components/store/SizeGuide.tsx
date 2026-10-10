"use client";

import { useState } from "react";

export default function SizeGuide({ type }: { type: string }) {
  const [open, setOpen] = useState(false);
  const isRing = /ring/i.test(type);
  const rows = isRing
    ? [
        ["India", "8", "10", "12", "14", "16"],
        ["Circumference (mm)", "47.8", "49.7", "51.5", "53.4", "55.2"],
        ["US", "4¼", "5¼", "6", "7", "7¾"],
      ]
    : [
        ["Style", "Choker", "Princess", "Matinee", "Opera"],
        ["Length (in)", "14–16", "17–19", "20–24", "28–36"],
        ["Best for", "Pendants", "Everyday", "Layers", "Statement"],
      ];

  return (
    <>
      <button type="button" className="text-xs underline text-muted" onClick={() => setOpen(true)}>
        Size guide
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
          <div className="relative card p-5 w-full max-w-md animate-pop">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">{isRing ? "Ring Size Guide" : "Chain Length Guide"}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 min-h-10">✕</button>
            </div>
            <div className="table-responsive">
              <table className="text-sm w-full">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ background: i === 0 ? "color-mix(in srgb, var(--c-gold) 18%, transparent)" : undefined }}>
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 25%, transparent)", fontWeight: i === 0 ? 700 : 400 }}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              Tip: wrap a strip of paper around your finger, mark the overlap, and measure it in mm to find your circumference.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
