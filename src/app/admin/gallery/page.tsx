import { listGalleryPhotos } from "@/lib/platform/gallery";
import { GalleryDesk } from "@/components/admin/GalleryDesk";
import { requireStaff } from "@/lib/platform/admin";

export const dynamic = "force-dynamic";

export default async function AdminGallery() {
  await requireStaff();
  const photos = await listGalleryPhotos();
  return (
    <div className="settings-page">
      <div className="today-hero">
        <div>
          <p className="today-kicker">Both restaurants</p>
          <h1 className="admin-page-title">Gallery</h1>
          <p className="admin-page-copy">Add or delete photos for the website gallery. Both restaurants use this list.</p>
        </div>
      </div>
      <GalleryDesk photos={photos} />
    </div>
  );
}
