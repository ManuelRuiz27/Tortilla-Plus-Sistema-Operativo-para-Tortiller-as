import assert from "node:assert/strict";
import test from "node:test";

import { calculateStockQuantity } from "../src/services/inventory-service.js";

test("stock increases for production and inbound adjustments", () => {
  assert.equal(calculateStockQuantity("10.000", "production_in", "2.500"), "12.500");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_in", "1.250"), "11.250");
});

test("stock decreases for waste and outbound adjustments", () => {
  assert.equal(calculateStockQuantity("10.000", "waste_out", "2.500"), "7.500");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_out", "1.250"), "8.750");
});
