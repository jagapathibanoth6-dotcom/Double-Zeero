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

export default async function AdminCancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: { payments: { include: { refunds: true } } },
  });
  if (!booking) notFound();
  await requireBranchRecord(booking.locationId);

  const loc = locations[booking.locationId as keyof typeof locations];
  const refund = paidPence(booking.payments);
  const done = booking.status === "CANCELLED" || booking.status === "COMPLETED";
  const kind =
    booking.source === "walk-in" ? "Walk-in" : booking.visitType === "collection" ? "Click & collect" : "Inside table";

  return (
    <div className="record-page">
      <Link href={`/admin/bookings/${booking.id}`} className="record-back">
        ← Back to booking
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">Cancel booking</p>
          <h1 className="admin-page-title">{booking.name}</h1>
          <p className="admin-page-copy">
            {booking.ref} · {kind} · {loc?.shortName || booking.locationId} · {formatBookingDate(booking.date)} at {booking.time}
          </p>
        </div>
      </div>
      <section className="admin-panel">
        <h2>{done ? "This booking cannot be cancelled" : "Cancel this booking"}</h2>
        <p className="admin-page-copy">
          {done
            ? "It is already finished or cancelled."
            : refund
              ? `${formatMoney(refund)} will be refunded to the same payment method. The sitting comes off the diary.`
              : "Nothing is left to refund. The sitting comes off the diary."}
        </p>
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
        </dl>
        <div className="order-record-actions mt-6">
          {done ? (
            <Link href={`/admin/bookings/${booking.id}`} className="btn btn-ghost">
              Back to booking
            </Link>
          ) : (
            <ActionButton action="cancel_booking" body={{ bookingId: booking.id }} label="Confirm cancel" next="/admin/bookings" />
          )}
        </div>
      </section>
    </div>
  );
}
