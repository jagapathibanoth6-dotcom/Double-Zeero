import { db } from "@/lib/db";
import { leftoverPence, type PaymentRow } from "@/lib/platform/pay";
import { paymentContext, sendPaymentMail, sendRefundMail } from "@/lib/platform/pay-mail";

export async function charge(input: {
  amountPence: number;
  kind: "ORDER" | "DEPOSIT";
  bookingId?: string;
  orderId?: string;
  to?: string;
  notify?: boolean;
  provider?: string;
  providerRef?: string;
}) {
  const payment = await db.payment.create({
    data: {
      amountPence: input.amountPence,
      kind: input.kind,
      status: "PAID",
      provider: input.provider || "DEMO",
      providerRef: input.providerRef || `demo_${Date.now()}`,
      bookingId: input.bookingId,
      orderId: input.orderId,
    },
  });
  if (input.notify !== false) {
    const context = await paymentContext({ orderId: input.orderId, bookingId: input.bookingId });
    await sendPaymentMail({
      to: input.to || context?.to,
      kind: input.kind,
      ref: context?.ref || payment.id,
      amountPence: input.amountPence,
      type: context?.type || (input.kind === "DEPOSIT" ? "Book a table" : "Order"),
      when: context?.when,
      extra: context?.extra,
    });
  }
  return payment;
}

export async function refundPayment(input: {
  paymentId: string;
  amountPence?: number;
  reason: string;
  staffName: string;
  notify?: boolean;
}) {
  const payment = await db.payment.findUnique({ where: { id: input.paymentId }, include: { refunds: true } });
  if (!payment) throw new Error("Payment not found");
  const already = payment.refunds.reduce((sum, row) => sum + row.amountPence, 0);
  const amount = input.amountPence ?? payment.amountPence - already;
  if (amount <= 0) throw new Error("Nothing left to refund");
  if (payment.provider === "STRIPE" && payment.providerRef) {
    const related = payment.orderId
      ? await db.order.findUnique({ where: { id: payment.orderId }, select: { locationId: true } })
      : payment.bookingId
        ? await db.booking.findUnique({ where: { id: payment.bookingId }, select: { locationId: true } })
        : null;
    if (!related?.locationId) throw new Error("Could not refund this Stripe payment.");
    const { refundStripe } = await import("@/lib/platform/stripe");
    await refundStripe(payment.providerRef, related.locationId as "manchester" | "chorlton", amount, input.reason);
  }
  const refund = await db.refund.create({
    data: {
      paymentId: payment.id,
      amountPence: amount,
      reason: input.reason,
      staffName: input.staffName,
    },
  });
  const remaining = payment.amountPence - already - amount;
  await db.payment.update({
    where: { id: payment.id },
    data: { status: remaining <= 0 ? "REFUNDED" : "PARTIAL_REFUND" },
  });
  if (input.notify !== false) {
    const context = await paymentContext({ orderId: payment.orderId, bookingId: payment.bookingId });
    await sendRefundMail({
      to: context?.to,
      ref: context?.ref || payment.id,
      amountPence: amount,
      reason: input.reason,
      type: context?.type || "Payment",
      extra: context?.extra,
    });
  }
  return refund;
}

export async function refundAcross(input: {
  payments: PaymentRow[];
  amountPence?: number;
  reason: string;
  staffName: string;
  notify?: boolean;
}) {
  const open = input.payments.filter((payment) => payment.id && leftoverPence(payment) > 0);
  if (!open.length) throw new Error("Nothing left to refund.");
  const available = open.reduce((sum, payment) => sum + leftoverPence(payment), 0);
  let remaining = input.amountPence ?? available;
  if (remaining <= 0) throw new Error("Enter how much to refund.");
  if (remaining > available) throw new Error("That is more than is left to refund.");
  let refunded = 0;
  for (const payment of open) {
    if (remaining <= 0) break;
    const take = Math.min(leftoverPence(payment), remaining);
    await refundPayment({
      paymentId: payment.id as string,
      amountPence: take,
      reason: input.reason,
      staffName: input.staffName,
      notify: input.notify,
    });
    remaining -= take;
    refunded += take;
  }
  return refunded;
}

export async function refundAllOpen(input: {
  payments: PaymentRow[];
  reason: string;
  staffName: string;
  notify?: boolean;
}) {
  let refunded = 0;
  for (const payment of input.payments) {
    const left = leftoverPence(payment);
    if (left <= 0 || !payment.id) continue;
    await refundPayment({
      paymentId: payment.id,
      amountPence: left,
      reason: input.reason,
      staffName: input.staffName,
      notify: input.notify ?? false,
    });
    refunded += left;
  }
  return refunded;
}
