import Image from "next/image";
import Link from "next/link";
import { locations, type LocationId } from "@/data/site";
import { Button } from "@/components/ui";
import type { MenuItem } from "@/data/menus";

const photos: Record<LocationId, { src: string; alt: string }> = {
  manchester: { src: "/images/interior.jpg", alt: "Double Zero City Centre" },
  chorlton: { src: "/images/pizza-1.jpg", alt: "Double Zero Chorlton" },
};

export function RoomCard({
  id,
  dishes,
}: {
  id: LocationId;
  dishes?: MenuItem[];
}) {
  const loc = locations[id];
  const photo = photos[id];
  const label = id === "manchester" ? "City Centre" : "Chorlton";

  return (
    <article className="room-card">
      <div className="room-card-photo img-zoom">
        <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </div>
      <div className="room-card-body">
        <p className="display text-[0.62rem] tracking-[0.22em] text-ember">Restaurant</p>
        <h3 className="serif mt-2 text-3xl">{label}</h3>
        <p className="mt-2 text-sm text-mute">
          {loc.address}, {loc.postcode}
        </p>
        <p className="mt-1 text-sm text-mute">{loc.hours[0]?.time ? `${loc.hours[0].days} · ${loc.hours[0].time}` : loc.headline}</p>

        {dishes?.length ? (
          <ul className="room-card-dishes">
            {dishes.slice(0, 2).map((item) => (
              <li key={item.name}>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-0.5 text-sm text-mute">{item.description}</p>
                </div>
                {item.price ? <span className="shrink-0 text-sm">{item.price}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-5 space-y-1.5 text-sm">
            {loc.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4">
                <span className="text-mute">{h.days}</span>
                <span>{h.time}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="room-card-actions">
          <Button href={loc.bookingPath}>Book a table</Button>
          <Button href={`/${loc.id}`} variant="ghost">
            Restaurant
          </Button>
          {dishes?.length ? (
            <Button href={loc.menuPath} variant="ghost">
              Menu
            </Button>
          ) : null}
        </div>

        {dishes?.length ? null : (
          <Link href={loc.mapUrl} target="_blank" rel="noreferrer" className="quiet-link mt-4 inline-block text-xs uppercase tracking-[0.18em]">
            Open in Maps →
          </Link>
        )}
      </div>
    </article>
  );
}
