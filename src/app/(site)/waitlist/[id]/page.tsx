import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bookWaitlist } from "@/lib/platform/booking";
import { locations } from "@/data/site";
import { SitePage } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function WaitlistOfferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const entry = await db.waitlistEntry.findUnique({ where: { id } });
  if (!entry) notFound();
  const loc = locations[entry.locationId as keyof typeof locations];

  if (entry.status === "BOOKED" || (query.confirm === "1" && entry.status === "OFFERED")) {
    const result =
      entry.status === "OFFERED" ? await bookWaitlist(entry.id, "guest", entry.time) : { booking: { ref: "Confirmed" } };
    return (
      <SitePage>
        <div className="site-card p-8 md:p-10">
        <p className="display text-[0.72rem] tracking-[0.28em] text-ember">Waitlist</p>
        <h1 className="serif mt-3 text-4xl">Your table is confirmed</h1>
        <p className="mt-4 text-mute">
          {result.booking.ref} · {loc?.shortName} · {entry.date} at {entry.time} for {entry.guests}.
        </p>
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage>
      <div className="site-card p-8 md:p-10">
      <p className="display text-[0.72rem] tracking-[0.28em] text-ember">Waitlist</p>
      <h1 className="serif mt-3 text-4xl">A table is available</h1>
      <p className="mt-4">
        {loc?.shortName} · {entry.date} at {entry.time} · {entry.guests} guests
      </p>
      <p className="mt-2 text-mute">Status: {entry.status}</p>
      {entry.status === "OFFERED" ? (
        <a className="btn btn-ember mt-6 inline-block" href={`/waitlist/${entry.id}?confirm=1`}>
          Confirm this table
        </a>
      ) : (
        <p className="mt-6 text-mute">This offer is no longer open.</p>
      )}
      </div>
    </SitePage>
  );
}
