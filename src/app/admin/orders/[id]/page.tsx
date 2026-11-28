import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBookingDate } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { locations } from "@/data/site";
import { requireBranchRecord } from "@/lib/platform/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { PaymentBill } from "@/components/admin/PaymentBill";
import { OrderItems } from "@/components/admin/OrderItems";
import { isPaid, paySummary } from "@/lib/platform/pay";
import { formatOrderWhen, nextOrderStatus, orderIsOpen, orderTypeLabel, statusText, statusTone } from "@/lib/platform/order-label";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";
import { DeliveryPins, TrackPins, trackKindFrom } from "@/components/TrackPins";

export const dynamic = "force-dynamic";

export default async function AdminOrderRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { include: { refunds: true } }, customer: true, booking: true, delivery: true },
  });
  if (!order) notFound();
  await requireBranchRecord(order.locationId);
  const loc = locations[order.locationId as keyof typeof locations];
  const type = orderTypeLabel(order.source);
  const bill = paySummary(order.totalPence, order.payments);
  const pretty = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : "";
  const when = formatOrderWhen(order, pretty);
  const next = nextOrderStatus(order.source, order.status);
  const open = orderIsOpen(order.status);
  const restaurant = loc ? `${loc.shortName} · ${loc.address}, ${loc.postcode}` : order.locationId;

  return (
    <div className="record-page">
      <KitchenRefresh every={3000} />
      <Link href="/admin/orders" className="record-back">
        ← Back to orders
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">{type}</p>
          <h1 className="admin-page-title">{order.ref}</h1>
          <p className="admin-page-copy">
            {order.name || "Walk-in"} · {loc?.shortName || order.locationId} · {when}
          </p>
        </div>
        <span>
          <span className={`admin-badge ${statusTone(order.status)}`}>{statusText(order.status)}</span>
          <PayBadge payments={order.payments} label={bill.label} />
        </span>
      </div>

      {order.status === "CANCELLED" ? (
        <p className="order-flag is-cancelled">
          This order is cancelled
          {bill.refundedPence ? ` · ${formatMoney(bill.refundedPence)} refunded` : ""}.
        </p>
      ) : null}
      {order.status === "COMPLETED" ? <p className="order-flag is-done">This order is finished.</p> : null}

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

      <section className="admin-panel">
        <h2>Tracking</h2>
        <TrackPins kind={trackKindFrom(order.source)} status={order.status} />
        {order.source === "DZ_DELIVERY" ? (
          <div className="mt-6">
            <DeliveryPins status={order.delivery?.status || order.status} restaurant={loc?.shortName} address={order.address} />
            {order.delivery ? (
              <p className="admin-page-copy mt-4">
                {order.delivery.courierName || "Uber Direct"} · ETA {order.delivery.etaMinutes} min · {order.delivery.status.replace(/_/g, " ")}
                {order.delivery.trackingUrl ? (
                  <>
                    {" · "}
                    <a href={order.delivery.trackingUrl} target="_blank" rel="noreferrer">
                      Open tracking
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="record-grid">
        <section className="admin-panel">
          <h2>Order</h2>
          <dl className="record-dl">
            <div>
              <dt>Type</dt>
              <dd>{type}</dd>
            </div>
            <div>
              <dt>Came from</dt>
              <dd>{order.via || "Website"}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{when}</dd>
            </div>
            <div>
              <dt>Restaurant</dt>
              <dd>{restaurant}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {order.name || "Walk-in"}
                <br />
                {order.email || "—"}
                <br />
                {order.phone || "No phone"}
              </dd>
            </div>
            {order.source === "DZ_DELIVERY" ? (
              <div>
                <dt>Deliver to</dt>
                <dd>{order.address || "No address"}</dd>
              </div>
            ) : null}
            <div>
              <dt>Notes</dt>
              <dd>{order.notes || "—"}</dd>
            </div>
          </dl>
          {order.customer ? (
            <Link href={`/admin/customers/${order.customer.id}`} className="record-link">
              Open customer {order.customer.name}
            </Link>
          ) : null}
          {order.booking ? (
            <Link href={`/admin/bookings/${order.booking.id}`} className="record-link">
              Open booking {order.booking.ref}
            </Link>
          ) : null}
        </section>

        <section className="admin-panel">
          <h2>What they ordered</h2>
          <OrderItems
            items={order.items}
            subtotalPence={order.subtotalPence}
            discountPence={order.discountPence}
            deliveryFeePence={order.deliveryFeePence}
            totalPence={order.totalPence}
          />
          <div className="order-record-actions">
            {open && next ? (
              <ActionButton action="order_status" body={{ orderId: order.id, status: next.status }} label={next.label} />
            ) : null}
            {open ? (
              <Link href={`/admin/orders/${order.id}/cancel`} className="btn btn-ghost">
                Cancel
              </Link>
            ) : null}
          </div>
        </section>

        <section className="admin-panel record-wide">
          <h2>Payment</h2>
          <PaymentBill duePence={order.totalPence} payments={order.payments} orderId={order.id} />
          <div className="order-record-actions">
            {isPaid(order.payments) ? (
              <ActionButton action="set_paid" body={{ orderId: order.id, paid: false }} label="Mark unpaid" />
            ) : (
              <ActionButton action="set_paid" body={{ orderId: order.id, paid: true }} label="Mark paid" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
