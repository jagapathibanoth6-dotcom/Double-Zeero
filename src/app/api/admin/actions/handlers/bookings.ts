/** Bookings, walk-ins, enquiries and the waitlist. */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookWaitlist, convertEnquiry, createWalkIn, offerWaitlist } from "@/lib/platform/booking";
import { setOrderStatus } from "@/lib/platform/orders";
import { notify } from "@/lib/platform/notify";
import { todayISO } from "@/lib/booking";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { refundAllOpen } from "@/lib/platform/payments";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
import { getStaffBranch } from "@/lib/platform/session";
import type { ActionHandlers } from "./types";

export const bookingsActions: ActionHandlers = {
  update_booking: async ({ staff, body }) => {
    const existing = await db.booking.findUnique({
      where: { id: String(body.id) },
      include: { payments: { include: { refunds: true } } },
    });
    if (!existing) throw new Error("Booking not found.");
    await assertStaffBranch(existing.locationId);
    const nextStatus = String(body.status || "CONFIRMED");
    if (nextStatus === "CANCELLED" && existing.status !== "CANCELLED") {
      const refunded = await refundAllOpen({
        payments: existing.payments,
        reason: "Restaurant cancelled booking",
        staffName: staff.name,
      });
      await sendCancelMail({
        to: existing.email,
        ref: existing.ref,
        type: existing.visitType === "collection" ? "Collection" : "Book a table",
        refundedPence: refunded,
        when: `${existing.date} ${existing.time}`.trim(),
      });
    }
    const booking = await db.booking.update({
      where: { id: existing.id },
      data: {
        name: String(body.name || "").trim(),
        email: String(body.email || "").trim().toLowerCase(),
        phone: String(body.phone || "").trim(),
        notes: String(body.notes || "").trim(),
        status: nextStatus,
        tableCodes: String(body.tableCodes || "").trim(),
      },
    });
    revalidateHouse();
    return NextResponse.json({ booking });
  },

  create_walkin: async ({ body }) => {
    const locationId = await getStaffBranch();
    const booking = await createWalkIn({
      locationId,
      date: String(body.date || todayISO()),
      time: String(body.time || ""),
      guests: Number(body.guests || 2),
      name: String(body.name || "Walk-in"),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      notes: String(body.notes || ""),
      tableCodes: String(body.tableCodes || ""),
    });
    revalidateHouse();
    return NextResponse.json({ booking });
  },

  cancel_booking: async ({ staff, body }) => {
    const existing = await db.booking.findUnique({
      where: { id: String(body.bookingId) },
      include: { payments: { include: { refunds: true } } },
    });
    if (!existing) throw new Error("Booking not found.");
    await assertStaffBranch(existing.locationId);
    if (existing.status === "CANCELLED" || existing.status === "COMPLETED") {
      throw new Error("That booking is already finished.");
    }
    const refunded = await refundAllOpen({
      payments: existing.payments,
      reason: "Restaurant cancelled booking",
      staffName: staff.name,
    });
    const booking = await db.booking.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
    });
    await sendCancelMail({
      to: existing.email,
      ref: existing.ref,
      type: existing.source === "walk-in" ? "Walk-in" : existing.visitType === "collection" ? "Collection" : "Book a table",
      refundedPence: refunded,
      when: `${existing.date} ${existing.time}`.trim(),
    });
    revalidateHouse();
    return NextResponse.json({ booking, refundedPence: refunded });
  },

  delete_booking: async ({ staff, body }) => {
    const existing = await db.booking.findUnique({
      where: { id: String(body.bookingId) },
      include: {
        payments: { include: { refunds: true } },
        orders: { include: { payments: { include: { refunds: true } } } },
      },
    });
    if (!existing) throw new Error("Booking not found.");
    await assertStaffBranch(existing.locationId);
    if (existing.source !== "walk-in") {
      throw new Error("Only walk-ins can be deleted. Cancel a website booking instead.");
    }
    await refundAllOpen({
      payments: existing.payments,
      reason: "Restaurant deleted walk-in",
      staffName: staff.name,
    });
    for (const order of existing.orders) {
      if (order.status !== "CANCELLED" && order.status !== "COMPLETED") {
        await setOrderStatus(order.id, "CANCELLED", staff.name);
      }
    }
    await db.payment.updateMany({ where: { bookingId: existing.id }, data: { bookingId: null } });
    await db.order.updateMany({ where: { bookingId: existing.id }, data: { bookingId: null } });
    await db.booking.delete({ where: { id: existing.id } });
    revalidateHouse();
    return NextResponse.json({ ok: true });
  },

  convert_enquiry: async ({ staff, body }) => {
    const enquiry = await db.enquiry.findUnique({ where: { id: String(body.enquiryId) } });
    if (!enquiry) throw new Error("Enquiry not found.");
    await assertStaffBranch(enquiry.locationId);
    const result = await convertEnquiry(enquiry.id, String(body.time), staff.name);
    return NextResponse.json(result);
  },

  decline_enquiry: async ({ body }) => {
    const existing = await db.enquiry.findUnique({ where: { id: String(body.enquiryId) } });
    if (!existing) throw new Error("Enquiry not found.");
    await assertStaffBranch(existing.locationId);
    const enquiry = await db.enquiry.update({
      where: { id: existing.id },
      data: { status: "DECLINED" },
    });
    await notify("email", "enquiry_declined", enquiry.email, {
      title: "Update on your Double Zero enquiry",
      intro: "We could not take that large-group request this time. Reply to this email if you'd like another date.",
      details: { Reference: enquiry.ref, Date: enquiry.date, Guests: String(enquiry.guests) },
    });
    return NextResponse.json({ enquiry });
  },

  waitlist_status: async ({ staff, body }) => {
    const existing = await db.waitlistEntry.findUnique({ where: { id: String(body.id) } });
    if (!existing) throw new Error("Waitlist entry not found.");
    await assertStaffBranch(existing.locationId);
    if (body.status === "OFFERED") {
      const entry = await offerWaitlist(existing.id, staff.name);
      return NextResponse.json({ entry });
    }
    const entry = await db.waitlistEntry.update({
      where: { id: existing.id },
      data: { status: String(body.status) },
    });
    return NextResponse.json({ entry });
  },

  waitlist_book: async ({ staff, body }) => {
    const existing = await db.waitlistEntry.findUnique({ where: { id: String(body.id) } });
    if (!existing) throw new Error("Waitlist entry not found.");
    await assertStaffBranch(existing.locationId);
    const result = await bookWaitlist(existing.id, staff.name, body.time ? String(body.time) : undefined);
    return NextResponse.json(result);
  },
};
