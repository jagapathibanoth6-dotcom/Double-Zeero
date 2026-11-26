import { notFound } from "next/navigation";
import { CancelConfirm } from "@/components/CancelConfirm";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { formatBookingDate } from "@/lib/booking";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/platform/money";
import { refundQuote, serializePayments } from "@/lib/platform/pay";
import { customerCanCancelOrder } from "@/lib/platform/customer-cancel";
import { RefundStatement } from "@/components/RefundStatement";

export const dynamic = "force-dynamic";

export default async function CancelOrderByRef({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const ref = (await searchParams).ref?.toUpperCase() || "";
  if (!ref) notFound();
  const order = await db.order.findUnique({
    where: { ref },
    include: { items: true, payments: { include: { refunds: true } } },
  });
  if (!order) notFound();

  const loc = locations[order.locationId as keyof typeof locations];
  const gate = customerCanCancelOrder(order.status);
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
        title={gate.ok ? "Cancel this order?" : "This order cannot be cancelled."}
        copy={
          gate.ok
            ? quote.refundPence
              ? `${formatMoney(quote.refundPence)} will go back the same way it was taken.`
              : "Nothing was paid, so there is no refund."
            : gate.reason
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
      {order.status === "CANCELLED" ? <RefundStatement quote={quote} done /> : <RefundStatement quote={quote} />}
      {gate.ok ? (
        <CancelConfirm kind="order" code={order.ref} backHref={`/order/confirmed?ref=${order.ref}`} />
      ) : (
        <div className="mt-8">
          <Button href={`/order/confirmed?ref=${order.ref}`}>Back to order</Button>
        </div>
      )}
    </SitePage>
  );
}
