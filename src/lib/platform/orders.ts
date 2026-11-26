import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";
import { formatMoney, uniqueRef } from "@/lib/platform/money";
import { sendCustomerMail, type MailBundle } from "@/lib/platform/mail-events";
import { notify } from "@/lib/platform/notify";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { charge, refundAllOpen } from "@/lib/platform/payments";
import { getSettings } from "@/lib/platform/settings";
import { issueCustomerAccess } from "@/lib/platform/customer-access";
import { locations } from "@/data/site";
import { kitchenAsap, kitchenHours, timeWithinKitchen } from "@/lib/platform/hours";
import { todayISO } from "@/lib/booking";
import { cleanVia } from "@/lib/platform/via";
import { handToUber } from "@/lib/platform/uber";

export async function ensureOrderVia() {
  const columns = (await db.$queryRawUnsafe(`PRAGMA table_info('Order')`)) as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "via")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN via TEXT NOT NULL DEFAULT ""`);
  }
}

export type BasketItem = { productId?: string; name: string; quantity: number; unitPence: number; notes?: string };

export async function quoteDelivery(locationId: LocationId, address: string) {
  const settings = await getSettings(locationId);
  if (!settings.deliveryEnabled) throw new Error("Delivery is not available from this restaurant.");
  const postcode = address.toUpperCase();
  const inArea = /M[0-9]|MANCHESTER|CHORLTON|DIDSBURY|SALE|STRETFORD|HULME|SALFORD/.test(postcode);
  if (!inArea) {
    return { ok: false as const, reason: "That address is outside the Double Zero delivery area.", feePence: 0, etaMinutes: 0 };
  }
  return {
    ok: true as const,
    feePence: settings.deliveryFeePence,
    etaMinutes: 40,
    provider: settings.uberReady ? "UBER_DIRECT" : "DEMO_UBER_DIRECT",
  };
}

/** New unguessable order reference, e.g. `O-7KQ4M2XP`. */
export async function nextOrderRef() {
  return uniqueRef("O", async (ref) => Boolean(await db.order.findUnique({ where: { ref }, select: { id: true } })));
}

export function applyOffer(subtotal: number, offer: { percentOff: number; minSpendPence: number; maxDiscountPence: number } | null) {
  if (!offer || subtotal < offer.minSpendPence) return 0;
  const raw = Math.round((subtotal * offer.percentOff) / 100);
  return offer.maxDiscountPence > 0 ? Math.min(raw, offer.maxDiscountPence) : raw;
}

export async function createOrder(input: {
  locationId: LocationId;
  source: string;
  items: BasketItem[];
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  date?: string;
  time?: string;
  asap?: boolean;
  address?: string;
  bookingId?: string;
  partyId?: string;
  guestId?: string;
  offerId?: string;
  chargeNow?: boolean;
  via?: string;
}) {
  await ensureOrderVia();
  if (!input.items.length) throw new Error("Basket is empty.");
  const productIds = [...new Set(input.items.map((item) => item.productId).filter(Boolean))] as string[];
  if (productIds.length) {
    const live = await db.menuPrice.findMany({
      where: { productId: { in: productIds }, locationId: input.locationId, available: true },
      select: { productId: true },
    });
    const ok = new Set(live.map((row) => row.productId));
    const blocked = input.items.find((item) => item.productId && !ok.has(item.productId));
    if (blocked) throw new Error(`${blocked.name} is unavailable.`);
  }
  const settings = await getSettings(input.locationId);
  const access = input.email
    ? await issueCustomerAccess({ email: input.email, name: input.name, phone: input.phone })
    : null;
  const customer = access?.customer || null;

  const subtotal = input.items.reduce((sum, item) => sum + item.unitPence * item.quantity, 0);
  const offer = input.offerId ? await db.offer.findUnique({ where: { id: input.offerId } }) : null;
  const discount = applyOffer(subtotal, offer);
  let deliveryFee = 0;
  let deliveryQuote = null;

  const orderKind = input.source === "DZ_DELIVERY" ? "delivery" : "collect";
  const whenDate = input.date || todayISO();
  const hours = kitchenHours(input.locationId, settings, whenDate);

  if (input.asap) {
    const asap = kitchenAsap(input.locationId, settings, orderKind, whenDate);
    if (!asap.ok) throw new Error(asap.reason);
  } else if (input.source === "CLICK_COLLECT" || input.source === "DZ_DELIVERY") {
    if (!input.time) throw new Error(input.source === "DZ_DELIVERY" ? "Choose a home delivery time or ASAP." : "Choose a collection time or ASAP.");
    if (!timeWithinKitchen(hours, input.time, orderKind)) {
      throw new Error(
        hours
          ? `${locations[input.locationId].shortName} kitchen hours are ${hours.open}–${hours.close}.`
          : `${locations[input.locationId].shortName} is closed that day.`,
      );
    }
  }

  if (input.source === "DZ_DELIVERY") {
    if (!input.address) throw new Error("Add a delivery address.");
    deliveryQuote = await quoteDelivery(input.locationId, input.address);
    if (!deliveryQuote.ok) throw new Error(deliveryQuote.reason);
    deliveryFee = deliveryQuote.feePence;
  }

  if ((input.source === "CLICK_COLLECT" || input.source === "DZ_DELIVERY") && input.time && input.date && !input.asap) {
    const used = await db.order.count({
      where: { locationId: input.locationId, date: input.date, time: input.time, source: input.source },
    });
    if (used >= settings.collectionMaxPerSlot) throw new Error("That time is full.");
  }

  const holdPay = input.chargeNow === false && (input.source === "CLICK_COLLECT" || input.source === "DZ_DELIVERY");
  const order = await db.order.create({
    data: {
      ref: await nextOrderRef(),
      locationId: input.locationId,
      source: input.source,
      status: holdPay ? "PENDING_PAY" : "NEW",
      date: input.date || todayISO(),
      time: input.asap ? "" : input.time || "",
      asap: Boolean(input.asap),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || "",
      notes: input.notes?.trim() || "",
      via: cleanVia(input.via),
      address: input.address?.trim() || "",
      subtotalPence: subtotal,
      discountPence: discount,
      deliveryFeePence: deliveryFee,
      totalPence: subtotal - discount + deliveryFee,
      customerId: customer?.id,
      bookingId: input.bookingId,
      partyId: input.partyId,
      guestId: input.guestId,
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          unitPence: item.unitPence,
          notes: item.notes || "",
        })),
      },
    },
    include: { items: true },
  });

  if (input.chargeNow !== false) {
    await charge({
      amountPence: order.totalPence,
      kind: "ORDER",
      orderId: order.id,
      to: order.email || undefined,
      notify: false,
    });
  }

  if (!holdPay) {
    await queuePrintJobs(order.id, order.items.map((item) => item.name));
  }

  if (deliveryQuote?.ok) {
    await db.delivery.create({
      data: {
        orderId: order.id,
        status: "QUOTED",
        quotePence: deliveryQuote.feePence,
        etaMinutes: deliveryQuote.etaMinutes,
        courierName: settings.uberReady ? "Uber Direct" : "Uber Direct (demo)",
      },
    });
  }

  // print jobs queued above
  const saved = await db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, payments: { include: { refunds: true } }, delivery: true },
  });
  const details = {
    Reference: saved.ref,
    Restaurant: locations[input.locationId].name,
    Type: saved.source === "DZ_DELIVERY" ? "Home delivery" : saved.source === "CLICK_COLLECT" ? "Click & collect" : saved.source.replace("_", " "),
    When: saved.asap ? "ASAP" : `${saved.date} ${saved.time}`.trim(),
    Name: saved.name,
    Email: saved.email,
    Phone: saved.phone,
    Address: saved.address || "Collection",
    Total: formatMoney(saved.totalPence),
    Payment: saved.payments.some((payment) => payment.status === "PAID" || payment.status === "PARTIAL_REFUND")
      ? `Paid ${formatMoney(saved.totalPence)}`
      : "Unpaid",
    Items: saved.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
    Status: saved.status,
  };
  const mail: MailBundle = {};
  if (!holdPay && saved.email?.includes("@")) {
    try {
      mail.customer = await sendCustomerMail("order_confirmed", saved.email, {
        title: `Order confirmed ${saved.ref}`,
        intro: "Your Double Zero order is confirmed. Keep this email as your receipt.",
        details,
        tempPassword: access?.tempPassword || "",
        ctaHref: "/account",
        ctaLabel: "Open my dashboard",
        body: `Order confirmed ${saved.ref}. Total ${details.Total}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Send failed";
      console.error("[mail] order confirmation failed", message);
      mail.customer = { sent: false, error: message };
    }
  }
  return { order: saved, access: access ? { email: saved.email, tempPassword: access.tempPassword, isNew: access.isNew } : null, mail };
}

export async function finalizePaidOrder(orderId: string) {
  const saved = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { include: { refunds: true } } },
  });
  if (!saved) return;
  if (saved.status !== "PENDING_PAY") return;
  await db.order.update({ where: { id: saved.id }, data: { status: "NEW" } });
  await queuePrintJobs(saved.id, saved.items.map((item) => item.name));
  if (!saved.email?.includes("@")) return;
  const loc = locations[saved.locationId as LocationId];
  await sendCustomerMail("order_confirmed", saved.email, {
    title: `Order confirmed ${saved.ref}`,
    intro: "Your Double Zero order is confirmed. Keep this email as your receipt.",
    details: {
      Reference: saved.ref,
      Restaurant: loc?.name || saved.locationId,
      Type: saved.source === "DZ_DELIVERY" ? "Home delivery" : saved.source === "CLICK_COLLECT" ? "Click & collect" : saved.source.replace("_", " "),
      When: saved.asap ? "ASAP" : `${saved.date} ${saved.time}`.trim(),
      Name: saved.name,
      Email: saved.email,
      Phone: saved.phone,
      Address: saved.address || "Collection",
      Total: formatMoney(saved.totalPence),
      Payment: `Paid ${formatMoney(saved.totalPence)}`,
      Items: saved.items.map((item) => `${item.quantity}x ${item.name}`).join(", "),
    },
    ctaHref: "/account",
    ctaLabel: "Open my dashboard",
    body: `Order confirmed ${saved.ref}. Total ${formatMoney(saved.totalPence)}.`,
  }).catch((error) => {
    console.error("[mail] order confirmation failed", error instanceof Error ? error.message : error);
  });
}

export async function setOrderStatus(orderId: string, status: string, staffName = "demo") {
  const current = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { include: { refunds: true } } },
  });
  const order = await db.order.update({ where: { id: orderId }, data: { status } });
  if (status === "CANCELLED" && current && current.status !== "CANCELLED") {
    const refunded = await refundAllOpen({
      payments: current.payments,
      reason: "Restaurant cancelled order",
      staffName,
    });
    await sendCancelMail({
      to: current.email,
      ref: current.ref,
      type: current.source === "DZ_DELIVERY" ? "Home delivery" : current.source === "CLICK_COLLECT" ? "Click & collect" : "Order",
      refundedPence: refunded,
      when: current.asap ? "ASAP" : `${current.date} ${current.time}`.trim(),
    });
  }
  if (status === "READY" && order.source === "CLICK_COLLECT" && order.email) {
    await notify("email", "ready_for_collection", order.email, {
      title: `Order ${order.ref} is ready`,
      intro: "Your click & collect order is ready at Double Zero.",
      details: {
        Reference: order.ref,
        Type: "Click & collect",
        When: order.asap ? "ASAP" : `${order.date} ${order.time}`.trim(),
        Restaurant: locations[order.locationId as keyof typeof locations]?.name || order.locationId,
      },
    });
  }
  if (status === "READY" && order.source === "DZ_DELIVERY") {
    await db.delivery.updateMany({ where: { orderId }, data: { status: "COURIER_ASSIGNED" } });
  }
  if (status === "DISPATCHED") {
    try {
      await handToUber(orderId);
    } catch {
      /* kitchen can still mark it out; staff can retry handover */
    }
    await db.delivery.updateMany({ where: { orderId }, data: { status: "ON_THE_WAY" } });
    if (order.email) {
      await notify("email", "delivery_dispatched", order.email, {
        title: `Order ${order.ref} is on the way`,
        intro: "Your Double Zero delivery has left the restaurant.",
        details: {
          Reference: order.ref,
          Type: "Home delivery",
          When: order.asap ? "ASAP" : `${order.date} ${order.time}`.trim(),
          Address: order.address || "",
        },
      });
    }
  }
  if (status === "COMPLETED") {
    await db.delivery.updateMany({ where: { orderId }, data: { status: "DELIVERED" } });
  }
  await db.auditLog.create({
    data: { actor: staffName, action: `order_${status.toLowerCase()}`, entity: "Order", entityId: orderId },
  });
  return order;
}

export async function queuePrintJobs(orderId: string, itemNames: string[]) {
  const drink = /drink|coke|juice|water|sprite|beer|wine/i;
  await db.printJob.create({ data: { orderId, target: "KITCHEN", status: "QUEUED" } });
  if (itemNames.some((name) => drink.test(name))) {
    await db.printJob.create({ data: { orderId, target: "BAR", status: "QUEUED" } });
  }
  await db.printJob.create({ data: { orderId, target: "RECEIPT", status: "QUEUED" } });
}
