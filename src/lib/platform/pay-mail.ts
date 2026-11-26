import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { notify } from "@/lib/platform/notify";

export function moneyLine(pence: number) {
  return formatMoney(pence);
}

export type PayMailContext = {
  to?: string | null;
  ref: string;
  type: string;
  when?: string;
  extra?: Record<string, string>;
};

export async function paymentContext(input: { orderId?: string | null; bookingId?: string | null }): Promise<PayMailContext | null> {
  if (input.orderId) {
    const order = await db.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) return null;
    return {
      to: order.email,
      ref: order.ref,
      type: order.source === "DZ_DELIVERY" ? "Home delivery" : order.source === "CLICK_COLLECT" ? "Click & collect" : "Order",
      when: order.asap ? "ASAP" : `${order.date} ${order.time}`.trim(),
      extra: {
        Restaurant: locations[order.locationId as keyof typeof locations]?.name || order.locationId,
        ...(order.address ? { Address: order.address } : {}),
        Total: moneyLine(order.totalPence),
        ...(order.items.length ? { Items: order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") } : {}),
      },
    };
  }
  if (input.bookingId) {
    const booking = await db.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) return null;
    return {
      to: booking.email,
      ref: booking.ref,
      type: booking.visitType === "collection" ? "Collection" : "Book a table",
      when: `${booking.date} ${booking.time}`.trim(),
      extra: {
        Restaurant: locations[booking.locationId as keyof typeof locations]?.name || booking.locationId,
        Guests: String(booking.guests),
        Name: booking.name,
      },
    };
  }
  return null;
}

export async function sendPaymentMail(input: {
  to?: string | null;
  kind: "ORDER" | "DEPOSIT";
  ref: string;
  amountPence: number;
  type: string;
  when?: string;
  extra?: Record<string, string>;
}) {
  if (!input.to?.includes("@")) return;
  await notify("email", input.kind === "DEPOSIT" ? "deposit_received" : "payment_confirmation", input.to, {
    title: input.kind === "DEPOSIT" ? `Deposit received ${input.ref}` : `Payment received ${input.ref}`,
    intro:
      input.kind === "DEPOSIT"
        ? "We have taken your table deposit. This is held against your booking."
        : "Thank you. Your Double Zero payment has been taken.",
    details: {
      Reference: input.ref,
      Type: input.type,
      Payment: moneyLine(input.amountPence),
      Status: "Paid",
      ...(input.when ? { When: input.when } : {}),
      ...(input.extra || {}),
    },
    ctaHref: "/account",
    ctaLabel: "Open my dashboard",
    body: `Payment ${moneyLine(input.amountPence)} received for ${input.ref}.`,
  });
}

export async function sendRefundMail(input: {
  to?: string | null;
  ref: string;
  amountPence: number;
  reason: string;
  type: string;
  extra?: Record<string, string>;
}) {
  if (!input.to?.includes("@")) return;
  await notify("email", "refund_issued", input.to, {
    title: `Refund ${input.ref}`,
    intro: "A refund has been issued to the same card or wallet used to pay.",
    details: {
      Reference: input.ref,
      Type: input.type,
      Refund: moneyLine(input.amountPence),
      Reason: input.reason,
      Status: "Refunded",
      ...(input.extra || {}),
    },
    ctaHref: "/account",
    ctaLabel: "Open my dashboard",
    body: `Refund ${moneyLine(input.amountPence)} for ${input.ref}. ${input.reason}`,
  });
}

export async function sendCancelMail(input: {
  to?: string | null;
  ref: string;
  type: string;
  refundedPence: number;
  when?: string;
  extra?: Record<string, string>;
}) {
  if (!input.to?.includes("@")) return;
  await notify("email", "booking_or_order_cancelled", input.to, {
    title: `Cancelled ${input.ref}`,
    intro: input.refundedPence
      ? "This has been cancelled and the refund is on its way to the same payment method."
      : "This has been cancelled. Nothing was paid, so there is no refund.",
    details: {
      Reference: input.ref,
      Type: input.type,
      Status: "Cancelled",
      Refund: input.refundedPence ? moneyLine(input.refundedPence) : "None",
      ...(input.when ? { When: input.when } : {}),
      ...(input.extra || {}),
    },
    ctaHref: "/account",
    ctaLabel: "Open my dashboard",
    body: `${input.ref} cancelled. Refund ${input.refundedPence ? moneyLine(input.refundedPence) : "none"}.`,
  });
}
