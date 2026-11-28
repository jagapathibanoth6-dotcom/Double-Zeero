import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBookingDate } from "@/lib/booking";
import { endTime } from "@/lib/platform/diary";
import { locations, type LocationId } from "@/data/site";
import { formatMoney } from "@/lib/platform/money";
import { requireBranchRecord } from "@/lib/platform/admin";
import { getSettings } from "@/lib/platform/settings";
import { BookingEditForm } from "@/components/admin/BookingForm";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { PaymentBill } from "@/components/admin/PaymentBill";
import { OrderItems } from "@/components/admin/OrderItems";
import { isPaid, paySummary } from "@/lib/platform/pay";
import { statusText, statusTone } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

export default async function AdminBookingRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      party: { include: { guests: true } },
      payments: { include: { refunds: true } },
      orders: { include: { items: true, payments: { include: { refunds: true } } } },
    },
  });
  if (!booking) notFound();
  await requireBranchRecord(booking.locationId);
  const loc = locations[booking.locationId as keyof typeof locations];
  const settings = await getSettings(booking.locationId as LocationId);
  const depositDue =
    booking.status === "PENDING_DEPOSIT" || booking.payments.some((p) => p.kind === "DEPOSIT")
      ? settings.depositType === "PER_PERSON"
        ? settings.depositAmountPence * booking.guests
        : settings.depositAmountPence
      : 0;
  const orderDue = booking.orders.reduce((sum, order) => sum + order.totalPence, 0);
  const due = depositDue + orderDue;
  const payments = [...booking.payments, ...booking.orders.flatMap((order) => order.payments)];
  const bill = paySummary(due, payments);

  return (
    <div className="record-page">
      <Link href="/admin/bookings" className="record-back">
        ← Back to diary
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">
            {booking.source === "walk-in"
              ? "Walk-in"
              : booking.visitType === "collection"
                ? "Click & collect"
                : "Inside table"}
          </p>
          <h1 className="admin-page-title">{booking.name}</h1>
          <p className="admin-page-copy">
            {booking.ref} · {formatBookingDate(booking.date)} at {booking.time} · {loc?.shortName || booking.locationId}
          </p>
        </div>
        <span>
          <span className={`admin-badge ${statusTone(booking.status)}`}>{statusText(booking.status)}</span>
          <PayBadge payments={payments} paid={bill.label === "Paid"} />
        </span>
      </div>

      {booking.status === "CANCELLED" ? (
        <p className="order-flag is-cancelled">This booking is cancelled.</p>
      ) : null}
      {booking.status === "COMPLETED" ? <p className="order-flag is-done">This booking is finished.</p> : null}

      <div className="order-record-actions" style={{ marginTop: 0 }}>
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" ? (
          <Link href={`/admin/bookings/${booking.id}/cancel`} className="btn btn-ghost">
            Cancel
          </Link>
        ) : null}
        {booking.source === "walk-in" ? (
          <Link href={`/admin/bookings/${booking.id}/delete`} className="btn btn-ghost">
            Delete
          </Link>
        ) : null}
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat is-gold">
          <p>Total</p>
          <strong>{formatMoney(bill.duePence)}</strong>
        </div>
        <div className="admin-stat is-forest">
          <p>Paid</p>
          <strong>{formatMoney(bill.paidPence)}</strong>
        </div>
        <div className="admin-stat">
          <p>Refunded</p>
          <strong>{formatMoney(bill.refundedPence)}</strong>
        </div>
        <div className="admin-stat is-ember">
          <p>Left to pay</p>
          <strong>{formatMoney(bill.leftPence)}</strong>
        </div>
      </div>

      <div className="record-grid">
        <section className="admin-panel">
          <h2>Booking details</h2>
          <dl className="record-dl">
            <div>
              <dt>When</dt>
              <dd>
                {formatBookingDate(booking.date)} · {booking.time}–{endTime(booking.time, booking.durationMin || 90)} · 1 hr 30 min
              </dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>
                {booking.guests} {booking.highchair ? "· highchair" : ""}
              </dd>
            </div>
            <div>
              <dt>Tables</dt>
              <dd>{booking.tableCodes || "Unassigned"}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                {booking.source === "walk-in"
                  ? "Walk-in"
                  : booking.visitType === "collection"
                    ? "Click & collect"
                    : "Inside table"}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{booking.source}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {booking.email}
                <br />
                {booking.phone || "No phone"}
              </dd>
            </div>
          </dl>
          {booking.customer ? (
            <Link href={`/admin/customers/${booking.customer.id}`} className="record-link">
              Open customer {booking.customer.name}
            </Link>
          ) : null}
        </section>

        <section className="admin-panel">
          <h2>Update</h2>
          <BookingEditForm
            id={booking.id}
            name={booking.name}
            email={booking.email}
            phone={booking.phone}
            notes={booking.notes}
            status={booking.status}
            tableCodes={booking.tableCodes}
          />
        </section>

        <section className="admin-panel">
          <h2>Payment</h2>
          <PaymentBill
            duePence={due}
            payments={payments}
            bookingId={booking.id}
            lines={[
              depositDue ? { label: "Deposit", amountPence: depositDue } : null,
              ...booking.orders.map((order) => ({
                label: `${order.ref} · ${order.source.replace(/_/g, " ")}`,
                amountPence: order.totalPence,
                note: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
              })),
            ].filter(Boolean) as { label: string; amountPence: number; note?: string }[]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {isPaid(booking.payments) ? (
              <ActionButton action="set_paid" body={{ bookingId: booking.id, paid: false }} label="Mark unpaid" />
            ) : (
              <ActionButton
                action="set_paid"
                body={{ bookingId: booking.id, paid: true, amountPence: depositDue || bill.leftPence }}
                label="Mark paid"
              />
            )}
          </div>
        </section>

        <section className="admin-panel record-wide">
          <h2>What they ordered</h2>
          {booking.orders.map((order) => (
            <article key={order.id} className="mb-6">
              <div className="today-panel-head">
                <h3>
                  {order.ref} · {order.source.replace(/_/g, " ")}
                </h3>
                <Link href={`/admin/orders/${order.id}`}>Open order</Link>
              </div>
              <OrderItems
                items={order.items}
                subtotalPence={order.subtotalPence}
                discountPence={order.discountPence}
                deliveryFeePence={order.deliveryFeePence}
                totalPence={order.totalPence}
              />
            </article>
          ))}
          {!booking.orders.length ? <p className="today-empty">No food or drink ordered on this booking yet.</p> : null}
        </section>

        {booking.party ? (
          <section className="admin-panel record-wide">
            <h2>Party {booking.party.code}</h2>
            <p className="admin-page-copy">Pay {booking.party.paymentMode.toLowerCase()}</p>
            <ul className="record-list">
              {booking.party.guests.map((g) => (
                <li key={g.id}>{g.name}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
