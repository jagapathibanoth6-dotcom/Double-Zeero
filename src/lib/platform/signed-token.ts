import { createHmac, timingSafeEqual } from "crypto";

/**
 * Small HMAC-signed tokens used for session cookies.
 *
 * Format: `<value>.<expiresAtUnixSeconds>.<signature>`
 * The value must not contain a dot (database ids are cuids, so that holds).
 */

const DEV_SECRET = "dev-only-insecure-session-secret-do-not-use-in-production";

function secret() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to at least 32 characters in production.");
  }
  return DEV_SECRET;
}

function mac(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signToken(value: string, maxAgeSeconds: number) {
  if (value.includes(".")) throw new Error("Signed token values cannot contain '.'");
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${value}.${expiresAt}`;
  return `${payload}.${mac(payload)}`;
}

export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [value, expiresAt, signature] = parts;
  const expected = mac(`${value}.${expiresAt}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(Number(expiresAt)) || Number(expiresAt) < Date.now() / 1000) return null;
  return value;
}
