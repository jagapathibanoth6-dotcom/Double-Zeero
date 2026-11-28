import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";
import { RefundControls } from "@/components/admin/RefundControls";
import { orderTypeLabel } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

const columns = ["NEW", "ACCEPTED", "PREPARING", "READY"];

const lanes: Record<string, { label: string; note: string; next: string; action: string }> = {
  NEW: { label: "New", note: "Just came in", next: "ACCEPTED", action: "Accept" },
  ACCEPTED: { label: "Accepted", note: "Waiting for the oven", next: "PREPARING", action: "Start cooking" },
  PREPARING: { label: "Cooking", note: "In the oven", next: "READY", action: "Mark ready" },
  READY: { label: "Ready", note: "Waiting to go out", next: "COMPLETED", action: "Complete" },
};

function minutesAgo(date: Date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
}

export default async function AdminKitchen() {
  const branch = await requireBranch();
  const orders = await db.order.findMany({
    where: { locationId: branch, status: { in: columns } },
    include: { items: true, booking: true, guest: true, payments: { include: { refunds: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="kitchen-page">
      <KitchenRefresh />
      <h1 className="admin-page-title">{locations[branch].shortName} kitchen</h1>
      <p className="admin-page-copy">Tickets for this restaurant only. The board refreshes itself.</p>

      <div className="kitchen-board">
        {columns.map((status) => {
          const lane = lanes[status];
          const tickets = orders.filter((o) => o.status === status);
          return (
            <section key={status} className={`kitchen-lane is-${status.toLowerCase()}`}>
              <header className="kitchen-lane-head">
                <div>
                  <h2>{lane.label}</h2>
                  <p>{lane.note}</p>
                </div>
                <em>{tickets.length}</em>
              </header>
              <div className="kitchen-tickets">
                {tickets.map((o) => (
                  <article key={o.id} className="kitchen-ticket">
                    <div className="kitchen-ticket-top">
                      <strong>{o.ref}</strong>
                      <PayBadge payments={o.payments} />
                    </div>
                    <p className="kitchen-ticket-meta">
                      {[orderTypeLabel(o.source), o.asap ? "ASAP" : o.time, minutesAgo(o.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                    <ul className="kitchen-ticket-items">
                      {o.items.map((i) => (
                        <li key={i.id}>
                          <b>{i.quantity}×</b> {i.name}
                          {o.guest ? <small> · {o.guest.name}</small> : null}
                          {i.notes ? <small className="kitchen-ticket-note">{i.notes}</small> : null}
                        </li>
                      ))}
                    </ul>
                    <div className="kitchen-actions">
                      <ActionButton action="order_status" body={{ orderId: o.id, status: lane.next }} label={lane.action} />
                      <ActionButton action="delete_order" body={{ orderId: o.id }} label="Delete" />
                      <RefundControls payments={o.payments} orderId={o.id} compact />
                    </div>
                  </article>
                ))}
                {!tickets.length ? <p className="kitchen-lane-empty">No tickets</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
