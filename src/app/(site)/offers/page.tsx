import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Button, SectionTitle, SitePage } from "@/components/ui";

export const metadata: Metadata = { title: "Offers" };

export default async function OffersPage() {
  const offers = await db.offer.findMany({ where: { active: true } });
  return (
    <SitePage>
        <SectionTitle
          eyebrow="Offers"
          title="Current offers."
          copy="Qualifying discounts are applied automatically when you check out."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.id} className="site-card p-8 md:p-9">
              <p className="display text-[0.7rem] tracking-[0.2em] text-ember">{offer.percentOff}% off</p>
              <h2 className="serif mt-3 text-3xl">{offer.name}</h2>
              <p className="mt-3 text-sm text-mute">
                {offer.orderType ? offer.orderType.replace("_", " ") : "Any order"}
                {offer.minSpendPence ? ` · min £${(offer.minSpendPence / 100).toFixed(0)}` : ""}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-10">
          <Button href="/order">Order online</Button>
        </div>
    </SitePage>
  );
}
