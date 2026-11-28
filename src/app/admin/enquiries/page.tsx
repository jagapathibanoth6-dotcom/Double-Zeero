import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { ConvertEnquiry } from "@/components/admin/ConvertEnquiry";
import { statusText, statusTone } from "@/lib/platform/order-label";

export const dynamic = "force-dynamic";

export default async function AdminEnquiries() {
  const branch = await requireBranch();
  const enquiries = await db.enquiry.findMany({
    where: { locationId: branch },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <h1 className="admin-page-title">{locations[branch].shortName} enquiries</h1>
      <p className="admin-page-copy">New large-group requests for this restaurant only.</p>
      <ul className="mt-8 space-y-4">
        {enquiries.map((e) => (
          <li key={e.id} className="border border-line bg-paper p-5">
            <p className="display text-[0.68rem] tracking-[0.16em] text-ember">{e.ref}</p>
            <p className="mt-1">
              {e.guests} guests · {e.date} {e.preferredTime}
            </p>
            <p className="mt-1 text-sm">
              {e.name} · {e.email} · {e.phone}
            </p>
            <p className="mt-2 text-sm text-mute">{e.message || e.occasion}</p>
            <p className="mt-2 text-sm">
              <span className={`admin-badge ${statusTone(e.status)}`}>{statusText(e.status)}</span>
            </p>
            {e.status === "NEW" ? <ConvertEnquiry id={e.id} time={e.preferredTime} /> : null}
          </li>
        ))}
        {!enquiries.length ? <li className="text-mute">No enquiries.</li> : null}
      </ul>
    </div>
  );
}
