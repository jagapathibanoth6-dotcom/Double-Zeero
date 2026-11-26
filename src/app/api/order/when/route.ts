import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { locations } from "@/data/site";
import { todayISO } from "@/lib/booking";
import { searchSlots } from "@/lib/platform/booking";
import { kitchenAsap, kitchenHours, openKitchenDates, timeWithinKitchen } from "@/lib/platform/hours";
import { getSettings } from "@/lib/platform/settings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId") || "";
  const date = url.searchParams.get("date") || todayISO();
  const kind = url.searchParams.get("kind") === "delivery" ? "delivery" : "collect";
  if (locationId !== "manchester" && locationId !== "chorlton") {
    return NextResponse.json({ error: "Choose a restaurant." }, { status: 400 });
  }

  const settings = await getSettings(locationId as LocationId);
  const hours = kitchenHours(locationId as LocationId, settings, date);
  const asap = kitchenAsap(locationId as LocationId, settings, kind, date);
  const dates = openKitchenDates(locationId as LocationId, settings, kind);
  const search = await searchSlots({
    locationId: locationId as LocationId,
    date,
    guests: 1,
    visitType: "collection",
  });
  const slots = search.slots.filter((slot) => timeWithinKitchen(hours, slot.time, kind));

  return NextResponse.json({
    locationId,
    name: locations[locationId as LocationId].shortName,
    date,
    hours,
    openLabel: hours ? `Open ${hours.open}–${hours.close}` : "Closed today",
    asap,
    dates,
    slots,
  });
}
