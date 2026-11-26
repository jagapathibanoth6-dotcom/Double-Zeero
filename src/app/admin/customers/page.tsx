import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/platform/admin";

export const dynamic = "force-dynamic";

export default async function AdminCustomers() {
  await requireStaff();
  const customers = await db.customer.findMany({
    include: { _count: { select: { bookings: true, orders: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <h1 className="admin-page-title">Customers</h1>
      <p className="admin-page-copy">
        Shared across Manchester and Chorlton. A guest who books or orders at either restaurant is one record here.
      </p>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {customers.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/customers/${c.id}`} className="record-customer">
              <span>
                <strong>{c.name}</strong>
                <em>
                  {c.email} · {c.phone || "No phone"}
                </em>
              </span>
              <span>
                {c._count.bookings} bookings · {c._count.orders} orders
              </span>
            </Link>
          </li>
        ))}
        {!customers.length ? <li className="py-4 text-mute">No customers yet.</li> : null}
      </ul>
    </div>
  );
}
