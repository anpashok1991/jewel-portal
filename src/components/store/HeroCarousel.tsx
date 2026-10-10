"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { youtubeId } from "@/lib/upi";
import JewelArt, { ART_KINDS, type ArtKind } from "@/components/store/JewelArt";

export type Slide = { title: string; subtitle: string; image: string; videoUrl: string; href: string };

export default function HeroCarousel({
  slides,
  accent,
}: {
  slides: Slide[];
  accent: string;
  /** kept for backward-compat callers; unused */
  sceneVariant?: string;
  primary?: string;
}) {
  const [idx, setIdx] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (textRef.current) {
        gsap.fromTo(
          textRef.current.children,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.09, ease: "power3.out" },
        );
      }
      if (heroRef.current) {
        gsap.to(heroRef.current.querySelector(".hero-media"), {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
        });
      }
    }, heroRef);
    return () => ctx.revert();
  }, [idx]);

  if (!slides.length) return null;
  const slide = slides[Math.min(idx, slides.length - 1)];
  const yt = youtubeId(slide.videoUrl);
  const art: ArtKind = ART_KINDS[idx % ART_KINDS.length];

  return (
    <section ref={heroRef} className="hero-shell relative overflow-hidden min-h-[70vh] sm:min-h-[80vh] flex items-center">
      {/* media layer: video or image when the owner set one; else soft gradient */}
      <div className="hero-media absolute inset-0">
        {yt ? (
          <iframe
            className="h-full w-full opacity-30"
            src={`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}`}
            title={slide.title}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : slide.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image} alt="" className="h-full w-full object-cover opacity-35 sm:opacity-40" />
        ) : null}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, var(--c-bg) 12%, transparent 70%)" }} />
      </div>

      {/* jewelry line-art (only when no owner image/video covers it) */}
      {!yt && !slide.image ? (
        <div className="absolute right-[-8%] sm:right-[2%] top-1/2 -translate-y-1/2 h-[62vmin] w-[62vmin] sm:h-[58vmin] sm:w-[58vmin] opacity-80 pointer-events-none">
          <JewelArt kind={art} accent={accent} />
        </div>
      ) : null}

      {/* copy */}
      <div ref={textRef} className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 w-full py-16">
        <div className="max-w-xl">
          <span className="badge">{new Date().getFullYear()} Collection</span>
          <h1 className="mt-4 section-title !text-3xl sm:!text-5xl lg:!text-6xl" style={{ color: "var(--c-primary)" }}>
            {slide.title}
          </h1>
          <p className="mt-3 text-sm sm:text-lg text-muted max-w-md">{slide.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={slide.href || "#"} className="btn btn-primary">Shop now</Link>
            <Link href="#collections" className="btn btn-ghost">Explore collections</Link>
          </div>
          <div className="mt-8 flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">✓ BIS Hallmark</span>
            <span className="flex items-center gap-1">✓ Insured delivery</span>
            <span className="flex items-center gap-1">✓ GST invoice</span>
          </div>
        </div>
      </div>

      {/* dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className="h-2.5 rounded-full transition-all"
            style={{ width: i === idx ? 26 : 10, background: i === idx ? "var(--c-gold)" : "color-mix(in srgb, var(--c-muted) 50%, transparent)" }}
          />
        ))}
      </div>
    </section>
  );
}
