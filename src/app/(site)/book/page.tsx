import type { Metadata } from "next";
import Image from "next/image";
import { SectionTitle, SitePage } from "@/components/ui";
import { locations } from "@/data/site";

export const metadata: Metadata = {
  title: "Book a table",
  description:
    "Book Double Zero Manchester City Centre or Chorlton separately. Tables, collection slots, and group bookings.",
};

export default function BookPage() {
  return (
    <SitePage wide>
      <div>
        <SectionTitle
          eyebrow="Reservations"
          title="Choose a restaurant."
          copy="Book 1–8 guests online, 9–20 as a large party with a shared menu, or send an enquiry for 21 or more."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <BranchCard
            href={locations.manchester.bookingPath}
            detailsHref="/manchester"
            image="/images/interior.jpg"
            imageAlt="Sharing pizza at Double Zero Manchester"
            kicker="Restaurant"
            title="City Centre"
            street="55 Spring Gardens, M2 2BY"
            hours="Sun–Thu 12–10 · Fri–Sat 12–11"
            points={["Table booking", "Full bar", "Highchairs on request"]}
            cta="Book City Centre"
          />
          <BranchCard
            href={locations.chorlton.bookingPath}
            detailsHref="/chorlton"
            image="/images/food-2.jpg"
            imageAlt="Pizza at Double Zero Chorlton"
            kicker="Restaurant"
            title="Chorlton"
            street="368 Barlow Moor Road, M21 8AZ"
            hours="Mon–Thu from 6pm · Fri–Sat from 5pm · Sun from 4pm"
            points={["Table booking", "Collection slots", "Bring your own wine"]}
            cta="Book Chorlton"
          />
        </div>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-mute">
          Online bookings are for 1–8 guests. For nine or more, call the restaurant —{" "}
          {locations.manchester.phone} (City Centre) or {locations.chorlton.phone} (Chorlton). Parties of ten or more
          need a pre-order up to 24 hours before.
        </p>
      </div>
    </SitePage>
  );
}

function BranchCard({
  href,
  detailsHref,
  image,
  imageAlt,
  kicker,
  title,
  street,
  hours,
  points,
  cta,
}: {
  href: string;
  detailsHref: string;
  image: string;
  imageAlt: string;
  kicker: string;
  title: string;
  street: string;
  hours: string;
  points: string[];
  cta: string;
}) {
  return (
    <article className="site-card card-hover flex flex-col overflow-hidden">
      <a href={href} className="block">
        <div className="img-zoom relative h-56">
          <Image src={image} alt={imageAlt} fill className="object-cover" />
        </div>
        <div className="flex flex-1 flex-col p-7 md:p-9">
          <p className="display text-[0.7rem] tracking-[0.28em] text-ember">{kicker}</p>
          <h2 className="serif mt-2 text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-mute">{street}</p>
          <p className="mt-1 text-sm text-mute">{hours}</p>
          <ul className="mt-6 space-y-2 text-sm">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <span className="btn btn-ember mt-8">{cta}</span>
        </div>
      </a>
      <div className="px-7 pb-7 md:px-9 md:pb-9">
        <a href={detailsHref} className="quiet-link text-xs uppercase tracking-[0.18em]">
          Restaurant details →
        </a>
      </div>
    </article>
  );
}
