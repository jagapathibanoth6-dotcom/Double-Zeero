import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { guestOrder, getPartyByCode } from "@/lib/platform/party";
import { createStripeCheckout, stripeReady } from "@/lib/platform/stripe";
import { demoPaymentsAllowed } from "@/lib/platform/payments";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const party = await getPartyByCode(code);
    const locationId = party?.booking.locationId as LocationId | undefined;
    const live = Boolean(locationId && (await stripeReady(locationId)));
    const order = await guestOrder({
      code,
      guestId: String(body.guestId),
      items: body.items || [],
      payNow: Boolean(body.payNow) && !live && demoPaymentsAllowed(),
    });
    const unpaid = Boolean(body.payNow) && live && order.totalPence > 0 && !order.payments?.some((payment) => payment.status === "PAID");
    if (unpaid && locationId) {
      const session = await createStripeCheckout({
        locationId,
        request,
        amountPence: order.totalPence,
        title: `Double Zero ${order.ref}`,
        kind: "ORDER",
        orderId: order.id,
        partyCode: code,
        email: order.email || party?.booking.email,
        cancelPath: `/party/${code}`,
      });
      return NextResponse.json({ order, checkoutUrl: session.url });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save order." }, { status: 400 });
  }
}
