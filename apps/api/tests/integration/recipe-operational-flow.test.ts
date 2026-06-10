import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { DomainError } from "../../src/lib/domain-error.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import {
  createUnitConversion,
  deleteUnitConversion,
  listInventoryMovements,
  listUnitConversions,
  updateUnitConversion,
} from "../../src/services/inventory-service.js";
import {
  activateRecipeVersion,
  createRecipe,
  createRecipeVersion,
} from "../../src/services/recipe-service.js";
import {
  closeProductionRecipeBatch,
  createProductionBatchFromRecipe,
  updateProductionRecipeBatchActuals,
} from "../../src/services/production-recipe-service.js";

type LoginResult = Awaited<ReturnType<typeof login>>;

function asAuthenticatedUser(session: LoginResult): AuthenticatedUser {
  assert.ok(session.user.organizationId, "demo user must have an organization");
  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email,
  };
}

function firstBranchId(session: LoginResult): string {
  const branchId = session.user.branches[0]?.branchId;
  assert.ok(branchId, "demo user must have a branch assignment");
  return branchId;
}

async function ensureRecipePermissions(userId: string) {
  const roleIds = (await prisma.userRole.findMany({ where: { userId } })).map((userRole) => userRole.roleId);
  assert.notEqual(roleIds.length, 0, "test user must have a role");

  for (const [code, name] of [
    ["recipes.view", "Ver recetas"],
    ["recipes.manage", "Gestionar recetas"],
    ["production.authorize_variance", "Autorizar variacion alta de produccion"],
  ] as const) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });

    for (const roleId of roleIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: permission.id } },
        update: {},
        create: { roleId, permissionId: permission.id },
      });
    }
  }
}

async function createRecipeProduct(input: {
  organizationId: string;
  name: string;
  sku: string;
  productType: "masa" | "tortilla" | "raw_material" | "packaging";
  unit: "kg" | "package";
  isRecipeIngredient: boolean;
}) {
  return prisma.product.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      sku: input.sku,
      productType: input.productType,
      unit: input.unit,
      isSellable: input.productType === "masa" || input.productType === "tortilla",
      requiresProduction: input.productType === "masa" || input.productType === "tortilla",
      isStockTracked: true,
      isRecipeIngredient: input.isRecipeIngredient,
      allowNegativeStock: false,
      status: "active",
    },
  });
}

test("RecipeService rejects stockable products not marked as recipe ingredients", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  await ensureRecipePermissions(manager.id);

  const suffix = Date.now();
  const output = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Masa receta invalida ${suffix}`,
    sku: `REC-OUT-BLOCK-${suffix}`,
    productType: "masa",
    unit: "kg",
    isRecipeIngredient: false,
  });
  const stockableButNotIngredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Insumo no autorizado ${suffix}`,
    sku: `REC-NOT-ING-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: false,
  });

  await assert.rejects(
    () => createRecipe(manager, {
      branchId,
      name: `Receta bloqueada ${suffix}`,
      outputProductId: output.id,
      expectedOutputQuantity: "10.000",
      outputUnit: "kg",
      ingredients: [
        {
          productId: stockableButNotIngredient.id,
          quantity: "1.000",
          unit: "kg",
        },
      ],
    }),
    (error) =>
      error instanceof DomainError &&
      error.statusCode === 400 &&
      error.code === "INVALID_RECIPE_INGREDIENT" &&
      error.message === "Producto no permitido como ingrediente de receta.",
  );
});

test("RecipeService creates initial active version and activates only one current version", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  await ensureRecipePermissions(manager.id);

  const suffix = Date.now();
  const output = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Masa versionada ${suffix}`,
    sku: `REC-OUT-VERS-${suffix}`,
    productType: "masa",
    unit: "kg",
    isRecipeIngredient: false,
  });
  const ingredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Maiz ingrediente ${suffix}`,
    sku: `REC-ING-VERS-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: true,
  });

  const created = (await createRecipe(manager, {
    branchId,
    name: `Receta versionada ${suffix}`,
    outputProductId: output.id,
    expectedOutputQuantity: "10.000",
    outputUnit: "kg",
    ingredients: [
      {
        productId: ingredient.id,
        quantity: "4.000",
        unit: "kg",
      },
    ],
  })).data;

  assert.ok(created.currentVersion);
  assert.equal(created.currentVersion?.version, 1);
  assert.equal(created.currentVersion?.status, "active");
  assert.equal(created.currentVersionId, created.currentVersion?.id);

  const secondVersion = (await createRecipeVersion(manager, created.id, {
    expectedOutputQuantity: "12.000",
    outputUnit: "kg",
    ingredients: [
      {
        productId: ingredient.id,
        quantity: "5.000",
        unit: "kg",
      },
    ],
  })).data;

  assert.equal(secondVersion.version, 2);
  assert.equal(secondVersion.status, "inactive");

  const activated = (await activateRecipeVersion(manager, secondVersion.id)).data;
  assert.equal(activated.status, "active");

  const persisted = await prisma.recipe.findUniqueOrThrow({
    where: { id: created.id },
    include: { versions: true },
  });
  assert.equal(persisted.currentVersionId, secondVersion.id);
  assert.equal(persisted.versions.filter((version) => version.status === "active").length, 1);
  assert.equal(persisted.versions.find((version) => version.status === "active")?.id, secondVersion.id);
});

test("UnitConversion endpoints support recipe alternative units", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  await ensureRecipePermissions(manager.id);

  const suffix = Date.now();
  const output = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Masa conversion ${suffix}`,
    sku: `REC-OUT-CONV-${suffix}`,
    productType: "masa",
    unit: "kg",
    isRecipeIngredient: false,
  });
  const ingredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Maiz cubeta ${suffix}`,
    sku: `REC-ING-CONV-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: true,
  });

  const conversion = (await createUnitConversion(manager, ingredient.id, {
    fromUnit: "package",
    toUnit: "kg",
    factor: "25.000000",
    name: `Costal ${suffix}`,
  })).data;
  assert.equal(conversion.factor, "25.000000");

  const listed = (await listUnitConversions(manager, ingredient.id)).data;
  assert.equal(listed.some((item) => item.id === conversion.id), true);

  const updated = (await updateUnitConversion(manager, conversion.id, {
    factor: "24.500000",
  })).data;
  assert.equal(updated.factor, "24.500000");

  const recipe = (await createRecipe(manager, {
    branchId,
    name: `Receta conversion ${suffix}`,
    outputProductId: output.id,
    expectedOutputQuantity: "10.000",
    outputUnit: "kg",
    ingredients: [
      {
        productId: ingredient.id,
        quantity: "2.000",
        unit: "package",
      },
    ],
  })).data;
  assert.equal(recipe.currentVersion?.ingredients[0]?.quantity, "49.000");
  assert.equal(recipe.currentVersion?.ingredients[0]?.unit, "kg");

  const deleted = (await deleteUnitConversion(manager, conversion.id)).data;
  assert.equal(deleted.status, "deleted");
});

test("UnitConversion rejects conversions that do not target product base unit", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const suffix = Date.now();
  const ingredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Maiz conversion invalida ${suffix}`,
    sku: `REC-ING-BAD-CONV-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: true,
  });

  await assert.rejects(
    () => createUnitConversion(manager, ingredient.id, {
      fromUnit: "package",
      toUnit: "piece",
      factor: "25.000000",
      name: `Costal mala ${suffix}`,
    }),
    (error) => error instanceof DomainError && error.code === "INVALID_UNIT_CONVERSION",
  );
});

test("ProductionRecipeService creates snapshot, captures actuals and closes with stock movements", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  await ensureRecipePermissions(manager.id);

  const suffix = Date.now();
  const output = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Masa produccion receta ${suffix}`,
    sku: `REC-OUT-PROD-${suffix}`,
    productType: "masa",
    unit: "kg",
    isRecipeIngredient: false,
  });
  const ingredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Maiz produccion receta ${suffix}`,
    sku: `REC-ING-PROD-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: true,
  });
  await prisma.inventoryStock.createMany({
    data: [
      {
        organizationId: manager.organizationId,
        branchId,
        productId: ingredient.id,
        quantity: "20.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
      {
        organizationId: manager.organizationId,
        branchId,
        productId: output.id,
        quantity: "0.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
    ],
  });

  const recipe = (await createRecipe(manager, {
    branchId,
    name: `Receta produccion ${suffix}`,
    outputProductId: output.id,
    expectedOutputQuantity: "10.000",
    outputUnit: "kg",
    ingredients: [
      {
        productId: ingredient.id,
        quantity: "4.000",
        unit: "kg",
      },
    ],
  })).data;

  const batch = (await createProductionBatchFromRecipe(manager, {
    branchId,
    productionDate: "2026-06-09",
    recipeVersionId: recipe.currentVersionId,
    expectedOutputQuantity: "15.000",
  })).data;

  assert.equal(batch.productionMode, "recipe_based");
  assert.equal(batch.expectedOutputQuantity, "15.000");
  assert.equal(batch.ingredients[0]?.expectedQuantity, "6.000");
  assert.equal(batch.ingredients[0]?.actualQuantity, "6.000");

  const captured = (await updateProductionRecipeBatchActuals(manager, batch.id, {
    actualOutputQuantity: "14.000",
    varianceReason: "Prueba integracion",
    ingredients: [
      {
        productId: ingredient.id,
        actualQuantity: "5.500",
      },
    ],
  })).data;
  assert.equal(captured.actualOutputQuantity, "14.000");
  assert.equal(captured.yieldPercentage, "93.33");
  assert.equal(captured.ingredients[0]?.actualQuantity, "5.500");

  const closed = (await closeProductionRecipeBatch(manager, batch.id)).data;
  assert.equal(closed.batch.status, "closed");
  assert.equal(closed.movements.some((movement) => movement.movementType === "production_input_out"), true);
  assert.equal(closed.movements.some((movement) => movement.movementType === "production_in"), true);

  const ingredientStock = await prisma.inventoryStock.findUniqueOrThrow({
    where: { branchId_productId: { branchId, productId: ingredient.id } },
  });
  const outputStock = await prisma.inventoryStock.findUniqueOrThrow({
    where: { branchId_productId: { branchId, productId: output.id } },
  });
  assert.equal(Number(ingredientStock.quantity).toFixed(3), "14.500");
  assert.equal(Number(outputStock.quantity).toFixed(3), "14.000");

  const movements = (await listInventoryMovements(manager, {
    branchId,
    referenceType: "production_batch",
    referenceId: batch.id,
  })).data;
  assert.equal(movements.length, 2);
  assert.equal(movements.some((movement) => movement.movementType === "production_input_out"), true);
  assert.equal(movements.some((movement) => movement.movementType === "production_in"), true);

  await assert.rejects(
    () => closeProductionRecipeBatch(manager, batch.id),
    (error) => error instanceof DomainError && error.code === "CANNOT_EDIT_CLOSED_BATCH",
  );
});

test("ProductionRecipeService enforces variance reason and high variance authorization", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  await ensureRecipePermissions(manager.id);

  const suffix = Date.now();
  const output = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Masa variacion receta ${suffix}`,
    sku: `REC-OUT-VAR-${suffix}`,
    productType: "masa",
    unit: "kg",
    isRecipeIngredient: false,
  });
  const ingredient = await createRecipeProduct({
    organizationId: manager.organizationId,
    name: `Maiz variacion receta ${suffix}`,
    sku: `REC-ING-VAR-${suffix}`,
    productType: "raw_material",
    unit: "kg",
    isRecipeIngredient: true,
  });
  await prisma.inventoryStock.createMany({
    data: [
      {
        organizationId: manager.organizationId,
        branchId,
        productId: ingredient.id,
        quantity: "20.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
      {
        organizationId: manager.organizationId,
        branchId,
        productId: output.id,
        quantity: "0.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
    ],
  });

  const recipe = (await createRecipe(manager, {
    branchId,
    name: `Receta variacion ${suffix}`,
    outputProductId: output.id,
    expectedOutputQuantity: "10.000",
    outputUnit: "kg",
    ingredients: [
      {
        productId: ingredient.id,
        quantity: "4.000",
        unit: "kg",
      },
    ],
  })).data;

  const batch = (await createProductionBatchFromRecipe(manager, {
    branchId,
    productionDate: "2026-06-09",
    recipeVersionId: recipe.currentVersionId,
    expectedOutputQuantity: "10.000",
  })).data;

  await assert.rejects(
    () => closeProductionRecipeBatch(manager, batch.id, {
      actualOutputQuantity: "9.500",
    }),
    (error) => error instanceof DomainError && error.code === "PRODUCTION_VARIANCE_REASON_REQUIRED",
  );

  await assert.rejects(
    () => closeProductionRecipeBatch(manager, batch.id, {
      actualOutputQuantity: "8.500",
      varianceReason: "Maiz con menor humedad",
    }),
    (error) => error instanceof DomainError && error.code === "PRODUCTION_VARIANCE_AUTHORIZATION_REQUIRED",
  );

  const closed = (await closeProductionRecipeBatch(manager, batch.id, {
    actualOutputQuantity: "8.500",
    varianceReason: "Maiz con menor humedad",
    authorizedByUserId: manager.id,
  })).data;

  assert.equal(closed.batch.status, "closed");
  assert.equal(closed.batch.yieldPercentage, "85.00");
  assert.equal(closed.movements.every((movement) => movement.authorizedByUserId === manager.id), true);
});
