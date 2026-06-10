import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

const productUnits = ["kg", "piece", "package", "liter", "service"] as const;
const genericStatuses = ["active", "inactive", "deleted"] as const;

type RecipeIngredientInput = {
  productId: string;
  quantity: string;
  unit: (typeof productUnits)[number];
  isOptional: boolean;
  wasteFactor: string | null;
};

export function validateRecipeIngredientShape(input: unknown): RecipeIngredientInput[] {
  return parseIngredients(input);
}

export function validateRecipeIngredientSet(outputProductId: string, ingredients: Pick<RecipeIngredientInput, "productId">[]) {
  if (ingredients.length === 0) {
    throw new DomainError(400, "RECIPE_WITHOUT_INGREDIENTS", "La receta requiere al menos un ingrediente.");
  }

  const seen = new Set<string>();
  for (const ingredient of ingredients) {
    if (seen.has(ingredient.productId)) {
      throw new DomainError(400, "DUPLICATE_RECIPE_INGREDIENT", "Ingrediente duplicado.");
    }
    seen.add(ingredient.productId);
    if (ingredient.productId === outputProductId) {
      throw new DomainError(400, "RECIPE_OUTPUT_CANNOT_BE_INGREDIENT", "La salida no puede ser ingrediente.");
    }
  }
}

export function assertRecipeIngredientAllowed(product: { isRecipeIngredient: boolean }) {
  if (!product.isRecipeIngredient) {
    throw new DomainError(400, "INVALID_RECIPE_INGREDIENT", "Producto no permitido como ingrediente de receta.");
  }
}

export function applyRecipeUnitConversion(quantity: string, factor: string | number | Prisma.Decimal) {
  const numericQuantity = Number(quantity);
  const numericFactor = Number(factor);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || !Number.isFinite(numericFactor) || numericFactor <= 0) {
    throw new DomainError(400, "INVALID_UNIT_CONVERSION", "Conversion de unidad invalida.");
  }
  return (numericQuantity * numericFactor).toFixed(3);
}

export async function listRecipes(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  const status = optionalEnum(query.status, "status", genericStatuses) ?? "active";

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const recipes = await prisma.recipe.findMany({
    where: {
      organizationId: currentUser.organizationId,
      status,
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
    },
    include: {
      branch: true,
      outputProduct: true,
      currentVersion: {
        include: {
          ingredients: {
            include: { product: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      versions: {
        orderBy: { version: "desc" },
      },
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });

  return { data: recipes.map(serializeRecipeSummary) };
}

export async function getRecipe(currentUser: AuthenticatedUser, recipeId: string) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.view");

  const recipe = await getRecipePayload(currentUser.organizationId, recipeId);
  if (recipe.branchId) {
    await assertBranchAccess(currentUser, recipe.branchId);
  }

  return { data: serializeRecipeDetail(recipe) };
}

export async function createRecipe(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.manage");
  const body = asRecord(input);
  const name = asString(body.name, "name");
  const branchId = optionalString(body.branchId);
  const outputProductId = asString(body.outputProductId, "outputProductId");
  const expectedOutputQuantity = asQuantity(body.expectedOutputQuantity, "expectedOutputQuantity");
  const outputUnit = asEnum(body.outputUnit, "outputUnit", productUnits);
  const ingredients = parseIngredients(body.ingredients);

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  return prisma.$transaction(async (tx) => {
    const normalized = await normalizeRecipeVersionInput(
      tx,
      currentUser.organizationId,
      outputProductId,
      expectedOutputQuantity,
      outputUnit,
      ingredients,
    );

    const recipe = await tx.recipe.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        name,
        outputProductId,
        status: "active",
      },
    });

    const version = await tx.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        version: 1,
        expectedOutputQuantity: normalized.expectedOutputQuantity,
        outputUnit: normalized.outputUnit,
        notes: optionalString(body.notes),
        status: "active",
        ingredients: {
          create: normalized.ingredients.map((ingredient) => ({
            productId: ingredient.productId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            isOptional: ingredient.isOptional,
            wasteFactor: ingredient.wasteFactor,
          })),
        },
      },
    });

    await tx.recipe.update({
      where: { id: recipe.id },
      data: { currentVersionId: version.id, updatedAt: new Date() },
    });

    await audit(tx, currentUser, branchId, "recipe_created", "recipe", recipe.id, {
      recipeId: recipe.id,
      versionId: version.id,
    });

    return { data: serializeRecipeDetail(await getRecipePayload(currentUser.organizationId, recipe.id, tx)) };
  });
}

export async function updateRecipe(currentUser: AuthenticatedUser, recipeId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.manage");
  const body = asRecord(input);
  const existing = await getRecipeOrThrow(currentUser.organizationId, recipeId);
  if (existing.branchId) {
    await assertBranchAccess(currentUser, existing.branchId);
  }

  const nextBranchId = body.branchId === undefined ? existing.branchId : optionalString(body.branchId);
  if (nextBranchId) {
    await assertBranchAccess(currentUser, nextBranchId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.recipe.update({
      where: { id: recipeId },
      data: {
        name: optionalString(body.name) ?? existing.name,
        branchId: nextBranchId,
        status: optionalEnum(body.status, "status", genericStatuses) ?? existing.status,
        updatedAt: new Date(),
      },
    });

    await audit(tx, currentUser, updated.branchId, "recipe_updated", "recipe", updated.id, {
      before: serializeRecipeHeader(existing),
      after: serializeRecipeHeader(updated),
    });

    return { data: serializeRecipeDetail(await getRecipePayload(currentUser.organizationId, recipeId, tx)) };
  });
}

export async function createRecipeVersion(currentUser: AuthenticatedUser, recipeId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.manage");
  const body = asRecord(input);
  const recipe = await getRecipeOrThrow(currentUser.organizationId, recipeId);
  if (recipe.branchId) {
    await assertBranchAccess(currentUser, recipe.branchId);
  }
  const expectedOutputQuantity = asQuantity(body.expectedOutputQuantity, "expectedOutputQuantity");
  const outputUnit = asEnum(body.outputUnit, "outputUnit", productUnits);
  const ingredients = parseIngredients(body.ingredients);

  return prisma.$transaction(async (tx) => {
    const normalized = await normalizeRecipeVersionInput(
      tx,
      currentUser.organizationId,
      recipe.outputProductId,
      expectedOutputQuantity,
      outputUnit,
      ingredients,
    );
    const latest = await tx.recipeVersion.aggregate({
      where: { recipeId },
      _max: { version: true },
    });
    const versionNumber = (latest._max.version ?? 0) + 1;
    const version = await tx.recipeVersion.create({
      data: {
        recipeId,
        version: versionNumber,
        expectedOutputQuantity: normalized.expectedOutputQuantity,
        outputUnit: normalized.outputUnit,
        notes: optionalString(body.notes),
        status: "inactive",
        ingredients: {
          create: normalized.ingredients.map((ingredient) => ({
            productId: ingredient.productId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            isOptional: ingredient.isOptional,
            wasteFactor: ingredient.wasteFactor,
          })),
        },
      },
      include: {
        ingredients: {
          include: { product: true },
        },
      },
    });

    await audit(tx, currentUser, recipe.branchId, "recipe_version_created", "recipe_version", version.id, serializeRecipeVersion(version));

    return { data: serializeRecipeVersion(version) };
  });
}

export async function activateRecipeVersion(currentUser: AuthenticatedUser, recipeVersionId: string) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.manage");

  return prisma.$transaction(async (tx) => {
    const version = await getRecipeVersionOrThrow(tx, currentUser.organizationId, recipeVersionId);
    if (version.recipe.branchId) {
      await assertBranchAccess(currentUser, version.recipe.branchId);
    }
    if (version.ingredients.length === 0) {
      throw new DomainError(400, "RECIPE_WITHOUT_INGREDIENTS", "La version requiere ingredientes.");
    }

    await tx.recipeVersion.updateMany({
      where: { recipeId: version.recipeId },
      data: { status: "inactive", updatedAt: new Date() },
    });
    const active = await tx.recipeVersion.update({
      where: { id: recipeVersionId },
      data: { status: "active", updatedAt: new Date() },
      include: { ingredients: { include: { product: true } } },
    });
    await tx.recipe.update({
      where: { id: version.recipeId },
      data: { currentVersionId: version.id, updatedAt: new Date() },
    });

    await audit(tx, currentUser, version.recipe.branchId, "recipe_version_activated", "recipe_version", version.id, serializeRecipeVersion(active));
    return { data: serializeRecipeVersion(active) };
  });
}

export async function archiveRecipeVersion(currentUser: AuthenticatedUser, recipeVersionId: string) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "recipes.manage");

  return prisma.$transaction(async (tx) => {
    const version = await getRecipeVersionOrThrow(tx, currentUser.organizationId, recipeVersionId);
    if (version.recipe.branchId) {
      await assertBranchAccess(currentUser, version.recipe.branchId);
    }
    if (version.recipe.currentVersionId === version.id) {
      throw new DomainError(409, "CANNOT_ARCHIVE_ACTIVE_RECIPE_VERSION", "No se puede archivar la version activa.");
    }
    const archived = await tx.recipeVersion.update({
      where: { id: version.id },
      data: { status: "inactive", updatedAt: new Date() },
      include: { ingredients: { include: { product: true } } },
    });
    await audit(tx, currentUser, version.recipe.branchId, "recipe_version_archived", "recipe_version", version.id, serializeRecipeVersion(archived));
    return { data: serializeRecipeVersion(archived) };
  });
}

async function normalizeRecipeVersionInput(
  tx: Prisma.TransactionClient,
  organizationId: string,
  outputProductId: string,
  expectedOutputQuantity: string,
  outputUnit: (typeof productUnits)[number],
  ingredients: RecipeIngredientInput[],
) {
  const outputProduct = await tx.product.findFirst({
    where: { id: outputProductId, organizationId, status: "active" },
  });
  if (!outputProduct) {
    throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto de salida no encontrado.");
  }
  if (!["masa", "tortilla"].includes(outputProduct.productType)) {
    throw new DomainError(400, "INVALID_RECIPE_OUTPUT_PRODUCT", "La salida de receta debe ser masa o tortilla.");
  }
  if (!outputProduct.isStockTracked) {
    throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Producto de salida sin control de inventario.");
  }

  validateRecipeIngredientSet(outputProductId, ingredients);
  const normalizedOutput = await normalizeProductQuantity(
    tx,
    organizationId,
    outputProduct.id,
    expectedOutputQuantity,
    outputUnit,
    outputProduct.unit,
    "INVALID_RECIPE_OUTPUT_UNIT",
  );

  const ingredientProducts = await tx.product.findMany({
    where: {
      id: { in: ingredients.map((ingredient) => ingredient.productId) },
      organizationId,
      status: "active",
    },
  });
  const productsById = new Map(ingredientProducts.map((product) => [product.id, product]));
  const normalizedIngredients: RecipeIngredientInput[] = [];

  for (const ingredient of ingredients) {
    const product = productsById.get(ingredient.productId);
    if (!product) {
      throw new DomainError(404, "PRODUCT_NOT_FOUND", "Ingrediente no encontrado.");
    }
    if (!product.isStockTracked) {
      throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Ingrediente sin control de inventario.");
    }
    assertRecipeIngredientAllowed(product);
    const normalizedIngredient = await normalizeProductQuantity(
      tx,
      organizationId,
      product.id,
      ingredient.quantity,
      ingredient.unit,
      product.unit,
      "INVALID_RECIPE_INGREDIENT_UNIT",
    );
    normalizedIngredients.push({
      ...ingredient,
      quantity: normalizedIngredient.quantity,
      unit: normalizedIngredient.unit,
    });
  }

  return {
    expectedOutputQuantity: normalizedOutput.quantity,
    outputUnit: normalizedOutput.unit,
    ingredients: normalizedIngredients,
  };
}

async function normalizeProductQuantity(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  quantity: string,
  fromUnit: (typeof productUnits)[number],
  baseUnit: string,
  errorCode: "INVALID_RECIPE_OUTPUT_UNIT" | "INVALID_RECIPE_INGREDIENT_UNIT",
) {
  if (fromUnit === baseUnit) {
    return { quantity, unit: baseUnit as (typeof productUnits)[number] };
  }

  const conversion = await tx.unitConversion.findFirst({
    where: {
      organizationId,
      productId,
      fromUnit,
      toUnit: baseUnit as (typeof productUnits)[number],
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!conversion) {
    throw new DomainError(400, errorCode, "Unidad incompatible sin conversion activa.");
  }

  return {
    quantity: applyRecipeUnitConversion(quantity, conversion.factor),
    unit: baseUnit as (typeof productUnits)[number],
  };
}

function parseIngredients(value: unknown): RecipeIngredientInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DomainError(400, "RECIPE_WITHOUT_INGREDIENTS", "La receta requiere al menos un ingrediente.");
  }

  return value.map((item) => {
    const body = asRecord(item);
    return {
      productId: asString(body.productId, "ingredients.productId"),
      quantity: asQuantity(body.quantity, "ingredients.quantity"),
      unit: asEnum(body.unit, "ingredients.unit", productUnits),
      isOptional: optionalBoolean(body.isOptional) ?? false,
      wasteFactor: optionalQuantity(body.wasteFactor, "ingredients.wasteFactor"),
    };
  });
}

async function getRecipePayload(
  organizationId: string,
  recipeId: string,
  tx: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const recipe = await tx.recipe.findFirst({
    where: { id: recipeId, organizationId },
    include: {
      branch: true,
      outputProduct: true,
      currentVersion: {
        include: {
          ingredients: {
            include: { product: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      versions: {
        include: {
          ingredients: {
            include: { product: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { version: "desc" },
      },
    },
  });
  if (!recipe) {
    throw new DomainError(404, "RECIPE_NOT_FOUND", "Receta no encontrada.");
  }
  return recipe;
}

async function getRecipeOrThrow(organizationId: string, recipeId: string) {
  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, organizationId } });
  if (!recipe) {
    throw new DomainError(404, "RECIPE_NOT_FOUND", "Receta no encontrada.");
  }
  return recipe;
}

async function getRecipeVersionOrThrow(
  tx: Prisma.TransactionClient,
  organizationId: string,
  recipeVersionId: string,
) {
  const version = await tx.recipeVersion.findFirst({
    where: {
      id: recipeVersionId,
      recipe: { organizationId },
    },
    include: {
      ingredients: true,
      recipe: true,
    },
  });
  if (!version) {
    throw new DomainError(404, "RECIPE_VERSION_NOT_FOUND", "Version de receta no encontrada.");
  }
  return version;
}

async function audit(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string | null,
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

function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new DomainError(400, "INVALID_REQUEST", "Campo boolean invalido.");
  return value;
}

function asEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }
  return value as T[number];
}

function optionalEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] | null {
  if (value === undefined || value === null || value === "") return null;
  return asEnum(value, field, values);
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

function serializeProductRef(product: { id: string; name: string; sku: string | null; productType: string; unit: string }) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    productType: product.productType,
    unit: product.unit,
  };
}

function serializeIngredient(ingredient: {
  id: string;
  productId: string;
  quantity: Prisma.Decimal;
  unit: string;
  isOptional: boolean;
  wasteFactor: Prisma.Decimal | null;
  product?: { id: string; name: string; sku: string | null; productType: string; unit: string } | null;
}) {
  return {
    id: ingredient.id,
    productId: ingredient.productId,
    product: ingredient.product ? serializeProductRef(ingredient.product) : null,
    quantity: normalizeQuantity(ingredient.quantity),
    unit: ingredient.unit,
    isOptional: ingredient.isOptional,
    wasteFactor: ingredient.wasteFactor ? normalizeQuantity(ingredient.wasteFactor) : null,
  };
}

function serializeRecipeVersion(version: {
  id: string;
  recipeId: string;
  version: number;
  expectedOutputQuantity: Prisma.Decimal;
  outputUnit: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  ingredients?: Array<Parameters<typeof serializeIngredient>[0]>;
}) {
  return {
    id: version.id,
    recipeId: version.recipeId,
    version: version.version,
    expectedOutputQuantity: normalizeQuantity(version.expectedOutputQuantity),
    outputUnit: version.outputUnit,
    notes: version.notes,
    status: version.status,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    ingredients: version.ingredients?.map(serializeIngredient) ?? [],
  };
}

function serializeRecipeHeader(recipe: {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  outputProductId: string;
  currentVersionId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: recipe.id,
    organizationId: recipe.organizationId,
    branchId: recipe.branchId,
    name: recipe.name,
    outputProductId: recipe.outputProductId,
    currentVersionId: recipe.currentVersionId,
    status: recipe.status,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

function serializeRecipeSummary(recipe: Parameters<typeof serializeRecipeDetail>[0]) {
  return {
    ...serializeRecipeHeader(recipe),
    branch: recipe.branch ? { id: recipe.branch.id, name: recipe.branch.name } : null,
    outputProduct: serializeProductRef(recipe.outputProduct),
    currentVersion: recipe.currentVersion ? serializeRecipeVersion(recipe.currentVersion) : null,
    versionCount: recipe.versions.length,
  };
}

function serializeRecipeDetail(recipe: {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  outputProductId: string;
  currentVersionId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: { id: string; name: string } | null;
  outputProduct: { id: string; name: string; sku: string | null; productType: string; unit: string };
  currentVersion?: Parameters<typeof serializeRecipeVersion>[0] | null;
  versions: Array<Parameters<typeof serializeRecipeVersion>[0]>;
}) {
  return {
    ...serializeRecipeHeader(recipe),
    branch: recipe.branch ? { id: recipe.branch.id, name: recipe.branch.name } : null,
    outputProduct: serializeProductRef(recipe.outputProduct),
    currentVersion: recipe.currentVersion ? serializeRecipeVersion(recipe.currentVersion) : null,
    versions: recipe.versions.map(serializeRecipeVersion),
  };
}
