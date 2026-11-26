import Link from "next/link";
import { formatBookingDate } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { orderTypeLabel } from "@/lib/platform/order-label";
import { TrackPins, trackKindFrom } from "@/components/TrackPins";
import { PayFacts } from "@/components/PayFacts";
import { orderNeed, placeName } from "@/components/account/account-labels";
import type { AccountOrder } from "@/lib/platform/account";

/** Orders on the customer account page, upcoming or past. */
export function OrderList({ orders, done = false, onManage }: { orders: AccountOrder[]; done?: boolean; onManage?: (order: AccountOrder) => void }) {
  if (!orders.length) return null;
  return (
    <>
      {orders.map((order) => {
        return (
          <li key={order.id} className={`site-card account-card ${done ? "is-past" : ""}`}>
            <div className="account-card-top">
              <p className="account-card-kicker">{orderTypeLabel(order.source)}</p>
              <span className="account-status">{orderNeed(order)}</span>
            </div>
            <h3 className="serif text-2xl leading-tight">{formatMoney(order.totalPence)}</h3>
            <TrackPins kind={trackKindFrom(order.source)} status={order.status} compact />
            <dl className="account-meta">
              <div>
                <dt>Type</dt>
                <dd>{orderTypeLabel(order.source)}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{order.asap ? "ASAP" : `${order.date ? formatBookingDate(order.date) : ""} ${order.time || ""}`.trim()}</dd>
              </div>
              <div>
                <dt>Restaurant</dt>
                <dd>{placeName(order.locationId)}</dd>
              </div>
              {order.address ? (
                <div className="is-wide">
                  <dt>Address</dt>
                  <dd>{order.address}</dd>
                </div>
              ) : null}
              <div>
                <dt>Reference</dt>
                <dd>{order.ref}</dd>
              </div>
              <PayFacts duePence={order.totalPence} payments={order.payments} />
              <div className="is-wide">
                <dt>Items</dt>
                <dd>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "No items"}</dd>
              </div>
            </dl>
            <div className="account-card-actions">
              {!done && onManage ? (
                <button type="button" onClick={() => onManage(order)}>
                  Manage
                </button>
              ) : null}
              {!done ? <Link href={`/account/cancel/order/${order.id}`}>Cancel</Link> : null}
              <Link href={`/order/confirmed?ref=${order.ref}`}>{done ? "View" : "Track"}</Link>
            </div>
          </li>
        );
      })}
    </>
  );
}
