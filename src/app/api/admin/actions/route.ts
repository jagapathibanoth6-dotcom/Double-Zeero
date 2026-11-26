import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookWaitlist, convertEnquiry, createWalkIn, guestsOnTables, offerWaitlist } from "@/lib/platform/booking";
import { createOrder, queuePrintJobs, setOrderStatus } from "@/lib/platform/orders";
import { handToUber } from "@/lib/platform/uber";
import { notify } from "@/lib/platform/notify";
import { todayISO } from "@/lib/booking";
import { createQrCode, deleteQrCode, findQrById } from "@/lib/platform/qr";
import { sendCancelMail } from "@/lib/platform/pay-mail";
import { charge, refundAllOpen, refundAcross, refundPayment } from "@/lib/platform/payments";
import { isPaid } from "@/lib/platform/pay";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
import { bustMenuCache } from "@/lib/platform/menu";
import { ensureSettingColumns } from "@/lib/platform/settings";
import { getStaff, getStaffBranch } from "@/lib/platform/session";

async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error("Sign in required.");
  return staff;
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "order_status") {
      const existing = await db.order.findUnique({ where: { id: String(body.orderId) } });
      if (!existing) throw new Error("Order not found.");
      await assertStaffBranch(existing.locationId);
      const order = await setOrderStatus(existing.id, String(body.status), staff.name);
      revalidateHouse();
      return NextResponse.json({ order });
    }
    if (action === "uber_handover") {
      const existing = await db.order.findUnique({ where: { id: String(body.orderId) } });
      if (!existing) throw new Error("Order not found.");
      await assertStaffBranch(existing.locationId);
      const delivery = await handToUber(existing.id);
      revalidateHouse();
      return NextResponse.json({ delivery });
    }
    if (action === "delete_order") {
      const existing = await db.order.findUnique({
        where: { id: String(body.orderId) },
        include: { payments: { include: { refunds: true } } },
      });
      if (!existing) throw new Error("Order not found.");
      await assertStaffBranch(existing.locationId);
      if (existing.status !== "CANCELLED") {
        await setOrderStatus(existing.id, "CANCELLED", staff.name);
      }
      await db.refund.deleteMany({ where: { payment: { orderId: existing.id } } });
      await db.payment.deleteMany({ where: { orderId: existing.id } });
      await db.order.delete({ where: { id: existing.id } });
      revalidateHouse();
      return NextResponse.json({ ok: true });
    }
    if (action === "refund") {
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
    }
    if (action === "convert_enquiry") {
      const enquiry = await db.enquiry.findUnique({ where: { id: String(body.enquiryId) } });
      if (!enquiry) throw new Error("Enquiry not found.");
      await assertStaffBranch(enquiry.locationId);
      const result = await convertEnquiry(enquiry.id, String(body.time), staff.name);
      return NextResponse.json(result);
    }
    if (action === "decline_enquiry") {
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
    }
    if (action === "waitlist_status") {
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
    }
    if (action === "waitlist_book") {
      const existing = await db.waitlistEntry.findUnique({ where: { id: String(body.id) } });
      if (!existing) throw new Error("Waitlist entry not found.");
      await assertStaffBranch(existing.locationId);
      const result = await bookWaitlist(existing.id, staff.name, body.time ? String(body.time) : undefined);
      return NextResponse.json(result);
    }
    if (action === "product_available") {
      const available = Boolean(body.available);
      const locationId = await getStaffBranch();
      const productId = String(body.productId);
      const updated = await db.menuPrice.updateMany({
        where: { productId, locationId },
        data: { available },
      });
      if (!updated.count) {
        const source = await db.menuPrice.findFirst({ where: { productId } });
        await db.menuPrice.create({
          data: {
            productId,
            locationId,
            pricePence: source?.pricePence || 0,
            label: source?.label || "",
            available,
          },
        });
      }
      bustMenuCache();
      revalidatePath("/");
      revalidatePath("/menu");
      revalidatePath("/manchester/menu");
      revalidatePath("/chorlton/menu");
      revalidatePath("/manchester");
      revalidatePath("/chorlton");
      revalidatePath("/order/collect");
      revalidatePath("/order/delivery");
      revalidatePath("/admin/menu");
      revalidatePath("/admin/pos");
      revalidatePath("/api/menu");
      return NextResponse.json({ ok: true, locationId, available });
    }
    if (action === "price_available") {
      const existing = await db.menuPrice.findUnique({ where: { id: String(body.priceId) } });
      if (!existing) throw new Error("Price not found.");
      await assertStaffBranch(existing.locationId);
      const price = await db.menuPrice.update({
        where: { id: existing.id },
        data: { available: Boolean(body.available) },
      });
      bustMenuCache();
      return NextResponse.json({ price });
    }
    if (action === "save_settings") {
      await ensureSettingColumns();
      const locationId = await getStaffBranch();
      const sittingCapacity = Math.max(1, Number(body.sittingCapacity || 40));
      const collectionRemindMinutes = Math.max(1, Number(body.collectionRemindMinutes || 15));
      const deliveryRemindMinutes = Math.max(1, Number(body.deliveryRemindMinutes || 20));
      const settings = await db.locationSettings.update({
        where: { locationId },
        data: {
          maxOnlineGuests: Number(body.maxOnlineGuests),
          largeFrom: Number(body.largeFrom),
          maxAutoBooking: Number(body.maxAutoBooking),
          enquiryFrom: Number(body.enquiryFrom),
          depositEnabled: Boolean(body.depositEnabled),
          depositType: String(body.depositType),
          depositAmountPence: Number(body.depositAmountPence),
          depositFrom: Number(body.depositFrom),
          preorderEnabled: Boolean(body.preorderEnabled),
          preorderFrom: Number(body.preorderFrom),
          preorderDeadlineHours: Number(body.preorderDeadlineHours),
          waitlistEnabled: Boolean(body.waitlistEnabled),
          collectionMaxPerSlot: Number(body.collectionMaxPerSlot),
          deliveryEnabled: Boolean(body.deliveryEnabled),
          deliveryFeePence: Number(body.deliveryFeePence),
          deliveryRadiusKm: Number(body.deliveryRadiusKm || 5),
          turnaroundMinutes: Number(body.turnaroundMinutes || 15),
          durationJson: String(body.durationJson || ""),
          hoursJson: String(body.hoursJson || ""),
          collectionHoursJson: String(body.collectionHoursJson || ""),
        },
      });
      const uberCustomerId = String(body.uberCustomerId || "").trim();
      const uberApiKey = String(body.uberApiKey || "").trim();
      const stripeSecretKey = String(body.stripeSecretKey || "").trim();
      const stripePublishableKey = String(body.stripePublishableKey || "").trim();
      const sets = [
        "sittingCapacity = ?",
        "collectionRemindMinutes = ?",
        "deliveryRemindMinutes = ?",
        "uberCustomerId = ?",
      ];
      const vals: Array<string | number> = [sittingCapacity, collectionRemindMinutes, deliveryRemindMinutes, uberCustomerId];
      if (uberApiKey) {
        sets.push("uberApiKey = ?");
        vals.push(uberApiKey);
      }
      if (stripeSecretKey) {
        sets.push("stripeSecretKey = ?");
        vals.push(stripeSecretKey);
      }
      if (stripePublishableKey) {
        sets.push("stripePublishableKey = ?");
        vals.push(stripePublishableKey);
      }
      vals.push(locationId);
      await db.$executeRawUnsafe(`UPDATE LocationSettings SET ${sets.join(", ")} WHERE locationId = ?`, ...vals);
      return NextResponse.json({
        settings: { ...settings, sittingCapacity, collectionRemindMinutes, deliveryRemindMinutes, uberCustomerId },
      });
    }
    if (action === "update_customer") {
      const customer = await db.customer.update({
        where: { id: String(body.id) },
        data: {
          name: String(body.name || "").trim(),
          email: String(body.email || "").trim().toLowerCase(),
          phone: String(body.phone || "").trim(),
        },
      });
      return NextResponse.json({ customer });
    }
    if (action === "update_booking") {
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
    }
    if (action === "set_paid") {
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
    }
    if (action === "create_walkin") {
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
    }
    if (action === "create_pos_order") {
      const locationId = await getStaffBranch();
      const items = Array.isArray(body.items) ? body.items : [];
      const result = await createOrder({
        locationId,
        source: "POS",
        items: items.map((item: { productId?: string; name: string; quantity: number; unitPence: number; notes?: string }) => ({
          productId: item.productId,
          name: String(item.name),
          quantity: Number(item.quantity || 1),
          unitPence: Number(item.unitPence || 0),
          notes: String(item.notes || ""),
        })),
        name: String(body.name || "Walk-in"),
        email: String(body.email || ""),
        phone: String(body.phone || ""),
        notes: String(body.notes || ""),
        date: String(body.date || todayISO()),
        time: String(body.time || ""),
        asap: Boolean(body.asap ?? true),
        bookingId: body.bookingId ? String(body.bookingId) : undefined,
        chargeNow: Boolean(body.paid),
      });
      return NextResponse.json(result);
    }
    if (action === "reprint") {
      const order = await db.order.findUnique({ where: { id: String(body.orderId) }, include: { items: true } });
      if (!order) throw new Error("Order not found.");
      await assertStaffBranch(order.locationId);
      await queuePrintJobs(order.id, order.items.map((item) => item.name));
      return NextResponse.json({ ok: true });
    }
    if (action === "print_done") {
      const job = await db.printJob.update({
        where: { id: String(body.id) },
        data: { status: "PRINTED", printedAt: new Date() },
      });
      return NextResponse.json({ job });
    }
    if (action === "save_table") {
      const locationId = await getStaffBranch();
      const data = {
        locationId,
        code: String(body.code || "").trim().toUpperCase(),
        seats: Number(body.seats || 2),
        x: Number(body.x || 1),
        y: Number(body.y || 1),
        active: body.active !== false,
      };
      if (!data.code) throw new Error("Table code is required.");
      if (body.id && data.active === false) {
        const existing = await db.table.findUnique({ where: { id: String(body.id) } });
        if (existing) {
          const seated = await guestsOnTables(existing.locationId, [existing.code]);
          if (seated.length) {
            const who = seated[0];
            throw new Error(`Cannot turn off ${existing.code}. ${who.name} is on it (${who.guests} pax, ${who.date} ${who.time}).`);
          }
        }
      }
      const table = body.id
        ? await db.table.update({ where: { id: String(body.id) }, data })
        : await db.table.create({ data });
      return NextResponse.json({ table });
    }
    if (action === "delete_table") {
      const table = await db.table.findUnique({ where: { id: String(body.id) } });
      if (!table) throw new Error("Table not found.");
      await assertStaffBranch(table.locationId);
      const seated = await guestsOnTables(table.locationId, [table.code]);
      if (seated.length) {
        const who = seated[0];
        throw new Error(`Cannot delete ${table.code}. ${who.name} is on it (${who.guests} pax, ${who.date} ${who.time}).`);
      }
      await db.table.delete({ where: { id: table.id } });
      return NextResponse.json({ ok: true });
    }
    if (action === "save_combo") {
      const locationId = await getStaffBranch();
      const combo = body.id
        ? await db.tableCombo.update({
            where: { id: String(body.id) },
            data: { codes: String(body.codes || ""), seats: Number(body.seats || 0) },
          })
        : await db.tableCombo.create({
            data: { locationId, codes: String(body.codes || ""), seats: Number(body.seats || 0) },
          });
      return NextResponse.json({ combo });
    }
    if (action === "delete_combo") {
      const combo = await db.tableCombo.findUnique({ where: { id: String(body.id) } });
      if (!combo) throw new Error("Combo not found.");
      const seated = await guestsOnTables(combo.locationId, combo.codes.split(","));
      if (seated.length) {
        throw new Error(`Cannot delete combo ${combo.codes}. Guests are on those tables.`);
      }
      await db.tableCombo.delete({ where: { id: combo.id } });
      return NextResponse.json({ ok: true });
    }
    if (action === "party_resend") {
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
    }
    if (action === "party_update") {
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
    }
    if (action === "party_cancel") {
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
    }
    if (action === "cancel_booking") {
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
    }
    if (action === "delete_booking") {
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
    }
    if (action === "save_qr") {
      const locationId = await getStaffBranch();
      const name = String(body.name || "").trim();
      if (!name) throw new Error("Give this QR a name.");
      const qr = await createQrCode(locationId, name);
      revalidatePath("/admin/settings");
      return NextResponse.json({ qr });
    }
    if (action === "delete_qr") {
      const qr = await findQrById(String(body.id));
      if (!qr) throw new Error("QR code not found.");
      await assertStaffBranch(qr.locationId);
      await deleteQrCode(qr.id);
      revalidatePath("/admin/settings");
      return NextResponse.json({ ok: true });
    }
    if (action === "marketplace_order") {
      const count = await db.order.count();
      const order = await db.order.create({
        data: {
          ref: `O${String(count + 20455).padStart(5, "0")}`,
          locationId: await getStaffBranch(),
          source: String(body.source),
          status: "NEW",
          name: String(body.name || body.source),
          totalPence: Number(body.totalPence || 0),
          notes: String(body.notes || "Imported marketplace order"),
        },
      });
      return NextResponse.json({ order });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed.";
    const status = message === "Sign in required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
