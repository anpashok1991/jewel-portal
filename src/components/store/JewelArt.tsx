"use client";

/** Elegant jewelry line-art slides shown in the hero when a slide has no image. */

export type ArtKind = "ring" | "chain" | "bangle" | "necklace";

export const ART_KINDS: ArtKind[] = ["ring", "chain", "bangle", "necklace"];

export default function JewelArt({ kind, accent = "#c9a227" }: { kind: ArtKind; accent?: string }) {
  const common = {
    fill: "none",
    stroke: accent,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${kind}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sheen-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="150" r="130" fill={`url(#glow-${kind})`} />
      <g className="jewel-art" style={{ transformOrigin: "160px 150px" }}>
        {kind === "ring" ? (
          <>
            {/* band */}
            <ellipse cx="160" cy="190" rx="72" ry="72" {...common} strokeWidth={7} stroke={`url(#sheen-${kind})`} />
            <ellipse cx="160" cy="190" rx="58" ry="58" {...common} strokeOpacity={0.45} />
            {/* diamond solitaire */}
            <path d="M160 78 L136 108 L160 128 L184 108 Z" {...common} strokeWidth={2.6} fill={`${accent}22`} />
            <path d="M136 108 L184 108" {...common} strokeOpacity={0.7} />
            <path d="M160 78 L160 128" {...common} strokeOpacity={0.7} />
            {/* prongs */}
            <path d="M148 100 Q160 88 172 100" {...common} strokeOpacity={0.8} />
            {/* sparkle */}
            <path d="M206 92 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill={accent} opacity="0.9" />
          </>
        ) : kind === "chain" ? (
          <>
            {/* chain links descending */}
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse key={i} cx={160 + Math.sin(i * 1.1) * 46} cy={78 + i * 44} rx={26} ry={34} {...common} strokeWidth={6} stroke={i % 2 ? accent : `url(#sheen-${kind})`} />
            ))}
            {/* pendant */}
            <path d="M160 268 c-18 0 -30 -14 -30 -30 0 -20 30 -42 30 -42 s30 22 30 42 c0 16 -12 30 -30 30 z" {...common} strokeWidth={2.8} fill={`${accent}22`} />
            <circle cx="160" cy="240" r="6" fill={accent} />
          </>
        ) : kind === "bangle" ? (
          <>
            {/* stacked bangles */}
            <ellipse cx="160" cy="170" rx="96" ry="60" {...common} strokeWidth={6} stroke={`url(#sheen-${kind})`} />
            <ellipse cx="160" cy="186" rx="84" ry="52" {...common} strokeWidth={5} strokeOpacity={0.75} />
            <ellipse cx="160" cy="200" rx="72" ry="44" {...common} strokeWidth={4} strokeOpacity={0.55} />
            {/* stone settings */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2;
              return <circle key={i} cx={160 + Math.cos(a) * 96} cy={170 + Math.sin(a) * 60} r="5" fill={accent} />;
            })}
          </>
        ) : (
          <>
            {/* necklace arc */}
            <path d="M70 110 Q160 250 250 110" {...common} strokeWidth={6} stroke={`url(#sheen-${kind})`} />
            <path d="M84 118 Q160 236 236 118" {...common} strokeWidth={3} strokeOpacity={0.5} />
            {/* beads */}
            {Array.from({ length: 11 }).map((_, i) => {
              const t = i / 10;
              const x = 70 + t * 180;
              const y = 110 + Math.sin(Math.PI * t) * 118;
              return <circle key={i} cx={x} cy={y} r={i === 5 ? 8 : 5} fill={i === 5 ? accent : `${accent}cc`} />;
            })}
            {/* pendant drop */}
            <path d="M160 232 v22" {...common} strokeWidth={3} />
            <path d="M160 254 l-14 18 14 22 14 -22 z" {...common} strokeWidth={2.4} fill={`${accent}33`} />
          </>
        )}
      </g>
      {/* floating sparkles */}
      <circle className="sparkle s1" cx="84" cy="86" r="2.5" fill={accent} />
      <circle className="sparkle s2" cx="242" cy="120" r="2" fill={accent} />
      <circle className="sparkle s3" cx="220" cy="64" r="1.6" fill="#fff" opacity="0.8" />
      <circle className="sparkle s1" cx="96" cy="228" r="1.8" fill={accent} />
      <style>{`
        .jewel-art { animation: floaty 7s ease-in-out infinite; }
        .sparkle { animation: twinkle 2.6s ease-in-out infinite; }
        .s2 { animation-delay: 0.9s; }
        .s3 { animation-delay: 1.6s; }
        @keyframes floaty {
          0%, 100% { transform: translateY(0) rotate(-1.5deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}
