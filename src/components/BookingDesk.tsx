import { BookingForm } from "@/components/BookingForm";
import { SectionTitle, SitePage } from "@/components/ui";
import { locations, type LocationId } from "@/data/site";

export function BookingDesk({ locationId }: { locationId: LocationId }) {
  const loc = locations[locationId];

  return (
    <SitePage wide>
      <div className="book-desk">
        <div className="book-desk-copy">
          <SectionTitle
            eyebrow={loc.shortName}
            title="Book a table."
            copy={`${loc.address}, ${loc.postcode}. Online for 1–${loc.maxOnlineGuests} guests. Larger parties, call ${loc.phone}.`}
          />
          <ul className="mt-8 space-y-2 text-sm">
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
        </div>
        <div className="form-panel">
          <BookingForm locationId={locationId} />
        </div>
      </div>
    </SitePage>
  );
}
