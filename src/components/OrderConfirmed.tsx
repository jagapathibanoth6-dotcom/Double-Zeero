"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { formatMoney } from "@/lib/platform/money";
import { leftPence, payLabel, refundQuote, type PaymentRow } from "@/lib/platform/pay";
import { RefundStatement } from "@/components/RefundStatement";
import { StripePayAgain } from "@/components/StripePayAgain";
import type { LocationId } from "@/data/site";
import { AccessCard, type AccessInfo } from "@/components/AccessCard";
import { MailNote } from "@/components/MailNote";
import type { MailBundle } from "@/lib/platform/mail-events";
import { PayFacts } from "@/components/PayFacts";
import { DeliveryPins, TrackPins, trackKindFrom } from "@/components/TrackPins";

type Order = {
  id?: string;
  locationId?: LocationId;
  ref: string;
  source: string;
  status: string;
  date: string;
  time: string;
  asap: boolean;
  address: string;
  name?: string;
  email?: string;
  totalPence: number;
  deliveryFeePence: number;
  items: { name: string; quantity: number; unitPence: number }[];
  delivery?: { status: string; etaMinutes: number; courierName: string } | null;
  payments?: PaymentRow[];
  access?: AccessInfo | null;
  mail?: MailBundle | null;
};

export function OrderConfirmed() {
  const params = useSearchParams();
  const ref = params.get("ref")?.toUpperCase() || "";
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("dz-order");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!ref || parsed.ref === ref) setOrder(parsed);
    }
    if (!ref) return;
    function load() {
      fetch(`/api/order?ref=${ref}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.order) return;
          if (d.order.status === "CANCELLED") sessionStorage.removeItem("dz-order");
          setOrder((current) => ({
            ...d.order,
            access: current?.access || d.access,
            mail: current?.mail || d.mail,
          }));
        });
    }
    load();
    const tick = window.setInterval(load, 8000);
    return () => window.clearInterval(tick);
  }, [ref]);

  if (!order) return <div className="px-5 py-32 text-center text-mute">Loading order…</div>;

  const cancelled = order.status === "CANCELLED";
  const waitingPay = order.status === "PENDING_PAY";
  const kind =
    order.source === "DZ_DELIVERY" ? "Home delivery" : order.source === "CLICK_COLLECT" ? "Click & collect" : order.source.replace("_", " ");
  const due = leftPence(order.totalPence, order.payments);
  const canPay = waitingPay && due > 0 && Boolean(order.id && order.locationId);

  return (
    <SitePage>
        <SectionTitle
          eyebrow={cancelled ? "Cancelled" : waitingPay ? "Waiting for payment" : payLabel(order.payments, order.totalPence)}
          title={
            cancelled
              ? `Order ${order.ref} is cancelled`
              : waitingPay
                ? `Pay to confirm ${order.ref}`
                : `Order ${order.ref}`
          }
          copy={
            cancelled
              ? `${kind}. This order is cancelled, so there is nothing to pay.`
              : waitingPay
                ? `${kind} · ${formatMoney(order.totalPence)}. The kitchen only sees this after Stripe takes the payment.`
                : `${kind} · ${formatMoney(order.totalPence)}`
          }
        />
        <div className="site-card mt-8 p-6 md:p-8">
        <ul className="space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.name}>
              {item.quantity} × {item.name} — {formatMoney(item.unitPence * item.quantity)}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-mute">
          {order.asap ? "ASAP collection" : order.time ? `${order.date} at ${order.time}` : ""}
          {order.address ? ` · ${order.address}` : ""}
        </p>
        <dl className="account-meta mt-6">
          <PayFacts duePence={order.totalPence} payments={order.payments} />
        </dl>
        {canPay ? (
          <StripePayAgain
            locationId={order.locationId as LocationId}
            orderId={order.id}
            cancelPath={`/order/confirmed?ref=${order.ref}`}
            label="Pay to confirm this order"
          />
        ) : null}
        {cancelled ? (
          <RefundStatement
            quote={refundQuote({
              type: kind,
              name: order.name,
              email: order.email || order.access?.email,
              payments: order.payments,
            })}
            done
          />
        ) : null}
        <div className="mt-8">
          <p className="display text-[0.68rem] tracking-[0.18em] text-ember">Tracking</p>
          <TrackPins kind={trackKindFrom(order.source)} status={order.status} />
        </div>
        {order.source === "DZ_DELIVERY" ? (
          <div className="mt-8">
            <p className="display text-[0.68rem] tracking-[0.18em] text-ember">Pin points</p>
            <DeliveryPins
              status={order.delivery?.status || order.status}
              restaurant="Double Zero kitchen"
              address={order.address}
            />
            {order.delivery ? (
              <p className="mt-3 text-sm text-mute">
                {order.delivery.courierName || "Courier"} · about {order.delivery.etaMinutes} min
              </p>
            ) : null}
          </div>
        ) : null}
        </div>
        <AccessCard access={order.access} />
        <MailNote email={order.access?.email} mail={order.mail} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/account">My Double Zero</Button>
          {order.status !== "CANCELLED" && order.status !== "COMPLETED" && order.status !== "DISPATCHED" ? (
            <Button href={`/order/cancel?ref=${order.ref}`} variant="ghost">
              Cancel this order
            </Button>
          ) : null}
        </div>
    </SitePage>
  );
}
