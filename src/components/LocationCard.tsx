import Link from "next/link";
import { locations, type LocationId } from "@/data/site";
import { Button } from "@/components/ui";

export function LocationCard({ id }: { id: LocationId }) {
  const loc = locations[id];

  return (
    <article className="site-card card-hover flex h-full flex-col p-7 md:p-9">
      <p className="display text-[0.7rem] tracking-[0.3em] text-ember">{loc.opened}</p>
      <h3 className="serif mt-3 text-3xl">{loc.shortName}</h3>
      <p className="mt-2 text-mute">{loc.address}, {loc.postcode}</p>
      <p className="mt-6 text-sm leading-relaxed">
        {loc.address}
        <br />
        {loc.city}
        <br />
        {loc.postcode}
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {loc.hours.map((h) => (
          <li key={h.days} className="flex justify-between gap-4">
            <span className="text-mute">{h.days}</span>
            <span>{h.time}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm">
        <a href={loc.phoneHref} className="ember-link">
          {loc.phone}
        </a>
        <br />
        <a href={`mailto:${loc.email}`} className="ember-link">
          {loc.email}
        </a>
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={`/${loc.id}`}>Restaurant</Button>
        <Button href={loc.menuPath} variant="ghost">
          Menu
        </Button>
        <Button href={loc.bookingPath} variant="ghost">
          Book
        </Button>
      </div>
      <Link href={loc.mapUrl} target="_blank" rel="noreferrer" className="quiet-link mt-5 text-xs uppercase tracking-[0.18em]">
        Open in Maps →
      </Link>
    </article>
  );
}
