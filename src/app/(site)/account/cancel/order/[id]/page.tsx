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

export default async function CancelOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomer();
  if (!customer) redirect("/account");
  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, customerId: customer.id },
    include: { items: true, payments: { include: { refunds: true } } },
  });
  if (!order) notFound();

  const loc = locations[order.locationId as keyof typeof locations];
  const done = order.status === "CANCELLED" || order.status === "COMPLETED";
  const type = order.source === "DZ_DELIVERY" ? "Home delivery" : order.source === "CLICK_COLLECT" ? "Click & collect" : "Order";
  const when = order.asap ? "ASAP" : `${order.date ? formatBookingDate(order.date) : ""} ${order.time || ""}`.trim();
  const quote = refundQuote({
    type,
    name: order.name,
    email: order.email,
    payments: serializePayments(order.payments),
  });

  return (
    <SitePage>
      <SectionTitle
        eyebrow={order.ref}
        title={done ? "This order cannot be cancelled." : "Cancel this order?"}
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
          ["Type", type],
          ["Restaurant", loc?.shortName || order.locationId],
          ["When", when || "—"],
          ["Items", order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "—"],
          ["Total", formatMoney(order.totalPence)],
        ].map(([label, value]) => (
          <div key={label} className="grid gap-1 py-4 sm:grid-cols-3">
            <dt className="display text-[0.68rem] tracking-[0.18em] text-mute">{label}</dt>
            <dd className="sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
      <RefundStatement quote={quote} done={order.status === "CANCELLED"} />
      {done ? (
        <div className="mt-8">
          <Button href="/account">Back to account</Button>
        </div>
      ) : (
        <CancelConfirm kind="order" id={order.id} backHref="/account" />
      )}
    </SitePage>
  );
}
