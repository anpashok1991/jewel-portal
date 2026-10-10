"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { waMeUrl } from "@/lib/upi";

type Props = { number: string; greeting: string };

export default function WhatsAppFab({ number, greeting }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!number) return null;

  const msg = `${greeting}\n\nPage: ${pathname}`;
  const href = waMeUrl(number, msg);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 print:hidden">
      {open ? (
        <div className="card w-64 sm:w-72 p-4 animate-pop text-sm" style={{ color: "var(--c-text)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">{pathname}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 min-h-8">✕</button>
          </div>
          <p className="text-muted mb-3 text-xs leading-relaxed">{greeting}</p>
          <a href={href} target="_blank" rel="noreferrer" className="btn w-full" style={{ background: "#25D366", color: "#0b3d22" }}>
            Chat on WhatsApp
          </a>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Chat on WhatsApp"
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full grid place-items-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#25D366" }}
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7 fill-white" aria-hidden>
          <path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.6 6L4 29l8.2-1.5c1.2.6 2.5.9 3.8.9 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.2 0-2.4-.3-3.5-.8l-.6-.3-4.9.9 1-4.7-.4-.6c-.9-1.4-1.4-3-1.4-4.6C6.2 9.7 10.5 5.4 16 5.4S25.8 9.7 25.8 15 21.5 24.8 16 24.8zm5.5-7.2c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1s0-.5.2-.6c.2-.2.4-.5.6-.7.2-.2.2-.4.3-.6s0-.5 0-.7c-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.5 5.5 4.9.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.8-.7 2.1-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.2-.6-.4z" />
        </svg>
      </button>
    </div>
  );
}
