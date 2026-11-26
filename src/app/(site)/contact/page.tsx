import type { Metadata } from "next";
import Link from "next/link";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { locations } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Double Zero Manchester City Centre or Chorlton directly.",
};

export default function ContactPage() {
  return (
    <SitePage>
        <SectionTitle
          eyebrow="Contact"
          title="Contact the restaurant you need."
          copy="Each location has its own phone number and email. Choose City Centre or Chorlton below."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {Object.values(locations).map((loc) => (
            <article key={loc.id} className="site-card card-hover p-8 md:p-9">
              <p className="display text-[0.7rem] tracking-[0.28em] text-ember">Restaurant</p>
              <h2 className="serif mt-2 text-3xl">{loc.shortName}</h2>
              <p className="mt-4 text-sm leading-relaxed text-mute">
                {loc.address}, {loc.postcode}
                <br />
                <a href={loc.phoneHref} className="ember-link">
                  {loc.phone}
                </a>
                <br />
                <a href={`mailto:${loc.email}`} className="ember-link">
                  {loc.email}
                </a>
              </p>
              <div className="mt-8">
                <Button href={`/${loc.id}#contact`}>Contact {loc.shortName}</Button>
              </div>
              <Link href={`/${loc.id}`} className="quiet-link mt-4 inline-block text-xs uppercase tracking-[0.18em]">
                Full {loc.shortName} site →
              </Link>
            </article>
          ))}
        </div>
    </SitePage>
  );
}
