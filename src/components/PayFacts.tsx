import { formatMoney } from "@/lib/platform/money";
import { paySummary, refundRows, type PaymentRow } from "@/lib/platform/pay";

function whenText(value?: Date | string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function PayFacts({
  duePence,
  payments,
  wide = false,
}: {
  duePence: number;
  payments?: PaymentRow[] | null;
  wide?: boolean;
}) {
  const pay = paySummary(duePence, payments);
  const refunds = refundRows(payments);
  return (
    <>
      <div className={wide ? "is-wide" : undefined}>
        <dt>Payment</dt>
        <dd>{pay.label}</dd>
      </div>
      <div>
        <dt>Paid</dt>
        <dd>{formatMoney(pay.paidPence)}</dd>
      </div>
      <div>
        <dt>Refunded</dt>
        <dd>{formatMoney(pay.refundedPence)}</dd>
      </div>
      {pay.leftPence > 0 ? (
        <div>
          <dt>Left to pay</dt>
          <dd>{formatMoney(pay.leftPence)}</dd>
        </div>
      ) : null}
      {refunds.length ? (
        <div className="is-wide">
          <dt>Refund details</dt>
          <dd>
            {refunds.map((refund, index) => (
              <span key={`${refund.paymentId || "r"}-${index}`}>
                {formatMoney(refund.amountPence)}
                {refund.reason ? ` · ${refund.reason}` : ""}
                {refund.createdAt ? ` · ${whenText(refund.createdAt)}` : ""}
                {index < refunds.length - 1 ? "; " : ""}
              </span>
            ))}
          </dd>
        </div>
      ) : null}
    </>
  );
}

export function PayRefundBox({
  duePence,
  payments,
  kind,
  kitchenStarted = false,
}: {
  duePence: number;
  payments?: PaymentRow[] | null;
  kind: "booking" | "order";
  kitchenStarted?: boolean;
}) {
  const pay = paySummary(duePence, payments);
  const refunds = refundRows(payments);
  return (
    <div className="account-refund is-wide">
      <p className="display text-[0.62rem] tracking-[0.16em] text-ember">Payment and refund</p>
      <p className="mt-2 text-sm">
        Paid {formatMoney(pay.paidPence)}
        {pay.refundedPence ? ` · already refunded ${formatMoney(pay.refundedPence)}` : ""}
        {pay.leftPence ? ` · left ${formatMoney(pay.leftPence)}` : ""}.
      </p>
      {refunds.length ? (
        <ul className="account-refund-list">
          {refunds.map((refund, index) => (
            <li key={`${refund.paymentId || "r"}-${index}`}>
              {formatMoney(refund.amountPence)} · {refund.reason}
              {refund.createdAt ? ` · ${whenText(refund.createdAt)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1 text-sm text-mute">
        {pay.paidPence
          ? kind === "booking"
            ? `Cancel this booking and ${formatMoney(pay.paidPence)} deposit goes back to the same card or wallet.`
            : `Cancel this order and ${formatMoney(pay.paidPence)} goes back to the same card or wallet.`
          : kind === "booking"
            ? "No deposit was paid, so there is no refund."
            : "Nothing was paid on this order, so there is no refund."}
      </p>
      {kitchenStarted ? <p className="mt-1 text-sm text-ember">The kitchen has already started this order.</p> : null}
    </div>
  );
}
