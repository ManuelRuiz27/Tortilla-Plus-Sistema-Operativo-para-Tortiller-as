import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../src/lib/domain-error.js";
import {
  calculateOutputVariancePercentage,
  calculateScaledQuantity,
  calculateYieldPercentage,
} from "../src/services/production-recipe-service.js";

test("recipe production scales ingredient quantities from requested output", () => {
  assert.equal(calculateScaledQuantity("4.000", "1.500"), "6.000");
  assert.equal(calculateScaledQuantity("0.125", "2.000"), "0.250");
});

test("recipe production calculates yield percentage", () => {
  assert.equal(calculateYieldPercentage("9.000", "10.000"), "90.00");
  assert.equal(calculateYieldPercentage("12.500", "10.000"), "125.00");
});

test("recipe production calculates absolute output variance percentage", () => {
  assert.equal(calculateOutputVariancePercentage("9.500", "10.000").toFixed(2), "5.00");
  assert.equal(calculateOutputVariancePercentage("11.250", "10.000").toFixed(2), "12.50");
});

test("recipe production rejects invalid expected output for yield", () => {
  assert.throws(
    () => calculateYieldPercentage("10.000", "0.000"),
    (error) => error instanceof DomainError && error.code === "INVALID_EXPECTED_OUTPUT",
  );
});
