import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { login } from "../../src/services/auth-service.js";

test("Post R8-B seed exposes pilot users, inputs, conversions and demo recipe", async () => {
  const owner = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const supervisor = await login({ email: "supervisor.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashier = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });

  assert.ok(owner.user.organizationId);
  assert.ok(manager.user.organizationId);
  assert.ok(supervisor.user.organizationId);
  assert.ok(cashier.user.organizationId);

  const organizationId = owner.user.organizationId;
  const branchId = owner.user.branches[0]?.branchId;
  assert.ok(branchId);

  const recipe = await prisma.recipe.findFirst({
    where: {
      organizationId,
      branchId,
      name: "Masa estandar demo",
      status: "active",
    },
    include: {
      currentVersion: {
        include: {
          ingredients: {
            include: {
              product: true,
            },
          },
        },
      },
      outputProduct: true,
    },
  });

  assert.ok(recipe);
  assert.equal(recipe.outputProduct.sku, "MASA-KG");
  assert.equal(recipe.currentVersion?.expectedOutputQuantity.toString(), "33");
  assert.equal(recipe.currentVersion?.ingredients.length, 3);
  assert.equal(recipe.currentVersion?.ingredients.every((ingredient) => ingredient.product.isRecipeIngredient), true);
  assert.equal(recipe.currentVersion?.ingredients.every((ingredient) => ingredient.product.isSellable === false), true);

  const corn = await prisma.product.findFirstOrThrow({
    where: { organizationId, sku: "MAIZ-BLANCO-KG" },
  });
  const conversions = await prisma.unitConversion.findMany({
    where: { organizationId, productId: corn.id, status: "active" },
  });
  assert.equal(conversions.some((conversion) => conversion.fromUnit === "costal" && conversion.factor.toString() === "50"), true);
  assert.equal(conversions.some((conversion) => conversion.fromUnit === "cubeta" && conversion.factor.toString() === "25"), true);

  const stock = await prisma.inventoryStock.findUnique({
    where: { branchId_productId: { branchId, productId: corn.id } },
  });
  assert.ok(stock);
  assert.equal(Number(stock.quantity) >= 250, true);
});
