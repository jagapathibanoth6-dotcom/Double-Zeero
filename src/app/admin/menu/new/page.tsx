import Link from "next/link";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { MenuEditor } from "@/components/admin/MenuEditor";

export default async function AdminMenuNew() {
  const branch = await requireBranch();
  return (
    <div className="record-page">
      <Link href="/admin/menu" className="record-back">
        ← Back to menu
      </Link>
      <h1 className="admin-page-title">Add item · {locations[branch].shortName}</h1>
      <p className="admin-page-copy">This dish and its prices go live at {locations[branch].shortName} only.</p>
      <div className="admin-panel mt-6 max-w-2xl">
        <MenuEditor locationId={branch} />
      </div>
    </div>
  );
}
