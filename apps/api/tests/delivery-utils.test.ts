import assert from "node:assert/strict";
import test from "node:test";

import { calculateSettlementDifference } from "../src/services/delivery-service.js";

test("delivery settlement difference is positive on surplus", () => {
  assert.equal(calculateSettlementDifference("100.00", "125.50"), "25.50");
});

test("delivery settlement difference is negative on shortage", () => {
  assert.equal(calculateSettlementDifference("100.00", "99.00"), "-1.00");
});

test("delivery settlement difference is zero when balanced", () => {
  assert.equal(calculateSettlementDifference("100.00", "100.00"), "0.00");
});
