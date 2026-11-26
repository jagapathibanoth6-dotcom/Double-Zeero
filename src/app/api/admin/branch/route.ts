import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/platform/admin";
import { setStaffBranch } from "@/lib/platform/session";

export async function POST(request: Request) {
  await requireStaff();
  const body = await request.json().catch(() => ({}));
  const locationId = body.locationId;
  if (locationId !== "manchester" && locationId !== "chorlton") {
    return NextResponse.json({ error: "Choose a branch." }, { status: 400 });
  }
  await setStaffBranch(locationId);
  return NextResponse.json({ ok: true, locationId });
}
