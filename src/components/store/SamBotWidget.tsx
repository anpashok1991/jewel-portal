"use client";

import { useEffect, useRef, useState } from "react";

type Chip = { label: string; href?: string; say?: string };
type Msg = { role: "user" | "bot"; text: string; chips?: Chip[]; escalate?: boolean };

type Props = { slug: string; shopName: string; enabled: boolean; welcome?: string };

export default function SamBotWidget({ slug, shopName, enabled, welcome }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => [
    {
      role: "bot",
      text:
        welcome ??
        `Namaste! I'm Sam Bot at ${shopName}. Ask me about today's rates, products, orders, schemes or store visits.`,
      chips: [
        { label: "Gold rate today", say: "gold rate today" },
        { label: "Show schemes", say: "show schemes" },
        { label: "Talk to staff", say: "talk to staff" },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  if (!enabled) return null;

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: value }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: value }),
      });
      const data = (await res.json()) as { text: string; chips?: Chip[]; escalate?: boolean };
      setMsgs((m) => [...m, { role: "bot", text: data.text, chips: data.chips, escalate: data.escalate }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open Sam Bot chat"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 left-4 z-40 h-14 w-14 rounded-full grid place-items-center shadow-lg transition-transform hover:scale-105 active:scale-95 print:hidden"
        style={{ background: "linear-gradient(135deg, var(--c-primary), var(--c-gold))", color: "#fff" }}
      >
        {open ? <span className="text-xl">✕</span> : <span className="text-xl">💬</span>}
      </button>

      {open ? (
        <div
          className="fixed bottom-20 left-4 z-40 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] card flex flex-col overflow-hidden animate-pop print:hidden"
          role="dialog"
          aria-label="Sam Bot"
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--c-primary)", color: "#fff" }}>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 grid place-items-center rounded-full text-sm font-bold" style={{ background: "var(--c-gold)", color: "#241b08" }}>S</span>
              <div className="leading-tight">
                <div className="font-semibold text-sm">Sam Bot</div>
                <div className="text-[10px] opacity-80">{shopName} · online</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="p-2 min-h-10">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm" style={{ background: "color-mix(in srgb, var(--c-bg) 92%, var(--c-muted))" }}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 whitespace-pre-line leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "var(--c-primary)", color: "#fff", borderBottomRightRadius: "4px" }
                      : { background: "var(--c-surface)", color: "var(--c-text)", border: "1px solid color-mix(in srgb, var(--c-muted) 30%, transparent)", borderBottomLeftRadius: "4px" }
                  }
                >
                  {m.text}
                  {m.chips?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.chips.map((c, j) =>
                        c.href ? (
                          <a key={j} href={c.href} className="chip !min-h-8 !text-xs !py-1 !px-3">{c.label}</a>
                        ) : (
                          <button key={j} type="button" className="chip !min-h-8 !text-xs !py-1 !px-3" onClick={() => send(c.say ?? c.label)}>{c.label}</button>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="text-xs text-muted animate-pulse">Sam Bot is typing…</div>
            ) : null}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 p-3 border-t"
            style={{ background: "var(--c-surface)", borderColor: "color-mix(in srgb, var(--c-muted) 30%, transparent)" }}
          >
            <input
              className="input !min-h-10 text-sm"
              placeholder="Ask about rates, orders, schemes…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message Sam Bot"
            />
            <button type="submit" className="btn btn-primary !px-4 !min-h-10" disabled={busy}>
              ➤
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
