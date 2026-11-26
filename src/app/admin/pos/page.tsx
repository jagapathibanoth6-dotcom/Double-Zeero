import { db } from "@/lib/db";
import { locations } from "@/data/site";
import { liveProducts } from "@/lib/platform/menu";
import { requireBranch } from "@/lib/platform/admin";
import { PosDesk } from "@/components/admin/PosDesk";

export const dynamic = "force-dynamic";

export default async function AdminPos() {
  const branch = await requireBranch();
  const [orders, products] = await Promise.all([
    db.order.findMany({
      where: { locationId: branch, status: { notIn: ["COMPLETED", "CANCELLED", "PENDING_PAY"] } },
      include: { items: true, booking: true, guest: true, payments: { include: { refunds: true } } },
      orderBy: { createdAt: "desc" },
    }),
    liveProducts(branch),
  ]);
  return (
    <div>
      <h1 className="admin-page-title">{locations[branch].shortName} POS</h1>
      <p className="admin-page-copy">Build a walk-in ticket, send it to the kitchen, and run open orders for this restaurant only.</p>
      <div className="mt-8">
        <PosDesk
          menu={products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            available: product.prices.some((price) => price.available),
            prices: product.prices.map((price) => ({
              id: price.id,
              label: price.label,
              pricePence: price.pricePence,
              available: price.available,
            })),
          }))}
          orders={orders}
        />
      </div>
    </div>
  );
}
