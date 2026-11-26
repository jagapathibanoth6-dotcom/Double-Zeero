import { NextResponse } from "next/server";
import type { LocationId, VisitType } from "@/data/site";
import { searchSlots } from "@/lib/platform/booking";

function isLocation(value: string): value is LocationId {
  return value === "manchester" || value === "chorlton";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId") || "";
  const date = url.searchParams.get("date") || "";
  const guests = Number(url.searchParams.get("guests") || 2);
  const visitType = (url.searchParams.get("visitType") || "table") as VisitType;

  if (!isLocation(locationId)) {
    return NextResponse.json({ error: "Choose a restaurant." }, { status: 400 });
  }
  if (visitType !== "table" && visitType !== "collection") {
    return NextResponse.json({ error: "That visit type is not available here." }, { status: 400 });
  }

  try {
    const result = await searchSlots({ locationId, date, guests, visitType });
    return NextResponse.json({
      configured: true,
      engine: "double-zero",
      band: result.band,
      settings: {
        largeFrom: result.settings.largeFrom,
        maxAutoBooking: result.settings.maxAutoBooking,
        enquiryFrom: result.settings.enquiryFrom,
        depositEnabled: result.settings.depositEnabled,
        depositType: result.settings.depositType,
        depositAmountPence: result.settings.depositAmountPence,
        depositFrom: result.settings.depositFrom,
        preorderEnabled: result.settings.preorderEnabled,
        preorderFrom: result.settings.preorderFrom,
        waitlistEnabled: result.settings.waitlistEnabled,
      },
      slots: result.slots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load times.";
    return NextResponse.json({ configured: true, slots: [], error: message }, { status: 500 });
  }
}
