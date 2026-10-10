import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

/**
 * Next.js 16 proxy (Node runtime).
 * 1. Host-based tenancy: custom domains (maaanjani.in or maaanjani.in.localhost)
 *    resolve to a shop via Shop.customDomain and rewrite to /{slug}/...
 *    /super stays on the app-owner domain only.
 * 2. Optimistic auth guards (real validation happens in server code).
 */

const SESSION_COOKIE = "jp_session";

let prisma: PrismaClient | null = null;
function db(): PrismaClient {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

/** In-memory host→slug cache (invalidated by TTL; fine for dev/small fleets). */
const hostCache = new Map<string, { slug: string; at: number }>();
const HOST_TTL_MS = 30_000;

function normalizeHost(host: string): string {
  let h = host.toLowerCase();
  // strip port
  const colon = h.lastIndexOf(":");
  if (colon > -1 && /^\d+$/.test(h.slice(colon + 1))) h = h.slice(0, colon);
  // local dev: maaanjani.in.localhost → maaanjani.in
  if (h.endsWith(".localhost")) h = h.slice(0, -".localhost".length);
  return h;
}

async function hostToSlug(host: string): Promise<string | null> {
  if (!host) return null;
  const cached = hostCache.get(host);
  if (cached && Date.now() - cached.at < HOST_TTL_MS) return cached.slug;

  // env override (quick map, wins over DB)
  try {
    const map = JSON.parse(process.env.TENANT_HOST_MAP ?? "{}") as Record<string, string>;
    if (map[host]) {
      hostCache.set(host, { slug: map[host], at: Date.now() });
      return map[host];
    }
  } catch {
    /* ignore */
  }

  try {
    const shop = await db().shop.findFirst({
      where: { customDomain: host, status: { not: "BLOCKED" } },
      select: { slug: true },
    });
    hostCache.set(host, { slug: shop?.slug ?? "", at: Date.now() });
    return shop?.slug ?? null;
  } catch {
    return null;
  }
}

const isStatic = (p: string) => /\.[a-z0-9]+$/i.test(p);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawHost = request.headers.get("host") ?? "";
  const host = normalizeHost(rawHost);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || isStatic(pathname)) {
    return NextResponse.next();
  }

  // ---- host based tenant rewrite (clean URLs on custom domains)
  const slug = await hostToSlug(host);
  if (slug) {
    // platform console is app-owner-domain only — send to the shop home
    if (pathname === "/super" || pathname.startsWith("/super/")) {
      return NextResponse.redirect(new URL(`/${slug}`, request.url));
    }
    const alreadyScoped = pathname === `/${slug}` || pathname.startsWith(`/${slug}/`);
    if (!alreadyScoped) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? `/${slug}` : `/${slug}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // ---- super admin guard (app-owner domain only)
  if (pathname === "/super" || pathname.startsWith("/super/")) {
    const isLogin = pathname.startsWith("/super/login");
    if (!isLogin && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/super/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---- shop admin guard: /{slug}/admin/...
  const parts = pathname.split("/").filter(Boolean); // [slug, 'admin', ...rest]
  if (parts.length >= 2 && parts[1] === "admin") {
    const rest = parts.slice(2).join("/");
    const isLogin = rest === "login";
    if (!isLogin && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = `/${parts[0]}/admin/login`;
      url.search = nextSearch(pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---- customer account guard
  if (pathname.startsWith("/account/")) {
    const rest = pathname.slice("/account/".length);
    const publicPages = ["login", "register", "forgot"];
    const isPublic = publicPages.some((p) => rest === p || rest.startsWith(`${p}/`));
    if (!isPublic && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/login";
      url.search = nextSearch(pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

function nextSearch(pathname: string): string {
  return `?next=${encodeURIComponent(pathname)}`;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
