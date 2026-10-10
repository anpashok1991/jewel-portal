"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; module?: string };

export function AdminNav({ items, orientation = "side" }: { items: NavItem[]; orientation?: "side" | "top" }) {
  const pathname = usePathname();

  if (orientation === "top") {
    return (
      <nav className="lg:hidden flex gap-1 overflow-x-auto px-3 pb-2 text-sm">
        {items.map((n) => {
          const active = n.href === pathname || (n.href !== `/${pathname.split("/")[1]}/admin` && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-full whitespace-nowrap"
              style={active ? { background: "#fff", color: "#0f1115", fontWeight: 600 } : { color: "rgba(255,255,255,.7)" }}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((n) => {
        const active = n.href === pathname || (pathname.startsWith(n.href) && n.href !== `/${pathname.split("/")[1]}/admin`);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="px-3 py-2 rounded-lg text-sm transition-colors"
            style={
              active
                ? { background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 600 }
                : { color: "rgba(255,255,255,.65)" }
            }
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
