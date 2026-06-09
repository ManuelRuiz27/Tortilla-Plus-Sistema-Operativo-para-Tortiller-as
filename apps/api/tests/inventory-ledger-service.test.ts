import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInventoryMovement,
  calculateStockQuantity,
} from "../src/services/inventory-ledger-service.js";

test("ledger stock calculation supports inbound and outbound movement types", () => {
  assert.equal(calculateStockQuantity("10.000", "production_in", "2.500"), "12.500");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_in", "1.250"), "11.250");
  assert.equal(calculateStockQuantity("10.000", "route_return_in", "1.000"), "11.000");
  assert.equal(calculateStockQuantity("10.000", "return_in", "0.500"), "10.500");

  assert.equal(calculateStockQuantity("10.000", "production_input_out", "2.000"), "8.000");
  assert.equal(calculateStockQuantity("10.000", "sale_out", "2.500"), "7.500");
  assert.equal(calculateStockQuantity("10.000", "route_load_out", "3.000"), "7.000");
  assert.equal(calculateStockQuantity("10.000", "waste_out", "1.000"), "9.000");
  assert.equal(calculateStockQuantity("10.000", "manual_adjustment_out", "1.250"), "8.750");
  assert.equal(calculateStockQuantity("10.000", "return_waste", "0.750"), "9.250");
});

test("ledger returns existing referenced movement without applying stock again", async () => {
  const existingMovement = {
    id: "movement-1",
    organizationId: "org-1",
    branchId: "branch-1",
    productId: "product-1",
    movementType: "production_in",
    quantity: "5.000",
    unit: "kg",
    reason: "Produccion diaria",
    referenceType: "production_batch",
    referenceId: "batch-1",
    createdByUserId: "user-1",
    authorizedByUserId: null,
    createdAt: new Date(),
  };
  const calls: string[] = [];
  const tx = {
    inventoryMovement: {
      findFirst: async () => {
        calls.push("findFirst");
        return existingMovement;
      },
      create: async () => {
        calls.push("createMovement");
        throw new Error("should not create duplicate movement");
      },
    },
    product: {
      findFirst: async () => {
        calls.push("findProduct");
        throw new Error("should not load product for duplicate movement");
      },
    },
    inventoryStock: {
      upsert: async () => {
        calls.push("upsertStock");
        throw new Error("should not upsert stock for duplicate movement");
      },
      update: async () => {
        calls.push("updateStock");
        throw new Error("should not update stock for duplicate movement");
      },
      updateMany: async () => {
        calls.push("updateManyStock");
        throw new Error("should not update stock for duplicate movement");
      },
    },
  };

  const movement = await applyInventoryMovement(tx as never, {
    organizationId: "org-1",
    branchId: "branch-1",
    productId: "product-1",
    movementType: "production_in",
    quantity: "5.000",
    reason: "Produccion diaria",
    referenceType: "production_batch",
    referenceId: "batch-1",
    createdByUserId: "user-1",
  });

  assert.equal(movement, existingMovement);
  assert.deepEqual(calls, ["findFirst"]);
});

test("ledger can create auditable movement without changing stock", async () => {
  const movement = {
    id: "movement-2",
    organizationId: "org-1",
    branchId: "branch-1",
    productId: "product-1",
    movementType: "return_waste",
    quantity: "1.000",
    unit: "kg",
    reason: "Devolucion no revendible",
    referenceType: "sale_return_item",
    referenceId: null,
    createdByUserId: "user-1",
    authorizedByUserId: null,
    createdAt: new Date(),
  };
  const calls: string[] = [];
  const tx = {
    inventoryMovement: {
      create: async () => {
        calls.push("createMovement");
        return movement;
      },
    },
    product: {
      findFirst: async () => {
        calls.push("findProduct");
        return {
          id: "product-1",
          organizationId: "org-1",
          status: "active",
          isStockTracked: true,
          allowNegativeStock: false,
          unit: "kg",
        };
      },
    },
    inventoryStock: {
      upsert: async () => {
        calls.push("upsertStock");
        return {};
      },
      update: async () => {
        calls.push("updateStock");
        throw new Error("should not update stock");
      },
      updateMany: async () => {
        calls.push("updateManyStock");
        throw new Error("should not update stock");
      },
    },
  };

  const result = await applyInventoryMovement(tx as never, {
    organizationId: "org-1",
    branchId: "branch-1",
    productId: "product-1",
    movementType: "return_waste",
    quantity: "1.000",
    reason: "Devolucion no revendible",
    referenceType: "sale_return_item",
    referenceId: null,
    createdByUserId: "user-1",
    affectsStock: false,
  });

  assert.equal(result, movement);
  assert.deepEqual(calls, ["findProduct", "upsertStock", "createMovement"]);
});
