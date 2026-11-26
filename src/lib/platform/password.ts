import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string) {
  if (!stored.startsWith("scrypt:")) return stored === plain;
  const [, salt, hash] = stored.split(":");
  const next = scryptSync(plain, salt, 64).toString("hex");
  if (hash.length !== next.length) return false;
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}
