import { PrismaClient } from "@prisma/client";
import { menus, type MenuItem } from "../src/data/menus";
import { penceFromPrice, slugify } from "../src/lib/platform/money";

const db = new PrismaClient();

const tables = {
  manchester: [
    { code: "T1", seats: 2, x: 1, y: 1 },
    { code: "T2", seats: 2, x: 2, y: 1 },
    { code: "T3", seats: 4, x: 1, y: 2 },
    { code: "T4", seats: 4, x: 2, y: 2 },
    { code: "T5", seats: 6, x: 3, y: 1 },
    { code: "T6", seats: 6, x: 3, y: 2 },
    { code: "T7", seats: 8, x: 4, y: 1 },
    { code: "T8", seats: 4, x: 1, y: 3 },
    { code: "T9", seats: 2, x: 2, y: 3 },
    { code: "T10", seats: 6, x: 3, y: 3 },
  ],
  chorlton: [
    { code: "T1", seats: 2, x: 1, y: 1 },
    { code: "T2", seats: 2, x: 2, y: 1 },
    { code: "T3", seats: 4, x: 1, y: 2 },
    { code: "T4", seats: 4, x: 2, y: 2 },
    { code: "T5", seats: 6, x: 3, y: 1 },
    { code: "T6", seats: 6, x: 3, y: 2 },
    { code: "T7", seats: 8, x: 4, y: 1 },
  ],
};

function collect(menu: (typeof menus)["manchester"]) {
  const rows: { item: MenuItem; category: string }[] = [];
  const push = (items: MenuItem[] | undefined, category: string) => {
    for (const item of items || []) rows.push({ item, category });
  };
  push(menu.starters, "STARTERS");
  push(menu.kids, "KIDS");
  push(menu.pizzas, "PIZZAS");
  push(menu.calzones, "CALZONES");
  push(menu.salads, "SIDES");
  push(menu.dippers, "SIDES");
  push(menu.desserts, "DESSERTS");
  push(menu.drinks, "DRINKS");
  push(menu.juices, "DRINKS");
  return rows;
}

async function main() {
  await db.staffUser.upsert({
    where: { email: "owner@doublezero.local" },
    update: {},
    create: {
      email: "owner@doublezero.local",
      name: "Owner",
      password: "doublezero",
      role: "owner",
    },
  });
  await db.staffUser.upsert({
    where: { email: "kitchen@doublezero.local" },
    update: {},
    create: { email: "kitchen@doublezero.local", name: "Kitchen", password: "kitchen", role: "kitchen" },
  });

  for (const locationId of ["manchester", "chorlton"] as const) {
    await db.locationSettings.upsert({
      where: { locationId },
      update: {},
      create: { locationId },
    });
    await db.table.deleteMany({ where: { locationId } });
    await db.tableCombo.deleteMany({ where: { locationId } });
    await db.table.createMany({ data: tables[locationId].map((t) => ({ ...t, locationId })) });
    await db.tableCombo.createMany({
      data:
        locationId === "manchester"
          ? [
              { locationId, codes: "T1,T12", seats: 12 },
              { locationId, codes: "T3,T11", seats: 20 },
              { locationId, codes: "T3,T1", seats: 16 },
              { locationId, codes: "T11,T12", seats: 16 },
              { locationId, codes: "T2,T9", seats: 8 },
            ]
          : [
              { locationId, codes: "T3,T4", seats: 8 },
              { locationId, codes: "T5,T6", seats: 12 },
              { locationId, codes: "T1,T2", seats: 18 },
              { locationId, codes: "T5,T6,T7", seats: 30 },
            ],
    });
  }

  const seen = new Map<string, string>();
  for (const locationId of ["manchester", "chorlton"] as const) {
    const rows = collect(menus[locationId]);
    let sort = 0;
    for (const { item, category } of rows) {
      const slug = slugify(item.name);
      let productId = seen.get(slug);
      if (!productId) {
        const product = await db.menuProduct.upsert({
          where: { slug },
          update: {
            name: item.name,
            description: item.description,
            category,
            photo: item.photo || "",
            dietary: (item.tags || []).join(","),
            note: item.note || "",
          },
          create: {
            slug,
            name: item.name,
            description: item.description,
            category,
            photo: item.photo || "",
            dietary: (item.tags || []).join(","),
            note: item.note || "",
            sortOrder: sort,
          },
        });
        productId = product.id;
        seen.set(slug, productId);
      }
      const variants = item.sizes?.length
        ? item.sizes.map((s) => ({ label: s.label, pricePence: penceFromPrice(s.price) }))
        : [{ label: "", pricePence: penceFromPrice(item.price) }];
      for (const variant of variants) {
        await db.menuPrice.upsert({
          where: { productId_locationId_label: { productId, locationId, label: variant.label } },
          update: { pricePence: variant.pricePence },
          create: { productId, locationId, label: variant.label, pricePence: variant.pricePence },
        });
      }
      sort += 1;
    }
  }

  await db.offer.upsert({
    where: { id: "offer-collect" },
    update: {},
    create: {
      id: "offer-collect",
      name: "10% off collection",
      percentOff: 10,
      orderType: "CLICK_COLLECT",
      minSpendPence: 2000,
      active: true,
    },
  });
  await db.offer.upsert({
    where: { id: "offer-first" },
    update: {},
    create: {
      id: "offer-first",
      name: "First online order",
      percentOff: 15,
      minSpendPence: 2500,
      maxDiscountPence: 800,
      active: true,
    },
  });

  console.log("Seeded Double Zero platform.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
