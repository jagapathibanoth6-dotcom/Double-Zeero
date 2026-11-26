import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";

let columnsReady = false;

export async function ensureSettingColumns() {
  if (columnsReady) return;
  const columns = (await db.$queryRawUnsafe(`PRAGMA table_info('LocationSettings')`)) as Array<{ name: string }>;
  const existing = new Set(columns.map((column) => column.name));
  const additions = [
    ["sittingCapacity", `ALTER TABLE LocationSettings ADD COLUMN sittingCapacity INTEGER NOT NULL DEFAULT 40`],
    ["collectionRemindMinutes", `ALTER TABLE LocationSettings ADD COLUMN collectionRemindMinutes INTEGER NOT NULL DEFAULT 15`],
    ["deliveryRemindMinutes", `ALTER TABLE LocationSettings ADD COLUMN deliveryRemindMinutes INTEGER NOT NULL DEFAULT 20`],
    ["uberApiKey", `ALTER TABLE LocationSettings ADD COLUMN uberApiKey TEXT NOT NULL DEFAULT ""`],
    ["uberCustomerId", `ALTER TABLE LocationSettings ADD COLUMN uberCustomerId TEXT NOT NULL DEFAULT ""`],
    ["stripeSecretKey", `ALTER TABLE LocationSettings ADD COLUMN stripeSecretKey TEXT NOT NULL DEFAULT ""`],
    ["stripePublishableKey", `ALTER TABLE LocationSettings ADD COLUMN stripePublishableKey TEXT NOT NULL DEFAULT ""`],
  ] as const;

  for (const [name, sql] of additions) {
    if (!existing.has(name)) await db.$executeRawUnsafe(sql);
  }
  columnsReady = true;
}

export function sittingCap(settings: { sittingCapacity?: number | null } | null | undefined) {
  return Math.max(1, Number(settings?.sittingCapacity || 40));
}

export function remindMinutes(value: number | null | undefined, fallback: number) {
  return Math.max(1, Number(value || fallback));
}

export async function getSettings(locationId: LocationId) {
  await ensureSettingColumns();
  const row = await db.locationSettings.findUnique({ where: { locationId } });
  if (!row) throw new Error(`Missing settings for ${locationId}`);
  const extra = ((await db.$queryRawUnsafe(
    `SELECT uberApiKey, uberCustomerId, stripeSecretKey, stripePublishableKey FROM LocationSettings WHERE locationId = ?`,
    locationId,
  )) as Array<{
    uberApiKey?: string;
    uberCustomerId?: string;
    stripeSecretKey?: string;
    stripePublishableKey?: string;
  }>)[0];
  const uberApiKey = String(extra?.uberApiKey ?? row.uberApiKey ?? "");
  const uberCustomerId = String(extra?.uberCustomerId ?? row.uberCustomerId ?? "");
  const stripeSecretKey = String(extra?.stripeSecretKey ?? row.stripeSecretKey ?? "");
  const stripePublishableKey = String(extra?.stripePublishableKey ?? row.stripePublishableKey ?? "");
  return {
    ...row,
    sittingCapacity: sittingCap(row),
    collectionRemindMinutes: remindMinutes(row.collectionRemindMinutes, 15),
    deliveryRemindMinutes: remindMinutes(row.deliveryRemindMinutes, 20),
    uberApiKey,
    uberCustomerId,
    uberKeyHint: uberApiKey.length > 3 ? `•••• ${uberApiKey.slice(-4)}` : "",
    uberReady: Boolean(uberApiKey && uberCustomerId),
    stripeSecretKey,
    stripePublishableKey,
    stripeKeyHint: stripeSecretKey.length > 3 ? `•••• ${stripeSecretKey.slice(-4)}` : "",
    stripeReady: Boolean(stripeSecretKey.startsWith("sk_")),
  };
}

export function bookingBand(guests: number, settings: { largeFrom: number; maxAutoBooking: number; enquiryFrom: number }) {
  if (guests >= settings.enquiryFrom) return "ENQUIRY" as const;
  if (guests >= settings.largeFrom) return "LARGE" as const;
  return "NORMAL" as const;
}
