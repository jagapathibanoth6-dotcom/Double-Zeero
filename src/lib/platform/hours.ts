import { locations, type DayHours, type LocationId, type VisitType } from "@/data/site";
import { formatBookingDate, generateSlots, londonParts, todayISO, toMinutes } from "@/lib/booking";

export type WeekHours = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DayHours | null>;

const days = [0, 1, 2, 3, 4, 5, 6] as const;

export function defaultWeekHours(locationId: LocationId, kind: "table" | "collection" = "table"): WeekHours {
  const loc = locations[locationId];
  if (kind === "collection" && "collectionHours" in loc && loc.collectionHours) return loc.collectionHours;
  return loc.weeklyHours;
}

export function parseWeekHours(json: string | null | undefined, fallback: WeekHours): WeekHours {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json) as Record<string, DayHours | null>;
    const next = { ...fallback };
    for (const day of days) {
      if (day in parsed) next[day] = parsed[String(day)] as DayHours | null;
    }
    return next;
  } catch {
    return fallback;
  }
}

export function hoursFromSettings(
  locationId: LocationId,
  settings: { hoursJson?: string; collectionHoursJson?: string } | null | undefined,
  visitType: VisitType,
  isoDate: string,
) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const table = parseWeekHours(settings?.hoursJson, defaultWeekHours(locationId, "table"));
  const collect = parseWeekHours(settings?.collectionHoursJson, defaultWeekHours(locationId, "collection"));
  return visitType === "collection" ? collect[dow] : table[dow];
}

export const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function kitchenHours(
  locationId: LocationId,
  settings: { hoursJson?: string; collectionHoursJson?: string } | null | undefined,
  isoDate: string,
) {
  return hoursFromSettings(locationId, settings, "collection", isoDate);
}

export function lastOrderMinutes(close: string, kind: "collect" | "delivery") {
  return toMinutes(close) - (kind === "delivery" ? 45 : 30);
}

export function kitchenAsap(
  locationId: LocationId,
  settings: { hoursJson?: string; collectionHoursJson?: string } | null | undefined,
  kind: "collect" | "delivery",
  isoDate = todayISO(),
) {
  const name = locations[locationId].shortName;
  const hours = kitchenHours(locationId, settings, isoDate);
  if (!hours) {
    return { ok: false as const, reason: `${name} is closed that day.`, hours: null, etaMinutes: 0 };
  }
  if (isoDate !== todayISO()) {
    return {
      ok: false as const,
      reason: `ASAP is only for today. ${name} is open ${hours.open}–${hours.close}.`,
      hours,
      etaMinutes: 0,
    };
  }
  const now = toMinutes(`${londonParts().hour}:${londonParts().minute}`);
  const open = toMinutes(hours.open);
  const last = lastOrderMinutes(hours.close, kind);
  if (now < open) {
    return { ok: false as const, reason: `${name} opens at ${hours.open}.`, hours, etaMinutes: 0 };
  }
  if (now > last) {
    return {
      ok: false as const,
      reason: `${name} last ${kind === "delivery" ? "home delivery" : "collection"} is before ${hours.close}.`,
      hours,
      etaMinutes: 0,
    };
  }
  return {
    ok: true as const,
    reason: `${name} is open ${hours.open}–${hours.close}.`,
    hours,
    etaMinutes: kind === "delivery" ? 45 : 35,
  };
}

export function timeWithinKitchen(
  hours: DayHours | null,
  time: string,
  kind: "collect" | "delivery",
) {
  if (!hours || !time) return false;
  const mins = toMinutes(time);
  return mins >= toMinutes(hours.open) && mins <= lastOrderMinutes(hours.close, kind);
}

export function addDaysISO(iso: string, add: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + add, 12));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function openKitchenDates(
  locationId: LocationId,
  settings: { hoursJson?: string; collectionHoursJson?: string } | null | undefined,
  kind: "collect" | "delivery",
  from = todayISO(),
  count = 14,
) {
  const dates: { date: string; hours: DayHours; label: string }[] = [];
  for (let i = 0; i < 28 && dates.length < count; i += 1) {
    const date = addDaysISO(from, i);
    const hours = kitchenHours(locationId, settings, date);
    if (!hours) continue;
    const slots = generateSlots(locationId, date, "collection", hours).filter((time) => timeWithinKitchen(hours, time, kind));
    if (!slots.length) continue;
    dates.push({
      date,
      hours,
      label: `${formatBookingDate(date)} · ${hours.open}–${hours.close}`,
    });
  }
  return dates;
}
