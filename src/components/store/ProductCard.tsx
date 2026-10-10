import Link from "next/link";
import { formatINR } from "@/lib/money";
import WishButton from "./WishButton";

type Props = {
  href: string;
  slug: string;
  productId: string;
  name: string;
  image?: string;
  pricePaise: number;
  compareAt?: number;
  purity?: string;
  weightMg?: number;
  wished?: boolean;
  badge?: string;
  index?: number;
};

export default function ProductCard(p: Props) {
  return (
    <div className="card group overflow-hidden reveal" style={{ transitionDelay: `${(p.index ?? 0) * 40}ms` }}>
      <Link href={p.href} className="block relative product-card-media aspect-square overflow-hidden" style={{ background: "color-mix(in srgb, var(--c-gold) 12%, var(--c-surface))" }}>
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-4xl opacity-40">✦</span>
        )}
        {p.badge ? <span className="badge absolute top-2 left-2">{p.badge}</span> : null}
        <span
          className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 text-center text-xs py-2 font-semibold"
          style={{ background: "color-mix(in srgb, var(--c-primary) 92%, transparent)", color: "#fff" }}
        >
          View details →
        </span>
      </Link>
      <div className="p-3 sm:p-4 relative">
        <div className="absolute -top-5 right-3">
          <WishButton productId={p.productId} slug={p.slug} active={p.wished ?? false} />
        </div>
        <Link href={p.href} className="block">
          <h3 className="font-semibold text-sm sm:text-[0.95rem] leading-snug line-clamp-2 min-h-2.5">{p.name}</h3>
        </Link>
        <div className="mt-1 text-[11px] text-muted">
          {p.purity ? `${p.purity} · ` : ""}
          {p.weightMg ? `${(p.weightMg / 1000).toFixed(2)}g` : ""}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-[0.95rem]">{formatINR(p.pricePaise)}</span>
          {p.compareAt && p.compareAt > p.pricePaise ? (
            <span className="text-xs text-muted line-through">{formatINR(p.compareAt)}</span>
          ) : null}
        </div>
        <div className="text-[10px] text-muted mt-0.5">Incl. making · excl. GST</div>
      </div>
    </div>
  );
}
