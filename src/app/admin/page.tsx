import Link from "next/link";
import { db } from "@/lib/db";
import { formatBookingDate, londonDayRange, londonParts, todayISO, toMinutes } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { ensureOrderVia } from "@/lib/platform/orders";
import { locations } from "@/data/site";
import { isISODate } from "@/lib/platform/diary";
import { requireBranch } from "@/lib/platform/admin";
import { PayBadge } from "@/components/admin/PayBadge";
import { paySummary } from "@/lib/platform/pay";
import { DateNav } from "@/components/admin/DateNav";
import { TableBoard } from "@/components/admin/TableBoard";
import { orderTypeLabel } from "@/lib/platform/order-label";
import { viaLabel } from "@/lib/platform/via";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const branch = await requireBranch();
  await ensureOrderVia();
  const params = await searchParams;
  const today = todayISO();
  const date = isISODate(params.date) ? params.date : today;
  const isToday = date === today;
  const { start, end } = londonDayRange(date);
  const now = londonParts();
  const nowMins = toMinutes(`${now.hour}:${now.minute}`);
  const loc = locations[branch];

  const [bookings, orders, enquiries, waitlist, tables] = await Promise.all([
    db.booking.findMany({
      where: { locationId: branch, date, status: { notIn: ["CANCELLED", "DECLINED"] } },
      include: {
        party: { include: { guests: true } },
        payments: { include: { refunds: true } },
        orders: { include: { items: true, guest: true, payments: { include: { refunds: true } } } },
      },
      orderBy: { time: "asc" },
    }),
    db.order.findMany({
      where: {
        locationId: branch,
        OR: [{ date }, { date: "", createdAt: { gte: start, lt: end } }],
      },
      include: { items: true, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.enquiry.findMany({
      where: { locationId: branch, status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.waitlistEntry.findMany({
      where: { locationId: branch, status: "WAITING", date },
      orderBy: { time: "asc" },
    }),
    db.table.findMany({ where: { locationId: branch }, orderBy: [{ y: "asc" }, { x: "asc" }, { code: "asc" }] }),
  ]);

  const parties = bookings.filter((b) => b.party).length;
  const covers = bookings.reduce((sum, b) => sum + b.guests, 0);
  const inHouse = isToday
    ? bookings.filter((b) => {
        const startMins = toMinutes(b.time);
        return nowMins >= startMins && nowMins < startMins + (b.durationMin || 90);
      })
    : [];
  const upcoming = bookings.filter((b) => !isToday || toMinutes(b.time) >= nowMins);
  const next = upcoming[0] || null;
  const activeTables = tables.filter((table) => table.active);
  const taken = new Set(
    inHouse.flatMap((b) => b.tableCodes.split(",").map((code) => code.trim()).filter(Boolean)),
  );
  const liveOrders = orders.filter((o) => o.status !== "PENDING_PAY");
  const kitchen = liveOrders.filter((o) => ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(o.status));
  const revenue = liveOrders.reduce((sum, o) => sum + o.totalPence, 0);

  const cards = [
    { href: "/admin/bookings", label: "Bookings", value: bookings.length, note: `${covers} covers`, tone: "ember" },
    { href: "/admin/orders", label: "Orders", value: liveOrders.length, note: formatMoney(revenue), tone: "gold" },
    { href: "/admin/kitchen", label: "Kitchen", value: kitchen.length, note: "tickets open", tone: "forest" },
    { href: "/admin/collect", label: "Collection", value: liveOrders.filter((o) => o.source === "CLICK_COLLECT").length, note: "click & collect", tone: "teal" },
    { href: "/admin/delivery", label: "Delivery", value: liveOrders.filter((o) => o.source === "DZ_DELIVERY").length, note: "out for drop", tone: "navy" },
    { href: "/admin/parties", label: "Parties", value: parties, note: "large groups", tone: "wine" },
    { href: "/admin/enquiries", label: "Enquiries", value: enquiries.length, note: "need a reply", tone: "amber" },
    { href: "/admin/waitlist", label: "Waitlist", value: waitlist.length, note: "waiting this day", tone: "slate" },
    { href: "/admin/tables", label: "Tables", value: Math.max(activeTables.length - taken.size, 0), note: `${taken.size} in use`, tone: "gold" },
  ];

  return (
    <div className="today-page">
      <div className="today-hero">
        <div>
          <DateNav date={date} today={today} base="/admin" />
          <h1 className="admin-page-title">{isToday ? "Today" : formatBookingDate(date)}</h1>
        </div>
        <div className="today-pulse">
          <div>
            <span>In house</span>
            <strong>{inHouse.length}</strong>
          </div>
          <div>
            <span>Tables free</span>
            <strong>{Math.max(activeTables.length - taken.size, 0)}</strong>
          </div>
          <div>
            <span>Next seating</span>
            <strong>{next ? next.time : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="admin-stat-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className={`admin-stat is-${card.tone}`}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <em>{card.note}</em>
          </Link>
        ))}
      </div>

      <div className="today-board">
        <section className="admin-panel today-tables">
          <div className="today-panel-head">
            <div>
              <h2>Tables</h2>
              <p>Guest assigned, food ordered, and status on the floor</p>
            </div>
            <Link href={`/admin/tables${isToday ? "" : `?date=${date}`}`}>Open floor</Link>
          </div>
          <TableBoard tables={tables} bookings={bookings} nowMins={nowMins} isToday={isToday} />
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Bookings</h2>
              <p>{covers} covers across {bookings.length} reservations</p>
            </div>
            <Link href={`/admin/bookings?date=${date}`}>Open diary</Link>
          </div>
          <div className="today-lane">
            {bookings.map((b) => {
              const startMins = toMinutes(b.time);
              const live = isToday && nowMins >= startMins && nowMins < startMins + (b.durationMin || 90);
              const payments = [...b.payments, ...b.orders.flatMap((order) => order.payments)];
              const bill = paySummary(
                b.orders.reduce((sum, order) => sum + order.totalPence, 0),
                payments,
              );
              return (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className={`today-card ${live ? "is-live" : ""}`}>
                  <time>{b.time}</time>
                  <div>
                    <p className="today-card-name">{b.name}</p>
                    <p className="today-card-meta">
                      {b.guests} pax
                      {b.tableCodes ? ` · ${b.tableCodes}` : " · unassigned"}
                      {b.visitType === "collection" ? " · collect" : ""}
                      {b.party ? ` · party ${b.party.code}` : ""}
                      {b.orders.length
                        ? ` · ${b.orders.flatMap((order) => order.items.map((item) => `${item.quantity}× ${item.name}`)).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <span>
                    <span className="admin-badge">{live ? "In house" : b.status.replace(/_/g, " ")}</span>
                    <PayBadge
                      payments={payments}
                      duePence={bill.duePence}
                      paid={bill.label === "Paid"}
                      label={bill.label === "Paid" ? "Paid" : `${bill.label} · ${formatMoney(bill.leftPence)} left`}
                    />
                  </span>
                </Link>
              );
            })}
            {!bookings.length ? <p className="today-empty">No bookings for this branch on this day.</p> : null}
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Click & collect</h2>
              <p>{liveOrders.filter((o) => o.source === "CLICK_COLLECT").length} from website, restaurant pages and QR</p>
            </div>
            <Link href="/admin/orders">Open orders</Link>
          </div>
          <div className="today-lane">
            {liveOrders
              .filter((o) => o.source === "CLICK_COLLECT")
              .map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="today-card">
                  <time>{o.time || (o.asap ? "ASAP" : "—")}</time>
                  <div>
                    <p className="today-card-name">{o.name || o.ref}</p>
                    <p className="today-card-meta">
                      {o.ref} · {viaLabel(o.via) || "Website"}
                      {o.items.length ? ` · ${o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}` : ""}
                    </p>
                  </div>
                  <span>
                    <span className="admin-badge">{o.status.replace(/_/g, " ")}</span>
                    <PayBadge payments={o.payments} label={paySummary(o.totalPence, o.payments).label} />
                  </span>
                </Link>
              ))}
            {!liveOrders.some((o) => o.source === "CLICK_COLLECT") ? <p className="today-empty">No click & collect for this day.</p> : null}
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Home delivery</h2>
              <p>{liveOrders.filter((o) => o.source === "DZ_DELIVERY").length} from website, restaurant pages and QR</p>
            </div>
            <Link href="/admin/orders">Open orders</Link>
          </div>
          <div className="today-lane">
            {liveOrders
              .filter((o) => o.source === "DZ_DELIVERY")
              .map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="today-card">
                  <time>{o.time || (o.asap ? "ASAP" : "—")}</time>
                  <div>
                    <p className="today-card-name">{o.name || o.ref}</p>
                    <p className="today-card-meta">
                      {o.ref} · {viaLabel(o.via) || "Website"}
                      {o.address ? ` · ${o.address}` : ""}
                    </p>
                  </div>
                  <span>
                    <span className="admin-badge">{o.status.replace(/_/g, " ")}</span>
                    <PayBadge payments={o.payments} label={paySummary(o.totalPence, o.payments).label} />
                  </span>
                </Link>
              ))}
            {!liveOrders.some((o) => o.source === "DZ_DELIVERY") ? <p className="today-empty">No home delivery for this day.</p> : null}
          </div>
        </section>

        <section className="admin-panel">
          <div className="today-panel-head">
            <div>
              <h2>Kitchen</h2>
              <p>{kitchen.length} open · {formatMoney(revenue)} taken</p>
            </div>
            <Link href="/admin/kitchen">Kitchen</Link>
          </div>
          <div className="today-lane">
            {liveOrders
              .filter((o) => !["CLICK_COLLECT", "DZ_DELIVERY"].includes(o.source))
              .slice(0, 10)
              .map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="today-card">
                  <time>{o.time || (o.asap ? "ASAP" : "—")}</time>
                  <div>
                    <p className="today-card-name">{o.ref}</p>
                    <p className="today-card-meta">
                      {o.name || "Walk-in"} · {orderTypeLabel(o.source)} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                    </p>
                  </div>
                  <span>
                    <span className="admin-badge">{formatMoney(o.totalPence)} · {o.status}</span>
                    <PayBadge
                      payments={o.payments}
                      label={`${paySummary(o.totalPence, o.payments).label} · ${formatMoney(paySummary(o.totalPence, o.payments).leftPence)} left`}
                    />
                  </span>
                </Link>
              ))}
            {!liveOrders.filter((o) => !["CLICK_COLLECT", "DZ_DELIVERY"].includes(o.source)).length ? (
              <p className="today-empty">No in-house tickets for this day.</p>
            ) : null}
          </div>
        </section>

        <section className="admin-panel today-actions">
          <div className="today-panel-head">
            <div>
              <h2>Needs action</h2>
              <p>Waitlist and new enquiries for {loc.shortName}</p>
            </div>
          </div>
          <div className="today-action-grid">
            <div>
              <div className="today-panel-head">
                <h3>Waitlist</h3>
                <Link href="/admin/waitlist">Open</Link>
              </div>
              {waitlist.map((row) => (
                <article key={row.id} className="today-mini">
                  <strong>{row.time}</strong>
                  <span>
                    {row.name} · {row.guests} pax
                  </span>
                </article>
              ))}
              {!waitlist.length ? <p className="today-empty">Clear.</p> : null}
            </div>
            <div>
              <div className="today-panel-head">
                <h3>Enquiries</h3>
                <Link href="/admin/enquiries">Open</Link>
              </div>
              {enquiries.map((row) => (
                <article key={row.id} className="today-mini">
                  <strong>{row.preferredTime}</strong>
                  <span>
                    {row.name} · {row.guests} · {row.date}
                  </span>
                </article>
              ))}
              {!enquiries.length ? <p className="today-empty">None waiting.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
