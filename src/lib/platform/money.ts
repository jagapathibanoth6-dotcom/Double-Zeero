import { randomInt } from "crypto";

export function penceFromPrice(price?: string) {
  if (!price) return 0;
  const n = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function formatMoney(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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

/** Every table sitting lasts 90 minutes, whatever the party size. */
export const TABLE_SITTING_MIN = 90;

/**
 * Minutes a table is held for a booking. Currently fixed at 90 for all sizes;
 * `LocationSettings.durationJson` is stored for future per-size rules but not used yet.
 */
export function durationForGuests() {
  return TABLE_SITTING_MIN;
}
