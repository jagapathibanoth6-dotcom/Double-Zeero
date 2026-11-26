import { db } from "@/lib/db";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { formatMoney } from "@/lib/platform/money";
import { refundQuote, serializePayments } from "@/lib/platform/pay";
import { refundAllOpen } from "@/lib/platform/payments";
import { revalidateHouse } from "@/lib/platform/admin";

export function customerCanCancelOrder(status?: string) {
  if (status === "CANCELLED" || status === "COMPLETED") return { ok: false, reason: "That order is already finished." };
  if (status === "DISPATCHED") return { ok: false, reason: "This order is already on the way. Call the restaurant." };
  return { ok: true };
}

export function customerCanCancelBooking(status?: string) {
  if (status === "CANCELLED" || status === "COMPLETED") return { ok: false, reason: "That booking is already finished." };
  return { ok: true };
}

export async function customerCancelOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { payments: { include: { refunds: true } } },
  });
  if (!order) throw new Error("Order not found.");
  const gate = customerCanCancelOrder(order.status);
  if (!gate.ok) throw new Error(gate.reason);
  const type = order.source === "DZ_DELIVERY" ? "Home delivery" : order.source === "CLICK_COLLECT" ? "Click & collect" : "Order";
  const refunded = await refundAllOpen({
    payments: order.payments,
    reason: "Customer cancelled order",
    staffName: order.name || "customer",
  });
  await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  const fresh = await db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { payments: { include: { refunds: true } } },
  });
  const quote = refundQuote({
    type,
    name: order.name,
    email: order.email,
    payments: serializePayments(fresh.payments),
  });
  await sendCancelMail({
    to: order.email,
    ref: order.ref,
    type,
    refundedPence: refunded,
    when: order.asap ? "ASAP" : `${order.date} ${order.time}`.trim(),
    extra: {
      "Refund to": [quote.toName, quote.toEmail].filter(Boolean).join(" · "),
      "Refund method": quote.method,
      Direction: quote.direction,
      Paid: formatMoney(quote.paidPence),
      "Cancellation charge": formatMoney(quote.cancelChargePence),
      "Refund total": formatMoney(quote.refundPence),
    },
  });
  revalidateHouse();
  return { order: fresh, refunded, quote };
}

export async function customerCancelBooking(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: { include: { refunds: true } },
      orders: { include: { payments: { include: { refunds: true } } } },
    },
  });
  if (!booking) throw new Error("Booking not found.");
  const gate = customerCanCancelBooking(booking.status);
  if (!gate.ok) throw new Error(gate.reason);
  if (booking.orders.some((order) => order.status === "DISPATCHED")) {
    throw new Error("Food from this booking is already on the way. Call the restaurant.");
  }
  const type = booking.visitType === "collection" ? "Collection" : "Book a table";
  const payments = [...booking.payments, ...booking.orders.flatMap((order) => order.payments)];
  const refunded = await refundAllOpen({
    payments,
    reason: "Customer cancelled booking",
    staffName: booking.name || "customer",
  });
  await db.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
  for (const order of booking.orders) {
    if (order.status === "CANCELLED" || order.status === "COMPLETED") continue;
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  }
  const fresh = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { payments: { include: { refunds: true } }, orders: { include: { payments: { include: { refunds: true } } } } },
  });
  const quote = refundQuote({
    type,
    name: booking.name,
    email: booking.email,
    payments: serializePayments([...fresh.payments, ...fresh.orders.flatMap((order) => order.payments)]),
  });
  await sendCancelMail({
    to: booking.email,
    ref: booking.ref,
    type,
    refundedPence: refunded,
    when: `${booking.date} ${booking.time}`.trim(),
    extra: {
      "Refund to": [quote.toName, quote.toEmail].filter(Boolean).join(" · "),
      "Refund method": quote.method,
      Direction: quote.direction,
      Paid: formatMoney(quote.paidPence),
      "Cancellation charge": formatMoney(quote.cancelChargePence),
      "Refund total": formatMoney(quote.refundPence),
    },
  });
  revalidateHouse();
  return { booking: fresh, refunded, quote };
}
