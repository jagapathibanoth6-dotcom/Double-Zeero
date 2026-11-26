import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { quoteDelivery } from "@/lib/platform/orders";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const quote = await quoteDelivery(body.locationId as LocationId, String(body.address || ""));
    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No quote." }, { status: 400 });
  }
}
