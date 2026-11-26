import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { createEnquiry } from "@/lib/platform/booking";
import { setCustomerCookie } from "@/lib/platform/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const result = await createEnquiry({
      locationId: body.locationId as LocationId,
      date: String(body.date),
      preferredTime: String(body.preferredTime || body.time || ""),
      guests: Number(body.guests),
      name: String(body.name),
      email: String(body.email),
      phone: String(body.phone),
      occasion: String(body.occasion || ""),
      foodRequirements: String(body.foodRequirements || ""),
      message: String(body.message || ""),
    });
    if (result.access.isNew && result.enquiry.customerId) await setCustomerCookie(result.enquiry.customerId);
    return NextResponse.json({ enquiry: result.enquiry, access: result.access, mail: result.mail });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send enquiry." }, { status: 400 });
  }
}
