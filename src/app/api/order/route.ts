import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";
import { createOrder } from "@/lib/platform/orders";
import { setCustomerCookie, setPreferredLocation } from "@/lib/platform/session";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref")?.toUpperCase();
  if (!ref) return NextResponse.json({ error: "Missing order reference." }, { status: 400 });
  const order = await db.order.findUnique({
    where: { ref },
    include: { items: true, payments: { include: { refunds: true } }, delivery: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const result = await createOrder({
      locationId: body.locationId as LocationId,
      source: String(body.source),
      items: body.items || [],
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      notes: String(body.notes || ""),
      date: String(body.date || ""),
      time: String(body.time || ""),
      asap: Boolean(body.asap),
      address: String(body.address || ""),
      offerId: body.offerId || undefined,
      via: String(body.via || ""),
      chargeNow: body.chargeNow !== false,
    });
    if (result.order.customerId) await setCustomerCookie(result.order.customerId);
    await setPreferredLocation(result.order.locationId as LocationId);
    return NextResponse.json({ order: result.order, access: result.access, mail: result.mail });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not place order." }, { status: 400 });
  }
}
