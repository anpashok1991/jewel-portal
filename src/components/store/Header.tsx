"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavCat = { slug: string; name: string };
type Props = {
  slug: string;
  shopName: string;
  logo: string;
  announcement: string;
  cartCount: number;
  userName: string | null;
  userHref: string;
  material: NavCat[];
  audience: NavCat[];
  type: NavCat[];
};

export default function Header(props: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/${props.slug}/search?q=${encodeURIComponent(q.trim())}`);
  };

  const shopUrl = (params: string) => `/${props.slug}/shop${params}`;
  const isActive = (p: string) => pathname === p;

  return (
    <header className="site-header sticky top-0 z-40 transition-shadow">
      {props.announcement ? (
        <div className="text-center text-[11px] sm:text-xs py-1.5 px-3 font-medium opacity-90 overflow-hidden">
          <span className="inline-block whitespace-nowrap animate-marquee px-6">{props.announcement.repeat(3)}</span>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-3 sm:px-5">
        <div className="flex items-center gap-3 h-16">
          {/* mobile menu */}
          <button
            type="button"
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-2 min-w-11 min-h-11"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block w-5 h-0.5 bg-current mb-1.5" />
            <span className="block w-5 h-0.5 bg-current mb-1.5" />
            <span className="block w-3.5 h-0.5 bg-current" />
          </button>

          <Link href={`/${props.slug}`} className="flex items-center gap-2.5 shrink-0">
            {props.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.logo} alt={props.shopName} className="h-9 w-9 object-contain rounded" />
            ) : (
              <span className="h-9 w-9 grid place-items-center rounded font-bold text-sm" style={{ background: "var(--c-gold)", color: "#231a05" }}>
                {props.shopName.slice(0, 1)}
              </span>
            )}
            <span className="font-theme-display font-bold text-base sm:text-lg leading-tight tracking-tight">
              {props.shopName}
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-4 text-sm font-medium">
            <Link href={`/${props.slug}`} className={`px-3 py-2 rounded-lg hover:opacity-80 ${isActive(`/${props.slug}`) ? "underline underline-offset-4 decoration-2" : ""}`}>Home</Link>
            <Dropdown label="Shop by Type" items={props.type.map((c) => ({ label: c.name, href: shopUrl(`?type=${c.slug}`) }))} />
            <Dropdown label="Material" items={props.material.map((c) => ({ label: c.name, href: shopUrl(`?material=${c.slug}`) }))} />
            <Dropdown label="Shop for" items={props.audience.map((c) => ({ label: c.name, href: shopUrl(`?audience=${c.slug}`) }))} />
            <Link href={shopUrl("")} className={`px-3 py-2 rounded-lg hover:opacity-80 ${isActive(`/${props.slug}/shop`) ? "underline underline-offset-4 decoration-2" : ""}`}>All Jewellery</Link>
            <Link href={`/${props.slug}/rates`} className="px-3 py-2 rounded-lg hover:opacity-80">Rates</Link>
            <Link href={`/${props.slug}/schemes`} className="px-3 py-2 rounded-lg hover:opacity-80">Schemes</Link>
          </nav>

          {/* search */}
          <form onSubmit={go} className="hidden md:flex items-center ml-auto flex-1 max-w-xs">
            <input
              className="input !min-h-10 !py-1.5 text-sm rounded-full"
              placeholder="Search rings, chains…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
          </form>

          <div className="flex items-center gap-1 ml-auto md:ml-2">
            <Link href={props.userHref} className="hidden sm:flex flex-col items-center px-2 py-1.5 text-[11px] leading-tight hover:opacity-80 min-w-11" aria-label="Account">
              <span className="text-base leading-none">👤</span>
              <span className="truncate max-w-16">{props.userName ? props.userName.split(" ")[0] : "Login"}</span>
            </Link>
            <Link href={`/${props.slug}/wishlist`} className="hidden sm:flex flex-col items-center px-2 py-1.5 text-[11px] leading-tight hover:opacity-80 min-w-11" aria-label="Wishlist">
              <span className="text-base leading-none">♡</span>
              <span>Wishlist</span>
            </Link>
            <Link href={`/${props.slug}/cart`} className="relative flex flex-col items-center px-2 py-1.5 text-[11px] leading-tight hover:opacity-80 min-w-11" aria-label="Cart">
              <span className="text-base leading-none">🛒</span>
              <span>Cart</span>
              {props.cartCount > 0 ? (
                <span className="absolute -top-0.5 right-1 h-5 min-w-5 px-1 grid place-items-center rounded-full text-[10px] font-bold" style={{ background: "var(--c-danger)", color: "#fff" }}>
                  {props.cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        {/* mobile search */}
        <form onSubmit={go} className="md:hidden pb-3">
          <input
            className="input !min-h-10 !py-1.5 text-sm rounded-full"
            placeholder="Search jewellery…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search products"
          />
        </form>
      </div>

      {/* mobile drawer */}
      {open ? (
        <div className="lg:hidden border-t" style={{ borderColor: "color-mix(in srgb, currentColor 15%, transparent)", background: "var(--c-surface)", color: "var(--c-text)" }}>
          <div className="mx-auto max-w-7xl px-4 py-3 space-y-1 text-sm">
            <Link href={`/${props.slug}`} className="block py-2.5 font-semibold" onClick={() => setOpen(false)}>Home</Link>
            <MobileGroup title="Shop by Type" items={props.type.map((c) => ({ label: c.name, href: shopUrl(`?type=${c.slug}`) }))} onNav={() => setOpen(false)} />
            <MobileGroup title="Material" items={props.material.map((c) => ({ label: c.name, href: shopUrl(`?material=${c.slug}`) }))} onNav={() => setOpen(false)} />
            <MobileGroup title="Shop for" items={props.audience.map((c) => ({ label: c.name, href: shopUrl(`?audience=${c.slug}`) }))} onNav={() => setOpen(false)} />
            <Link href={shopUrl("")} className="block py-2.5 font-semibold" onClick={() => setOpen(false)}>All Jewellery</Link>
            <Link href={`/${props.slug}/rates`} className="block py-2.5" onClick={() => setOpen(false)}>Today&apos;s Rates</Link>
            <Link href={`/${props.slug}/schemes`} className="block py-2.5" onClick={() => setOpen(false)}>Savings Schemes</Link>
            <Link href={`/${props.slug}/appointment`} className="block py-2.5" onClick={() => setOpen(false)}>Book Appointment</Link>
            <Link href={`/${props.slug}/exchange`} className="block py-2.5" onClick={() => setOpen(false)}>Old Gold Exchange</Link>
            <Link href={`/${props.slug}/contact`} className="block py-2.5" onClick={() => setOpen(false)}>Contact</Link>
            <Link href={props.userHref} className="block py-2.5" onClick={() => setOpen(false)}>{props.userName ? `My Account (${props.userName.split(" ")[0]})` : "Login / Register"}</Link>
            <Link href={`/${props.slug}/wishlist`} className="block py-2.5" onClick={() => setOpen(false)}>Wishlist</Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Dropdown({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button type="button" className="px-3 py-2 rounded-lg hover:opacity-80 flex items-center gap-1">
        {label} <span className="text-[9px]">▼</span>
      </button>
      {show ? (
        <div className="absolute left-0 top-full w-56 card p-2 animate-pop z-50">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="block px-3 py-2 rounded-lg text-sm hover:bg-black/5">
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileGroup({ title, items, onNav }: { title: string; items: { label: string; href: string }[]; onNav: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "color-mix(in srgb, var(--c-muted) 25%, transparent)" }}>
      <button type="button" className="w-full flex justify-between items-center py-2.5 font-semibold" onClick={() => setOpen((v) => !v)}>
        {title} <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="pb-2 grid grid-cols-2 gap-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="px-3 py-2 rounded-lg text-sm" style={{ background: "color-mix(in srgb, var(--c-muted) 10%, transparent)" }} onClick={onNav}>
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
