import { formatMoney } from "@/lib/platform/money";
import { leftoverPence, paySummary, refundRows, type PaymentRow } from "@/lib/platform/pay";
import { PayBadge } from "@/components/admin/PayBadge";
import { RefundControls } from "@/components/admin/RefundControls";

function whenText(value?: Date | string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function PaymentBill({
  duePence,
  payments,
  lines,
  orderId,
  bookingId,
}: {
  duePence: number;
  payments?: PaymentRow[] | null;
  lines?: { label: string; amountPence: number; note?: string }[];
  orderId?: string;
  bookingId?: string;
}) {
  const bill = paySummary(duePence, payments);
  const refunds = refundRows(payments);

  return (
    <div className="pay-bill">
      <div className="pay-bill-status">
        <PayBadge payments={payments} paid={bill.label === "Paid"} />
        <span>
          {bill.label === "Paid"
            ? "Nothing left to pay."
            : bill.refundedPence > 0 && bill.paidPence <= 0
              ? `${formatMoney(bill.refundedPence)} refunded.`
              : bill.leftPence > 0
                ? `${formatMoney(bill.leftPence)} still to pay.`
                : "No bill yet."}
        </span>
      </div>
      <dl className="pay-bill-grid is-four">
        <div>
          <dt>Total</dt>
          <dd>{formatMoney(bill.duePence)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{formatMoney(bill.paidPence)}</dd>
        </div>
        <div>
          <dt>Refunded</dt>
          <dd>{formatMoney(bill.refundedPence)}</dd>
        </div>
        <div>
          <dt>Left to pay</dt>
          <dd className={bill.leftPence > 0 ? "is-due" : ""}>{formatMoney(bill.leftPence)}</dd>
        </div>
      </dl>
      {lines?.length ? (
        <ul className="pay-bill-lines">
          {lines.map((line) => (
            <li key={line.label}>
              <span>
                {line.label}
                {line.note ? <em>{line.note}</em> : null}
              </span>
              <strong>{formatMoney(line.amountPence)}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      {payments?.length ? (
        <ul className="pay-bill-pays">
          {payments.map((payment, index) => {
            const left = leftoverPence(payment);
            return (
              <li key={payment.id || index}>
                <strong>{formatMoney(payment.amountPence || 0)}</strong>
                {" · "}
                {(payment.kind || "PAYMENT").replace(/_/g, " ")}
                {" · "}
                {payment.status.replace(/_/g, " ")}
                {payment.provider ? ` · ${payment.provider}` : ""}
                {payment.createdAt ? ` · ${whenText(payment.createdAt)}` : ""}
                {left > 0 && payment.status !== "PAID" ? ` · ${formatMoney(left)} left` : ""}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="today-empty">No payments taken yet.</p>
      )}
      {refunds.length ? (
        <ul className="pay-bill-refunds">
          {refunds.map((refund, index) => (
            <li key={`${refund.paymentId || "r"}-${index}`}>
              Refund {formatMoney(refund.amountPence)}
              {refund.reason ? ` · ${refund.reason}` : ""}
              {refund.staffName ? ` · ${refund.staffName}` : ""}
              {refund.createdAt ? ` · ${whenText(refund.createdAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <RefundControls payments={payments} orderId={orderId} bookingId={bookingId} />
    </div>
  );
}
