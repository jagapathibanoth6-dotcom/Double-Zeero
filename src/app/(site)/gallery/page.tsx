import type { Metadata } from "next";
import Image from "next/image";
import { SectionTitle, SitePage } from "@/components/ui";
import { listGalleryPhotos } from "@/lib/platform/gallery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from Double Zero — dough, fire, and Neapolitan pizza in Manchester.",
};

export default async function GalleryPage() {
  const shots = await listGalleryPhotos();
  return (
    <SitePage wide>
      <SectionTitle
        eyebrow="Gallery"
        title="From the kitchen and the table."
        copy="Photographs from Double Zero in Chorlton and Manchester City Centre."
      />
      <div className="mt-14 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shots.map((shot) => (
          <figure key={shot.id} className="mb-4 break-inside-avoid">
            <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-paper">
              <Image src={shot.src} alt={shot.alt} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 33vw" />
            </div>
          </figure>
        ))}
      </div>
    </SitePage>
  );
}
