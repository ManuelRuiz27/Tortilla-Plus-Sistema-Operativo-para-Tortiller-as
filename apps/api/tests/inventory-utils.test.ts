import assert from "node:assert/strict";
import test from "node:test";

import { calculateStockQuantity, productBehavior } from "../src/services/inventory-service.js";

test("stock increases for production and inbound adjustments", () => {
  assert.equal(calculateStockQuantity("10.000", "production_in", "2.500"), "12.500");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_in", "1.250"), "11.250");
});

test("stock decreases for waste and outbound adjustments", () => {
  assert.equal(calculateStockQuantity("10.000", "waste_out", "2.500"), "7.500");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_out", "1.250"), "8.750");
});

test("raw material product behavior is forced to inventory ingredient defaults", () => {
  assert.deepEqual(productBehavior("raw_material", {
    isSellable: true,
    requiresProduction: true,
    isStockTracked: false,
    isRecipeIngredient: false,
    allowNegativeStock: true,
  }), {
    isSellable: false,
    requiresProduction: false,
    isStockTracked: true,
    isRecipeIngredient: true,
    allowNegativeStock: false,
  });
});

test("packaging product behavior is non-sellable and can opt into recipe ingredients", () => {
  assert.deepEqual(productBehavior("packaging", {
    isSellable: true,
    requiresProduction: true,
    isStockTracked: false,
    isRecipeIngredient: true,
    allowNegativeStock: true,
  }), {
    isSellable: false,
    requiresProduction: false,
    isStockTracked: true,
    isRecipeIngredient: true,
    allowNegativeStock: false,
  });
});
