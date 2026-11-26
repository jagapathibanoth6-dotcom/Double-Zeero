import { db } from "@/lib/db";
import { formatBookingDate, londonDayRange, todayISO } from "@/lib/booking";
import { locations } from "@/data/site";
import { isISODate } from "@/lib/platform/diary";
import { requireBranch } from "@/lib/platform/admin";
import { paySummary, serializePayments } from "@/lib/platform/pay";
import { formatOrderWhen, trackLanes } from "@/lib/platform/order-label";
import { viaLabel } from "@/lib/platform/via";
import { DateNav } from "@/components/admin/DateNav";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";
import { OrdersDesk } from "@/components/admin/OrdersDesk";
import { OrderTrackBoard } from "@/components/admin/OrderTrackBoard";

export async function OrdersScreen({
  kind = "all",
  dateParam,
}: {
  kind?: "all" | "CLICK_COLLECT" | "DZ_DELIVERY";
  dateParam?: string;
}) {
  const branch = await requireBranch();
  const today = todayISO();
  const date = isISODate(dateParam) ? dateParam : today;
  const { start, end } = londonDayRange(date);
  const tracking = kind === "CLICK_COLLECT" || kind === "DZ_DELIVERY";
  const orders = await db.order.findMany({
    where: {
      locationId: branch,
      ...(kind === "all" ? {} : { source: kind }),
      ...(tracking
        ? {
            status: { notIn: ["PENDING_PAY"] },
            OR: [{ date }, { date: "", createdAt: { gte: start, lt: end } }],
          }
        : {}),
    },
    include: { items: true, payments: { include: { refunds: true } }, delivery: true },
    orderBy: [{ time: "asc" }, { createdAt: "desc" }],
    take: tracking ? 200 : 120,
  });

  const title = kind === "CLICK_COLLECT" ? "Click & collect" : kind === "DZ_DELIVERY" ? "Home delivery" : "Orders";
  const copy =
    kind === "CLICK_COLLECT"
      ? "Pick a day. Move tickets from orders to cooking, then still to collect, then picked up."
      : kind === "DZ_DELIVERY"
        ? "Pick a day. Move tickets from orders to cooking, then on the way, then delivered."
        : "Click & collect, home delivery and in-restaurant tickets.";
  const base = kind === "CLICK_COLLECT" ? "/admin/collect" : kind === "DZ_DELIVERY" ? "/admin/delivery" : "/admin/orders";
  const loc = locations[branch];

  if (tracking) {
    const lanes = trackLanes(kind);
    const counts = lanes.map((lane) => ({
      label: lane.label,
      count: orders.filter((order) => lane.statuses.includes(order.status)).length,
    }));
    return (
      <div className="today-page">
        <KitchenRefresh every={3000} />
        <div className="today-hero">
          <div>
            <DateNav date={date} today={today} base={base} />
            <h1 className="admin-page-title">
              {loc.shortName} {title.toLowerCase()}
            </h1>
            <p className="admin-page-copy">
              {formatBookingDate(date)} · {copy} {counts.map((row) => `${row.count} ${row.label.toLowerCase()}`).join(" · ")}
            </p>
          </div>
        </div>
        <OrderTrackBoard
          kind={kind}
          orders={orders.map((order) => {
            const bill = paySummary(order.totalPence, order.payments);
            const pretty = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : "";
            return {
              id: order.id,
              ref: order.ref,
              source: kind,
              status: order.status,
              name: order.name,
              phone: order.phone,
              when: formatOrderWhen(order, pretty),
              items: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
              via: viaLabel(order.via),
              address: order.address,
              payLabel: bill.label,
              paidPence: bill.paidPence,
              refundedPence: bill.refundedPence,
              leftPence: bill.leftPence,
              payments: serializePayments(order.payments),
              courierName: order.delivery?.courierName || "",
              trackingUrl: order.delivery?.trackingUrl || "",
              etaMinutes: order.delivery?.etaMinutes || 0,
              deliveryStatus: order.delivery?.status || "",
            };
          })}
        />
      </div>
    );
  }

  return (
    <div>
      <KitchenRefresh every={3000} />
      <h1 className="admin-page-title">
        {loc.shortName} {title.toLowerCase()}
      </h1>
      <p className="admin-page-copy">{copy}</p>
      <OrdersDesk
        startFilter="all"
        orders={orders.map((order) => {
          const bill = paySummary(order.totalPence, order.payments);
          const pretty = /^\d{4}-\d{2}-\d{2}$/.test(order.date) ? formatBookingDate(order.date) : "";
          return {
            id: order.id,
            ref: order.ref,
            source: order.source,
            status: order.status,
            name: order.name,
            when: formatOrderWhen(order, pretty),
            items: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
            payLabel: bill.label,
            paidPence: bill.paidPence,
            refundedPence: bill.refundedPence,
            leftPence: bill.leftPence,
            payments: serializePayments(order.payments),
            fresh:
              ["CLICK_COLLECT", "DZ_DELIVERY"].includes(order.source) &&
              order.status !== "CANCELLED" &&
              order.status !== "COMPLETED" &&
              order.status !== "PENDING_PAY" &&
              Date.now() - order.createdAt.getTime() < 15 * 60 * 1000,
          };
        })}
      />
    </div>
  );
}
