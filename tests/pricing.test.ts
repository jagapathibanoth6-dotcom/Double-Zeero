import { test } from "node:test";
import assert from "node:assert/strict";
import { priceLine, type PricedProduct } from "@/lib/platform/pricing";

const margherita: PricedProduct = { category: "PIZZAS", prices: [{ label: "", pricePence: 1100 }] };
const lemonade: PricedProduct = {
  category: "DRINKS",
  prices: [
    { label: "Small", pricePence: 300 },
    { label: "Large", pricePence: 450 },
  ],
};

test("uses the database price, not the browser's", () => {
  const line = priceLine({ productId: "p1", name: "Margherita", quantity: 2, unitPence: 1 }, margherita);
  assert.equal(line.unitPence, 1100);
  assert.equal(line.quantity, 2);
});

test("matches sizes by label", () => {
  const line = priceLine({ productId: "p2", name: "Lemonade", quantity: 1, unitPence: 0, label: "Large" }, lemonade);
  assert.equal(line.unitPence, 450);
});

test("matches sizes by price when no label is sent", () => {
  const line = priceLine({ productId: "p2", name: "Lemonade", quantity: 1, unitPence: 300 }, lemonade);
  assert.equal(line.label, "Small");
});

test("rejects a size price that doesn't exist", () => {
  assert.throws(
    () => priceLine({ productId: "p2", name: "Lemonade", quantity: 1, unitPence: 1 }, lemonade),
    /price of Lemonade has changed/,
  );
});

test("adds pizza extras from the notes", () => {
  const line = priceLine(
    { productId: "p1", name: "Margherita", quantity: 1, unitPence: 0, label: "", notes: "Extra: Chorizo, Olives" },
    margherita,
  );
  assert.equal(line.unitPence, 1100 + 250 + 200);
});

test("does not charge extras on drinks", () => {
  const line = priceLine({ productId: "p2", name: "Lemonade", quantity: 1, unitPence: 0, label: "Small", notes: "Extra: Chorizo" }, lemonade);
  assert.equal(line.unitPence, 300);
});

test("rejects unavailable products and silly quantities", () => {
  assert.throws(() => priceLine({ name: "Ghost", quantity: 1, unitPence: 100 }, undefined), /unavailable/);
  assert.throws(() => priceLine({ name: "Margherita", quantity: 0, unitPence: 1100 }, margherita), /quantity/);
  assert.throws(() => priceLine({ name: "Margherita", quantity: 999, unitPence: 1100 }, margherita), /quantity/);
  assert.throws(() => priceLine({ name: "Margherita", quantity: -2, unitPence: 1100 }, margherita), /quantity/);
});
