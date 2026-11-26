/**
 * Pure helpers and types for the online ordering screen (OrderDesk).
 * Kept separate so they can be read and tested without the UI.
 */
import { menuPhotoFor } from "@/data/menus";
import { includedToppings, parsePizzaNotes } from "@/data/pizza-options";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  photo: string;
  available?: boolean;
  prices: { id: string; pricePence: number; label: string; available?: boolean }[];
};

/** A product is orderable unless it is switched off or every one of its sizes is. */
export function isAvailable(product: Product) {
  if (product.available === false) return false;
  return product.prices.length === 0 || product.prices.some((price) => price.available !== false);
}

export type BasketItem = {
  lineId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPence: number;
  label: string;
  notes?: string;
};

export function newLineId() {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pizzaLineCopy(product: Product, notes?: string) {
  const saved = parsePizzaNotes(notes || "");
  const bits = [
    saved.extras.length ? `Extra: ${saved.extras.join(", ")}` : "",
    saved.removed.length ? `No: ${saved.removed.join(", ")}` : "",
    saved.special,
  ].filter(Boolean);
  if (bits.length) return bits.join(". ");
  const included = includedToppings(product.description);
  return included.length ? included.join(", ") : product.description;
}

export function canCustomise(product: Product) {
  const category = String(product.category || "").toUpperCase();
  return category === "PIZZAS" || category === "CALZONES" || category === "KIDS";
}

export const categoryTitle: Record<string, string> = {
  STARTERS: "Starters",
  KIDS: "Kids",
  PIZZAS: "Pizza",
  CALZONES: "Calzone",
  SIDES: "Sides",
  DESSERTS: "Desserts",
  DRINKS: "Drinks",
  TOPPINGS: "Extra toppings",
};

export const categoryOrder = ["STARTERS", "KIDS", "PIZZAS", "CALZONES", "SIDES", "DESSERTS", "DRINKS"];

export function productPhoto(product: Product) {
  return product.photo || menuPhotoFor(product.name)?.photo || "";
}

export function joinAddress(parts: { line1: string; line2: string; city: string; postcode: string }) {
  return [parts.line1, parts.line2, parts.city, parts.postcode].map((part) => part.trim()).filter(Boolean).join(", ");
}
