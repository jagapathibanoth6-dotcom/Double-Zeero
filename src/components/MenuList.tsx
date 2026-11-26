import Image from "next/image";
import { menus, type DietTag, type MenuItem } from "@/data/menus";
import type { LocationId } from "@/data/site";
import { formatMoney } from "@/lib/platform/money";
import { liveProducts, toMenuItem } from "@/lib/platform/menu";
import { MenuPhotoCard } from "@/components/MenuPhotoCard";

const tagLabel: Record<DietTag, string> = {
  v: "v",
  vg: "vg",
  n: "n",
};

function DietTags({ tags }: { tags?: DietTag[] }) {
  if (!tags?.length) return null;
  return (
    <span className="flex shrink-0 flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="display border border-gold/50 px-1.5 py-0.5 text-[0.58rem] tracking-[0.14em] text-gold">
          {tagLabel[tag]}
        </span>
      ))}
    </span>
  );
}

function ItemCard({ item, compact = false }: { item: MenuItem; compact?: boolean }) {
  return (
    <MenuPhotoCard item={item}>
      <article className={`site-card card-hover flex items-start gap-4 ${item.unavailable ? "is-unavailable" : ""} ${compact ? "p-4" : "p-5 md:gap-6 md:p-6"}`}>
        {item.photo ? (
          <div className={`img-zoom relative shrink-0 overflow-hidden bg-paper ${compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-32"}`}>
            <Image
              src={item.photo}
              alt={item.photoAlt || item.name}
              fill
              className="object-cover"
              sizes={compact ? "80px" : "128px"}
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className={`serif leading-tight ${compact ? "text-xl" : "text-2xl"}`}>{item.name}</h3>
            <span className="flex shrink-0 flex-wrap items-center gap-2">
              {item.unavailable ? <em className="menu-unavailable">Unavailable</em> : null}
              <DietTags tags={item.tags} />
            </span>
          </div>
          {item.description ? (
            <p className={`leading-relaxed text-mute ${compact ? "mt-1.5 text-sm" : "mt-2 text-sm"}`}>{item.description}</p>
          ) : null}
          {item.sizes ? (
            <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
              {item.sizes.map((size) => (
                <li key={size.label} className="flex items-baseline justify-between gap-4">
                  <span className="text-mute">{size.label}</span>
                  <span className="display text-[0.72rem] tracking-[0.14em]">{size.price}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {item.price ? <p className="display mt-4 text-[0.78rem] tracking-[0.16em]">{item.price}</p> : null}
        </div>
      </article>
    </MenuPhotoCard>
  );
}

function Section({
  title,
  items,
  compact = false,
  columns = "two",
}: {
  title: string;
  items: MenuItem[];
  compact?: boolean;
  columns?: "two" | "three";
}) {
  if (!items.length) return null;
  const grid =
    columns === "three"
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      : "grid gap-3";

  return (
    <section>
      <div className="mb-5 flex items-center gap-4">
        <h2 className="display text-[0.78rem] tracking-[0.28em] text-ember">{title}</h2>
        <span className="h-px flex-1 bg-line" />
      </div>
      <ul className={grid}>
        {items.map((item) => (
          <li key={item.name}>
            <ItemCard item={item} compact={compact} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function MenuList({ locationId }: { locationId: LocationId }) {
  const products = await liveProducts(locationId);
  const of = (category: string) => products.filter((p) => p.category === category).map(toMenuItem);
  const copy = menus[locationId];
  const toppings = products.filter((p) => p.category === "TOPPINGS");

  return (
    <div className="space-y-12">
      <div className="grid gap-4 md:grid-cols-5">
        <p className="border border-line bg-white p-5 text-mute leading-relaxed md:col-span-3 md:p-6">{copy.intro}</p>
        <p className="site-card p-5 text-sm leading-relaxed md:col-span-2 md:p-6">{copy.parmesanNote}</p>
      </div>

      <Section title="Starters" items={of("STARTERS")} />
      <Section title="Kids pizza meal deal" items={of("KIDS")} />
      <Section title="Our pizza" items={of("PIZZAS")} />
      <Section title="Calzone" items={of("CALZONES")} />
      <Section title="Desserts" items={of("DESSERTS")} />
      <Section title="Sides" items={of("SIDES")} compact columns="three" />
      <Section title="Drinks" items={of("DRINKS")} compact columns="three" />

      {toppings.length ? (
        <section>
          <div className="mb-5 flex items-center gap-4">
            <h2 className="display text-[0.78rem] tracking-[0.28em] text-ember">Extra toppings</h2>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {toppings.map((group) => (
              <li key={group.id} className="card-hover border border-line bg-white p-5">
                <p className="serif text-xl leading-tight">{group.name}</p>
                {!group.prices.some((price) => price.available) ? <em className="menu-unavailable">Unavailable</em> : null}
                <p className="display mt-2 text-[0.72rem] tracking-[0.16em] text-gold">
                  {group.prices[0] ? formatMoney(group.prices[0].pricePence) : ""}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-mute">{group.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {copy.byob ? (
        <aside className="border border-ink bg-ink p-6 text-cream md:p-8">
          <p className="display text-[0.7rem] tracking-[0.24em] text-gold">BYOB · Chorlton</p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream/85 md:text-base">{copy.byob}</p>
        </aside>
      ) : null}

      <section className="site-card p-5 md:p-6">
        <p className="display text-[0.7rem] tracking-[0.24em] text-mute">Please note</p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-mute">
          {copy.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
