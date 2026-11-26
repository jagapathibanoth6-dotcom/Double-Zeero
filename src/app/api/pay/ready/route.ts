import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { getSettings } from "@/lib/platform/settings";

function isLocation(value: string): value is LocationId {
  return value === "manchester" || value === "chorlton";
}

export async function GET(request: Request) {
  const locationId = new URL(request.url).searchParams.get("locationId") || "";
  if (!isLocation(locationId)) return NextResponse.json({ ready: false });
  try {
    const settings = await getSettings(locationId);
    const key = String(settings.stripeSecretKey || "").trim();
    return NextResponse.json({ ready: key.startsWith("sk_") });
  } catch (error) {
    console.error("pay/ready", error);
    return NextResponse.json({
      ready: false,
      error: error instanceof Error ? error.message : "Could not read Stripe settings.",
    });
  }
}
