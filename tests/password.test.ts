import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/platform/password";

test("hashes with scrypt and a random salt", () => {
  const a = hashPassword("pizza-oven-2024");
  const b = hashPassword("pizza-oven-2024");
  assert.match(a, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.notEqual(a, b, "same password should give different hashes");
});

test("verifies the right password and rejects the wrong one", () => {
  const stored = hashPassword("correct horse");
  assert.deepEqual(verifyPassword("correct horse", stored), { ok: true, needsRehash: false });
  assert.equal(verifyPassword("wrong horse", stored).ok, false);
});

test("accepts old SHA-256 customer hashes and asks for an upgrade", () => {
  const legacy = createHash("sha256").update("DZ-1A2B3C").digest("hex");
  assert.deepEqual(verifyPassword("DZ-1A2B3C", legacy), { ok: true, needsRehash: true });
  assert.equal(verifyPassword("nope", legacy).ok, false);
});

test("never accepts plain-text or empty stored passwords", () => {
  assert.equal(verifyPassword("doublezero", "doublezero").ok, false);
  assert.equal(verifyPassword("anything", "").ok, false);
  assert.equal(verifyPassword("anything", null).ok, false);
  assert.equal(verifyPassword("", hashPassword("x")).ok, false);
});

test("temporary passwords look like DZ-XXXXXXXX", () => {
  assert.match(generateTempPassword(), /^DZ-[0-9A-F]{8}$/);
});
