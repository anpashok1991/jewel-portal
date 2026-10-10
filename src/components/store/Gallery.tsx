"use client";

import { useState } from "react";
import { youtubeId } from "@/lib/upi";

type Props = { images: string[]; videoUrl: string; name: string; viewer: React.ReactNode };

export default function Gallery({ images, videoUrl, name, viewer }: Props) {
  const yt = youtubeId(videoUrl);
  const tabs = ["3d", ...images.map((_, i) => `img${i}`), ...(yt ? ["video"] : [])];
  const [active, setActive] = useState(tabs[0]);

  return (
    <div>
      <div className="card overflow-hidden relative">
        <div className="aspect-square sm:aspect-[4/3.4] relative" style={{ background: "color-mix(in srgb, var(--c-gold) 10%, var(--c-surface))" }}>
          {active === "3d" ? (
            <div className="h-full">{viewer}</div>
          ) : active === "video" && yt ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${yt}`}
              title={`${name} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[Number(active.replace("img", ""))]} alt={name} className="h-full w-full object-contain" />
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Thumb label="3D" active={active === "3d"} onClick={() => setActive("3d")} />
        {images.map((img, i) => (
          <Thumb key={img} label="" active={active === `img${i}`} onClick={() => setActive(`img${i}`)} src={img} />
        ))}
        {yt ? <Thumb label="▶ Video" active={active === "video"} onClick={() => setActive("video")} /> : null}
      </div>
    </div>
  );
}

function Thumb({ label, active, onClick, src }: { label: string; active: boolean; onClick: () => void; src?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label || "View image"}
      className="h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition"
      style={{ borderColor: active ? "var(--c-primary)" : "color-mix(in srgb, var(--c-muted) 35%, transparent)", background: "var(--c-surface)" }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-[10px] font-bold" style={{ color: "var(--c-primary)" }}>{label}</span>
      )}
    </button>
  );
}
