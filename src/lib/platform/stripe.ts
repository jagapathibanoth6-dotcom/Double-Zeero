import Stripe from "stripe";
import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";
import { finalizePaidOrder } from "@/lib/platform/orders";
import { finalizePaidBooking } from "@/lib/platform/booking";
import { charge } from "@/lib/platform/payments";
import { getSettings } from "@/lib/platform/settings";

const venues: LocationId[] = ["manchester", "chorlton"];

export async function stripeClient(locationId: LocationId) {
  const settings = await getSettings(locationId);
  const key = String(settings.stripeSecretKey || "").trim();
  if (!key.startsWith("sk_")) return null;
  return new Stripe(key);
}

export async function stripeReady(locationId: LocationId) {
  return Boolean(await stripeClient(locationId));
}

export function payOrigin(request: Request) {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  if (env && !/localhost|127\.0\.0\.1/i.test(env)) return env;
  return new URL(request.url).origin;
}

export async function createStripeCheckout(input: {
  locationId: LocationId;
  request: Request;
  amountPence: number;
  title: string;
  kind: "ORDER" | "DEPOSIT";
  orderId?: string;
  bookingId?: string;
  partyCode?: string;
  successPath?: string;
  cancelPath: string;
  email?: string;
}) {
  const stripe = await stripeClient(input.locationId);
  if (!stripe) throw new Error("Stripe is not set up for this restaurant.");
  if (input.amountPence < 30) throw new Error("That amount is too small for card payment.");
  const origin = payOrigin(input.request);
  const successPath = input.successPath || "/pay/return";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email || undefined,
    success_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${input.cancelPath}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: input.amountPence,
          product_data: { name: input.title },
        },
      },
    ],
    metadata: {
      locationId: input.locationId,
      kind: input.kind,
      orderId: input.orderId || "",
      bookingId: input.bookingId || "",
      partyCode: input.partyCode || "",
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout link.");
  return session;
}

function orderIdsFrom(session: Stripe.Checkout.Session) {
  return [session.metadata?.orderId, session.metadata?.orderIds]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function markStripePaid(input: { locationId: LocationId; sessionId: string }) {
  const stripe = await stripeClient(input.locationId);
  if (!stripe) throw new Error("Stripe is not set up.");
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);
  if (session.payment_status !== "paid") throw new Error("That payment is not finished.");
  const ids = orderIdsFrom(session);
  const bookingId = session.metadata?.bookingId || "";
  const partyCode = session.metadata?.partyCode || "";
  const kind = session.metadata?.kind === "DEPOSIT" ? "DEPOSIT" : "ORDER";
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || session.id;
  const amount = session.amount_total || 0;

  for (const orderId of ids) {
    const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, totalPence: true } });
    if (!order) continue;
    if (order.status === "CANCELLED" || order.status === "COMPLETED") {
      if (intent.startsWith("pi_") || intent.startsWith("ch_")) {
        await refundStripe(intent, input.locationId, ids.length === 1 ? amount : order.totalPence, "requested_by_customer").catch(
          () => undefined,
        );
      }
      continue;
    }
    const existing = await db.payment.findFirst({ where: { orderId, providerRef: intent } });
    if (existing) {
      await finalizePaidOrder(orderId);
      continue;
    }
    const share = ids.length === 1 ? amount : order.totalPence;
    if (share <= 0) continue;
    await charge({
      amountPence: share,
      kind: "ORDER",
      orderId,
      provider: "STRIPE",
      providerRef: intent,
      notify: true,
    });
    await finalizePaidOrder(orderId);
  }

  if (bookingId) {
    const bookingRow = await db.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
    if (bookingRow?.status === "CANCELLED" || bookingRow?.status === "COMPLETED") {
      if (intent.startsWith("pi_") || intent.startsWith("ch_")) {
        await refundStripe(intent, input.locationId, amount, "requested_by_customer").catch(() => undefined);
      }
    } else {
      const existing = await db.payment.findFirst({ where: { bookingId, providerRef: intent } });
      if (!existing) {
        await charge({
          amountPence: amount,
          kind,
          bookingId,
          provider: "STRIPE",
          providerRef: intent,
          notify: false,
        });
      }
      if (session.payment_status === "paid") {
        await finalizePaidBooking(bookingId, amount);
      }
    }
  }

  const firstOrder = ids[0] ? await db.order.findUnique({ where: { id: ids[0] }, include: { party: true } }) : null;
  const booking = bookingId ? await db.booking.findUnique({ where: { id: bookingId }, include: { party: true } }) : null;
  return {
    orderId: ids[0] || "",
    orderRef: firstOrder?.ref || "",
    bookingId,
    bookingRef: booking?.ref || "",
    partyCode: partyCode || firstOrder?.party?.code || booking?.party?.code || "",
    already: false,
  };
}

export async function markStripePaidBySession(sessionId: string) {
  for (const locationId of venues) {
    const stripe = await stripeClient(locationId);
    if (!stripe) continue;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session?.id) return markStripePaid({ locationId, sessionId });
    } catch {
      /* try the other restaurant */
    }
  }
  throw new Error("Could not find that payment.");
}

const stripeReasons = ["duplicate", "fraudulent", "requested_by_customer"] as const;

export async function refundStripe(providerRef: string, locationId: LocationId, amountPence: number, reason?: string) {
  if (!providerRef.startsWith("pi_") && !providerRef.startsWith("ch_")) return;
  const stripe = await stripeClient(locationId);
  if (!stripe) throw new Error("Stripe is not set up for this restaurant.");
  const stripeReason = stripeReasons.includes(reason as (typeof stripeReasons)[number])
    ? (reason as (typeof stripeReasons)[number])
    : undefined;
  await stripe.refunds.create({
    payment_intent: providerRef.startsWith("pi_") ? providerRef : undefined,
    charge: providerRef.startsWith("ch_") ? providerRef : undefined,
    amount: amountPence,
    reason: stripeReason,
  });
}

export async function stripeAccountFacts(locationId: LocationId) {
  const settings = await getSettings(locationId);
  const stripe = await stripeClient(locationId);
  if (!stripe) {
    return {
      ready: false,
      livemode: false,
      chargesEnabled: false,
      keyHint: "",
      dashboardUrl: "https://dashboard.stripe.com/test/payments",
    };
  }
  const account = await stripe.accounts.retrieve().catch(() => null);
  const livemode = Boolean(String(settings.stripeSecretKey || "").startsWith("sk_live_"));
  return {
    ready: true,
    livemode,
    chargesEnabled: Boolean(account?.charges_enabled),
    keyHint: settings.stripeKeyHint || "",
    dashboardUrl: livemode ? "https://dashboard.stripe.com/payments" : "https://dashboard.stripe.com/test/payments",
  };
}

export type StripePaymentFact = {
  method: string;
  stripeStatus: string;
  receiptEmail: string;
  dashboardUrl: string;
  intentId: string;
};

export async function stripePaymentFacts(locationId: LocationId, refs: string[]) {
  const stripe = await stripeClient(locationId);
  const facts: Record<string, StripePaymentFact> = {};
  if (!stripe) return facts;
  const livemode = Boolean((await getSettings(locationId)).stripeSecretKey.startsWith("sk_live_"));
  const unique = [...new Set(refs.filter((ref) => ref.startsWith("pi_") || ref.startsWith("ch_")))].slice(0, 40);
  await Promise.all(
    unique.map(async (ref) => {
      try {
        const intent = ref.startsWith("pi_")
          ? await stripe.paymentIntents.retrieve(ref, { expand: ["latest_charge"] })
          : null;
        const charge =
          intent && typeof intent.latest_charge !== "string"
            ? intent.latest_charge
            : ref.startsWith("ch_")
              ? await stripe.charges.retrieve(ref)
              : null;
        const card = charge?.payment_method_details?.card;
        const wallet = card?.wallet?.type;
        const brand = card?.brand ? card.brand.replace(/^./, (letter) => letter.toUpperCase()) : "";
        const last4 = card?.last4 ? `•••• ${card.last4}` : "";
        const walletLabel = wallet === "apple_pay" ? "Apple Pay" : wallet === "google_pay" ? "Google Pay" : "";
        const method = [walletLabel || brand || "Card", last4].filter(Boolean).join(" · ") || "Stripe";
        const intentId = intent?.id || (typeof charge?.payment_intent === "string" ? charge.payment_intent : ref);
        facts[ref] = {
          method,
          stripeStatus: intent?.status || charge?.status || "succeeded",
          receiptEmail: charge?.billing_details?.email || intent?.receipt_email || "",
          dashboardUrl: `${livemode ? "https://dashboard.stripe.com/payments" : "https://dashboard.stripe.com/test/payments"}/${intentId}`,
          intentId,
        };
      } catch {
        /* keep the diary row without live Stripe extras */
      }
    }),
  );
  return facts;
}
