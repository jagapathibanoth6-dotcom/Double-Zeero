import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { ActionButton } from "@/components/admin/ActionButton";

export const dynamic = "force-dynamic";

export default async function AdminWaitlist() {
  const branch = await requireBranch();
  const rows = await db.waitlistEntry.findMany({
    where: { locationId: branch },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <h1 className="admin-page-title">{locations[branch].shortName} waitlist</h1>
      <p className="admin-page-copy">Offer emails the guest a confirm link. Book now creates the table booking at once.</p>
      <ul className="mt-8 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="border border-line bg-paper p-4">
            <p>
              {r.date} {r.time} · {r.guests} pax
            </p>
            <p className="text-sm text-mute">
              {r.name} · {r.email} · {r.status}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton action="waitlist_status" body={{ id: r.id, status: "OFFERED" }} label="Offer table" />
              <ActionButton action="waitlist_book" body={{ id: r.id }} label="Book now" />
              <ActionButton action="waitlist_status" body={{ id: r.id, status: "CLOSED" }} label="Close" />
            </div>
          </li>
        ))}
        {!rows.length ? <li className="text-mute">Empty.</li> : null}
      </ul>
    </div>
  );
}
