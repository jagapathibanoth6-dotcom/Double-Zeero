import Link from "next/link";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { formatBookingDate, londonDayRange, todayISO } from "@/lib/booking";
import { isISODate } from "@/lib/platform/diary";
import { requireBranch } from "@/lib/platform/admin";
import { formatMoney } from "@/lib/platform/money";
import { leftoverPence, paidPence, paySummary, refundedPence, serializePayments } from "@/lib/platform/pay";
import { formatOrderWhen, orderKindClass, orderTypeLabel } from "@/lib/platform/order-label";
import { getSettings } from "@/lib/platform/settings";
import { stripeAccountFacts, stripePaymentFacts } from "@/lib/platform/stripe";
import { DateNav } from "@/components/admin/DateNav";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";
import { PaymentsDesk, type DueCard, type PaymentCard } from "@/components/admin/PaymentsDesk";

export const dynamic = "force-dynamic";

function bookingType(visitType?: string) {
  return visitType === "collection" ? "Click & collect" : "Book a table";
}

function statusLabel(status: string, leftover: number, refunded: number, stripeStatus?: string) {
  if (refunded > 0 && leftover <= 0) return "Refunded";
  if (refunded > 0 && leftover > 0) return "Partially refunded";
  if (stripeStatus === "processing" || stripeStatus === "requires_action") return "Pending";
  if (stripeStatus === "requires_payment_method" || stripeStatus === "canceled") return "Incomplete";
  if (status === "REFUNDED") return "Refunded";
  if (status === "PARTIAL_REFUND") return "Partially refunded";
  if (status === "UNPAID") return "Unpaid";
  return "Succeeded";
}

function methodLabel(provider?: string, providerRef?: string, stripeMethod?: string) {
  if (stripeMethod) return stripeMethod;
  if (provider === "STRIPE") return providerRef ? `Stripe · ${providerRef.slice(-4)}` : "Stripe";
  return "Till";
}

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const branch = await requireBranch();
  const loc = locations[branch];
  const today = todayISO();
  const date = isISODate((await searchParams).date) ? (await searchParams).date! : today;
  const { start, end } = londonDayRange(date);
  const settings = await getSettings(branch);

  const [payments, orders, bookings, stripe] = await Promise.all([
    db.payment.findMany({
      where: {
        OR: [{ order: { locationId: branch } }, { booking: { locationId: branch } }],
      },
      include: {
        refunds: true,
        order: { include: { items: true } },
        booking: { include: { orders: { include: { items: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    db.order.findMany({
      where: {
        locationId: branch,
        status: { not: "CANCELLED" },
        OR: [{ date }, { date: "", createdAt: { gte: start, lt: end } }],
      },
      include: { items: true, payments: { include: { refunds: true } } },
    }),
    db.booking.findMany({
      where: { locationId: branch, date, status: { notIn: ["CANCELLED", "DECLINED"] } },
      include: {
        payments: { include: { refunds: true } },
        orders: { include: { items: true, payments: { include: { refunds: true } } } },
      },
    }),
    stripeAccountFacts(branch),
  ]);

  const dayPayments = payments.filter((payment) => {
    const created = payment.createdAt >= start && payment.createdAt < end;
    const orderDay = payment.order?.date === date;
    const bookingDay = payment.booking?.date === date;
    return created || orderDay || bookingDay;
  });

  const stripeFacts = await stripePaymentFacts(
    branch,
    dayPayments.map((payment) => payment.providerRef || "").filter(Boolean),
  );

  const cards: PaymentCard[] = dayPayments.map((payment) => {
    const order = payment.order;
    const booking = payment.booking;
    const leftover = leftoverPence(payment);
    const refunded = refundedPence([payment]);
    const fact = stripeFacts[payment.providerRef || ""];
    const pretty = order && /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : booking ? formatBookingDate(booking.date) : "";
    const items = order
      ? order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")
      : booking?.orders.flatMap((row) => row.items.map((item) => `${item.quantity}× ${item.name}`)).join(", ") || "";
    return {
      id: payment.id,
      amountPence: payment.amountPence,
      leftoverPence: leftover,
      refundedPence: refunded,
      kind: payment.kind,
      status: payment.status,
      stripeStatus: fact?.stripeStatus || "",
      statusLabel: statusLabel(payment.status, leftover, refunded, fact?.stripeStatus),
      provider: payment.provider,
      method: methodLabel(payment.provider, payment.providerRef, fact?.method),
      intentId: fact?.intentId || (payment.providerRef?.startsWith("pi_") ? payment.providerRef : ""),
      dashboardUrl: fact?.dashboardUrl || "",
      receiptEmail: fact?.receiptEmail || "",
      createdLabel: payment.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      name: order?.name || booking?.name || "Guest",
      phone: order?.phone || booking?.phone || "",
      email: order?.email || booking?.email || "",
      ref: order?.ref || booking?.ref || payment.id.slice(-6),
      href: order ? `/admin/orders/${order.id}` : booking ? `/admin/bookings/${booking.id}` : "/admin/payments",
      typeLabel: order ? orderTypeLabel(order.source) : bookingType(booking?.visitType),
      typeClass: order ? orderKindClass(order.source) : booking?.visitType === "collection" ? "is-collect" : "is-inside",
      when: order
        ? formatOrderWhen(order, pretty)
        : booking
          ? `${pretty} · ${booking.time} · ${booking.guests} guests`
          : pretty,
      items,
      payments: serializePayments([payment]),
      orderId: order?.id,
      bookingId: booking?.id,
    };
  });

  const outstanding: DueCard[] = [
    ...orders
      .map((order) => {
        const bill = paySummary(order.totalPence, order.payments);
        const pretty = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : "";
        return {
          id: `order-${order.id}`,
          kind: "order" as const,
          ref: order.ref,
          href: `/admin/orders/${order.id}`,
          name: order.name || "Walk-in",
          typeLabel: orderTypeLabel(order.source),
          typeClass: orderKindClass(order.source),
          when: formatOrderWhen(order, pretty),
          items: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
          duePence: bill.duePence,
          paidPence: bill.paidPence,
          leftPence: bill.leftPence,
          incomplete: order.status === "PENDING_PAY",
          payments: serializePayments(order.payments),
          orderId: order.id,
        };
      })
      .filter((row) => row.leftPence > 0),
    ...bookings
      .filter((booking) => booking.status === "PENDING_DEPOSIT" && paidPence(booking.payments) <= 0)
      .map((booking) => {
        const depositDue =
          settings.depositType === "PER_PERSON" ? settings.depositAmountPence * booking.guests : settings.depositAmountPence;
        return {
          id: `booking-${booking.id}`,
          kind: "booking" as const,
          ref: booking.ref,
          href: `/admin/bookings/${booking.id}`,
          name: booking.name,
          typeLabel: bookingType(booking.visitType),
          typeClass: booking.visitType === "collection" ? "is-collect" : "is-inside",
          when: `${formatBookingDate(booking.date)} · ${booking.time} · ${booking.guests} guests`,
          items: "Deposit due",
          duePence: depositDue,
          paidPence: 0,
          leftPence: depositDue,
          incomplete: true,
          payments: serializePayments(booking.payments),
          bookingId: booking.id,
        };
      }),
  ];

  const taken = dayPayments.reduce((sum, payment) => sum + leftoverPence(payment), 0);
  const refunded = refundedPence(dayPayments);
  const dueLeft = outstanding.reduce((sum, row) => sum + row.leftPence, 0);

  return (
    <div className="today-page">
      <KitchenRefresh every={12000} />
      <div className="today-hero">
        <div>
          <DateNav date={date} today={today} base="/admin/payments" />
          <h1 className="admin-page-title">{loc.shortName} payments</h1>
          <p className="admin-page-copy">
            {formatBookingDate(date)} · {dayPayments.length} taken · {outstanding.length} still to take.
            {stripe.ready
              ? ` Stripe ${stripe.livemode ? "live" : "test"} ${stripe.keyHint}. Card, Apple Pay and Google Pay land here.`
              : " Paste the Stripe API key in Settings to take live card payments."}
          </p>
          {!stripe.ready ? (
            <p className="admin-page-copy">
              <Link href="/admin/settings">Open Settings</Link> to paste the Stripe key.
            </p>
          ) : null}
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat is-forest">
          <p>Kept</p>
          <strong>{formatMoney(taken)}</strong>
        </div>
        <div className="admin-stat is-amber">
          <p>Refunded</p>
          <strong>{formatMoney(refunded)}</strong>
        </div>
        <div className="admin-stat is-ember">
          <p>Still to take</p>
          <strong>{formatMoney(dueLeft)}</strong>
        </div>
        <div className="admin-stat is-navy">
          <p>Stripe</p>
          <strong>{stripe.ready ? (stripe.livemode ? "Live" : "Test") : "Off"}</strong>
        </div>
      </div>

      <PaymentsDesk payments={cards} outstanding={outstanding} stripe={stripe} />
    </div>
  );
}
