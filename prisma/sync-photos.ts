import { PrismaClient } from "@prisma/client";
import { menus, menuPhotoFor } from "../src/data/menus";

const db = new PrismaClient();

async function main() {
  const products = await db.menuProduct.findMany();
  let updated = 0;
  for (const product of products) {
    const fromMenus =
      Object.values(menus)
        .flatMap((menu) => [...menu.starters, ...menu.kids, ...menu.pizzas, ...menu.calzones, ...menu.salads, ...menu.dippers, ...(menu.desserts || []), ...(menu.drinks || []), ...(menu.juices || [])])
        .find((item) => item.name === product.name)?.photo || menuPhotoFor(product.name)?.photo;
    if (!fromMenus || product.photo === fromMenus) continue;
    await db.menuProduct.update({ where: { id: product.id }, data: { photo: fromMenus } });
    updated += 1;
  }
  console.log(`Updated ${updated} menu photos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
