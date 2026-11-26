import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { requireBranch } from "@/lib/platform/admin";
import { MenuEditor } from "@/components/admin/MenuEditor";

export const dynamic = "force-dynamic";

export default async function AdminMenuEdit({ params }: { params: Promise<{ id: string }> }) {
  const branch = await requireBranch();
  const { id } = await params;
  const product = await db.menuProduct.findUnique({
    where: { id },
    include: { prices: { where: { locationId: branch } } },
  });
  if (!product) notFound();

  return (
    <div className="record-page">
      <Link href="/admin/menu" className="record-back">
        ← Back to menu
      </Link>
      <h1 className="admin-page-title">{product.name}</h1>
      <p className="admin-page-copy">
        Prices and availability for {locations[branch].shortName} only. The other branch is left as it is.
      </p>
      <div className="admin-panel mt-6 max-w-2xl">
        <MenuEditor locationId={branch} product={product} />
      </div>
    </div>
  );
}
