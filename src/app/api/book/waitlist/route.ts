import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { joinWaitlist } from "@/lib/platform/booking";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const entry = await joinWaitlist({
      locationId: body.locationId as LocationId,
      date: String(body.date),
      time: String(body.time),
      guests: Number(body.guests),
      name: String(body.name),
      email: String(body.email),
      phone: String(body.phone),
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not join waitlist." }, { status: 400 });
  }
}
