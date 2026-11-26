import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { type PaymentRow } from "@/lib/platform/pay";
import { formatMoney } from "@/lib/platform/money";
import { nextOrderStatus, orderIsOpen, trackLanes } from "@/lib/platform/order-label";
import { RefundControls } from "@/components/admin/RefundControls";
import { TrackPins, DeliveryPins, trackKindFrom } from "@/components/TrackPins";

export type TrackOrder = {
  id: string;
  ref: string;
  source: "CLICK_COLLECT" | "DZ_DELIVERY";
  status: string;
  name: string;
  phone: string;
  when: string;
  items: string;
  via: string;
  address: string;
  payLabel: string;
  paidPence: number;
  refundedPence: number;
  leftPence: number;
  payments: PaymentRow[];
  courierName: string;
  trackingUrl: string;
  etaMinutes: number;
  deliveryStatus: string;
};

export function OrderTrackBoard({
  kind,
  orders,
}: {
  kind: "CLICK_COLLECT" | "DZ_DELIVERY";
  orders: TrackOrder[];
}) {
  const lanes = trackLanes(kind);
  return (
    <div className={`track-board ${kind === "DZ_DELIVERY" ? "is-delivery" : "is-collect"}`}>
      {lanes.map((lane) => {
        const rows = orders.filter((order) => lane.statuses.includes(order.status));
        return (
          <section key={lane.id} className={`track-lane ${lane.id === "done" ? "is-done" : ""}`}>
            <div className="track-lane-head">
              <div>
                <h2>{lane.label}</h2>
                <p>{lane.note}</p>
              </div>
              <em>{rows.length}</em>
            </div>
            <div className="track-lane-list">
              {rows.map((order) => {
                const next = nextOrderStatus(order.source, order.status);
                const open = orderIsOpen(order.status);
                return (
                  <article key={order.id} className={`track-card ${order.source === "DZ_DELIVERY" ? "is-delivery" : "is-collect"}`}>
                    <Link href={`/admin/orders/${order.id}`} className="track-card-link">
                      <p className="track-card-ref">{order.ref}</p>
                      <h3>{order.name || "Guest"}</h3>
                      <p className="track-card-meta">
                        {order.when}
                        {order.via ? ` · ${order.via}` : ""}
                        {order.phone ? ` · ${order.phone}` : ""}
                      </p>
                      <p className="track-card-items">{order.items || "No items"}</p>
                    </Link>
                    <TrackPins kind={trackKindFrom(order.source)} status={order.status} compact />
                    {order.source === "DZ_DELIVERY" ? (
                      <DeliveryPins
                        status={order.deliveryStatus || order.status}
                        restaurant="Double Zero kitchen"
                        address={order.address}
                      />
                    ) : null}
                    {order.address ? <p className="track-card-address">{order.address}</p> : null}
                    {order.courierName || order.trackingUrl ? (
                      <p className="track-card-courier">
                        {order.courierName || "Courier"}
                        {order.etaMinutes ? ` · about ${order.etaMinutes} min` : ""}
                        {order.trackingUrl ? (
                          <>
                            {" · "}
                            <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                              Track
                            </a>
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="track-card-pay">
                      <PayBadge payments={order.payments} label={order.payLabel} />
                      <span>
                        {formatMoney(order.paidPence)}
                        {order.leftPence ? ` · left ${formatMoney(order.leftPence)}` : ""}
                        {order.refundedPence ? ` · refunded ${formatMoney(order.refundedPence)}` : ""}
                      </span>
                    </div>
                    <div className="track-card-actions">
                      {open && next ? (
                        <ActionButton action="order_status" body={{ orderId: order.id, status: next.status }} label={next.label} />
                      ) : null}
                      {open && order.source === "DZ_DELIVERY" && (order.status === "READY" || order.status === "DISPATCHED") ? (
                        <ActionButton action="uber_handover" body={{ orderId: order.id }} label="Hand to Uber" />
                      ) : null}
                      <RefundControls payments={order.payments} orderId={order.id} compact />
                      {open ? (
                        <Link href={`/admin/orders/${order.id}/cancel`} className="btn btn-ghost">
                          Cancel
                        </Link>
                      ) : null}
                      <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost">
                        Open
                      </Link>
                    </div>
                  </article>
                );
              })}
              {!rows.length ? <p className="today-empty">None in this lane.</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
