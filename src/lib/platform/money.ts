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

export function randomCode(length = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function nextRef(prefix: string, n: number) {
  return `${prefix}${String(n).padStart(5, "0")}`;
}

export const TABLE_SITTING_MIN = 90;

export type DurationRule = { max: number; minutes: number };

export function durationForGuests(_guests?: number, _json?: string) {
  return TABLE_SITTING_MIN;
}
