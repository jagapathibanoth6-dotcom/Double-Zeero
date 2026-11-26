import { notFound } from "next/navigation";
import { CancelConfirm } from "@/components/CancelConfirm";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { formatBookingDate } from "@/lib/booking";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { refundQuote, serializePayments } from "@/lib/platform/pay";
import { customerCanCancelBooking } from "@/lib/platform/customer-cancel";
import { RefundStatement } from "@/components/RefundStatement";

export const dynamic = "force-dynamic";

export default async function CancelBookingByRef({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const ref = (await searchParams).ref?.toUpperCase() || "";
  if (!ref) notFound();
  const booking = await db.booking.findUnique({
    where: { ref },
    include: { payments: { include: { refunds: true } }, orders: { include: { payments: { include: { refunds: true } } } } },
  });
  if (!booking) notFound();

  const loc = locations[booking.locationId as keyof typeof locations];
  const payments = [...booking.payments, ...booking.orders.flatMap((order) => order.payments)];
  const gate = customerCanCancelBooking(booking.status);
  const blocked = !gate.ok || booking.orders.some((order) => order.status === "DISPATCHED");
  const quote = refundQuote({
    type: booking.visitType === "collection" ? "Collection" : "Book a table",
    name: booking.name,
    email: booking.email,
    payments: serializePayments(payments),
  });

  return (
    <SitePage>
      <SectionTitle
        eyebrow={booking.ref}
        title={blocked ? "This booking cannot be cancelled." : "Cancel this booking?"}
        copy={
          blocked
            ? booking.orders.some((order) => order.status === "DISPATCHED")
              ? "Food from this booking is already on the way. Call the restaurant."
              : gate.reason
            : quote.refundPence
              ? `${formatMoney(quote.refundPence)} will go back the same way it was taken.`
              : "Nothing was paid, so there is no refund."
        }
      />
      <dl className="mt-10 divide-y divide-line border-y border-line text-sm">
        {[
          ["Type", booking.visitType === "collection" ? "Collection" : "Book a table"],
          ["Restaurant", loc?.shortName || booking.locationId],
          ["When", `${formatBookingDate(booking.date)} at ${booking.time}`],
          ["Guests", String(booking.guests)],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-3">
            <dt className="display text-[0.68rem] tracking-[0.18em] text-mute">{label}</dt>
            <dd className="sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
      <RefundStatement quote={quote} done={booking.status === "CANCELLED"} />
      {blocked ? (
        <div className="mt-8">
          <Button href={`/book/confirmed?ref=${booking.ref}`}>Back to booking</Button>
        </div>
      ) : (
        <CancelConfirm kind="booking" code={booking.ref} backHref={`/book/confirmed?ref=${booking.ref}`} />
      )}
    </SitePage>
  );
}
