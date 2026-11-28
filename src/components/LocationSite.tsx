import Image from "next/image";
import Link from "next/link";
import { BookingForm } from "@/components/BookingForm";
import { EnquiryForm } from "@/components/EnquiryForm";
import { MenuList } from "@/components/MenuList";
import { JourneyChoices } from "@/components/JourneyChoices";
import { SectionTitle } from "@/components/ui";
import { locations, type LocationId } from "@/data/site";
import { addVia } from "@/lib/platform/via";
import { listGalleryPhotos } from "@/lib/platform/gallery";

export async function LocationSite({
  locationId,
  kicker,
  title,
  copy,
  extras,
  heroSrc,
  heroAlt,
}: {
  locationId: LocationId;
  kicker: string;
  title: string;
  copy: string;
  extras: string[];
  heroSrc: string;
  heroAlt: string;
}) {
  const loc = locations[locationId];
  const other = locationId === "manchester" ? locations.chorlton : locations.manchester;
  const gallery = await listGalleryPhotos();

  return (
    <div className="location-site">
      <section className="location-hero">
        <Image src={heroSrc} alt={heroAlt} fill priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/20" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-10 md:px-8">
          <p className="display text-[0.72rem] tracking-[0.32em] text-gold">{kicker}</p>
          <h1 className="serif mt-3 max-w-3xl text-4xl md:text-6xl">{title}</h1>
          <JourneyChoices
            items={[
              { href: "#book", kicker: "Reserve", title: "Book a table", copy: `A sitting at ${loc.shortName}.` },
              { href: addVia(`/order/collect?location=${loc.id}`, loc.shortName), kicker: "Takeaway", title: "Click & collect", copy: "Order now and pick it up at the counter." },
            ]}
          />
          <a href={loc.phoneHref} className="journey-call">
            Call {loc.phone}
          </a>
        </div>
      </section>

      <nav className="location-subnav">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-5 py-3 text-sm md:px-8">
          {[
            ["#about", "About"],
            ["#menu", "Menu"],
            ["#book", "Book"],
            ["#hours", "Hours"],
            ["#contact", "Contact"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="display shrink-0 tracking-[0.18em] text-mute transition-colors hover:text-ember">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="about" className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-12 md:px-8 md:py-24">
        <div className="md:col-span-7">
          <SectionTitle eyebrow={loc.name} title={title} copy={copy} />
          <ul className="mt-8 space-y-4 text-mute leading-relaxed">
            {loc.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
            {extras.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <aside id="hours" className="site-card p-8 md:col-span-5">
          <p className="display text-[0.7rem] tracking-[0.28em] text-ember">Visit</p>
          <p className="mt-4 text-sm leading-relaxed">
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
          <JourneyChoices
            tone="paper"
            items={[
              { href: loc.bookingPath, kicker: "Reserve", title: "Book a table", copy: `A sitting at ${loc.shortName}.` },
              { href: loc.menuPath, kicker: "Menu", title: "Full menu", copy: "Pizzas, starters and prices for this restaurant." },
              { href: loc.phoneHref, kicker: "Call", title: loc.phone, copy: "Speak to the restaurant." },
            ]}
          />
        </aside>
      </section>

      <section id="menu" className="border-y border-line bg-cream">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <SectionTitle
            eyebrow={`${loc.shortName} menu`}
            title={`${loc.shortName} menu`}
            copy="Prices and dishes for this restaurant only, taken from the printed menu."
          />
          <div className="mt-12">
            <MenuList locationId={locationId} />
          </div>
        </div>
      </section>

      <section id="book" className="bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-12 md:px-8 md:py-24">
          <div className="md:col-span-5">
            <SectionTitle
              eyebrow="Reservations"
              title={loc.visitTypes.includes("collection") ? "Book a table or collection." : "Book a table."}
              copy={`Online bookings for this restaurant only, 1–${loc.maxOnlineGuests} guests. For larger parties, call ${loc.phone}.`}
            />
          </div>
          <div className="form-panel md:col-span-7">
            <BookingForm locationId={locationId} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <SectionTitle eyebrow="Gallery" title="From this restaurant." />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {gallery.slice(0, 8).map((shot) => (
            <div key={shot.src} className="img-zoom relative aspect-[4/5]">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover" sizes="25vw" />
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="border-t border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-12 md:px-8 md:py-24">
          <div className="md:col-span-5">
            <SectionTitle
              eyebrow="Contact"
              title={`Contact ${loc.shortName}`}
              copy="Your message is sent only to this restaurant."
            />
            <p className="mt-6 text-sm">
              <a href={loc.phoneHref} className="ember-link">
                {loc.phone}
              </a>
              <br />
              <a href={`mailto:${loc.email}`} className="ember-link">
                {loc.email}
              </a>
            </p>
            <p className="mt-8 text-sm text-mute">
              Need {other.name}?{" "}
              <Link href={`/${other.id}`} className="ember-link text-ink">
                Visit {other.shortName}
              </Link>
              .
            </p>
          </div>
          <div className="form-panel md:col-span-6 md:col-start-7">
            <EnquiryForm
              to={loc.email}
              subjectPrefix={`Double Zero ${loc.shortName}`}
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "phone", label: "Phone", type: "tel" },
                { name: "message", label: "Message", type: "textarea", required: true },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="h-[360px] w-full bg-paper">
        <iframe title={`Map of ${loc.name}`} src={loc.embedUrl} className="h-full w-full border-0 grayscale" loading="lazy" />
      </div>
    </div>
  );
}
