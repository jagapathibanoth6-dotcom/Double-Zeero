import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { formatBookingDate } from "@/lib/booking";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { requireBranchRecord } from "@/lib/platform/admin";
import { formatMoney } from "@/lib/platform/money";
import { paidPence } from "@/lib/platform/pay";

export const dynamic = "force-dynamic";

export default async function AdminDeleteBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: { payments: { include: { refunds: true } }, orders: true },
  });
  if (!booking) notFound();
  await requireBranchRecord(booking.locationId);

  const loc = locations[booking.locationId as keyof typeof locations];
  const refund = paidPence(booking.payments);
  const walkIn = booking.source === "walk-in";

  return (
    <div className="record-page">
      <Link href={`/admin/bookings/${booking.id}`} className="record-back">
        ← Back to booking
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">Delete walk-in</p>
          <h1 className="admin-page-title">{booking.name}</h1>
          <p className="admin-page-copy">
            {booking.ref} · {loc?.shortName || booking.locationId} · {formatBookingDate(booking.date)} at {booking.time}
          </p>
        </div>
      </div>
      <section className="admin-panel">
        <h2>{walkIn ? "Delete this walk-in" : "This booking cannot be deleted"}</h2>
        <p className="admin-page-copy">
          {!walkIn
            ? "Website bookings stay on record. Cancel them instead."
            : refund
              ? `${formatMoney(refund)} will be refunded. This walk-in is removed from the diary and cannot be undone.`
              : "This walk-in is removed from the diary and cannot be undone."}
        </p>
        {walkIn ? (
          <dl className="record-dl mt-6">
            <div>
              <dt>Guest</dt>
              <dd>{booking.name}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{booking.guests}</dd>
            </div>
            <div>
              <dt>Tables</dt>
              <dd>{booking.tableCodes || "Unassigned"}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd>{booking.orders.length ? `${booking.orders.length} on this sitting` : "None"}</dd>
            </div>
          </dl>
        ) : null}
        <div className="order-record-actions mt-6">
          {walkIn ? (
            <ActionButton action="delete_booking" body={{ bookingId: booking.id }} label="Confirm delete" next="/admin/bookings" />
          ) : (
            <Link href={`/admin/bookings/${booking.id}/cancel`} className="btn btn-ghost">
              Cancel booking
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
