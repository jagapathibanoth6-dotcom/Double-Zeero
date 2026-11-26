/** Refunds and marking bookings/orders as paid. */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { charge, refundAcross } from "@/lib/platform/payments";
import { isPaid } from "@/lib/platform/pay";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
import type { ActionHandlers } from "./types";

export const paymentsActions: ActionHandlers = {
  refund: async ({ staff, body }) => {
    const amountPence = body.amountPence != null && body.amountPence !== "" ? Math.round(Number(body.amountPence)) : undefined;
    const reason = String(body.reason || (amountPence ? "Partial refund" : "Full refund"));
    if (body.orderId) {
      const order = await db.order.findUnique({
        where: { id: String(body.orderId) },
        include: { payments: { include: { refunds: true } } },
      });
      if (!order) throw new Error("Order not found.");
      await assertStaffBranch(order.locationId);
      const refunded = await refundAcross({
        payments: order.payments,
        amountPence,
        reason,
        staffName: staff.name,
      });
      revalidateHouse();
      return NextResponse.json({ refunded });
    }
    if (body.bookingId) {
      const booking = await db.booking.findUnique({
        where: { id: String(body.bookingId) },
        include: {
          payments: { include: { refunds: true } },
          orders: { include: { payments: { include: { refunds: true } } } },
        },
      });
      if (!booking) throw new Error("Booking not found.");
      await assertStaffBranch(booking.locationId);
      const refunded = await refundAcross({
        payments: [...booking.payments, ...booking.orders.flatMap((order) => order.payments)],
        amountPence,
        reason,
        staffName: staff.name,
      });
      revalidateHouse();
      return NextResponse.json({ refunded });
    }
    const ids = [
      body.paymentId ? String(body.paymentId) : "",
      ...((Array.isArray(body.paymentIds) ? body.paymentIds : []) as unknown[]).map((id) => String(id || "")),
    ].filter(Boolean);
    const payments = await db.payment.findMany({
      where: { id: { in: ids } },
      include: { refunds: true, booking: true, order: true },
    });
    if (!payments.length) throw new Error("Payment not found.");
    for (const payment of payments) {
      const locationId = payment.booking?.locationId || payment.order?.locationId;
      if (locationId) await assertStaffBranch(locationId);
    }
    const refunded = await refundAcross({
      payments,
      amountPence,
      reason,
      staffName: staff.name,
    });
    revalidateHouse();
    return NextResponse.json({ refunded });
  },

  set_paid: async ({ body }) => {
    const paid = Boolean(body.paid);
    if (body.orderId) {
      const order = await db.order.findUnique({
        where: { id: String(body.orderId) },
        include: { payments: true },
      });
      if (!order) throw new Error("Order not found.");
      await assertStaffBranch(order.locationId);
      if (paid && !isPaid(order.payments)) {
        await charge({ amountPence: order.totalPence, kind: "ORDER", orderId: order.id, to: order.email || undefined });
      }
      if (!paid) {
        await db.payment.updateMany({ where: { orderId: order.id, status: { in: ["PAID", "PARTIAL_REFUND"] } }, data: { status: "UNPAID" } });
      }
      revalidateHouse();
      return NextResponse.json({ ok: true, paid });
    }
    const booking = await db.booking.findUnique({
      where: { id: String(body.bookingId) },
      include: { payments: true },
    });
    if (!booking) throw new Error("Booking not found.");
    await assertStaffBranch(booking.locationId);
    if (paid && !isPaid(booking.payments)) {
      await charge({
        amountPence: Number(body.amountPence || 0),
        kind: "DEPOSIT",
        bookingId: booking.id,
        to: booking.email,
      });
      if (booking.status === "PENDING_DEPOSIT") {
        await db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
      }
    }
    if (!paid) {
      await db.payment.updateMany({ where: { bookingId: booking.id, status: { in: ["PAID", "PARTIAL_REFUND"] } }, data: { status: "UNPAID" } });
    }
    revalidateHouse();
    return NextResponse.json({ ok: true, paid });
  },
};
