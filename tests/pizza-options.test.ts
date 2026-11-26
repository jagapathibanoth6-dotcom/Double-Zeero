import { test } from "node:test";
import assert from "node:assert/strict";
import { extrasPence, parsePizzaNotes, pizzaNotes } from "@/data/pizza-options";

test("pizza notes round-trip", () => {
  const notes = pizzaNotes(["Chorizo", "Rocket"], ["Basil"], "Well done please");
  assert.deepEqual(parsePizzaNotes(notes), { extras: ["Chorizo", "Rocket"], removed: ["Basil"], special: "Well done please" });
});

test("extras are added up", () => {
  assert.equal(extrasPence(["Chorizo"]), 250);
  assert.equal(extrasPence(["Chorizo", "Olives"]), 450);
  assert.equal(extrasPence([]), 0);
});

test("removing a paid topping credits one swap", () => {
  // Swap mozzarella (250) for chorizo (250): free.
  assert.equal(extrasPence(["Chorizo"], ["Mozzarella"]), 0);
});

test("a gluten-free base can't be paid for by removing toppings", () => {
  assert.equal(extrasPence(["Gluten-free base"], ["Mozzarella"]), 200);
});
