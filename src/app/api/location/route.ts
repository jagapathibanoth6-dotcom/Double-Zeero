import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { setPreferredLocation } from "@/lib/platform/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locationId = String(body?.locationId || "");
  if (locationId !== "manchester" && locationId !== "chorlton") {
    return NextResponse.json({ error: "Choose a restaurant." }, { status: 400 });
  }
  await setPreferredLocation(locationId as LocationId);
  return NextResponse.json({ ok: true, locationId });
}
