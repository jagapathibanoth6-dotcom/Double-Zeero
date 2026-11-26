import Link from "next/link";
import { formatMoney } from "@/lib/platform/money";
import { locations } from "@/data/site";
import { branchEnabled, liveProducts, MENU_CATEGORIES } from "@/lib/platform/menu";
import { requireBranch } from "@/lib/platform/admin";
import { MenuToggle } from "@/components/admin/MenuToggle";

export const dynamic = "force-dynamic";

export default async function AdminMenu() {
  const branch = await requireBranch();
  const products = await liveProducts(branch, true);

  return (
    <div className="menu-admin">
      <div className="record-head">
        <div>
          <h1 className="admin-page-title">{locations[branch].shortName} menu</h1>
          <p className="admin-page-copy">
            Turn a dish off to mark it unavailable — it stays on the customer menu. Delete is the only way to remove it. This list is for {locations[branch].shortName} only.
          </p>
        </div>
        <Link href="/admin/menu/new" className="btn btn-ember">
          Add item
        </Link>
      </div>

      <div className="menu-admin-list">
        {MENU_CATEGORIES.map((cat) => {
          const rows = products.filter((p) => p.category === cat);
          return (
            <section key={cat} className="menu-group">
              <header>
                <h2>{cat.replace(/_/g, " ")}</h2>
                <span>{rows.length} items</span>
              </header>
              {!rows.length ? <p className="today-empty">Nothing in this section yet.</p> : null}
              <ul>
                {rows.map((p) => {
                  const on = branchEnabled(p.prices);
                  return (
                    <li key={p.id} className={`menu-item ${on ? "" : "is-off"}`}>
                      {p.photo ? <img src={p.photo} alt="" /> : <span className="menu-item-ph">DZ</span>}
                      <div className="menu-item-copy">
                        <strong>{p.name}</strong>
                        <p>
                          {on ? "" : "Unavailable · "}
                          {p.prices.map((price) => `${price.label ? `${price.label} ` : ""}${formatMoney(price.pricePence)}`).join(" · ") || "No price set"}
                        </p>
                      </div>
                      <MenuToggle key={`${p.id}-${branch}-${on}`} productId={p.id} locationId={branch} available={on} />
                      <Link href={`/admin/menu/${p.id}`} className="menu-edit">
                        Edit
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
