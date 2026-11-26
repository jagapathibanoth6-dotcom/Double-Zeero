import { db } from "@/lib/db";
import { formatBookingDate, londonParts, todayISO, toMinutes } from "@/lib/booking";
import { isISODate } from "@/lib/platform/diary";
import { requireBranch } from "@/lib/platform/admin";
import { DateNav } from "@/components/admin/DateNav";
import { TableBoard } from "@/components/admin/TableBoard";
import { TableDesk } from "@/components/admin/TableDesk";
import { codesOfTable } from "@/lib/platform/booking";

export const dynamic = "force-dynamic";

export default async function AdminTables({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const branch = await requireBranch();
  const params = await searchParams;
  const today = todayISO();
  const date = isISODate(params.date) ? params.date : today;
  const isToday = date === today;
  const now = londonParts();
  const nowMins = toMinutes(`${now.hour}:${now.minute}`);

  const [tables, bookings] = await Promise.all([
    db.table.findMany({
      where: { locationId: branch },
      orderBy: [{ y: "asc" }, { x: "asc" }, { code: "asc" }],
    }),
    db.booking.findMany({
      where: { locationId: branch, date, status: { notIn: ["CANCELLED", "DECLINED"] } },
      include: {
        customer: true,
        party: { include: { guests: true } },
        payments: { include: { refunds: true } },
        orders: { include: { items: true, guest: true, payments: { include: { refunds: true } } } },
      },
      orderBy: { time: "asc" },
    }),
  ]);

  const assigned = bookings.filter((booking) => booking.visitType !== "collection" && booking.tableCodes.trim()).length;
  const covers = bookings.reduce((sum, booking) => sum + booking.guests, 0);
  const held = await db.booking.findMany({
    where: {
      locationId: branch,
      date: { gte: today },
      visitType: { not: "collection" },
      status: { notIn: ["CANCELLED", "DECLINED"] },
    },
    select: { tableCodes: true },
  });
  const occupied = [...new Set(held.flatMap((booking) => codesOfTable(booking.tableCodes)))];

  return (
    <div className="today-page">
      <div className="today-hero">
        <div>
          <DateNav date={date} today={today} base="/admin/tables" />
          <h1 className="admin-page-title">Tables</h1>
          <p className="admin-page-copy">
            {formatBookingDate(date)} · {assigned} assigned · {covers} covers
          </p>
        </div>
      </div>

      <section className="admin-panel">
        <div className="today-panel-head">
          <div>
            <h2>House tables</h2>
            <p>Guest, food order, payment and status on each table.</p>
          </div>
        </div>
        <TableBoard tables={tables} bookings={bookings} nowMins={nowMins} isToday={isToday} />
      </section>

      <section className="admin-panel floor-setup">
        <div className="today-panel-head">
          <div>
            <h2>Tables</h2>
            <p>Table number and seats. Booking uses this list.</p>
          </div>
        </div>
        <TableDesk tables={tables} occupied={occupied} />
      </section>
    </div>
  );
}
