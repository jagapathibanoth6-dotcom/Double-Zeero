"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { RefundControls } from "@/components/admin/RefundControls";
import { formatMoney } from "@/lib/platform/money";
import type { PaymentRow } from "@/lib/platform/pay";

export type PaymentCard = {
  id: string;
  amountPence: number;
  leftoverPence: number;
  refundedPence: number;
  kind: string;
  status: string;
  stripeStatus: string;
  statusLabel: string;
  provider: string;
  method: string;
  intentId: string;
  dashboardUrl: string;
  receiptEmail: string;
  createdLabel: string;
  name: string;
  phone: string;
  email: string;
  ref: string;
  href: string;
  typeLabel: string;
  typeClass: string;
  when: string;
  items: string;
  payments: PaymentRow[];
  orderId?: string;
  bookingId?: string;
};

export type DueCard = {
  id: string;
  kind: "order" | "booking";
  ref: string;
  href: string;
  name: string;
  typeLabel: string;
  typeClass: string;
  when: string;
  items: string;
  duePence: number;
  paidPence: number;
  leftPence: number;
  incomplete?: boolean;
  payments: PaymentRow[];
  orderId?: string;
  bookingId?: string;
};

export type StripeDeskFacts = {
  ready: boolean;
  livemode: boolean;
  chargesEnabled: boolean;
  keyHint: string;
  dashboardUrl: string;
};

const filters = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Incomplete" },
  { id: "paid", label: "Succeeded" },
  { id: "partial", label: "Partially refunded" },
  { id: "refunded", label: "Refunded" },
  { id: "stripe", label: "Stripe" },
  { id: "demo", label: "Till" },
  { id: "deposit", label: "Deposits" },
  { id: "collect", label: "Click & collect" },
  { id: "booking", label: "Bookings" },
] as const;

function matches(filter: (typeof filters)[number]["id"], row: PaymentCard) {
  if (filter === "all") return true;
  if (filter === "unpaid") return false;
  if (filter === "paid") return row.status === "PAID" && row.refundedPence <= 0;
  if (filter === "partial") return row.status === "PARTIAL_REFUND" || (row.refundedPence > 0 && row.leftoverPence > 0);
  if (filter === "refunded") return row.status === "REFUNDED" || (row.refundedPence > 0 && row.leftoverPence <= 0);
  if (filter === "stripe") return row.provider === "STRIPE";
  if (filter === "demo") return row.provider !== "STRIPE";
  if (filter === "deposit") return row.kind === "DEPOSIT";
  if (filter === "collect") return row.typeClass === "is-collect";
  if (filter === "booking") return Boolean(row.bookingId) && !row.orderId;
  return true;
}

export function PaymentsDesk({
  payments,
  outstanding,
  stripe,
}: {
  payments: PaymentCard[];
  outstanding: DueCard[];
  stripe: StripeDeskFacts;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      payments.filter((row) => {
        if (!matches(filter, row)) return false;
        if (!needle) return true;
        return [row.ref, row.name, row.email, row.phone, row.intentId, row.method, row.items, row.typeLabel]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      }),
    [payments, filter, needle],
  );
  const dueRows = useMemo(
    () =>
      outstanding.filter((row) => {
        if (!needle) return true;
        return [row.ref, row.name, row.items, row.typeLabel].join(" ").toLowerCase().includes(needle);
      }),
    [outstanding, needle],
  );
  const showDue = filter === "all" || filter === "unpaid";
  const counts = {
    all: payments.length,
    unpaid: outstanding.length,
    paid: payments.filter((row) => matches("paid", row)).length,
    partial: payments.filter((row) => matches("partial", row)).length,
    refunded: payments.filter((row) => matches("refunded", row)).length,
    stripe: payments.filter((row) => matches("stripe", row)).length,
    demo: payments.filter((row) => matches("demo", row)).length,
    deposit: payments.filter((row) => matches("deposit", row)).length,
    collect: payments.filter((row) => matches("collect", row)).length,
    booking: payments.filter((row) => matches("booking", row)).length,
  };

  return (
    <div>
      <section className={`stripe-desk-bar ${stripe.ready ? "is-ready" : "is-off"}`}>
        <div>
          <p className="stripe-desk-kicker">Stripe</p>
          <p>
            {stripe.ready
              ? `${stripe.livemode ? "Live mode" : "Test mode"}${stripe.keyHint ? ` · ${stripe.keyHint}` : ""} · ${stripe.chargesEnabled ? "Charges on" : "Finish Stripe setup to take live charges"}`
              : "No API key. Paste sk_test_ or sk_live_ in Settings."}
          </p>
        </div>
        <div className="stripe-desk-bar-actions">
          {stripe.ready ? (
            <a className="btn btn-ghost" href={stripe.dashboardUrl} target="_blank" rel="noreferrer">
              Open Stripe Dashboard
            </a>
          ) : (
            <Link className="btn btn-ember" href="/admin/settings">
              Add Stripe key
            </Link>
          )}
        </div>
      </section>

      <div className="pay-desk-tools">
        <input
          className="pay-desk-search"
          placeholder="Search guest, reference, email, card or PaymentIntent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="diary-filters is-orders">
        {filters.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`diary-filter ${filter === row.id ? "is-on" : ""}`}
            onClick={() => setFilter(row.id)}
          >
            {row.label}
            <em>{counts[row.id]}</em>
          </button>
        ))}
      </div>

      {showDue ? (
        <section className="admin-panel pay-desk-panel">
          <div className="today-panel-head">
            <div>
              <h2>Incomplete</h2>
              <p>Unpaid bills and Stripe checkouts that never finished. Mark paid at the till, or open the record.</p>
            </div>
          </div>
          <div className="pay-table-wrap">
            <table className="pay-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Guest</th>
                  <th>For</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dueRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{formatMoney(row.leftPence)}</strong>
                      <em>Due {formatMoney(row.duePence)}</em>
                    </td>
                    <td>
                      <PayBadge label={row.incomplete ? "Incomplete" : "Unpaid"} />
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                      <em>{row.ref}</em>
                    </td>
                    <td>
                      {row.typeLabel}
                      <em>{row.items || "No items"}</em>
                    </td>
                    <td>{row.when}</td>
                    <td className="pay-table-actions">
                      {row.orderId && !row.incomplete ? (
                        <ActionButton action="set_paid" body={{ orderId: row.orderId, paid: true }} label="Mark paid" />
                      ) : null}
                      {row.bookingId && !row.orderId ? (
                        <ActionButton
                          action="set_paid"
                          body={{ bookingId: row.bookingId, paid: true, amountPence: row.leftPence }}
                          label="Mark paid"
                        />
                      ) : null}
                      <Link href={row.href} className="btn btn-ghost">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dueRows.length ? <p className="today-empty">Nothing incomplete this day.</p> : null}
          </div>
        </section>
      ) : null}

      {filter !== "unpaid" ? (
        <section className="admin-panel pay-desk-panel">
          <div className="today-panel-head">
            <div>
              <h2>Transactions</h2>
              <p>Succeeded Stripe and till payments. Full or partial refund, same as the Stripe Dashboard.</p>
            </div>
          </div>
          <div className="pay-table-wrap">
            <table className="pay-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Guest</th>
                  <th>For</th>
                  <th>When</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const open = openId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className={open ? "is-open" : ""}>
                        <td>
                          <strong>{formatMoney(row.amountPence)}</strong>
                          <em>
                            {row.refundedPence ? `Refunded ${formatMoney(row.refundedPence)}` : `Kept ${formatMoney(row.leftoverPence)}`}
                          </em>
                        </td>
                        <td>
                          <PayBadge
                            payments={row.payments}
                            label={row.statusLabel}
                          />
                        </td>
                        <td>
                          {row.method}
                          {row.intentId ? <em>{row.intentId}</em> : null}
                        </td>
                        <td>
                          <strong>{row.name}</strong>
                          <em>{row.email || row.phone || row.receiptEmail || row.ref}</em>
                        </td>
                        <td>
                          {row.typeLabel}
                          {row.kind === "DEPOSIT" ? " deposit" : ""}
                          <em>{row.items || row.ref}</em>
                        </td>
                        <td>{row.createdLabel}</td>
                        <td className="pay-table-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => setOpenId(open ? "" : row.id)}>
                            {open ? "Close" : "Handle"}
                          </button>
                          <Link href={row.href} className="btn btn-ghost">
                            Open
                          </Link>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="pay-table-detail">
                          <td colSpan={7}>
                            <div className="pay-table-detail-grid">
                              <p>
                                {row.when}
                                {row.phone ? ` · ${row.phone}` : ""}
                                {row.email || row.receiptEmail ? ` · ${row.email || row.receiptEmail}` : ""}
                              </p>
                              {row.dashboardUrl ? (
                                <p>
                                  <a href={row.dashboardUrl} target="_blank" rel="noreferrer">
                                    View in Stripe
                                  </a>
                                  {row.intentId ? ` · ${row.intentId}` : ""}
                                </p>
                              ) : null}
                              {row.payments[0]?.refunds?.length ? (
                                <ul className="pay-bill-refunds">
                                  {row.payments[0].refunds.map((refund, index) => (
                                    <li key={`${row.id}-${index}`}>
                                      {formatMoney(refund.amountPence)}
                                      {refund.reason ? ` · ${refund.reason.replace(/_/g, " ")}` : ""}
                                      {refund.staffName ? ` · ${refund.staffName}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                              <RefundControls payments={row.payments} orderId={row.orderId} bookingId={row.bookingId} />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!visible.length ? <p className="today-empty">No transactions in this view.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
