import "server-only";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function saveUpload(file: File, dir: string, shopSlug: string): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new Error("INVALID_FILE_TYPE");
  if (file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const rel = path.posix.join("uploads", shopSlug, dir, name);
  const abs = path.join(process.cwd(), "public", rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(abs, buf);
  return `/${rel}`;
}

export async function deleteUpload(rel: string): Promise<void> {
  if (!rel.startsWith("/uploads/")) return;
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  await fs.rm(abs, { force: true });
}
