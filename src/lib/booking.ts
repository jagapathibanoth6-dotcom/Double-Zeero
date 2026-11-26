import { locations, type LocationId, type VisitType } from "@/data/site";

export type Reservation = {
  ref: string;
  locationId: LocationId;
  visitType: VisitType;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  highchair: boolean;
  notes: string;
  createdAt: string;
  status: "requested";
};

const SLOT_STEP = 15;
const TABLE_LAST_SEATING = 90;
const COLLECTION_LAST_SEATING = 30;
const COVERS_PER_TABLE_SLOT = 16;
const COVERS_PER_COLLECTION_SLOT = 10;

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function londonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
}

export function todayISO() {
  const { year, month, day } = londonParts();
  return `${year}-${month}-${day}`;
}

export function londonDayRange(iso = todayISO()) {
  const utcMidnight = new Date(`${iso}T00:00:00.000Z`);
  const london = utcMidnight.toLocaleString("en-GB", { timeZone: "Europe/London", timeZoneName: "short" });
  const offset = london.includes("BST") ? 60 * 60 * 1000 : 0;
  const start = new Date(utcMidnight.getTime() - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function weekdayFromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function hoursFor(
  locationId: LocationId,
  isoDate: string,
  visitType: VisitType,
  override?: { open: string; close: string } | null,
) {
  if (override !== undefined) return override;
  const loc = locations[locationId];
  const dow = weekdayFromISO(isoDate);
  if (visitType === "collection" && "collectionHours" in loc && loc.collectionHours) {
    return loc.collectionHours[dow];
  }
  return loc.weeklyHours[dow];
}

export function generateSlots(
  locationId: LocationId,
  isoDate: string,
  visitType: VisitType,
  override?: { open: string; close: string } | null,
) {
  const hours = hoursFor(locationId, isoDate, visitType, override);
  if (!hours) return [];

  const lastGap = visitType === "collection" ? COLLECTION_LAST_SEATING : TABLE_LAST_SEATING;
  const start = toMinutes(hours.open);
  const end = toMinutes(hours.close) - lastGap;
  const slots: string[] = [];

  for (let t = start; t <= end; t += SLOT_STEP) {
    slots.push(fromMinutes(t));
  }

  if (isoDate === todayISO()) {
    const now = londonParts();
    const nowMins = toMinutes(`${now.hour}:${now.minute}`) + 45;
    return slots.filter((slot) => toMinutes(slot) >= nowMins);
  }

  return slots;
}

export type Occupancy = Pick<Reservation, "locationId" | "date" | "time" | "visitType" | "guests">;

export function slotCapacity(visitType: VisitType) {
  return visitType === "collection" ? COVERS_PER_COLLECTION_SLOT : COVERS_PER_TABLE_SLOT;
}

export function availableSlots(
  locationId: LocationId,
  isoDate: string,
  visitType: VisitType,
  existing: Occupancy[],
) {
  const cap = slotCapacity(visitType);
  return generateSlots(locationId, isoDate, visitType).filter((time) => {
    const covers = existing
      .filter(
        (r) =>
          r.locationId === locationId && r.date === isoDate && r.time === time && r.visitType === visitType,
      )
      .reduce((sum, r) => sum + r.guests, 0);
    return covers < cap;
  });
}

export function isValidSlot(locationId: LocationId, isoDate: string, visitType: VisitType, time: string) {
  return generateSlots(locationId, isoDate, visitType).includes(time);
}

export function makeRef(locationId: LocationId) {
  const prefix = locationId === "manchester" ? "MCR" : "CHL";
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DZ-${prefix}-${n}`;
}

export function formatBookingDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
