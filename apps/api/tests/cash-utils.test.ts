import assert from "node:assert/strict";
import test from "node:test";

import { calculateCashDifference } from "../src/services/cash-service.js";

test("cash close difference classifies surplus", () => {
  assert.deepEqual(calculateCashDifference("100.00", "125.50"), {
    differenceAmount: "25.50",
    differenceType: "surplus",
  });
});

test("cash close difference classifies shortage", () => {
  assert.deepEqual(calculateCashDifference("100.00", "99.00"), {
    differenceAmount: "-1.00",
    differenceType: "shortage",
  });
});

test("cash close difference classifies balanced close", () => {
  assert.deepEqual(calculateCashDifference("100.00", "100.00"), {
    differenceAmount: "0.00",
    differenceType: "none",
  });
});
