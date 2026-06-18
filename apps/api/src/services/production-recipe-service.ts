import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { applyInventoryMovement } from "./inventory-ledger-service.js";
import { assertOrganizationOperational } from "./operational-access-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

type DbClient = Prisma.TransactionClient;

type ActualIngredientInput = {
  productionBatchIngredientId: string | null;
  productId: string | null;
  actualQuantity: string;
};

export function calculateScaledQuantity(quantity: string | number | Prisma.Decimal, scale: string | number | Prisma.Decimal) {
  return (Number(quantity) * Number(scale)).toFixed(3);
}

export function calculateYieldPercentage(actualOutput: string | number | Prisma.Decimal, expectedOutput: string | number | Prisma.Decimal) {
  const expected = Number(expectedOutput);
  if (!Number.isFinite(expected) || expected <= 0) {
    throw new DomainError(400, "INVALID_EXPECTED_OUTPUT", "Salida esperada invalida.");
  }
  return ((Number(actualOutput) / expected) * 100).toFixed(2);
}

export function calculateOutputVariancePercentage(actualOutput: string | number | Prisma.Decimal, expectedOutput: string | number | Prisma.Decimal) {
  const actual = Number(actualOutput);
  const expected = Number(expectedOutput);
  if (!Number.isFinite(actual) || actual <= 0 || !Number.isFinite(expected) || expected <= 0) {
    throw new DomainError(400, "INVALID_EXPECTED_OUTPUT", "Salida esperada invalida.");
  }
  return (Math.abs(actual - expected) / expected) * 100;
}

export async function createProductionBatchFromRecipe(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const recipeVersionId = asString(body.recipeVersionId, "recipeVersionId");
  const productionDate = asDateOnly(body.productionDate);
  const requestedOutputQuantity = optionalQuantity(body.expectedOutputQuantity, "expectedOutputQuantity");

  await assertBranchAccess(currentUser, branchId);
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede registrar produccion.");

  return prisma.$transaction(async (tx) => {
    const recipeVersion = await getRecipeVersionForProduction(tx, currentUser.organizationId, recipeVersionId, branchId);
    const expectedOutputQuantity = requestedOutputQuantity ?? normalizeQuantity(recipeVersion.expectedOutputQuantity);
    const scale = Number(expectedOutputQuantity) / Number(recipeVersion.expectedOutputQuantity);
    if (!Number.isFinite(scale) || scale <= 0) {
      throw new DomainError(400, "INVALID_EXPECTED_OUTPUT", "Salida esperada invalida.");
    }

    const batch = await tx.productionBatch.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        productionDate,
        createdByUserId: currentUser.id,
        recipeVersionId: recipeVersion.id,
        productionMode: "recipe_based",
        outputProductId: recipeVersion.recipe.outputProductId,
        expectedOutputQuantity,
        actualOutputQuantity: expectedOutputQuantity,
        outputUnit: recipeVersion.outputUnit,
        yieldPercentage: "100.00",
        productionBatchIngredientProductionBatch: {
          create: recipeVersion.ingredients.map((ingredient) => {
            const expectedQuantity = calculateScaledQuantity(ingredient.quantity, scale);
            return {
              productId: ingredient.productId,
              expectedQuantity,
              actualQuantity: expectedQuantity,
              unit: ingredient.unit,
            };
          }),
        },
      },
      include: productionBatchInclude,
    });

    await audit(tx, currentUser, branchId, "production_recipe_batch_created", "production_batch", batch.id, serializeProductionRecipeBatch(batch));

    return { data: serializeProductionRecipeBatch(batch) };
  });
}

export async function updateProductionRecipeBatchActuals(
  currentUser: AuthenticatedUser,
  productionBatchId: string,
  input: unknown,
) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");
  const body = asRecord(input);

  const batch = await getOpenRecipeBatch(currentUser, productionBatchId);
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede registrar produccion.");

  return prisma.$transaction(async (tx) => {
    await applyActualCapture(tx, batch.id, body);
    const updated = await getProductionRecipeBatchOrThrow(tx, currentUser.organizationId, batch.id);
    await audit(tx, currentUser, updated.branchId, "production_recipe_batch_actuals_updated", "production_batch", updated.id, serializeProductionRecipeBatch(updated));
    return { data: serializeProductionRecipeBatch(updated) };
  });
}

export async function getProductionRecipeBatch(currentUser: AuthenticatedUser, productionBatchId: string) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");
  const batch = await prisma.productionBatch.findFirst({
    where: {
      id: productionBatchId,
      organizationId: currentUser.organizationId,
      productionMode: "recipe_based",
    },
    include: productionBatchInclude,
  });

  if (!batch) {
    throw new DomainError(404, "PRODUCTION_BATCH_NOT_FOUND", "Produccion no encontrada.");
  }

  await assertBranchAccess(currentUser, batch.branchId);
  return { data: serializeProductionRecipeBatch(batch) };
}

export async function closeProductionRecipeBatch(
  currentUser: AuthenticatedUser,
  productionBatchId: string,
  input: unknown = {},
) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");
  const body = asLooseRecord(input);

  const batch = await getOpenRecipeBatch(currentUser, productionBatchId);
  await assertOrganizationOperational(currentUser.organizationId, "La organizacion no puede registrar produccion.");

  return prisma.$transaction(async (tx) => {
    if (Object.keys(body).length > 0) {
      await applyActualCapture(tx, batch.id, body);
    }
    const current = await getProductionRecipeBatchOrThrow(tx, currentUser.organizationId, batch.id);

    if (!current.outputProductId || !current.actualOutputQuantity || !current.outputUnit || !current.expectedOutputQuantity) {
      throw new DomainError(400, "INVALID_RECIPE_BATCH", "Lote por receta incompleto.");
    }
    if (current.productionBatchIngredientProductionBatch.length === 0) {
      throw new DomainError(400, "RECIPE_BATCH_WITHOUT_INGREDIENTS", "Lote sin insumos.");
    }

    const authorizedByUserId = await resolveVarianceAuthorization(currentUser, current, body.authorizedByUserId);

    const movements = [];
    for (const ingredient of current.productionBatchIngredientProductionBatch) {
      const movement = await applyInventoryMovement(tx, {
        organizationId: currentUser.organizationId,
        branchId: current.branchId,
        productId: ingredient.productId,
        movementType: "production_input_out",
        quantity: normalizeQuantity(ingredient.actualQuantity),
        reason: "Consumo de insumo por produccion",
        referenceType: "production_batch",
        referenceId: current.id,
        createdByUserId: currentUser.id,
        authorizedByUserId,
        insufficientStockCode: "INSUFFICIENT_RECIPE_INGREDIENT_STOCK",
        insufficientStockMessage: "Stock insuficiente para insumo de receta.",
      });
      movements.push(movement);
      await tx.productionBatchIngredient.update({
        where: { id: ingredient.id },
        data: { inventoryMovementId: movement.id },
      });
    }

    const outputMovement = await applyInventoryMovement(tx, {
      organizationId: currentUser.organizationId,
      branchId: current.branchId,
      productId: current.outputProductId,
      movementType: "production_in",
      quantity: normalizeQuantity(current.actualOutputQuantity),
      reason: "Produccion por receta",
      referenceType: "production_batch",
      referenceId: current.id,
      createdByUserId: currentUser.id,
      authorizedByUserId,
    });
    movements.push(outputMovement);

    const closed = await tx.productionBatch.update({
      where: { id: current.id },
      data: {
        status: "closed",
        closedByUserId: currentUser.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      },
      include: productionBatchInclude,
    });

    await audit(tx, currentUser, current.branchId, "production_recipe_batch_closed", "production_batch", current.id, {
      batch: serializeProductionRecipeBatch(closed),
      variance: {
        variancePercentage: calculateOutputVariancePercentage(current.actualOutputQuantity, current.expectedOutputQuantity).toFixed(2),
        authorizedByUserId,
      },
      movements: movements.map(serializeInventoryMovement),
    });

    return {
      data: {
        batch: serializeProductionRecipeBatch(closed),
        movements: movements.map(serializeInventoryMovement),
      },
    };
  });
}

const productionBatchInclude = {
  outputProduct: true,
  recipeVersion: {
    include: {
      recipe: true,
    },
  },
  productionBatchIngredientProductionBatch: {
    include: { product: true, inventoryMovement: true },
    orderBy: { createdAt: "asc" as const },
  },
};

async function getRecipeVersionForProduction(
  tx: DbClient,
  organizationId: string,
  recipeVersionId: string,
  branchId: string,
) {
  const recipeVersion = await tx.recipeVersion.findFirst({
    where: {
      id: recipeVersionId,
      status: "active",
      recipe: {
        organizationId,
        status: "active",
        OR: [{ branchId }, { branchId: null }],
      },
    },
    include: {
      recipe: true,
      ingredients: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!recipeVersion) {
    throw new DomainError(404, "RECIPE_VERSION_NOT_FOUND", "Version de receta no encontrada.");
  }
  if (recipeVersion.ingredients.length === 0) {
    throw new DomainError(400, "RECIPE_WITHOUT_INGREDIENTS", "La receta requiere al menos un ingrediente.");
  }
  for (const ingredient of recipeVersion.ingredients) {
    if (!ingredient.product.isStockTracked || !ingredient.product.isRecipeIngredient || ingredient.product.status !== "active") {
      throw new DomainError(400, "INVALID_RECIPE_INGREDIENT", "Producto no permitido como ingrediente de receta.");
    }
  }

  return recipeVersion;
}

async function getOpenRecipeBatch(currentUser: AuthenticatedUser, productionBatchId: string) {
  const batch = await prisma.productionBatch.findFirst({
    where: {
      id: productionBatchId,
      organizationId: currentUser.organizationId,
      productionMode: "recipe_based",
    },
    include: productionBatchInclude,
  });
  if (!batch) {
    throw new DomainError(404, "PRODUCTION_BATCH_NOT_FOUND", "Produccion no encontrada.");
  }
  await assertBranchAccess(currentUser, batch.branchId);
  if (batch.status !== "open") {
    throw new DomainError(409, "CANNOT_EDIT_CLOSED_BATCH", "La produccion cerrada no se edita.");
  }
  return batch;
}

async function getProductionRecipeBatchOrThrow(tx: DbClient, organizationId: string, productionBatchId: string) {
  const batch = await tx.productionBatch.findFirst({
    where: {
      id: productionBatchId,
      organizationId,
      productionMode: "recipe_based",
    },
    include: productionBatchInclude,
  });
  if (!batch) {
    throw new DomainError(404, "PRODUCTION_BATCH_NOT_FOUND", "Produccion no encontrada.");
  }
  return batch;
}

async function resolveVarianceAuthorization(
  currentUser: AuthenticatedUser,
  batch: {
    actualOutputQuantity: Prisma.Decimal | null;
    expectedOutputQuantity: Prisma.Decimal | null;
    varianceReason: string | null;
  },
  rawAuthorizedByUserId: unknown,
) {
  if (!batch.actualOutputQuantity || !batch.expectedOutputQuantity) {
    throw new DomainError(400, "INVALID_RECIPE_BATCH", "Lote por receta incompleto.");
  }

  const variancePercentage = calculateOutputVariancePercentage(batch.actualOutputQuantity, batch.expectedOutputQuantity);
  if (variancePercentage < 3) {
    return null;
  }

  if (!batch.varianceReason || batch.varianceReason.trim() === "") {
    throw new DomainError(400, "PRODUCTION_VARIANCE_REASON_REQUIRED", "Motivo requerido por variacion de produccion.");
  }

  if (variancePercentage <= 10) {
    return null;
  }

  const authorizedByUserId = optionalString(rawAuthorizedByUserId);
  if (!authorizedByUserId) {
    throw new DomainError(400, "PRODUCTION_VARIANCE_AUTHORIZATION_REQUIRED", "Autorizacion requerida por variacion alta de produccion.");
  }

  const authorizedUser = await prisma.user.findFirst({
    where: {
      id: authorizedByUserId,
      organizationId: currentUser.organizationId,
      status: "active",
    },
  });
  if (!authorizedUser) {
    throw new DomainError(400, "INVALID_VARIANCE_AUTHORIZER", "Usuario autorizador invalido.");
  }

  await assertPermission(authorizedByUserId, "production.authorize_variance");
  return authorizedByUserId;
}

async function applyActualCapture(tx: DbClient, productionBatchId: string, body: Record<string, unknown>) {
  const data: Prisma.ProductionBatchUpdateInput = {};
  const actualOutputQuantity = optionalQuantity(body.actualOutputQuantity, "actualOutputQuantity");
  const expectedOutputQuantity = optionalQuantity(body.expectedOutputQuantity, "expectedOutputQuantity");
  if (actualOutputQuantity) data.actualOutputQuantity = actualOutputQuantity;
  if (expectedOutputQuantity) data.expectedOutputQuantity = expectedOutputQuantity;
  if (body.varianceReason !== undefined) data.varianceReason = optionalString(body.varianceReason);

  const current = await tx.productionBatch.findUniqueOrThrow({ where: { id: productionBatchId } });
  const nextActualOutput = actualOutputQuantity ?? (current.actualOutputQuantity ? normalizeQuantity(current.actualOutputQuantity) : null);
  const nextExpectedOutput = expectedOutputQuantity ?? (current.expectedOutputQuantity ? normalizeQuantity(current.expectedOutputQuantity) : null);
  if (nextActualOutput && nextExpectedOutput) {
    data.yieldPercentage = calculateYieldPercentage(nextActualOutput, nextExpectedOutput);
  }
  if (Object.keys(data).length > 0) {
    data.updatedAt = new Date();
    await tx.productionBatch.update({ where: { id: productionBatchId }, data });
  }

  const ingredients = parseActualIngredients(body.ingredients);
  for (const ingredient of ingredients) {
    const where: Prisma.ProductionBatchIngredientWhereInput = {
      productionBatchId,
      ...(ingredient.productionBatchIngredientId ? { id: ingredient.productionBatchIngredientId } : {}),
      ...(ingredient.productId ? { productId: ingredient.productId } : {}),
    };
    const updated = await tx.productionBatchIngredient.updateMany({
      where,
      data: { actualQuantity: ingredient.actualQuantity },
    });
    if (updated.count !== 1) {
      throw new DomainError(404, "PRODUCTION_BATCH_INGREDIENT_NOT_FOUND", "Insumo de lote no encontrado.");
    }
  }
}

function parseActualIngredients(value: unknown): ActualIngredientInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new DomainError(400, "INVALID_REQUEST", "Campo invalido: ingredients.");
  }
  return value.map((item) => {
    const body = asRecord(item);
    const productionBatchIngredientId = optionalString(body.productionBatchIngredientId);
    const productId = optionalString(body.productId);
    if (!productionBatchIngredientId && !productId) {
      throw new DomainError(400, "INVALID_REQUEST", "Insumo requiere productionBatchIngredientId o productId.");
    }
    return {
      productionBatchIngredientId,
      productId,
      actualQuantity: asQuantity(body.actualQuantity, "ingredients.actualQuantity"),
    };
  });
}

async function audit(
  tx: DbClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterSnapshot: unknown,
) {
  await tx.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType,
      entityId,
      afterSnapshot: afterSnapshot as Prisma.InputJsonValue,
    },
  });
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }
  return input as Record<string, unknown>;
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function asDateOnly(value: unknown) {
  const raw = asString(value, "productionDate");
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida.");
  }
  return date;
}

function asQuantity(value: unknown, field: string) {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Cantidad invalida: ${field}.`);
  }
  return quantity.toFixed(3);
}

function optionalQuantity(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  return asQuantity(value, field);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

function serializeProductionRecipeBatch(batch: {
  id: string;
  organizationId: string;
  branchId: string;
  productionDate: Date;
  status: string;
  recipeVersionId: string | null;
  productionMode: string;
  outputProductId: string | null;
  expectedOutputQuantity: Prisma.Decimal | null;
  actualOutputQuantity: Prisma.Decimal | null;
  outputUnit: string | null;
  yieldPercentage: Prisma.Decimal | null;
  varianceReason: string | null;
  createdByUserId: string;
  closedByUserId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  outputProduct?: { id: string; name: string; sku: string | null; productType: string; unit: string } | null;
  productionBatchIngredientProductionBatch?: Array<{
    id: string;
    productId: string;
    expectedQuantity: Prisma.Decimal;
    actualQuantity: Prisma.Decimal;
    unit: string;
    inventoryMovementId: string | null;
    product?: { id: string; name: string; sku: string | null; productType: string; unit: string } | null;
  }>;
}) {
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    branchId: batch.branchId,
    productionDate: batch.productionDate,
    status: batch.status,
    recipeVersionId: batch.recipeVersionId,
    productionMode: batch.productionMode,
    outputProductId: batch.outputProductId,
    outputProduct: batch.outputProduct ? serializeProductRef(batch.outputProduct) : null,
    expectedOutputQuantity: batch.expectedOutputQuantity ? normalizeQuantity(batch.expectedOutputQuantity) : null,
    actualOutputQuantity: batch.actualOutputQuantity ? normalizeQuantity(batch.actualOutputQuantity) : null,
    outputUnit: batch.outputUnit,
    yieldPercentage: batch.yieldPercentage ? Number(batch.yieldPercentage).toFixed(2) : null,
    varianceReason: batch.varianceReason,
    createdByUserId: batch.createdByUserId,
    closedByUserId: batch.closedByUserId,
    closedAt: batch.closedAt,
    createdAt: batch.createdAt,
    ingredients:
      batch.productionBatchIngredientProductionBatch?.map((ingredient) => ({
        id: ingredient.id,
        productId: ingredient.productId,
        product: ingredient.product ? serializeProductRef(ingredient.product) : null,
        expectedQuantity: normalizeQuantity(ingredient.expectedQuantity),
        actualQuantity: normalizeQuantity(ingredient.actualQuantity),
        unit: ingredient.unit,
        inventoryMovementId: ingredient.inventoryMovementId,
      })) ?? [],
  };
}

function serializeProductRef(product: { id: string; name: string; sku: string | null; productType: string; unit: string }) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    productType: product.productType,
    unit: product.unit,
  };
}

function serializeInventoryMovement(movement: {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  movementType: string;
  quantity: Prisma.Decimal;
  unit: string;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdByUserId: string;
  authorizedByUserId: string | null;
  createdAt: Date;
}) {
  return {
    id: movement.id,
    organizationId: movement.organizationId,
    branchId: movement.branchId,
    productId: movement.productId,
    movementType: movement.movementType,
    quantity: normalizeQuantity(movement.quantity),
    unit: movement.unit,
    reason: movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdByUserId: movement.createdByUserId,
    authorizedByUserId: movement.authorizedByUserId,
    createdAt: movement.createdAt,
  };
}
