import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMoney, penceFromPrice, slugify } from "@/lib/platform/money";
import { randomCode, uniqueRef } from "@/lib/platform/refs";

test("formats pence as pounds", () => {
  assert.equal(formatMoney(1250), "£12.50");
  assert.equal(formatMoney(0), "£0.00");
});

test("reads menu prices into pence", () => {
  assert.equal(penceFromPrice("£12.50"), 1250);
  assert.equal(penceFromPrice("9"), 900);
  assert.equal(penceFromPrice(""), 0);
  assert.equal(penceFromPrice(undefined), 0);
});

test("slugify makes URL-safe names", () => {
  assert.equal(slugify("Margherita Bufala"), "margherita-bufala");
  assert.equal(slugify("Chef’s Special!"), "chefs-special");
});

test("random codes use only easy-to-read characters", () => {
  for (let i = 0; i < 200; i++) assert.match(randomCode(8), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
});

test("references are random, prefixed and unique", async () => {
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const ref = await uniqueRef("O", async (candidate) => seen.has(candidate));
    assert.match(ref, /^O-[A-Z2-9]{8}$/);
    seen.add(ref);
  }
  assert.equal(seen.size, 100);
});

test("uniqueRef retries when a reference is taken", async () => {
  let calls = 0;
  const ref = await uniqueRef("B", async () => ++calls < 3);
  assert.equal(calls, 3);
  assert.match(ref, /^B-/);
});

test("uniqueRef gives up rather than looping forever", async () => {
  await assert.rejects(uniqueRef("B", async () => true), /unique B reference/);
});
