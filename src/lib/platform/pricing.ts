import { extrasPence, parsePizzaNotes } from "@/data/pizza-options";

export type BasketItem = {
  productId?: string;
  name: string;
  quantity: number;
  unitPence: number;
  /** Size label, e.g. "12\"". Empty for single-price products. */
  label?: string;
  notes?: string;
};

/** A live menu product with the prices that are switched on at one restaurant. */
export type PricedProduct = {
  category: string;
  prices: { label: string; pricePence: number }[];
};

const CUSTOMISABLE = new Set(["PIZZAS", "CALZONES", "KIDS"]);
const MAX_QUANTITY = 50;

/**
 * Work out the real price of one basket line.
 *
 * - The product must exist and have at least one live price here.
 * - The size is matched by label; older clients that send no label are matched
 *   by price, and single-price products need no match.
 * - Pizza extras are re-costed from the line's notes ("Extra: …. No: …").
 *
 * Throws a customer-friendly error if the line can't be priced.
 */
export function priceLine(item: BasketItem, product: PricedProduct | undefined): BasketItem {
  const quantity = Math.floor(Number(item.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error(`Check the quantity for ${item.name}.`);
  }
  if (!product || !product.prices.length) throw new Error(`${item.name} is unavailable.`);

  const saved = parsePizzaNotes(item.notes || "");
  const extras = CUSTOMISABLE.has(product.category.toUpperCase()) ? extrasPence(saved.extras, saved.removed) : 0;
  const price =
    (item.label !== undefined ? product.prices.find((row) => row.label === item.label) : undefined) ||
    product.prices.find((row) => row.pricePence + extras === Number(item.unitPence)) ||
    (product.prices.length === 1 ? product.prices[0] : undefined);
  if (!price) throw new Error(`The price of ${item.name} has changed. Please refresh the page.`);

  return { ...item, quantity, label: price.label, unitPence: price.pricePence + extras };
}
