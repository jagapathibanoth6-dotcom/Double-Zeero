import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { formatBookingDate } from "@/lib/booking";
import { locations } from "@/data/site";
import { db } from "@/lib/db";
import { requireBranchRecord } from "@/lib/platform/admin";
import { formatMoney } from "@/lib/platform/money";
import { formatOrderWhen, orderTypeLabel } from "@/lib/platform/order-label";
import { paidPence } from "@/lib/platform/pay";

export const dynamic = "force-dynamic";

export default async function AdminCancelOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { include: { refunds: true } } },
  });
  if (!order) notFound();
  await requireBranchRecord(order.locationId);

  const loc = locations[order.locationId as keyof typeof locations];
  const pretty = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : "";
  const refund = paidPence(order.payments);
  const done = order.status === "CANCELLED" || order.status === "COMPLETED";

  return (
    <div className="record-page">
      <Link href={`/admin/orders/${order.id}`} className="record-back">
        ← Back to order
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">Cancel order</p>
          <h1 className="admin-page-title">{order.ref}</h1>
          <p className="admin-page-copy">
            {orderTypeLabel(order.source)} · {loc?.shortName || order.locationId} · {formatOrderWhen(order, pretty)}
          </p>
        </div>
      </div>
      <section className="admin-panel">
        <h2>{done ? "This order cannot be cancelled" : "Cancel this order only"}</h2>
        <p className="admin-page-copy">
          {done
            ? "It is already finished or cancelled."
            : refund
              ? `${formatMoney(refund)} will be refunded to the same payment method.`
              : "Nothing is left to refund."}
        </p>
        <dl className="record-dl mt-6">
          <div>
            <dt>Customer</dt>
            <dd>{order.name || "Walk-in"}</dd>
          </div>
          <div>
            <dt>Items</dt>
            <dd>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ") || "—"}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatMoney(order.totalPence)}</dd>
          </div>
        </dl>
        <div className="order-record-actions mt-6">
          {done ? (
            <Link href={`/admin/orders/${order.id}`} className="btn btn-ghost">
              Back to order
            </Link>
          ) : (
            <ActionButton action="order_status" body={{ orderId: order.id, status: "CANCELLED" }} label="Confirm cancel" />
          )}
        </div>
      </section>
    </div>
  );
}
