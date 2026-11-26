import { db } from "@/lib/db";
import { partyReminderText } from "@/lib/platform/notify";
import { createOrder, priceBasket, queuePrintJobs, type BasketItem } from "@/lib/platform/orders";
import { charge } from "@/lib/platform/payments";
import type { LocationId } from "@/data/site";
import type { Serialized } from "@/types/serialized";

export async function getPartyByCode(code: string) {
  return db.party.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      booking: true,
      guests: { orderBy: { sortOrder: "asc" }, include: { orders: { include: { items: true, payments: true } } } },
      orders: { include: { items: true, payments: true } },
    },
  });
}

export async function saveGuestList(partyId: string, names: string[]) {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  const existing = await db.bookingGuest.findMany({ where: { partyId }, include: { orders: true } });
  const keep = new Set<string>();
  for (const [index, name] of clean.entries()) {
    const match = existing.find((g) => g.name.toLowerCase() === name.toLowerCase() && !keep.has(g.id));
    if (match) {
      keep.add(match.id);
      await db.bookingGuest.update({ where: { id: match.id }, data: { name, sortOrder: index } });
    } else {
      const created = await db.bookingGuest.create({ data: { partyId, name, sortOrder: index } });
      keep.add(created.id);
    }
  }
  for (const guest of existing) {
    if (!keep.has(guest.id) && guest.orders.length === 0) {
      await db.bookingGuest.delete({ where: { id: guest.id } });
    }
  }
  return getPartyByCode((await db.party.findUniqueOrThrow({ where: { id: partyId } })).code);
}

export async function guestOrder(input: {
  code: string;
  guestId: string;
  items: BasketItem[];
  payNow: boolean;
}) {
  const party = await getPartyByCode(input.code);
  if (!party) throw new Error("Party not found");
  const guest = party.guests.find((g) => g.id === input.guestId);
  if (!guest) throw new Error("Guest not found");
  if (party.deadlineAt && party.deadlineAt < new Date()) throw new Error("Pre-order is closed.");

  const items = await priceBasket(party.booking.locationId as LocationId, input.items);
  const existing = guest.orders[0];
  if (existing) {
    await db.orderItem.deleteMany({ where: { orderId: existing.id } });
    const subtotal = items.reduce((sum, item) => sum + item.unitPence * item.quantity, 0);
    await db.order.update({
      where: { id: existing.id },
      data: {
        subtotalPence: subtotal,
        totalPence: subtotal,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            unitPence: item.unitPence,
            notes: item.notes || "",
          })),
        },
      },
    });
    if (input.payNow && party.paymentMode !== "HOST") {
      const already = existing.payments.some((p) => p.status === "PAID");
      if (!already) {
        await charge({ amountPence: subtotal, kind: "ORDER", orderId: existing.id, to: party.booking.email });
      }
    }
    await queuePrintJobs(existing.id, items.map((item) => item.name));
    return db.order.findUniqueOrThrow({ where: { id: existing.id }, include: { items: true, payments: true } });
  }

  const result = await createOrder({
    locationId: party.booking.locationId as LocationId,
    source: "PARTY_PREORDER",
    items: items,
    name: guest.name,
    email: party.booking.email,
    phone: party.booking.phone,
    date: party.booking.date,
    time: party.booking.time,
    bookingId: party.booking.id,
    partyId: party.id,
    guestId: guest.id,
    chargeNow: input.payNow,
  });
  return result.order;
}

export async function unpaidPartyBalance(code: string) {
  const party = await getPartyByCode(code);
  if (!party) throw new Error("Party not found");
  const unpaid = party.orders.filter((order) => !order.payments.some((payment) => payment.status === "PAID"));
  const amountPence = unpaid.reduce((sum, order) => sum + order.totalPence, 0);
  return { party, unpaid, amountPence };
}

export async function hostPayBalance(code: string) {
  const party = await getPartyByCode(code);
  if (!party) throw new Error("Party not found");
  const unpaid = party.orders.filter((o) => !o.payments.some((p) => p.status === "PAID"));
  const amount = unpaid.reduce((sum, o) => sum + o.totalPence, 0);
  if (amount <= 0) return { amountPence: 0, payments: [] };
  const payments = [];
  for (const order of unpaid) {
    payments.push(await charge({ amountPence: order.totalPence, kind: "ORDER", orderId: order.id, to: party.booking.email }));
  }
  return { amountPence: amount, payments };
}

export function partyProgress(party: NonNullable<Awaited<ReturnType<typeof getPartyByCode>>>) {
  const completed = party.guests.filter((g) => g.orders.length > 0).length;
  return {
    completed,
    total: party.booking.guests,
    listed: party.guests.length,
    reminderText: partyReminderText({
      date: party.booking.date,
      time: party.booking.time,
      code: party.code,
      deadline: party.deadlineAt ? party.deadlineAt.toLocaleString("en-GB") : undefined,
    }),
  };
}

type PartyWithDetails = NonNullable<Awaited<ReturnType<typeof getPartyByCode>>>;

/**
 * What anyone with the party link may see. The party link is shared with every
 * guest, so it must not include the booking reference (which allows cancelling),
 * emails, phone numbers or payment details.
 */
export function publicPartyView(party: PartyWithDetails) {
  return {
    code: party.code,
    paymentMode: party.paymentMode,
    deadlineAt: party.deadlineAt,
    booking: {
      locationId: party.booking.locationId,
      date: party.booking.date,
      time: party.booking.time,
      guests: party.booking.guests,
      name: party.booking.name,
      status: party.booking.status,
    },
    guests: party.guests.map((g) => ({
      id: g.id,
      name: g.name,
      ordered: g.orders.length > 0,
      totalPence: g.orders[0]?.totalPence || 0,
      paid: g.orders[0]?.payments.some((p) => p.status === "PAID") || false,
      items: g.orders[0]?.items || [],
    })),
  };
}

export type PartyView = Serialized<ReturnType<typeof publicPartyView>>;
