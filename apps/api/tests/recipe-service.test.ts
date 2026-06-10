import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../src/lib/domain-error.js";
import {
  applyRecipeUnitConversion,
  assertRecipeIngredientAllowed,
  validateRecipeIngredientSet,
  validateRecipeIngredientShape,
} from "../src/services/recipe-service.js";

test("recipe ingredient shape requires at least one ingredient", () => {
  assert.throws(
    () => validateRecipeIngredientShape([]),
    (error) => error instanceof DomainError && error.code === "RECIPE_WITHOUT_INGREDIENTS",
  );
});

test("recipe ingredient shape normalizes defaults and quantities", () => {
  assert.deepEqual(
    validateRecipeIngredientShape([
      {
        productId: "product-1",
        quantity: 2.5,
        unit: "kg",
      },
    ]),
    [
      {
        productId: "product-1",
        quantity: "2.500",
        unit: "kg",
        isOptional: false,
        wasteFactor: null,
      },
    ],
  );
});

test("recipe ingredient shape rejects invalid quantities", () => {
  assert.throws(
    () =>
      validateRecipeIngredientShape([
        {
          productId: "product-1",
          quantity: 0,
          unit: "kg",
        },
      ]),
    (error) => error instanceof DomainError && error.code === "INVALID_REQUEST",
  );
});

test("recipe ingredient set rejects duplicate ingredients", () => {
  assert.throws(
    () =>
      validateRecipeIngredientSet("output-1", [
        { productId: "ingredient-1" },
        { productId: "ingredient-1" },
      ]),
    (error) => error instanceof DomainError && error.code === "DUPLICATE_RECIPE_INGREDIENT",
  );
});

test("recipe ingredient set rejects output product as ingredient", () => {
  assert.throws(
    () => validateRecipeIngredientSet("output-1", [{ productId: "output-1" }]),
    (error) => error instanceof DomainError && error.code === "RECIPE_OUTPUT_CANNOT_BE_INGREDIENT",
  );
});

test("recipe ingredient validation rejects stockable products not authorized as recipe ingredients", () => {
  assert.throws(
    () => assertRecipeIngredientAllowed({ isRecipeIngredient: false }),
    (error) => error instanceof DomainError && error.code === "INVALID_RECIPE_INGREDIENT",
  );
});

test("recipe ingredient validation accepts authorized recipe ingredients", () => {
  assert.doesNotThrow(() => assertRecipeIngredientAllowed({ isRecipeIngredient: true }));
});

test("recipe unit conversion normalizes quantities with active conversion factor", () => {
  assert.equal(applyRecipeUnitConversion("2.000", "25.000000"), "50.000");
  assert.equal(applyRecipeUnitConversion("1.250", 10), "12.500");
});

test("recipe unit conversion rejects invalid factors", () => {
  assert.throws(
    () => applyRecipeUnitConversion("2.000", "0.000000"),
    (error) => error instanceof DomainError && error.code === "INVALID_UNIT_CONVERSION",
  );
});
