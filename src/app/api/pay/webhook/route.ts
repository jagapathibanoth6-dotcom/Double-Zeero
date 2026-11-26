import { NextResponse } from "next/server";
import Stripe from "stripe";
import { markStripePaid } from "@/lib/platform/stripe";
import type { LocationId } from "@/data/site";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const signature = request.headers.get("stripe-signature") || "";
  if (!secret || !signature) return NextResponse.json({ received: true });
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const locationId = session.metadata?.locationId;
    if (locationId === "manchester" || locationId === "chorlton") {
      try {
        await markStripePaid({ locationId: locationId as LocationId, sessionId: session.id });
      } catch {
        /* return page can still confirm */
      }
    }
  }
  return NextResponse.json({ received: true });
}
