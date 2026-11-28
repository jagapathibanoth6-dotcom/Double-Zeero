import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBookingDate } from "@/lib/booking";
import { formatMoney } from "@/lib/platform/money";
import { locations } from "@/data/site";
import { requireBranch, requireStaff } from "@/lib/platform/admin";
import { CustomerForm } from "@/components/admin/CustomerForm";
import { PayBadge } from "@/components/admin/PayBadge";
import { paySummary } from "@/lib/platform/pay";
import { BranchRecordLink } from "@/components/admin/BranchRecordLink";
import { RefundControls } from "@/components/admin/RefundControls";
import { statusText } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

function visitLabel(type: string) {
  if (type === "collection") return "Click & collect";
  if (type === "table") return "Inside table";
  return type;
}

function orderLabel(source: string) {
  if (source === "DZ_DELIVERY") return "Delivery home";
  if (source === "CLICK_COLLECT") return "Click & collect";
  return source.replace(/_/g, " ");
}

export default async function AdminCustomerRecord({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const branch = await requireBranch();
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: [{ date: "desc" }, { time: "desc" }], include: { party: true, payments: { include: { refunds: true } } } },
      orders: { orderBy: { createdAt: "desc" }, include: { items: true, payments: { include: { refunds: true } } } },
      waitlist: { orderBy: { createdAt: "desc" } },
      enquiries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const types = [
    ...new Set([
      ...customer.bookings.map((b) => visitLabel(b.visitType)),
      ...customer.orders.map((o) => orderLabel(o.source)),
    ]),
  ];
  const spend = customer.orders.reduce((sum, o) => sum + o.totalPence, 0);

  return (
    <div className="record-page">
      <Link href="/admin/customers" className="record-back">
        ← Back to customers
      </Link>
      <div className="record-head">
        <div>
          <p className="today-kicker">Customer</p>
          <h1 className="admin-page-title">{customer.name}</h1>
          <p className="admin-page-copy">
            {customer.email} · {customer.phone || "No phone"} · since{" "}
            {customer.createdAt.toLocaleDateString("en-GB")} · both restaurants
          </p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat is-ember">
          <p>Bookings</p>
          <strong>{customer.bookings.length}</strong>
        </div>
        <div className="admin-stat is-gold">
          <p>Orders</p>
          <strong>{customer.orders.length}</strong>
        </div>
        <div className="admin-stat is-teal">
          <p>Spend</p>
          <strong>{formatMoney(spend)}</strong>
        </div>
        <div className="admin-stat is-navy">
          <p>Types</p>
          <strong>{types.length || 0}</strong>
          <em>{types.join(" · ") || "None yet"}</em>
        </div>
      </div>

      <div className="record-grid">
        <section className="admin-panel">
          <h2>Update details</h2>
          <CustomerForm id={customer.id} name={customer.name} email={customer.email} phone={customer.phone} />
        </section>

        <section className="admin-panel">
          <h2>Profile</h2>
          <dl className="record-dl">
            <div>
              <dt>Name</dt>
              <dd>{customer.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{customer.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{customer.phone || "—"}</dd>
            </div>
            <div>
              <dt>Uses</dt>
              <dd>{types.join(", ") || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-panel record-wide">
          <h2>Bookings</h2>
          {customer.bookings.map((b) => (
            <div key={b.id} className="record-refund-row">
              <BranchRecordLink
                href={`/admin/bookings/${b.id}`}
                locationId={b.locationId}
                currentBranch={branch}
                className="record-line is-link"
              >
                {formatBookingDate(b.date)} {b.time} · {b.ref} · {visitLabel(b.visitType)} · {b.guests} pax · {b.status.replace(/_/g, " ")}{" "}
                <PayBadge payments={b.payments} label={paySummary(0, b.payments).label} />
                {paySummary(0, b.payments).refundedPence ? ` · refunded ${formatMoney(paySummary(0, b.payments).refundedPence)}` : ""}
                <span>
                  {locations[b.locationId as keyof typeof locations]?.shortName || b.locationId}
                  {b.tableCodes ? ` · ${b.tableCodes}` : ""}
                  {b.party ? ` · party ${b.party.code}` : ""}
                </span>
              </BranchRecordLink>
              <RefundControls payments={b.payments} bookingId={b.id} compact />
            </div>
          ))}
          {!customer.bookings.length ? <p className="today-empty">No bookings.</p> : null}
        </section>

        <section className="admin-panel record-wide">
          <h2>Orders</h2>
          {customer.orders.map((o) => (
            <div key={o.id} className="record-refund-row">
              <BranchRecordLink
                href={`/admin/orders/${o.id}`}
                locationId={o.locationId}
                currentBranch={branch}
                className="record-line is-link"
              >
                {o.ref} · {orderLabel(o.source)} · {formatMoney(o.totalPence)} · {statusText(o.status)}{" "}
                <PayBadge payments={o.payments} label={paySummary(o.totalPence, o.payments).label} />
                {paySummary(o.totalPence, o.payments).refundedPence
                  ? ` · refunded ${formatMoney(paySummary(o.totalPence, o.payments).refundedPence)}`
                  : ""}
                <span>
                  {locations[o.locationId as keyof typeof locations]?.shortName || o.locationId} · {o.date || o.createdAt.toLocaleDateString("en-GB")} {o.time} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </span>
              </BranchRecordLink>
              <RefundControls payments={o.payments} orderId={o.id} compact />
            </div>
          ))}
          {!customer.orders.length ? <p className="today-empty">No orders.</p> : null}
        </section>

        <section className="admin-panel">
          <h2>Waitlist</h2>
          {customer.waitlist.map((w) => (
            <p key={w.id} className="record-line">
              {locations[w.locationId as keyof typeof locations]?.shortName || w.locationId} · {w.date} {w.time} · {w.guests} pax · {statusText(w.status)}
            </p>
          ))}
          {!customer.waitlist.length ? <p className="today-empty">None.</p> : null}
        </section>

        <section className="admin-panel">
          <h2>Enquiries</h2>
          {customer.enquiries.map((e) => (
            <p key={e.id} className="record-line">
              {locations[e.locationId as keyof typeof locations]?.shortName || e.locationId} · {e.ref} · {e.date} {e.preferredTime} · {e.guests} · {statusText(e.status)}
            </p>
          ))}
          {!customer.enquiries.length ? <p className="today-empty">None.</p> : null}
        </section>
      </div>
    </div>
  );
}
