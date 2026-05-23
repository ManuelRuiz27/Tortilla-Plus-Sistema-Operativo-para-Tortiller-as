import assert from "node:assert/strict";
import test from "node:test";

import { calculateReturnAmount, calculateSaleItem, validatePaymentTotal } from "../src/services/sale-service.js";

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
