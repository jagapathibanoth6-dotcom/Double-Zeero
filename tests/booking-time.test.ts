import { test } from "node:test";
import assert from "node:assert/strict";
import { fromMinutes, toMinutes } from "@/lib/booking";

test("converts between HH:MM and minutes", () => {
  assert.equal(toMinutes("00:00"), 0);
  assert.equal(toMinutes("12:30"), 750);
  assert.equal(fromMinutes(750), "12:30");
  assert.equal(fromMinutes(toMinutes("21:45")), "21:45");
});
