import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { londonDayRange, londonParts, todayISO, toMinutes } from "@/lib/booking";
import { requireBranch } from "@/lib/platform/admin";
import { getSettings } from "@/lib/platform/settings";
import { formatOrderWhen, orderTypeLabel } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

function dueInMinutes(order: { asap: boolean; date: string; time: string; createdAt: Date }) {
  const now = londonParts();
  const nowMins = toMinutes(`${now.hour}:${now.minute}`);
  if (order.asap) {
    const age = Math.round((Date.now() - order.createdAt.getTime()) / 60000);
    return -age;
  }
  if (order.date !== todayISO() || !order.time) return 999;
  return toMinutes(order.time) - nowMins;
}

export async function GET() {
  const branch = await requireBranch();
  const today = todayISO();
  const { start, end } = londonDayRange(today);
  const settings = await getSettings(branch);

  const orders = await db.order.findMany({
    where: {
      locationId: branch,
      source: { in: ["CLICK_COLLECT", "DZ_DELIVERY"] },
      status: { notIn: ["CANCELLED", "COMPLETED", "PENDING_PAY"] },
      OR: [{ date: today }, { date: "", createdAt: { gte: start, lt: end } }],
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const alerts = orders.map((order) => {
    const remindAt = order.source === "DZ_DELIVERY" ? settings.deliveryRemindMinutes : settings.collectionRemindMinutes;
    const due = dueInMinutes(order);
    return {
      id: order.id,
      ref: order.ref,
      source: order.source,
      label: orderTypeLabel(order.source),
      name: order.name || "Guest",
      when: formatOrderWhen(order),
      items: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
      createdAt: order.createdAt.toISOString(),
      dueIn: due,
      remindAt,
      isNew: Date.now() - order.createdAt.getTime() < 15 * 60 * 1000,
      isDue: due <= remindAt,
    };
  });

  return NextResponse.json({
    alerts,
    collectionRemindMinutes: settings.collectionRemindMinutes,
    deliveryRemindMinutes: settings.deliveryRemindMinutes,
  });
}
