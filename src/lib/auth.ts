import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";
import { bearerToken } from "./api";
import type { Role } from "./constants";

const COOKIE = "jp_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret");

export type Session = {
  uid: string;
  role: Role;
  shopId: string; // "" for super admin
  name: string;
  email: string;
  pool: "platform" | "shop";
};

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(s: Session): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function setSessionCookie(s: Session) {
  const token = await createSessionToken(s);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  // Works for web (cookie) and native clients e.g. Android (Authorization: Bearer <token>).
  const jar = await cookies();
  const headerAuth = (await headers()).get("authorization");
  const token = bearerToken(headerAuth) ?? jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export const currentSession = cache(getSession);

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireRole(...roles: Role[]): Promise<Session> {
  const s = await requireSession();
  if (!roles.includes(s.role)) throw new Error("FORBIDDEN");
  return s;
}

/** Super admin only. */
export async function requireSuperAdmin(): Promise<Session> {
  return requireRole("SUPER_ADMIN");
}

/**
 * Staff permission check against the module matrix.
 * Owners and super admins implicitly have full access.
 */
export async function can(
  session: Session | null,
  module: string,
  action: "view" | "create" | "edit" | "delete",
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "SUPER_ADMIN" || session.role === "OWNER") return true;
  if (session.role !== "STAFF") return false;
  const perm = await db.permission.findUnique({
    where: { userId_module: { userId: session.uid, module } },
  });
  if (!perm) return false;
  return action === "view"
    ? perm.canView
    : action === "create"
      ? perm.canCreate
      : action === "edit"
        ? perm.canEdit
        : perm.canDelete;
}

export async function assertCan(
  session: Session | null,
  module: string,
  action: "view" | "create" | "edit" | "delete",
): Promise<void> {
  if (!(await can(session, module, action))) throw new Error("FORBIDDEN");
}

/** Client IP / host helpers */
export async function requestHost(): Promise<string> {
  const h = await headers();
  return h.get("host") ?? "localhost:3000";
}
