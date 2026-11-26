import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { locations } from "@/data/site";

export const metadata: Metadata = {
  title: "Menus",
  description: "Choose the Double Zero menu for Manchester City Centre or Chorlton.",
};

export default function MenuChooserPage() {
  return (
    <SitePage wide>
        <SectionTitle
          eyebrow="Menus"
          title="Choose a restaurant."
          copy="City Centre and Chorlton each have their own menu and prices. Open the restaurant you are visiting."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="site-card card-hover flex flex-col overflow-hidden">
            <div className="img-zoom relative h-56">
              <Image src="/images/interior.jpg" alt="Double Zero Manchester" fill className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col p-8">
              <p className="display text-[0.7rem] tracking-[0.28em] text-ember">Menu</p>
              <h2 className="serif mt-2 text-3xl">City Centre</h2>
              <p className="mt-2 text-sm text-mute">55 Spring Gardens, M2 2BY</p>
              <p className="mt-1 text-sm text-mute">Full bar. Lunch from midday.</p>
              <div className="mt-8">
                <Button href={locations.manchester.menuPath}>Open City Centre menu</Button>
              </div>
              <Link href="/manchester" className="quiet-link mt-4 text-xs uppercase tracking-[0.18em]">
                City Centre restaurant
              </Link>
            </div>
          </article>
          <article className="site-card card-hover flex flex-col overflow-hidden">
            <div className="img-zoom relative h-56">
              <Image src="/images/food-2.jpg" alt="Double Zero Chorlton" fill className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col p-8">
              <p className="display text-[0.7rem] tracking-[0.28em] text-ember">Menu</p>
              <h2 className="serif mt-2 text-3xl">Chorlton</h2>
              <p className="mt-2 text-sm text-mute">368 Barlow Moor Road, M21 8AZ</p>
              <p className="mt-1 text-sm text-mute">BYOB. Evening room and collection.</p>
              <div className="mt-8">
                <Button href={locations.chorlton.menuPath}>Open Chorlton menu</Button>
              </div>
              <Link href="/chorlton" className="quiet-link mt-4 text-xs uppercase tracking-[0.18em]">
                Chorlton restaurant →
              </Link>
            </div>
          </article>
        </div>
    </SitePage>
  );
}
