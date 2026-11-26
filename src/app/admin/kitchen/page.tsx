import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { PayBadge } from "@/components/admin/PayBadge";
import { KitchenRefresh } from "@/components/admin/KitchenRefresh";
import { RefundControls } from "@/components/admin/RefundControls";

export const dynamic = "force-dynamic";

const columns = ["NEW", "ACCEPTED", "PREPARING", "READY"];

export default async function AdminKitchen() {
  const branch = await requireBranch();
  const [orders, prints] = await Promise.all([
    db.order.findMany({
      where: { locationId: branch, status: { in: columns } },
      include: { items: true, booking: true, guest: true, payments: { include: { refunds: true } } },
    }),
    db.printJob.findMany({
      where: { order: { locationId: branch }, status: "QUEUED" },
      include: { order: { include: { items: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ]);
  return (
    <div>
      <KitchenRefresh />
      <h1 className="admin-page-title">{locations[branch].shortName} kitchen</h1>
      <p className="admin-page-copy">Tickets for this restaurant only. Print queue is at the top. Board refreshes itself.</p>

      <section className="admin-panel mt-6">
        <h2>Print queue</h2>
        {prints.map((job) => (
          <article key={job.id} className="record-line">
            <strong>
              {job.target} · {job.order.ref}
            </strong>
            <span>{job.order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</span>
            <div className="mt-2">
              <ActionButton action="print_done" body={{ id: job.id }} label="Mark printed" />
              <ActionButton action="reprint" body={{ orderId: job.orderId }} label="Re-fire" />
            </div>
          </article>
        ))}
        {!prints.length ? <p className="today-empty">Queue clear.</p> : null}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {columns.map((status) => (
          <section key={status}>
            <h2 className="display text-[0.7rem] tracking-[0.18em] text-mute">{status}</h2>
            <div className="mt-3 space-y-3">
              {orders
                .filter((o) => o.status === status)
                .map((o) => (
                  <article key={o.id} className="border border-line bg-paper p-4 text-sm">
                    <p className="font-medium">
                      {o.ref} <PayBadge payments={o.payments} />
                    </p>
                    <p className="text-mute">
                      {o.source} · {o.time || (o.asap ? "ASAP" : "")} · {o.booking?.tableCodes || ""}
                    </p>
                    <ul className="mt-2">
                      {o.items.map((i) => (
                        <li key={i.id}>
                          {i.quantity} × {i.name}
                          {o.guest ? ` (${o.guest.name})` : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton
                        action="order_status"
                        body={{
                          orderId: o.id,
                          status: status === "NEW" ? "ACCEPTED" : status === "ACCEPTED" ? "PREPARING" : status === "PREPARING" ? "READY" : "COMPLETED",
                        }}
                        label="Next"
                      />
                      <ActionButton action="reprint" body={{ orderId: o.id }} label="Print" />
                      <ActionButton action="delete_order" body={{ orderId: o.id }} label="Delete" />
                      <RefundControls payments={o.payments} orderId={o.id} compact />
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
