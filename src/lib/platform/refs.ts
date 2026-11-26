import { randomInt } from "crypto";

// Server only (uses Node crypto). money.ts stays browser-safe.

/** Readable random code (no 0/O/1/I) from a cryptographically secure source. */
export function randomCode(length = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[randomInt(chars.length)]).join("");
}

/**
 * Public reference for an order, booking or enquiry, e.g. `O-7KQ4M2XP`.
 * References appear in links that let customers view and cancel, so they
 * must be unguessable — never sequential.
 */
export async function uniqueRef(prefix: string, exists: (ref: string) => Promise<boolean>) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const ref = `${prefix}-${randomCode(8)}`;
    if (!(await exists(ref))) return ref;
  }
  throw new Error(`Could not generate a unique ${prefix} reference.`);
}
