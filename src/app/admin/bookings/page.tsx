import { db } from "@/lib/db";
import { todayISO } from "@/lib/booking";
import { type SlotItem } from "@/components/admin/BookingDiary";
import { DiaryToolbar } from "@/components/admin/DiaryToolbar";
import { endTime, isISODate } from "@/lib/platform/diary";
import { diaryHoursLive } from "@/lib/platform/diary-live";
import { TABLE_SITTING_MIN } from "@/lib/platform/money";
import { locations } from "@/data/site";
import { formatMoney } from "@/lib/platform/money";
import { paySummary } from "@/lib/platform/pay";
import { requireBranch } from "@/lib/platform/admin";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";

export const dynamic = "force-dynamic";

export default async function AdminBookings({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const location = await requireBranch();
  const params = await searchParams;
  const today = todayISO();
  const upcoming = !params.date
    ? await db.booking.findFirst({
        where: { locationId: location, date: { gte: today }, status: { notIn: ["CANCELLED", "DECLINED"] } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      })
    : null;
  const date = isISODate(params.date) ? params.date : upcoming?.date || today;
  const hours = await diaryHoursLive(location, date);

  const [bookings, orders, tables] = await Promise.all([
    db.booking.findMany({
      where: { locationId: location, date, status: { notIn: ["CANCELLED", "DECLINED"] } },
      include: { party: true, payments: { include: { refunds: true } }, orders: { include: { items: true, payments: { include: { refunds: true } } } } },
      orderBy: { time: "asc" },
    }),
    db.order.findMany({
      where: {
        locationId: location,
        date,
        source: { in: ["CLICK_COLLECT", "DZ_DELIVERY", "POS"] },
        status: { notIn: ["CANCELLED"] },
      },
      include: { payments: { include: { refunds: true } }, items: true },
      orderBy: [{ time: "asc" }, { createdAt: "asc" }],
    }),
    db.table.findMany({
      where: { locationId: location, active: true },
      orderBy: { code: "asc" },
      select: { code: true, seats: true },
    }),
  ]);

  const items: SlotItem[] = [
    ...bookings.map((b) => {
      const payments = [...b.payments, ...b.orders.flatMap((order) => order.payments)];
      const due = b.orders.reduce((sum, order) => sum + order.totalPence, 0);
      const bill = paySummary(due, payments);
      const food = b.orders.flatMap((order) => order.items.map((item) => `${item.quantity}× ${item.name}`));
      return {
        id: b.id,
        time: b.time,
        durationMin: b.visitType === "table" ? TABLE_SITTING_MIN : 15,
        until: b.visitType === "table" ? endTime(b.time, TABLE_SITTING_MIN) : undefined,
        name: b.name,
        ref: b.ref,
        guests: b.guests,
        tableCodes: b.tableCodes,
        status: b.status,
        kind: (b.source === "walk-in" ? "walkin" : b.visitType === "collection" ? "collect" : "inside") as SlotItem["kind"],
        note: b.source === "walk-in" ? "Walk-in" : b.party ? `party ${b.party.code}` : undefined,
        href: `/admin/bookings/${b.id}`,
        paid: bill.label === "Paid",
        payText:
          bill.refundedPence > 0
            ? `${bill.label} · refunded ${formatMoney(bill.refundedPence)}`
            : due
              ? `${bill.label} · ${formatMoney(bill.paidPence)} paid · ${formatMoney(bill.leftPence)} left`
              : bill.label,
        items: food.join(", "),
      };
    }),
    ...orders
      .filter((o) => !o.bookingId)
      .map((o) => {
        const bill = paySummary(o.totalPence, o.payments);
        return {
          id: o.id,
          time: o.asap ? "ASAP" : o.time,
          name: o.name || (o.source === "POS" ? "Walk-in" : "Order"),
          ref: o.ref,
          status: o.status,
          kind: (o.source === "DZ_DELIVERY" ? "delivery" : o.source === "POS" ? "walkin" : "collect") as SlotItem["kind"],
          note: o.source === "DZ_DELIVERY" ? "Home delivery" : o.source === "POS" ? "Walk-in" : "Click & collect",
          href: `/admin/orders/${o.id}`,
          paid: bill.label === "Paid",
          payText:
            bill.refundedPence > 0
              ? `${bill.label} · refunded ${formatMoney(bill.refundedPence)}`
              : `${bill.label} · ${formatMoney(bill.paidPence)} paid · ${formatMoney(bill.leftPence)} left`,
          items: o.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
        };
      }),
  ];

  return (
    <div className="admin-diary-page">
      <KitchenRefresh every={3000} />
      <DiaryToolbar
        date={date}
        today={today}
        branchName={locations[location].shortName}
        items={items}
        tables={tables}
        open={hours?.open}
        close={hours?.close}
        live={date === today}
      />
    </div>
  );
}
