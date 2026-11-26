import Link from "next/link";
import { PayBadge } from "@/components/admin/PayBadge";
import { endTime } from "@/lib/platform/diary";
import { formatMoney } from "@/lib/platform/money";
import { orderTypeLabel } from "@/lib/platform/order-label";
import { paySummary, type PaymentRow } from "@/lib/platform/pay";
import { RefundControls } from "@/components/admin/RefundControls";

export type TableBoardTable = {
  id: string;
  code: string;
  seats: number;
  active: boolean;
};

export type TableBoardOrder = {
  id: string;
  ref: string;
  status: string;
  source: string;
  totalPence: number;
  items: Array<{ name: string; quantity: number; notes?: string }>;
  payments: PaymentRow[];
  guest?: { name: string } | null;
};

export type TableBoardBooking = {
  id: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  guests: number;
  time: string;
  durationMin: number;
  status: string;
  visitType: string;
  notes: string;
  tableCodes: string;
  highchair?: boolean;
  customerId?: string | null;
  party?: { code: string; guests?: Array<{ name: string }> } | null;
  orders: TableBoardOrder[];
  payments: PaymentRow[];
};

function codesOf(booking: TableBoardBooking) {
  return booking.tableCodes.split(",").map((code) => code.trim()).filter(Boolean);
}

function sittingState(booking: TableBoardBooking, nowMins: number, isToday: boolean) {
  const start = timeToMins(booking.time);
  const end = start + (booking.durationMin || 90);
  if (isToday && nowMins >= start && nowMins < end) return "live";
  if (isToday && nowMins >= end) return "done";
  return "soon";
}

function timeToMins(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function SittingCard({
  booking,
  tableCode,
  nowMins,
  isToday,
}: {
  booking: TableBoardBooking;
  tableCode?: string;
  nowMins: number;
  isToday: boolean;
}) {
  const state = sittingState(booking, nowMins, isToday);
  const codes = codesOf(booking);
  const combined = tableCode ? codes.filter((code) => code !== tableCode) : codes;
  const allPayments = [...booking.payments, ...booking.orders.flatMap((order) => order.payments)];
  const due = booking.orders.reduce((sum, order) => sum + order.totalPence, 0);
  const bill = paySummary(due, allPayments);
  const items = booking.orders.flatMap((order) =>
    order.items.map((item) => {
      const who = order.guest?.name ? ` · ${order.guest.name}` : "";
      return `${item.quantity}× ${item.name}${item.notes ? ` (${item.notes})` : ""}${who}`;
    }),
  );
  const partyNames = booking.party?.guests?.map((guest) => guest.name).filter(Boolean) || [];
  const statusLabel = state === "live" ? "In house" : state === "done" ? "Left" : booking.status.replace(/_/g, " ");

  return (
    <article className={`floor-sit ${state === "live" ? "is-live" : state === "done" ? "is-done" : ""}`}>
      <div className="floor-sit-top">
        <time>
          {booking.time}–{endTime(booking.time, booking.durationMin || 90)}
        </time>
        <span>
          <span className="admin-badge">{statusLabel}</span>
          <PayBadge
            payments={allPayments}
            duePence={due}
            paid={bill.label === "Paid"}
            label={bill.label === "Paid" ? "Paid" : `${bill.label}${bill.leftPence ? ` · ${formatMoney(bill.leftPence)} left` : ""}`}
          />
        </span>
      </div>
      <p className="floor-guest">{booking.name}</p>
      <p className="floor-meta">
        {booking.guests} pax · {booking.ref}
        {booking.visitType === "collection" ? " · collect" : ""}
        {booking.party ? ` · party ${booking.party.code}` : ""}
        {booking.highchair ? " · highchair" : ""}
        {combined.length ? ` · with ${combined.join(", ")}` : ""}
      </p>
      {partyNames.length ? <p className="floor-meta">Guests: {partyNames.join(", ")}</p> : null}
      {booking.phone || booking.email ? (
        <p className="floor-meta">
          {[booking.phone, booking.email].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {items.length ? (
        <ul className="floor-order">
          {items.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="floor-meta">No food order yet</p>
      )}
      {booking.orders.map((order) => (
        <p key={order.id} className="floor-meta">
          {order.ref} · {orderTypeLabel(order.source)} · {order.status.replace(/_/g, " ")} · {formatMoney(order.totalPence)}
        </p>
      ))}
      {booking.notes ? <p className="floor-note">{booking.notes}</p> : null}
      <RefundControls payments={allPayments} bookingId={booking.id} compact />
      <div className="floor-links">
        <Link href={`/admin/bookings/${booking.id}`}>Open booking</Link>
        {booking.customerId ? <Link href={`/admin/customers/${booking.customerId}`}>Guest</Link> : null}
        {booking.orders.map((order) => (
          <Link key={order.id} href={`/admin/orders/${order.id}`}>
            {order.ref}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function TableBoard({
  tables,
  bookings,
  nowMins,
  isToday,
}: {
  tables: TableBoardTable[];
  bookings: TableBoardBooking[];
  nowMins: number;
  isToday: boolean;
}) {
  const seated = bookings.filter((booking) => booking.visitType !== "collection" && codesOf(booking).length);
  const unassigned = bookings.filter((booking) => booking.visitType !== "collection" && !codesOf(booking).length);
  const liveCodes = new Set(
    seated
      .filter((booking) => sittingState(booking, nowMins, isToday) === "live")
      .flatMap(codesOf),
  );

  return (
    <div className="floor-board">
      <div className="floor-grid">
        {tables.map((table) => {
          const sittings = seated.filter((booking) => codesOf(booking).includes(table.code));
          const live = table.active && liveCodes.has(table.code);
          const reserved = table.active && !live && sittings.some((booking) => sittingState(booking, nowMins, isToday) === "soon");
          const house = !table.active ? "Off" : live ? "In house" : reserved ? "Reserved" : "Free";
          return (
            <section
              key={table.id}
              className={`floor-card ${!table.active ? "is-off" : live ? "is-live" : reserved ? "is-held" : "is-free"}`}
            >
              <header className="floor-card-head">
                <div>
                  <p className="floor-code">{table.code}</p>
                  <p className="floor-seats">{table.seats} seats</p>
                </div>
                <span className="admin-badge">{house}</span>
              </header>
              {sittings.length ? (
                sittings.map((booking) => (
                  <SittingCard key={booking.id} booking={booking} tableCode={table.code} nowMins={nowMins} isToday={isToday} />
                ))
              ) : (
                <p className="today-empty">{table.active ? "No guest assigned." : "Table is turned off."}</p>
              )}
            </section>
          );
        })}
      </div>

      {unassigned.length ? (
        <section className="floor-unassigned">
          <h3>Unassigned guests</h3>
          <p>Need a table for this service.</p>
          <div className="floor-unassigned-list">
            {unassigned.map((booking) => (
              <SittingCard key={booking.id} booking={booking} nowMins={nowMins} isToday={isToday} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
