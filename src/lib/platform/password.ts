import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Password hashing for staff and customers.
 *
 * New hashes use scrypt with a random salt: `scrypt:<salt>:<hash>`.
 * Older customer accounts were stored as an unsalted SHA-256 hex digest;
 * those still verify, and `needsRehash` tells the caller to upgrade them.
 * Plain-text passwords are never accepted.
 */
export function hashPassword(plain: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function safeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function verifyPassword(plain: string, stored: string | null | undefined): { ok: boolean; needsRehash: boolean } {
  if (!stored || !plain) return { ok: false, needsRehash: false };

  if (stored.startsWith("scrypt:")) {
    const [, salt, hash] = stored.split(":");
    if (!salt || !hash) return { ok: false, needsRehash: false };
    const candidate = scryptSync(plain, salt, 64).toString("hex");
    return { ok: safeEqualHex(hash, candidate), needsRehash: false };
  }

  // Legacy: unsalted SHA-256 (64 hex characters).
  if (/^[0-9a-f]{64}$/.test(stored)) {
    const candidate = createHash("sha256").update(plain).digest("hex");
    const ok = safeEqualHex(stored, candidate);
    return { ok, needsRehash: ok };
  }

  return { ok: false, needsRehash: false };
}

/** Temporary password emailed to new customers, e.g. `DZ-7KQ4M2`. */
export function generateTempPassword() {
  return `DZ-${randomBytes(4).toString("hex").toUpperCase()}`;
}
