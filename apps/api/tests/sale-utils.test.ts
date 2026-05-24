import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCreditUsage,
  calculateReturnAmount,
  calculateSaleItem,
  parseSalePayments,
  validatePaymentTotal,
} from "../src/services/sale-service.js";
import { DomainError } from "../src/lib/domain-error.js";

test("sale item by kg multiplies quantity by price", () => {
  assert.deepEqual(
    calculateSaleItem({
      saleMode: "by_kg",
      inputQuantityOrAmount: "2.500",
      unitPrice: "24.00",
    }),
    {
      quantity: "2.500",
      unitPrice: "24.00",
      total: "60.00",
    },
  );
});

test("sale item by amount calculates quantity from price", () => {
  assert.deepEqual(
    calculateSaleItem({
      saleMode: "by_amount",
      inputQuantityOrAmount: "12.00",
      unitPrice: "24.00",
    }),
    {
      quantity: "0.500",
      unitPrice: "24.00",
      total: "12.00",
    },
  );
});

test("payment total must match sale total exactly", () => {
  assert.equal(validatePaymentTotal("100.00", [{ amount: "60.00" }, { amount: "40.00" }]), true);
  assert.equal(validatePaymentTotal("100.00", [{ amount: "60.00" }, { amount: "39.99" }]), false);
});

test("mixed cash and credit payment can cover sale total", () => {
  assert.equal(validatePaymentTotal("120.00", [{ amount: "80.00" }, { amount: "40.00" }]), true);
});

test("card and transfer payments require reference", () => {
  assert.throws(
    () => parseSalePayments([{ paymentMethod: "card", amount: "10.00" }]),
    (error) => error instanceof DomainError && error.code === "CARD_REFERENCE_REQUIRED",
  );
  assert.throws(
    () => parseSalePayments([{ paymentMethod: "transfer", amount: "10.00" }]),
    (error) => error instanceof DomainError && error.code === "TRANSFER_REFERENCE_REQUIRED",
  );
  assert.deepEqual(parseSalePayments([{ paymentMethod: "card", amount: "10", reference: "TERM-1" }]), [
    { paymentMethod: "card", amount: "10.00", reference: "TERM-1", provider: null },
  ]);
});

test("credit usage detects when customer limit is exceeded", () => {
  assert.deepEqual(calculateCreditUsage({ currentBalance: "50.00", creditLimit: "200.00", creditAmount: "80.00" }), {
    nextBalance: "130.00",
    availableCredit: "150.00",
    exceedsLimit: false,
  });
  assert.deepEqual(calculateCreditUsage({ currentBalance: "150.00", creditLimit: "200.00", creditAmount: "80.00" }), {
    nextBalance: "230.00",
    availableCredit: "50.00",
    exceedsLimit: true,
  });
});

test("return amount is proportional to returned quantity", () => {
  assert.equal(
    calculateReturnAmount({
      itemTotal: "48.00",
      itemQuantity: "2.000",
      returnQuantity: "0.500",
    }),
    "12.00",
  );
});
