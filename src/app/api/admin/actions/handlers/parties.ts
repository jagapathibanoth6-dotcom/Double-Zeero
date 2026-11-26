/** Party menus attached to large bookings. */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notify } from "@/lib/platform/notify";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { refundAllOpen } from "@/lib/platform/payments";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
import type { ActionHandlers } from "./types";

export const partiesActions: ActionHandlers = {
  party_resend: async ({ body }) => {
    const party = await db.party.findUnique({ where: { id: String(body.id) }, include: { booking: true } });
    if (!party) throw new Error("Party not found.");
    await assertStaffBranch(party.booking.locationId);
    await notify("email", "party_created", party.booking.email, {
      title: `Party menu for ${party.booking.ref}`,
      intro: "Share this link so guests can choose their food.",
      details: { Reference: party.booking.ref, Code: party.code },
      ctaHref: `/party/${party.code}`,
      ctaLabel: "Open party menu",
    });
    return NextResponse.json({ ok: true });
  },

  party_update: async ({ body }) => {
    const party = await db.party.findUnique({ where: { id: String(body.id) }, include: { booking: true } });
    if (!party) throw new Error("Party not found.");
    await assertStaffBranch(party.booking.locationId);
    const updated = await db.party.update({
      where: { id: party.id },
      data: {
        paymentMode: String(body.paymentMode || party.paymentMode),
        deadlineAt: body.deadlineAt ? new Date(String(body.deadlineAt)) : party.deadlineAt,
      },
    });
    return NextResponse.json({ party: updated });
  },

  party_cancel: async ({ staff, body }) => {
    const party = await db.party.findUnique({
      where: { id: String(body.id) },
      include: { booking: { include: { payments: { include: { refunds: true } } } } },
    });
    if (!party) throw new Error("Party not found.");
    await assertStaffBranch(party.booking.locationId);
    if (party.booking.status !== "CANCELLED") {
      const refunded = await refundAllOpen({
        payments: party.booking.payments,
        reason: "Restaurant cancelled party booking",
        staffName: staff.name,
      });
      await sendCancelMail({
        to: party.booking.email,
        ref: party.booking.ref,
        type: party.booking.visitType === "collection" ? "Collection" : "Book a table",
        refundedPence: refunded,
        when: `${party.booking.date} ${party.booking.time}`.trim(),
      });
    }
    await db.booking.update({ where: { id: party.bookingId }, data: { status: "CANCELLED" } });
    revalidateHouse();
    return NextResponse.json({ ok: true });
  },
};
