"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { type PaymentRow } from "@/lib/platform/pay";
import { formatMoney } from "@/lib/platform/money";
import { nextOrderStatus, orderIsOpen, orderKindClass, orderTypeLabel, statusText, statusTone } from "@/lib/platform/order-label";
import { RefundControls } from "@/components/admin/RefundControls";

export type OrderCard = {
  id: string;
  ref: string;
  source: string;
  status: string;
  name: string;
  when: string;
  items: string;
  payLabel: string;
  paidPence: number;
  refundedPence: number;
  leftPence: number;
  payments: PaymentRow[];
  fresh?: boolean;
};

const filters = [
  { id: "all", label: "All" },
  { id: "CLICK_COLLECT", label: "Click & collect" },
  { id: "PARTY_PREORDER", label: "Party food" },
] as const;

export function OrdersDesk({
  orders,
  startFilter = "all",
}: {
  orders: OrderCard[];
  startFilter?: (typeof filters)[number]["id"];
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>(startFilter);
  const counts = useMemo(
    () => ({
      all: orders.length,
      CLICK_COLLECT: orders.filter((order) => order.source === "CLICK_COLLECT").length,
      PARTY_PREORDER: orders.filter((order) => order.source === "PARTY_PREORDER").length,
    }),
    [orders],
  );
  const visible = filter === "all" ? orders : orders.filter((order) => order.source === filter);

  return (
    <div>
      <div className="diary-filters is-orders">
        {filters
          .filter((row) => row.id !== "PARTY_PREORDER" || counts[row.id] > 0)
          .map((row) => (
            <button
              key={row.id}
              type="button"
              className={`diary-filter ${row.id === "all" ? "is-all" : orderKindClass(row.id)} ${filter === row.id ? "is-on" : ""}`}
              onClick={() => setFilter(row.id)}
            >
              {row.label}
              <em>{counts[row.id]}</em>
            </button>
          ))}
      </div>
      <ul className="order-board">
        {visible.map((order) => {
          const next = nextOrderStatus(order.source, order.status);
          const open = orderIsOpen(order.status);
          return (
            <li
              key={order.id}
              className={`order-board-card ${orderKindClass(order.source)} ${order.status === "CANCELLED" ? "is-cancelled" : ""} ${order.status === "COMPLETED" ? "is-done" : ""}`}
            >
              <Link href={`/admin/orders/${order.id}`} className="order-board-link">
                <p className="order-board-kicker">
                  {orderTypeLabel(order.source)}
                  {order.fresh ? " · New" : ""}
                </p>
                <h2>{order.ref}</h2>
                <p>
                  {order.name || "Walk-in"} · {order.when}
                </p>
                <p className="order-board-items">{order.items || "No items"}</p>
              </Link>
              <div className="order-board-pay">
                <span className={`admin-badge ${statusTone(order.status)}`}>{statusText(order.status)}</span>
                <PayBadge payments={order.payments} label={order.payLabel} />
                <p>
                  Paid {formatMoney(order.paidPence)}
                  {order.refundedPence ? ` · refunded ${formatMoney(order.refundedPence)}` : ""}
                  {order.leftPence ? ` · left ${formatMoney(order.leftPence)}` : ""}
                </p>
              </div>
              <div className="order-board-actions">
                {open && next ? (
                  <ActionButton action="order_status" body={{ orderId: order.id, status: next.status }} label={next.label} />
                ) : null}
                {open ? (
                  <Link href={`/admin/orders/${order.id}/cancel`} className="btn btn-ghost">
                    Cancel
                  </Link>
                ) : null}
                <RefundControls payments={order.payments} orderId={order.id} compact />
                <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost">
                  Open
                </Link>
              </div>
            </li>
          );
        })}
        {!visible.length ? <li className="today-empty">No orders in this view.</li> : null}
      </ul>
    </div>
  );
}
