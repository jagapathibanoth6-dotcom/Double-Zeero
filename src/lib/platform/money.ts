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

/** Every table sitting lasts 90 minutes, whatever the party size. */
export const TABLE_SITTING_MIN = 90;

/**
 * Minutes a table is held for a booking. Currently fixed at 90 for all sizes;
 * `LocationSettings.durationJson` is stored for future per-size rules but not used yet.
 */
export function durationForGuests() {
  return TABLE_SITTING_MIN;
}
