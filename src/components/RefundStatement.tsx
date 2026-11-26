import { formatMoney } from "@/lib/platform/money";
import type { RefundQuote } from "@/lib/platform/pay";

export function RefundStatement({
  quote,
  done = false,
}: {
  quote: RefundQuote;
  done?: boolean;
}) {
  const rows = [
    ["Type", quote.type],
    ["Refund to", [quote.toName, quote.toEmail].filter(Boolean).join(" · ") || "Guest who paid"],
    ["Refund method", quote.method],
    ["Direction", quote.direction],
    ["Paid", formatMoney(quote.paidPence)],
    ["Cancellation charge", formatMoney(quote.cancelChargePence)],
    ["Already refunded", formatMoney(quote.alreadyRefundedPence)],
    ["Refund total", formatMoney(quote.refundPence)],
  ];
  return (
    <div className="refund-statement">
      <p className="display text-[0.68rem] tracking-[0.18em] text-ember">
        {done ? "Refund issued" : "Refund if you cancel"}
      </p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className={label === "Refund total" ? "is-total" : undefined}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="refund-statement-note">
        {quote.refundPence
          ? done
            ? `${formatMoney(quote.refundPence)} is going back the same way it was taken. There is no cancellation charge.`
            : `${formatMoney(quote.refundPence)} will go back the same way it was taken. There is no cancellation charge.`
          : "Nothing was paid, so there is no refund."}
      </p>
    </div>
  );
}
