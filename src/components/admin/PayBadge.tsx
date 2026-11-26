import { payLabel, paySummary, payTone, type PaymentRow } from "@/lib/platform/pay";

export function PayBadge({
  payments,
  paid,
  duePence,
  label,
  className = "",
}: {
  payments?: PaymentRow[] | null;
  paid?: boolean;
  duePence?: number;
  label?: string;
  className?: string;
}) {
  const bill = typeof duePence === "number" ? paySummary(duePence, payments) : null;
  const text = label || bill?.label || payLabel(payments, duePence);
  const tone = payTone(text, paid ?? (bill ? bill.label === "Paid" : undefined));
  return <span className={`pay-badge ${tone} ${className}`.trim()}>{text}</span>;
}
