export type PaymentRefundRow = {
  amountPence: number;
  reason?: string;
  staffName?: string;
  createdAt?: Date | string;
};

export type PaymentRow = {
  id?: string;
  status: string;
  amountPence?: number;
  kind?: string;
  provider?: string;
  providerRef?: string;
  createdAt?: Date | string;
  refunds?: PaymentRefundRow[];
};

export type RefundQuote = {
  type: string;
  toName: string;
  toEmail: string;
  method: string;
  direction: string;
  paidPence: number;
  cancelChargePence: number;
  refundPence: number;
  alreadyRefundedPence: number;
};

export function payMethodLabel(payment?: PaymentRow | null) {
  if (!payment) return "Original payment method";
  if (payment.provider === "STRIPE") {
    const tail = payment.providerRef ? payment.providerRef.slice(-4) : "";
    return tail ? `Stripe · same card or wallet · ${tail}` : "Stripe · same card or wallet";
  }
  return "Till · original payment";
}

export function refundQuote(input: {
  type: string;
  name?: string;
  email?: string;
  payments?: PaymentRow[] | null;
}) {
  const payments = input.payments || [];
  const remaining = payments.reduce((sum, payment) => sum + leftoverPence(payment), 0);
  const already = refundedPence(payments);
  const taken = payments.reduce((sum, payment) => sum + (payment.amountPence || 0), 0);
  const open = payments.find((payment) => leftoverPence(payment) > 0);
  const any = open || payments.find((payment) => payment.provider);
  return {
    type: input.type,
    toName: input.name || "Guest",
    toEmail: input.email || "",
    method: payMethodLabel(any),
    direction: "Back to the guest who paid, on the same card or wallet",
    paidPence: taken,
    cancelChargePence: 0,
    refundPence: remaining || already,
    alreadyRefundedPence: already,
  } satisfies RefundQuote;
}

export function leftoverPence(payment: PaymentRow) {
  if (payment.status === "UNPAID" || payment.status === "REFUNDED") return 0;
  const already = (payment.refunds || []).reduce((sum, refund) => sum + refund.amountPence, 0);
  return Math.max(0, (payment.amountPence || 0) - already);
}

export function refundRows(payments?: PaymentRow[] | null) {
  return (payments || []).flatMap((payment) =>
    (payment.refunds || []).map((refund) => ({
      paymentId: payment.id,
      amountPence: refund.amountPence,
      reason: refund.reason || "Refund",
      staffName: refund.staffName || "",
      createdAt: refund.createdAt,
    })),
  );
}

export function isPaid(payments?: PaymentRow[] | null) {
  return Boolean(payments?.some((payment) => payment.status === "PAID" || payment.status === "PARTIAL_REFUND"));
}

export function paidPence(payments?: PaymentRow[] | null) {
  return (payments || []).reduce((sum, payment) => {
    if (payment.status === "UNPAID" || payment.status === "REFUNDED") return sum;
    const refunded = (payment.refunds || []).reduce((total, refund) => total + refund.amountPence, 0);
    return sum + Math.max(0, (payment.amountPence || 0) - refunded);
  }, 0);
}

export function refundedPence(payments?: PaymentRow[] | null) {
  return (payments || []).reduce((sum, payment) => {
    const refunded = (payment.refunds || []).reduce((total, refund) => total + refund.amountPence, 0);
    if (payment.status === "REFUNDED") return sum + (payment.amountPence || 0);
    return sum + refunded;
  }, 0);
}

export function dueFromPayments(payments?: PaymentRow[] | null) {
  return (payments || []).reduce((sum, payment) => sum + (payment.amountPence || 0), 0);
}

export function leftPence(duePence: number, payments?: PaymentRow[] | null) {
  return Math.max(0, duePence - paidPence(payments));
}

export function paySummary(duePence: number, payments?: PaymentRow[] | null) {
  const paid = paidPence(payments);
  const refunded = refundedPence(payments);
  const due = Math.max(duePence, dueFromPayments(payments));
  const left = Math.max(0, due - paid);
  const marked = isPaid(payments);
  const label =
    refunded > 0 && paid <= 0
      ? "Refunded"
      : marked && left <= 0
        ? "Paid"
        : paid > 0 && left > 0
          ? "Part paid"
          : "Unpaid";
  return { duePence: due, paidPence: paid, leftPence: left, refundedPence: refunded, label };
}

export function payTone(label: string, paid?: boolean) {
  if (/partial/i.test(label) || /part paid/i.test(label)) return "is-part";
  if (/refund/i.test(label)) return "is-refunded";
  if (/pending/i.test(label)) return "is-pending";
  if (paid === true || /succeed|^paid\b/i.test(label.trim())) return "is-paid";
  return "is-unpaid";
}

export function payLabel(payments?: PaymentRow[] | null, duePence?: number) {
  if (typeof duePence === "number") return paySummary(duePence, payments).label;
  if (payments?.some((payment) => payment.status === "REFUNDED") && !isPaid(payments)) return "Refunded";
  return isPaid(payments) ? "Paid" : "Unpaid";
}

export function serializePayments(
  payments?: Array<{
    id: string;
    status: string;
    amountPence: number;
    kind?: string;
    provider?: string;
    providerRef?: string;
    createdAt?: Date;
    refunds?: Array<{ amountPence: number; reason?: string | null; staffName?: string | null; createdAt?: Date }>;
  }> | null,
): PaymentRow[] {
  return (payments || []).map((payment) => ({
    id: payment.id,
    status: payment.status,
    amountPence: payment.amountPence,
    kind: payment.kind,
    provider: payment.provider,
    providerRef: payment.providerRef,
    createdAt: payment.createdAt?.toISOString(),
    refunds: (payment.refunds || []).map((refund) => ({
      amountPence: refund.amountPence,
      reason: refund.reason || "Refund",
      staffName: refund.staffName || "",
      createdAt: refund.createdAt?.toISOString(),
    })),
  }));
}
