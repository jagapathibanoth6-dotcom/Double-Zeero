import { NextResponse } from "next/server";
import { locations, type LocationId } from "@/data/site";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/platform/settings";
import { createStripeCheckout } from "@/lib/platform/stripe";

function isLocation(value: string): value is LocationId {
  return value === "manchester" || value === "chorlton";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const locationId = String(body.locationId || "");
  if (!isLocation(locationId)) return NextResponse.json({ error: "Choose a restaurant." }, { status: 400 });

  try {
    const orderIds = [body.orderId, ...(Array.isArray(body.orderIds) ? body.orderIds : [])]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const uniqueIds = [...new Set(orderIds)];
    const bookingId = String(body.bookingId || "");
    const partyCode = String(body.partyCode || "");
    const cancelPath = String(body.cancelPath || "/");
    const loc = locations[locationId];

    if (uniqueIds.length) {
      const orders = await db.order.findMany({ where: { id: { in: uniqueIds } } });
      if (orders.length !== uniqueIds.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      if (orders.some((order) => order.locationId !== locationId)) {
        return NextResponse.json({ error: "That order is for the other restaurant." }, { status: 400 });
      }
      if (orders.some((order) => order.status === "CANCELLED" || order.status === "COMPLETED")) {
        return NextResponse.json({ error: "That order is cancelled, so there is nothing to pay." }, { status: 400 });
      }
      const amountPence = orders.reduce((sum, order) => sum + order.totalPence, 0);
      const session = await createStripeCheckout({
        locationId,
        request,
        amountPence,
        title: orders.length === 1 ? `Double Zero ${orders[0].ref}` : `Double Zero party · ${loc.shortName}`,
        kind: "ORDER",
        orderId: uniqueIds.join(","),
        partyCode,
        email: orders[0].email || undefined,
        cancelPath,
      });
      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    if (bookingId) {
      const booking = await db.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      if (booking.locationId !== locationId) {
        return NextResponse.json({ error: "That booking is for the other restaurant." }, { status: 400 });
      }
      if (booking.status === "CANCELLED" || booking.status === "COMPLETED" || booking.status === "DECLINED") {
        return NextResponse.json({ error: "That booking is cancelled, so there is nothing to pay." }, { status: 400 });
      }
      const settings = await getSettings(locationId);
      const amountPence =
        settings.depositType === "PER_PERSON" ? settings.depositAmountPence * booking.guests : settings.depositAmountPence;
      const session = await createStripeCheckout({
        locationId,
        request,
        amountPence,
        title: `Double Zero deposit ${booking.ref}`,
        kind: "DEPOSIT",
        bookingId: booking.id,
        partyCode,
        email: booking.email,
        cancelPath,
      });
      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    return NextResponse.json({ error: "Nothing to pay." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start payment." }, { status: 400 });
  }
}
