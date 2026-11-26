import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { gallery as fallbackGallery } from "@/data/site";

export type GalleryShot = {
  id: string;
  src: string;
  alt: string;
  sortOrder: number;
};

const seedShots = [
  ...fallbackGallery,
  { src: "/images/menu/triple-pepperoni.jpg", alt: "Triple Pepperoni" },
  { src: "/images/menu/arancini.jpg", alt: "Arancini con carne di manzo" },
  { src: "/images/menu/antipasti.jpg", alt: "Meat antipasti platter" },
  { src: "/images/menu/olives.jpg", alt: "Marinated olives" },
  { src: "/images/menu/garlic-bread.jpg", alt: "Wood-fired garlic bread" },
  { src: "/images/menu/garlic-bread-cheese.jpg", alt: "Garlic bread with cheese" },
  { src: "/images/menu/calzone-veg.jpg", alt: "Vegetarian calzone" },
  { src: "/images/menu/vegetable-antipasti.jpg", alt: "Vegetable antipasti platter" },
  { src: "/images/menu/tiramisu.jpg", alt: "Homemade tiramisu" },
  { src: "/images/food-1.jpg", alt: "Margherita with leopard-spotted crust" },
  { src: "/images/pizza-1.jpg", alt: "Dough balls ready to stretch" },
  { src: "/images/food-2.jpg", alt: "Pizza from the wood oven" },
  { src: "/images/oven.webp", alt: "The wood oven" },
];

function newId() {
  return `gal_${randomBytes(12).toString("hex")}`;
}

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS GalleryPhoto (
      id TEXT PRIMARY KEY NOT NULL,
      src TEXT NOT NULL,
      alt TEXT NOT NULL DEFAULT '',
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function listGalleryPhotos() {
  await ensureTable();
  const rows = await db.$queryRaw<GalleryShot[]>`
    SELECT id, src, alt, sortOrder FROM GalleryPhoto ORDER BY sortOrder ASC, createdAt ASC
  `;
  if (rows.length) return rows;

  const seen = new Set<string>();
  let order = 0;
  for (const shot of seedShots) {
    if (seen.has(shot.src)) continue;
    seen.add(shot.src);
    await db.$executeRaw`
      INSERT INTO GalleryPhoto (id, src, alt, sortOrder, createdAt)
      VALUES (${newId()}, ${shot.src}, ${shot.alt}, ${order}, ${new Date().toISOString()})
    `;
    order += 1;
  }
  return db.$queryRaw<GalleryShot[]>`
    SELECT id, src, alt, sortOrder FROM GalleryPhoto ORDER BY sortOrder ASC, createdAt ASC
  `;
}

export async function addGalleryPhoto(src: string, alt: string) {
  await ensureTable();
  const current = await db.$queryRaw<{ sortOrder: number }[]>`
    SELECT sortOrder FROM GalleryPhoto ORDER BY sortOrder DESC LIMIT 1
  `;
  const row: GalleryShot = {
    id: newId(),
    src,
    alt: alt.trim() || "Double Zero",
    sortOrder: (current[0]?.sortOrder || 0) + 1,
  };
  await db.$executeRaw`
    INSERT INTO GalleryPhoto (id, src, alt, sortOrder, createdAt)
    VALUES (${row.id}, ${row.src}, ${row.alt}, ${row.sortOrder}, ${new Date().toISOString()})
  `;
  return row;
}

export async function deleteGalleryPhoto(id: string) {
  await ensureTable();
  await db.$executeRaw`DELETE FROM GalleryPhoto WHERE id = ${id}`;
}
