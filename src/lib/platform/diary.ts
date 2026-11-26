import { locations, type LocationId } from "@/data/site";
import { fromMinutes, toMinutes } from "@/lib/booking";
import { hoursFromSettings } from "@/lib/platform/hours";
import { getSettings } from "@/lib/platform/settings";

export const DIARY_SLOT = 30;
export const BOOKING_SLOT = 15;

export function shiftISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isISODate(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function spanHours(parts: ({ open: string; close: string } | null | undefined)[]) {
  const opens = parts.filter(Boolean).map((row) => toMinutes(row!.open));
  const closes = parts.filter(Boolean).map((row) => toMinutes(row!.close));
  if (!opens.length) return null;
  return { open: fromMinutes(Math.min(...opens)), close: fromMinutes(Math.max(...closes)) };
}

export function diaryHours(locationId: LocationId, isoDate: string) {
  const loc = locations[locationId];
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  return spanHours([loc.weeklyHours[dow], loc.collectionHours?.[dow]]);
}

export async function diaryHoursLive(locationId: LocationId, isoDate: string) {
  const settings = await getSettings(locationId);
  const table = hoursFromSettings(locationId, settings, "table", isoDate);
  const collect = hoursFromSettings(locationId, settings, "collection", isoDate);
  return spanHours([table, collect, diaryHours(locationId, isoDate)]);
}

export function diarySlots(open: string, close: string, step = DIARY_SLOT) {
  const start = toMinutes(open);
  const end = toMinutes(close);
  const slots: string[] = [];
  for (let t = start; t < end; t += step) slots.push(fromMinutes(t));
  if (!slots.length && end > start) slots.push(fromMinutes(start));
  return slots;
}

export function endTime(start: string, durationMin: number) {
  return fromMinutes(toMinutes(start) + durationMin);
}
