import { db } from "@/lib/db";
import { formatMoney, penceFromPrice, slugify } from "@/lib/platform/money";
import type { LocationId } from "@/data/site";
import { menuPhotoFor, type DietTag, type MenuItem } from "@/data/menus";

export { MENU_CATEGORIES } from "@/data/menu-categories";

const defaultToppings = [
  {
    name: "Meat & fish",
    description: "Anchovies, grilled chicken, chorizo, Italian pepperoni, Italian herb ham, ’nduja, Parma ham, salami Napoli, salami finocchiona.",
    price: "+£2.50",
  },
  {
    name: "Cheeses",
    description: "Fior di latte, mozzarella, bufala mozzarella, parmesan, smoked mozzarella, buffalo burrata, stracciatella, vegan mozzarella, goat’s cheese, gorgonzola.",
    price: "+£2.50",
  },
  {
    name: "Vegetables",
    description: "Artichoke, aubergine, basil, cherry tomatoes, courgette, garlic, jalapeños, mixed mushrooms, olives, red onion, rocket, spinach, sun-dried tomatoes.",
    price: "+£2.00",
  },
];

let toppingsReady: Promise<void> | null = null;

export function bustMenuCache() {
  toppingsReady = null;
}

async function seedToppings() {
  const count = await db.menuProduct.count({ where: { category: "TOPPINGS" } });
  if (count) return;
  for (const topping of defaultToppings) {
    const product = await db.menuProduct.create({
      data: {
        slug: slugify(topping.name),
        name: topping.name,
        description: topping.description,
        category: "TOPPINGS",
        available: true,
      },
    });
    for (const locationId of ["manchester", "chorlton"]) {
      await db.menuPrice.create({
        data: {
          productId: product.id,
          locationId,
          pricePence: penceFromPrice(topping.price),
          label: "",
        },
      });
    }
  }
}

export async function ensureToppings() {
  toppingsReady ??= seedToppings();
  return toppingsReady;
}

async function queryProducts(locationId: LocationId) {
  return db.menuProduct.findMany({
    where: {
      prices: { some: { locationId } },
    },
    include: {
      prices: {
        where: { locationId },
        orderBy: { label: "asc" },
      },
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function liveProducts(locationId: LocationId) {
  await ensureToppings();
  return (await queryProducts(locationId)).map((product) => {
    if (product.photo) return product;
    const fallback = menuPhotoFor(product.name);
    return fallback ? { ...product, photo: fallback.photo } : product;
  });
}

/** True when at least one size/price of the product is switched on. */
export function branchEnabled(prices: { available?: boolean }[]) {
  return prices.some((price) => price.available !== false);
}

export function toMenuItem(product: {
  name: string;
  description: string;
  photo: string;
  dietary: string;
  prices: { label: string; pricePence: number; available?: boolean }[];
}): MenuItem {
  const tags = product.dietary.split(",").filter(Boolean) as DietTag[];
  const prices = product.prices;
  const fallback = menuPhotoFor(product.name);
  const item: MenuItem = {
    name: product.name,
    description: product.description,
    photo: product.photo || fallback?.photo,
    photoAlt: fallback?.photoAlt || product.name,
    tags: tags.length ? tags : undefined,
    unavailable: !branchEnabled(prices),
  };
  if (prices.length > 1) {
    item.sizes = prices.map((price) => ({
      label: price.label || "Standard",
      price: formatMoney(price.pricePence),
    }));
  } else if (prices[0]) {
    item.price = formatMoney(prices[0].pricePence);
  }
  return item;
}

export async function featuredPizzasLive(locationId: LocationId = "manchester") {
  const prefer = [
    "Margherita",
    "Vulcano",
    "Miele Sizzler",
    "Chorizo",
    "Rustica",
    "Partenopea",
    "Margherita Bufala",
    "Marinara",
    "Triple Pepperoni",
    "Formaggio",
    "Estiva",
    "Beef Ragu",
  ];
  const products = await db.menuProduct.findMany({
    where: {
      category: "PIZZAS",
      prices: { some: { locationId } },
    },
    include: {
      prices: { where: { locationId }, orderBy: { label: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const picked = prefer.map((name) => products.find((p) => p.name === name)).filter(Boolean);
  const rest = products.filter((p) => !picked.includes(p));
  return [...picked, ...rest].slice(0, 12).map((p) => toMenuItem(p!));
}
