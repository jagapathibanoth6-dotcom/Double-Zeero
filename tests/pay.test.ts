import { test } from "node:test";
import assert from "node:assert/strict";
import { isPaid, leftPence, paidPence, refundQuote } from "@/lib/platform/pay";

const paid = { status: "PAID", amountPence: 2000, provider: "STRIPE", providerRef: "pi_123_abcd" };
const partly = { status: "PARTIAL_REFUND", amountPence: 2000, refunds: [{ amountPence: 500 }] };

test("paid amount subtracts refunds and ignores unpaid", () => {
  assert.equal(paidPence([paid]), 2000);
  assert.equal(paidPence([partly]), 1500);
  assert.equal(paidPence([{ status: "UNPAID", amountPence: 999 }]), 0);
  assert.equal(paidPence([{ status: "REFUNDED", amountPence: 999 }]), 0);
});

test("isPaid", () => {
  assert.equal(isPaid([paid]), true);
  assert.equal(isPaid([partly]), true);
  assert.equal(isPaid([]), false);
  assert.equal(isPaid(null), false);
});

test("amount left to pay", () => {
  assert.equal(leftPence(3000, [paid]), 1000);
  assert.equal(leftPence(1000, [paid]), 0);
});

test("refund quote refunds what is left on the payment", () => {
  const quote = refundQuote({ type: "Order", name: "Sam", email: "sam@example.com", payments: [partly] });
  assert.equal(quote.paidPence, 2000);
  assert.equal(quote.alreadyRefundedPence, 500);
  assert.equal(quote.refundPence, 1500);
});

test("refund quote names Stripe payments", () => {
  assert.match(refundQuote({ type: "Order", payments: [paid] }).method, /Stripe/);
});
