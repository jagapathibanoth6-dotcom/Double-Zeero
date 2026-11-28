import { db } from "@/lib/db";
import type { LocationId } from "@/data/site";
import { formatMoney } from "@/lib/platform/money";
import { uniqueRef } from "@/lib/platform/refs";
import { sendCustomerMail, type MailBundle } from "@/lib/platform/mail-events";
import { notify } from "@/lib/platform/notify";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { charge, refundAllOpen } from "@/lib/platform/payments";
import { getSettings } from "@/lib/platform/settings";
import { issueCustomerAccess } from "@/lib/platform/customer-access";
import { locations } from "@/data/site";
import { kitchenAsap, kitchenHours, timeWithinKitchen } from "@/lib/platform/hours";
import { todayISO } from "@/lib/booking";
import { priceLine, type BasketItem } from "@/lib/platform/pricing";
import { cleanVia } from "@/lib/platform/via";

export async function ensureOrderVia() {
  const columns = (await db.$queryRawUnsafe(`PRAGMA table_info('Order')`)) as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "via")) {
    await db.$executeRawUnsafe(`ALTER TABLE "Order" ADD COLUMN via TEXT NOT NULL DEFAULT ""`);
  }
}

export type { BasketItem } from "@/lib/platform/pricing";

/**
 * Re-price a customer's basket from the database (see priceLine).
 * Prices sent by the browser are never trusted.
 */
export async function priceBasket(locationId: LocationId, items: BasketItem[]): Promise<BasketItem[]> {
  const ids = [...new Set(items.map((item) => item.productId).filter(Boolean))] as string[];
  const products = await db.menuProduct.findMany({
    where: { id: { in: ids }, available: true },
    include: { prices: { where: { locationId, available: true } } },
  });
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => priceLine(item, item.productId ? byId.get(item.productId) : undefined));
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
  bookingId?: string;
  partyId?: string;
  guestId?: string;
  offerId?: string;
  chargeNow?: boolean;
  via?: string;
}) {
  await ensureOrderVia();
  if (!input.items.length) throw new Error("Basket is empty.");
  // Prices sent by the browser are never trusted: every line is re-priced here.
  input = { ...input, items: await priceBasket(input.locationId, input.items) };
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
  const found = input.offerId ? await db.offer.findUnique({ where: { id: input.offerId } }) : null;
  // Only apply offers that are live, not expired, and meant for this restaurant and order type.
  const offer =
    found &&
    found.active &&
    (!found.expiresAt || found.expiresAt > new Date()) &&
    (!found.locationId || found.locationId === input.locationId) &&
    (!found.orderType || found.orderType === input.source)
      ? found
      : null;
  const discount = applyOffer(subtotal, offer);
  const orderKind = "collect";
  const whenDate = input.date || todayISO();
  const hours = kitchenHours(input.locationId, settings, whenDate);

  if (input.asap) {
    const asap = kitchenAsap(input.locationId, settings, orderKind, whenDate);
    if (!asap.ok) throw new Error(asap.reason);
  } else if (input.source === "CLICK_COLLECT") {
    if (!input.time) throw new Error("Choose a collection time or ASAP.");
    if (!timeWithinKitchen(hours, input.time, orderKind)) {
      throw new Error(
        hours
          ? `${locations[input.locationId].shortName} kitchen hours are ${hours.open}–${hours.close}.`
          : `${locations[input.locationId].shortName} is closed that day.`,
      );
    }
  }

  if (input.source === "CLICK_COLLECT" && input.time && input.date && !input.asap) {
    const used = await db.order.count({
      where: { locationId: input.locationId, date: input.date, time: input.time, source: input.source },
    });
    if (used >= settings.collectionMaxPerSlot) throw new Error("That time is full.");
  }

  const holdPay = input.chargeNow === false && input.source === "CLICK_COLLECT";
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
      subtotalPence: subtotal,
      discountPence: discount,
      totalPence: subtotal - discount,
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
  return { order: saved, access: access ? { email: saved.email, tempPassword: access.created ? access.tempPassword : null, isNew: access.created } : null, mail };
}

export async function finalizePaidOrder(orderId: string) {
  const saved = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { include: { refunds: true } } },
  });
  if (!saved) return;
  if (saved.status !== "PENDING_PAY") return;
  await db.order.update({ where: { id: saved.id }, data: { status: "NEW" } });
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
  await db.auditLog.create({
    data: { actor: staffName, action: `order_${status.toLowerCase()}`, entity: "Order", entityId: orderId },
  });
  return order;
}
