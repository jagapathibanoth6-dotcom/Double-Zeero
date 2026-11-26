import { test } from "node:test";
import assert from "node:assert/strict";
import { nextOrderStatus, orderTypeLabel } from "@/lib/platform/order-label";

test("kitchen flow for click & collect", () => {
  assert.equal(nextOrderStatus("CLICK_COLLECT", "NEW")?.status, "ACCEPTED");
  assert.equal(nextOrderStatus("CLICK_COLLECT", "ACCEPTED")?.status, "PREPARING");
  assert.equal(nextOrderStatus("CLICK_COLLECT", "PREPARING")?.status, "READY");
  assert.equal(nextOrderStatus("CLICK_COLLECT", "READY")?.status, "COMPLETED");
  assert.equal(nextOrderStatus("CLICK_COLLECT", "COMPLETED"), null);
});

test("delivery goes out before it completes", () => {
  assert.equal(nextOrderStatus("DZ_DELIVERY", "READY")?.status, "DISPATCHED");
  assert.equal(nextOrderStatus("DZ_DELIVERY", "DISPATCHED")?.status, "COMPLETED");
});

test("order type labels", () => {
  assert.equal(orderTypeLabel("CLICK_COLLECT"), "Click & collect");
  assert.equal(orderTypeLabel("DZ_DELIVERY"), "Home delivery");
  assert.equal(orderTypeLabel("UBER_EATS"), "UBER EATS");
});
