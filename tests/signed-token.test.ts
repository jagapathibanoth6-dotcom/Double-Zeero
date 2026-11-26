import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "@/lib/platform/signed-token";

test("a signed token returns its value", () => {
  const token = signToken("cm123abc", 60);
  assert.equal(verifyToken(token), "cm123abc");
});

test("a plain id (old-style cookie) is rejected", () => {
  assert.equal(verifyToken("cm123abc"), null);
});

test("a tampered value is rejected", () => {
  const [, expiry, signature] = signToken("staff-1", 60).split(".");
  assert.equal(verifyToken(`staff-2.${expiry}.${signature}`), null);
});

test("a tampered expiry is rejected", () => {
  const [value, , signature] = signToken("staff-1", 60).split(".");
  assert.equal(verifyToken(`${value}.9999999999.${signature}`), null);
});

test("an expired token is rejected", () => {
  assert.equal(verifyToken(signToken("staff-1", -1)), null);
});

test("empty input is rejected", () => {
  assert.equal(verifyToken(undefined), null);
  assert.equal(verifyToken(""), null);
});
