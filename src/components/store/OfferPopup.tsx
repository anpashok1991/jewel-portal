"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { youtubeId } from "@/lib/upi";

export type PopupCfg = {
  id: string;
  title: string;
  body: string;
  image: string;
  videoUrl: string;
  trigger: string; // VISIT | LOGIN | EXIT
  chips: { label: string; href: string }[];
  ctaLabel: string;
  ctaHref: string;
  frequency: string; // ONCE | SESSION | DAILY
};

function canShow(p: PopupCfg): boolean {
  if (typeof window === "undefined") return false;
  const key = `popup-${p.id}`;
  const now = Date.now();
  if (p.frequency === "ONCE") return !localStorage.getItem(key);
  if (p.frequency === "DAILY") {
    const last = Number(localStorage.getItem(key) ?? 0);
    return now - last > 24 * 3600 * 1000;
  }
  return !sessionStorage.getItem(key);
}

function markShown(p: PopupCfg) {
  const key = `popup-${p.id}`;
  if (p.frequency === "ONCE" || p.frequency === "DAILY") localStorage.setItem(key, String(Date.now()));
  else sessionStorage.setItem(key, "1");
}

export default function OfferPopup({ popups, isLoggedIn }: { popups: PopupCfg[]; isLoggedIn: boolean }) {
  const [active, setActive] = useState<PopupCfg | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!popups.length) return;
    const visit = popups.find((p) => p.trigger === "VISIT" && canShow(p));
    const login = popups.find((p) => p.trigger === "LOGIN" && isLoggedIn && canShow(p));

    const t = window.setTimeout(() => {
      const target = login ?? visit;
      if (target) setActive(target);
    }, 1400);

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 4) {
        const exit = popups.find((p) => p.trigger === "EXIT" && canShow(p));
        if (exit) {
          setActive(exit);
          document.removeEventListener("mouseout", onLeave);
        }
      }
    };
    document.addEventListener("mouseout", onLeave);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [popups, isLoggedIn]);

  const close = () => {
    if (active) markShown(active);
    setActive(null);
  };

  if (!active) return null;
  const yt = youtubeId(active.videoUrl);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 print:hidden" role="dialog" aria-modal="true" aria-label={active.title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-2xl card overflow-hidden animate-pop">
        <button
          type="button"
          onClick={close}
          aria-label="Close offer"
          className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full grid place-items-center shadow"
          style={{ background: "var(--c-surface)", color: "var(--c-text)" }}
        >
          ✕
        </button>

        {yt ? (
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${yt}`}
              title={active.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : active.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.image} alt={active.title} className="w-full h-40 sm:h-52 object-cover" />
        ) : null}

        <div className="p-5 sm:p-8 text-center">
          <h2 className="section-title !text-2xl sm:!text-3xl" style={{ color: "var(--c-primary)" }}>{active.title}</h2>
          {active.body ? <p className="mt-2 text-sm sm:text-base text-muted max-w-lg mx-auto">{active.body}</p> : null}

          {active.chips.length ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {active.chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="chip"
                  onClick={() => {
                    markShown(active);
                    setActive(null);
                    router.push(c.href);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}

          {active.ctaLabel ? (
            <button
              type="button"
              className="btn btn-primary mt-5"
              onClick={() => {
                markShown(active);
                setActive(null);
                router.push(active.ctaHref || "/");
              }}
            >
              {active.ctaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
