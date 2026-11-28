/** Kitchen and order desk actions (click & collect and party pre-orders). */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setOrderStatus } from "@/lib/platform/orders";
import { assertStaffBranch, revalidateHouse } from "@/lib/platform/admin";
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
};
