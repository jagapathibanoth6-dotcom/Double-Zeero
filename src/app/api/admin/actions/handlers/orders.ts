/** Kitchen and order desk actions. */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrder, nextOrderRef, queuePrintJobs, setOrderStatus } from "@/lib/platform/orders";
import { handToUber } from "@/lib/platform/uber";
import { todayISO } from "@/lib/booking";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
import { getStaffBranch } from "@/lib/platform/session";
import type { ActionHandlers } from "./types";

export const ordersActions: ActionHandlers = {
  order_status: async ({ staff, body }) => {
    const existing = await db.order.findUnique({ where: { id: String(body.orderId) } });
    if (!existing) throw new Error("Order not found.");
    await assertStaffBranch(existing.locationId);
    const order = await setOrderStatus(existing.id, String(body.status), staff.name);
    revalidateHouse();
    return NextResponse.json({ order });
  },

  uber_handover: async ({ body }) => {
    const existing = await db.order.findUnique({ where: { id: String(body.orderId) } });
    if (!existing) throw new Error("Order not found.");
    await assertStaffBranch(existing.locationId);
    const delivery = await handToUber(existing.id);
    revalidateHouse();
    return NextResponse.json({ delivery });
  },

  delete_order: async ({ staff, body }) => {
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
  },

  create_pos_order: async ({ body }) => {
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
  },

  reprint: async ({ body }) => {
    const order = await db.order.findUnique({ where: { id: String(body.orderId) }, include: { items: true } });
    if (!order) throw new Error("Order not found.");
    await assertStaffBranch(order.locationId);
    await queuePrintJobs(order.id, order.items.map((item) => item.name));
    return NextResponse.json({ ok: true });
  },

  print_done: async ({ body }) => {
    const job = await db.printJob.update({
      where: { id: String(body.id) },
      data: { status: "PRINTED", printedAt: new Date() },
    });
    return NextResponse.json({ job });
  },

  marketplace_order: async ({ body }) => {
    const order = await db.order.create({
      data: {
        ref: await nextOrderRef(),
        locationId: await getStaffBranch(),
        source: String(body.source),
        status: "NEW",
        name: String(body.name || body.source),
        totalPence: Number(body.totalPence || 0),
        notes: String(body.notes || "Imported marketplace order"),
      },
    });
    return NextResponse.json({ order });
  },
};
