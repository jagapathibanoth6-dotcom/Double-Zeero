import { notFound, redirect } from "next/navigation";
import { CancelConfirm } from "@/components/CancelConfirm";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { formatBookingDate } from "@/lib/booking";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { refundQuote, serializePayments } from "@/lib/platform/pay";
import { getCustomer } from "@/lib/platform/session";
import { RefundStatement } from "@/components/RefundStatement";

export default async function CancelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomer();
  if (!customer) redirect("/account");
  const { id } = await params;
  const booking = await db.booking.findFirst({
    where: { id, customerId: customer.id },
    include: { payments: { include: { refunds: true } }, orders: { include: { payments: { include: { refunds: true } } } } },
  });
  if (!booking) notFound();

  const loc = locations[booking.locationId as keyof typeof locations];
  const done = booking.status === "CANCELLED" || booking.status === "COMPLETED";
  const quote = refundQuote({
    type: booking.visitType === "collection" ? "Collection" : "Book a table",
    name: booking.name,
    email: booking.email,
    payments: serializePayments([...booking.payments, ...booking.orders.flatMap((order) => order.payments)]),
  });

  return (
    <SitePage>
      <SectionTitle
        eyebrow={booking.ref}
        title={done ? "This booking cannot be cancelled." : "Cancel this booking?"}
        copy={
          done
            ? "It is already finished or cancelled."
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
      {done ? (
        <div className="mt-8">
          <Button href="/account">Back to account</Button>
        </div>
      ) : (
        <CancelConfirm kind="booking" id={booking.id} backHref="/account" />
      )}
    </SitePage>
  );
}
