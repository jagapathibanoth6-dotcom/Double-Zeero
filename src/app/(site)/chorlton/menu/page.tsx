import type { Metadata } from "next";
import { MenuList } from "@/components/MenuList";
import { Button, SectionTitle, SitePage } from "@/components/ui";
import { locations } from "@/data/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chorlton menu",
  description: "The Double Zero Chorlton menu at 368 Barlow Moor Road, including BYOB.",
};

export default function ChorltonMenuPage() {
  const loc = locations.chorlton;
  return (
    <SitePage wide>
        <SectionTitle eyebrow="368 Barlow Moor Road" title="Chorlton menu." copy={loc.notes[0]} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href={loc.bookingPath}>Book Chorlton</Button>
          <Button href="/chorlton" variant="ghost">
            Back to Chorlton
          </Button>
        </div>
        <div className="mt-14">
          <MenuList locationId="chorlton" />
        </div>
    </SitePage>
  );
}
