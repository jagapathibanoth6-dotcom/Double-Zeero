import { NextResponse } from "next/server";
import type { LocationId } from "@/data/site";
import { hostPayBalance, unpaidPartyBalance } from "@/lib/platform/party";
import { createStripeCheckout, stripeReady } from "@/lib/platform/stripe";
import { demoPaymentsAllowed } from "@/lib/platform/payments";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  try {
    const { party, unpaid, amountPence } = await unpaidPartyBalance(code);
    const locationId = party.booking.locationId as LocationId;
    if (amountPence > 0 && (await stripeReady(locationId))) {
      const session = await createStripeCheckout({
        locationId,
        request,
        amountPence,
        title: `Double Zero party ${party.booking.ref}`,
        kind: "ORDER",
        orderId: unpaid.map((order) => order.id).join(","),
        partyCode: code,
        email: party.booking.email,
        cancelPath: `/party/${code}`,
      });
      return NextResponse.json({ amountPence, checkoutUrl: session.url });
    }
    if (amountPence > 0 && !demoPaymentsAllowed()) throw new Error("Card payments are not set up for this restaurant yet.");
    const result = await hostPayBalance(code);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not pay." }, { status: 400 });
  }
}
