import Link from "next/link";
import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { PayBadge } from "@/components/admin/PayBadge";
import { ActionButton } from "@/components/admin/ActionButton";
import { PartyAdmin } from "@/components/admin/PartyAdmin";
import { RefundControls } from "@/components/admin/RefundControls";
import { statusText } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

export default async function AdminParties() {
  const branch = await requireBranch();
  const parties = await db.party.findMany({
    where: { booking: { locationId: branch, status: { notIn: ["CANCELLED"] } } },
    include: {
      booking: {
        include: {
          payments: { include: { refunds: true } },
          orders: { include: { payments: { include: { refunds: true } } } },
        },
      },
      guests: { include: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <h1 className="admin-page-title">{locations[branch].shortName} parties</h1>
      <p className="admin-page-copy">Resend the guest link, change how they pay, or cancel the booking.</p>
      <ul className="mt-8 space-y-4">
        {parties.map((p) => {
          const done = p.guests.filter((g) => g.orders.length).length;
          return (
            <li key={p.id} className="border border-line bg-paper p-5">
              <p className="display text-[0.68rem] tracking-[0.16em] text-ember">{p.booking.ref}</p>
              <p className="mt-1">
                {p.booking.guests} guests · {p.booking.date} {p.booking.time}
              </p>
              <p className="mt-1 text-sm text-mute">
                Deposit {statusText(p.booking.status).toLowerCase()} · <PayBadge payments={p.booking.payments} /> · Pre-order {done}/{p.booking.guests}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/admin/bookings/${p.booking.id}`} className="ember-link text-ember">
                  Open booking
                </Link>
                <Link href={`/party/${p.code}`} className="ember-link text-ember">
                  Guest link {p.code}
                </Link>
              </div>
              <PartyAdmin
                id={p.id}
                paymentMode={p.paymentMode}
                deadlineAt={p.deadlineAt ? p.deadlineAt.toISOString().slice(0, 16) : ""}
              />
              <div className="mt-3">
                <ActionButton action="party_resend" body={{ id: p.id }} label="Resend party email" />
                <ActionButton action="party_cancel" body={{ id: p.id }} label="Cancel party" />
                <RefundControls
                  payments={[...p.booking.payments, ...p.booking.orders.flatMap((order) => order.payments)]}
                  bookingId={p.booking.id}
                  compact
                />
              </div>
            </li>
          );
        })}
        {!parties.length ? <li className="text-mute">No large parties yet.</li> : null}
      </ul>
    </div>
  );
}
