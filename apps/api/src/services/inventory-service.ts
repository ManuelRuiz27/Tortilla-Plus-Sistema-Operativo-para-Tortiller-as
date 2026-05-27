import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertAnyPermission, assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

type InventoryMovementKind =
  | "production_in"
  | "waste_out"
  | "manual_adjustment_in"
  | "manual_adjustment_out";

const productTypes = ["tortilla", "masa", "package", "retail", "service"] as const;
const productUnits = ["kg", "piece", "package", "liter", "service"] as const;
const saleModes = ["by_kg", "by_amount", "by_package", "by_unit"] as const;
const wasteReasons = [
  "tortilla_rota",
  "masa_echada_a_perder",
  "producto_vencido",
  "devolucion_no_revendible",
  "otro",
] as const;

export async function listProducts(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "products.view");

  const products = await prisma.product.findMany({
    where: {
      organizationId: currentUser.organizationId,
    },
    include: {
      category: true,
      productPackageConfigProduct: {
        include: {
          baseProduct: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return { data: products.map(serializeProduct) };
}

export async function createProduct(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "products.manage");
  const body = asRecord(input);
  const name = asString(body.name, "name");
  const sku = optionalString(body.sku);
  const barcode = optionalString(body.barcode);
  const productType = asEnum(body.productType, "productType", productTypes);
  const unit = asEnum(body.unit, "unit", productUnits);
  const categoryId = await resolveCategoryId(currentUser.organizationId, body);
  const isSellable = optionalBoolean(body.isSellable) ?? true;
  const requiresProduction = optionalBoolean(body.requiresProduction) ?? ["tortilla", "masa"].includes(productType);
  const isStockTracked = optionalBoolean(body.isStockTracked) ?? productType !== "service";

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        organizationId: currentUser.organizationId,
        categoryId,
        name,
        sku,
        barcode,
        productType,
        unit,
        isSellable,
        requiresProduction,
        isStockTracked,
        status: "active",
      },
    });

    if (productType === "package") {
      await upsertPackageConfig(tx, currentUser.organizationId, product.id, body.packageConfig);
    }

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        userId: currentUser.id,
        action: "product_created",
        entityType: "product",
        entityId: product.id,
        afterSnapshot: serializeProduct(product),
      },
    });

    return { data: await getProductPayload(tx, currentUser.organizationId, product.id) };
  });
}

export async function updateProduct(currentUser: AuthenticatedUser, productId: string, input: unknown) {
  await assertPermission(currentUser.id, "products.manage");
  const body = asRecord(input);
  const existing = await getProductOrThrow(currentUser.organizationId, productId);
  const categoryId = await resolveCategoryId(currentUser.organizationId, body, true);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: productId },
      data: {
        categoryId,
        name: optionalString(body.name) ?? existing.name,
        sku: optionalString(body.sku) ?? existing.sku,
        barcode: optionalString(body.barcode) ?? existing.barcode,
        productType: optionalEnum(body.productType, "productType", productTypes) ?? existing.productType,
        unit: optionalEnum(body.unit, "unit", productUnits) ?? existing.unit,
        isSellable: optionalBoolean(body.isSellable) ?? existing.isSellable,
        requiresProduction: optionalBoolean(body.requiresProduction) ?? existing.requiresProduction,
        isStockTracked: optionalBoolean(body.isStockTracked) ?? existing.isStockTracked,
        status: optionalEnum(body.status, "status", ["active", "inactive", "deleted"] as const) ?? existing.status,
        updatedAt: new Date(),
      },
    });

    if (product.productType === "package" && body.packageConfig !== undefined) {
      await upsertPackageConfig(tx, currentUser.organizationId, product.id, body.packageConfig);
    }

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        userId: currentUser.id,
        action: "product_updated",
        entityType: "product",
        entityId: product.id,
        beforeSnapshot: serializeProduct(existing),
        afterSnapshot: serializeProduct(product),
      },
    });

    return { data: await getProductPayload(tx, currentUser.organizationId, product.id) };
  });
}

export async function getBranchPrices(currentUser: AuthenticatedUser, branchId: string) {
  await assertFeatureAvailable(currentUser, "inventory_basic");
  await assertPermission(currentUser.id, "products.view");
  await assertBranchAccess(currentUser, branchId);

  const prices = await prisma.branchProductPrice.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      status: "active",
      activeTo: null,
    },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { data: prices.map(serializeBranchPrice) };
}

export async function setBranchPrice(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "inventory_basic");
  await assertPermission(currentUser.id, "prices.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const productId = asString(body.productId, "productId");
  const saleMode = asEnum(body.saleMode, "saleMode", saleModes);
  const price = asMoney(body.price, "price");

  await assertBranchAccess(currentUser, branchId);
  await getProductOrThrow(currentUser.organizationId, productId);

  return prisma.$transaction(async (tx) => {
    await tx.branchProductPrice.updateMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId,
        productId,
        saleMode,
        status: "active",
        activeTo: null,
      },
      data: {
        status: "inactive",
        activeTo: new Date(),
        updatedAt: new Date(),
      },
    });

    const branchPrice = await tx.branchProductPrice.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        productId,
        saleMode,
        price,
        currency: "MXN",
        activeFrom: new Date(),
        status: "active",
      },
      include: {
        product: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "branch_price_changed",
        entityType: "branch_product_price",
        entityId: branchPrice.id,
        afterSnapshot: serializeBranchPrice(branchPrice),
      },
    });

    return { data: serializeBranchPrice(branchPrice) };
  });
}

export async function getBranchInventory(currentUser: AuthenticatedUser, branchId: string) {
  await assertFeatureAvailable(currentUser, "inventory_basic");
  await assertPermission(currentUser.id, "inventory.view");
  await assertBranchAccess(currentUser, branchId);

  const stocks = await prisma.inventoryStock.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
    },
    include: {
      product: true,
    },
    orderBy: {
      product: {
        name: "asc",
      },
    },
  });

  const stockedProductIds = new Set(stocks.map((stock) => stock.productId));
  const productsWithoutStock = await prisma.product.findMany({
    where: {
      organizationId: currentUser.organizationId,
      isStockTracked: true,
      status: "active",
      id: {
        notIn: [...stockedProductIds],
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    data: [
      ...stocks.map(serializeInventoryStock),
      ...productsWithoutStock.map((product) => serializeEmptyInventoryStock(currentUser.organizationId, branchId, product)),
    ].sort((left, right) => (left.product?.name ?? "").localeCompare(right.product?.name ?? "")),
  };
}

export async function createInventoryAdjustment(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "inventory_basic");
  await assertPermission(currentUser.id, "inventory.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const productId = asString(body.productId, "productId");
  const direction = asEnum(body.direction, "direction", ["in", "out"] as const);
  const quantity = asQuantity(body.quantity, "quantity");
  const reason = asReason(body.reason);

  await assertBranchAccess(currentUser, branchId);

  return prisma.$transaction(async (tx) => {
    const movement = await applyInventoryMovement(tx, {
      currentUser,
      branchId,
      productId,
      movementType: direction === "in" ? "manual_adjustment_in" : "manual_adjustment_out",
      quantity,
      reason,
      referenceType: "manual_adjustment",
      referenceId: null,
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "inventory_adjusted",
        entityType: "inventory_movement",
        entityId: movement.id,
        afterSnapshot: serializeInventoryMovement(movement),
      },
    });

    return { data: serializeInventoryMovement(movement) };
  });
}

export async function createProductionBatch(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const productionDate = asDateOnly(body.productionDate);
  const items = asItems(body.items);

  await assertBranchAccess(currentUser, branchId);

  for (const item of items) {
    await assertProductionProduct(currentUser.organizationId, item.productId);
  }

  return prisma.$transaction(async (tx) => {
    const batch = await tx.productionBatch.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        productionDate,
        createdByUserId: currentUser.id,
        productionBatchItemProductionBatch: {
          create: items.map((item) => ({
            productId: item.productId,
            producedQuantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        productionBatchItemProductionBatch: {
          include: { product: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "production_batch_created",
        entityType: "production_batch",
        entityId: batch.id,
        afterSnapshot: serializeProductionBatch(batch),
      },
    });

    return { data: serializeProductionBatch(batch) };
  });
}

export async function closeProductionBatch(
  currentUser: AuthenticatedUser,
  productionBatchId: string,
) {
  await assertFeatureAvailable(currentUser, "production_control");
  await assertPermission(currentUser.id, "production.manage");

  const batch = await prisma.productionBatch.findFirst({
    where: {
      id: productionBatchId,
      organizationId: currentUser.organizationId,
    },
    include: {
      productionBatchItemProductionBatch: true,
    },
  });

  if (!batch) {
    throw new DomainError(404, "PRODUCTION_BATCH_NOT_FOUND", "Produccion no encontrada.");
  }

  await assertBranchAccess(currentUser, batch.branchId);

  if (batch.status !== "open") {
    throw new DomainError(409, "CANNOT_EDIT_CLOSED_BATCH", "La produccion cerrada no se edita.");
  }

  return prisma.$transaction(async (tx) => {
    const movements = [];

    for (const item of batch.productionBatchItemProductionBatch) {
      const movement = await applyInventoryMovement(tx, {
        currentUser,
        branchId: batch.branchId,
        productId: item.productId,
        movementType: "production_in",
        quantity: normalizeQuantity(item.producedQuantity),
        reason: "Produccion diaria",
        referenceType: "production_batch",
        referenceId: batch.id,
      });
      movements.push(movement);
    }

    const closed = await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: "closed",
        closedByUserId: currentUser.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        productionBatchItemProductionBatch: {
          include: { product: true },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: batch.branchId,
        userId: currentUser.id,
        action: "production_batch_closed",
        entityType: "production_batch",
        entityId: batch.id,
        afterSnapshot: {
          batch: serializeProductionBatch(closed),
          movements: movements.map(serializeInventoryMovement),
        },
      },
    });

    return {
      data: {
        batch: serializeProductionBatch(closed),
        movements: movements.map(serializeInventoryMovement),
      },
    };
  });
}

export async function createWasteRecord(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "inventory_basic");
  await assertAnyPermission(currentUser.id, ["production.manage", "inventory.manage"]);
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const productId = asString(body.productId, "productId");
  const quantity = asQuantity(body.quantity, "quantity");
  const wasteReason = asEnum(body.wasteReason, "wasteReason", wasteReasons);

  await assertBranchAccess(currentUser, branchId);

  return prisma.$transaction(async (tx) => {
    const movement = await applyInventoryMovement(tx, {
      currentUser,
      branchId,
      productId,
      movementType: "waste_out",
      quantity,
      reason: wasteReason,
      referenceType: "waste_record",
      referenceId: null,
    });

    const wasteRecord = await tx.wasteRecord.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        productId,
        quantity,
        unit: movement.unit,
        wasteReason,
        inventoryMovementId: movement.id,
        createdByUserId: currentUser.id,
      },
    });

    await tx.inventoryMovement.update({
      where: { id: movement.id },
      data: {
        referenceId: wasteRecord.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "waste_recorded",
        entityType: "waste_record",
        entityId: wasteRecord.id,
        afterSnapshot: {
          wasteRecord: serializeWasteRecord(wasteRecord),
          movement: serializeInventoryMovement(movement),
        },
      },
    });

    return {
      data: {
        ...serializeWasteRecord(wasteRecord),
        inventoryMovement: serializeInventoryMovement(movement),
      },
    };
  });
}

export function calculateStockQuantity(
  currentQuantity: string,
  movementType: InventoryMovementKind,
  quantity: string,
) {
  const current = toMillis(currentQuantity);
  const delta = toMillis(quantity);
  const next = ["production_in", "manual_adjustment_in"].includes(movementType)
    ? current + delta
    : current - delta;

  return (next / 1000).toFixed(3);
}

async function applyInventoryMovement(
  tx: Prisma.TransactionClient,
  input: {
    currentUser: AuthenticatedUser;
    branchId: string;
    productId: string;
    movementType: InventoryMovementKind;
    quantity: string;
    reason: string;
    referenceType: string;
    referenceId: string | null;
  },
) {
  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      organizationId: input.currentUser.organizationId,
      status: "active",
    },
  });

  if (!product) {
    throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
  }

  if (!product.isStockTracked) {
    throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Producto sin control de inventario.");
  }

  const stock = await tx.inventoryStock.upsert({
    where: {
      branchId_productId: {
        branchId: input.branchId,
        productId: input.productId,
      },
    },
    update: {},
    create: {
      organizationId: input.currentUser.organizationId,
      branchId: input.branchId,
      productId: input.productId,
      quantity: "0.000",
      reservedQuantity: "0.000",
      minimumQuantity: "0.000",
    },
  });

  const nextQuantity = calculateStockQuantity(
    normalizeQuantity(stock.quantity),
    input.movementType,
    input.quantity,
  );

  if (Number(nextQuantity) < 0) {
    throw new DomainError(409, "INSUFFICIENT_STOCK", "Stock insuficiente.");
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      organizationId: input.currentUser.organizationId,
      branchId: input.branchId,
      productId: input.productId,
      movementType: input.movementType,
      quantity: input.quantity,
      unit: product.unit,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      createdByUserId: input.currentUser.id,
    },
  });

  await tx.inventoryStock.update({
    where: {
      branchId_productId: {
        branchId: input.branchId,
        productId: input.productId,
      },
    },
    data: {
      quantity: nextQuantity,
      updatedAt: new Date(),
    },
  });

  return movement;
}

async function getProductOrThrow(organizationId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId,
    },
  });

  if (!product) {
    throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
  }

  return product;
}

async function assertProductionProduct(organizationId: string, productId: string) {
  const product = await getProductOrThrow(organizationId, productId);

  if (!["tortilla", "masa"].includes(product.productType)) {
    throw new DomainError(400, "INVALID_PRODUCTION_PRODUCT", "Produccion solo permite tortilla o masa.");
  }

  if (!product.isStockTracked) {
    throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Producto sin control de inventario.");
  }

  return product;
}

async function resolveCategoryId(
  organizationId: string,
  body: Record<string, unknown>,
  optional = false,
) {
  const categoryId = optionalString(body.categoryId);
  const categoryName = optionalString(body.categoryName);

  if (categoryId) {
    const category = await prisma.productCategory.findFirst({
      where: {
        id: categoryId,
        organizationId,
        status: "active",
      },
    });

    if (!category) {
      throw new DomainError(400, "INVALID_TENANT_REFERENCE", "Categoria invalida.");
    }

    return category.id;
  }

  if (categoryName) {
    const category = await prisma.productCategory.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: categoryName,
        },
      },
      update: {
        status: "active",
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        name: categoryName,
        status: "active",
      },
    });

    return category.id;
  }

  if (optional) {
    return undefined;
  }

  return null;
}

async function upsertPackageConfig(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
  input: unknown,
) {
  const body = asRecord(input);
  const baseProductId = asString(body.baseProductId, "packageConfig.baseProductId");
  const packageWeightGrams = asQuantity(body.packageWeightGrams, "packageConfig.packageWeightGrams");
  const baseProduct = await tx.product.findFirst({
    where: {
      id: baseProductId,
      organizationId,
      productType: { in: ["tortilla", "masa"] },
    },
  });

  if (!baseProduct) {
    throw new DomainError(400, "INVALID_PRODUCTION_PRODUCT", "Producto base de paquete invalido.");
  }

  await tx.productPackageConfig.upsert({
    where: { productId },
    update: {
      baseProductId,
      packageWeightGrams,
      updatedAt: new Date(),
    },
    create: {
      productId,
      baseProductId,
      packageWeightGrams,
    },
  });
}

async function getProductPayload(
  tx: Prisma.TransactionClient,
  organizationId: string,
  productId: string,
) {
  const product = await tx.product.findFirstOrThrow({
    where: {
      id: productId,
      organizationId,
    },
    include: {
      category: true,
      productPackageConfigProduct: {
        include: {
          baseProduct: true,
        },
      },
    },
  });

  return serializeProduct(product);
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }

  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  return value.trim();
}

function asReason(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "REASON_REQUIRED", "Motivo requerido.");
  }

  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  }

  return value.trim();
}

function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "boolean") {
    throw new DomainError(400, "INVALID_REQUEST", "Campo boolean invalido.");
  }

  return value;
}

function asEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }

  return value as T[number];
}

function optionalEnum<T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return asEnum(value, field, values);
}

function asMoney(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Monto invalido: ${field}.`);
  }

  return amount.toFixed(2);
}

function asQuantity(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  const quantity = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Cantidad invalida: ${field}.`);
  }

  return quantity.toFixed(3);
}

function asDateOnly(value: unknown) {
  if (value === undefined || value === null || value === "") {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida: productionDate.");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function asItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DomainError(400, "INVALID_REQUEST", "Items requeridos.");
  }

  return value.map((item) => {
    const body = asRecord(item);
    return {
      productId: asString(body.productId, "items.productId"),
      quantity: asQuantity(body.quantity, "items.quantity"),
      unit: optionalEnum(body.unit, "items.unit", productUnits) ?? "kg",
    };
  });
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

function toMillis(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 1000);
}

function serializeProduct(product: {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  productType: string;
  unit: string;
  isSellable: boolean;
  requiresProduction: boolean;
  isStockTracked: boolean;
  status: string;
  category?: { id: string; name: string } | null;
  productPackageConfigProduct?: {
    id: string;
    baseProductId: string;
    packageWeightGrams: Prisma.Decimal;
    baseProduct?: { id: string; name: string; sku: string | null } | null;
  } | null;
}) {
  return {
    id: product.id,
    organizationId: product.organizationId,
    categoryId: product.categoryId,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    productType: product.productType,
    unit: product.unit,
    isSellable: product.isSellable,
    requiresProduction: product.requiresProduction,
    isStockTracked: product.isStockTracked,
    status: product.status,
    packageConfig: product.productPackageConfigProduct
      ? {
          id: product.productPackageConfigProduct.id,
          baseProductId: product.productPackageConfigProduct.baseProductId,
          baseProduct: product.productPackageConfigProduct.baseProduct
            ? {
                id: product.productPackageConfigProduct.baseProduct.id,
                name: product.productPackageConfigProduct.baseProduct.name,
                sku: product.productPackageConfigProduct.baseProduct.sku,
              }
            : null,
          packageWeightGrams: normalizeQuantity(product.productPackageConfigProduct.packageWeightGrams),
        }
      : null,
  };
}

function serializeBranchPrice(price: {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  saleMode: string;
  price: Prisma.Decimal;
  currency: string;
  activeFrom: Date;
  activeTo: Date | null;
  status: string;
  product?: { id: string; name: string; sku: string | null } | null;
}) {
  return {
    id: price.id,
    organizationId: price.organizationId,
    branchId: price.branchId,
    productId: price.productId,
    product: price.product
      ? {
          id: price.product.id,
          name: price.product.name,
          sku: price.product.sku,
        }
      : null,
    saleMode: price.saleMode,
    price: normalizeMoney(price.price),
    currency: price.currency,
    activeFrom: price.activeFrom,
    activeTo: price.activeTo,
    status: price.status,
  };
}

function serializeInventoryStock(stock: {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  quantity: Prisma.Decimal;
  reservedQuantity: Prisma.Decimal;
  minimumQuantity: Prisma.Decimal;
  updatedAt: Date;
  product?: { id: string; name: string; sku: string | null; productType: string; unit: string } | null;
}) {
  return {
    id: stock.id,
    organizationId: stock.organizationId,
    branchId: stock.branchId,
    productId: stock.productId,
    product: stock.product
      ? {
          id: stock.product.id,
          name: stock.product.name,
          sku: stock.product.sku,
          productType: stock.product.productType,
          unit: stock.product.unit,
        }
      : null,
    quantity: normalizeQuantity(stock.quantity),
    reservedQuantity: normalizeQuantity(stock.reservedQuantity),
    minimumQuantity: normalizeQuantity(stock.minimumQuantity),
    updatedAt: stock.updatedAt,
  };
}

function serializeEmptyInventoryStock(
  organizationId: string,
  branchId: string,
  product: {
    id: string;
    name: string;
    sku: string | null;
    productType: string;
    unit: string;
    updatedAt: Date;
  },
) {
  return {
    id: `empty-${branchId}-${product.id}`,
    organizationId,
    branchId,
    productId: product.id,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      productType: product.productType,
      unit: product.unit,
    },
    quantity: "0.000",
    reservedQuantity: "0.000",
    minimumQuantity: "0.000",
    updatedAt: product.updatedAt,
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

function serializeProductionBatch(batch: {
  id: string;
  organizationId: string;
  branchId: string;
  productionDate: Date;
  status: string;
  createdByUserId: string;
  closedByUserId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  productionBatchItemProductionBatch?: Array<{
    id: string;
    productId: string;
    producedQuantity: Prisma.Decimal;
    unit: string;
    product?: { id: string; name: string; sku: string | null } | null;
  }>;
}) {
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    branchId: batch.branchId,
    productionDate: batch.productionDate,
    status: batch.status,
    createdByUserId: batch.createdByUserId,
    closedByUserId: batch.closedByUserId,
    closedAt: batch.closedAt,
    createdAt: batch.createdAt,
    items:
      batch.productionBatchItemProductionBatch?.map((item) => ({
        id: item.id,
        productId: item.productId,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              sku: item.product.sku,
            }
          : null,
        producedQuantity: normalizeQuantity(item.producedQuantity),
        unit: item.unit,
      })) ?? [],
  };
}

function serializeWasteRecord(record: {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  quantity: Prisma.Decimal;
  unit: string;
  wasteReason: string;
  inventoryMovementId: string | null;
  createdByUserId: string;
  authorizedByUserId: string | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    branchId: record.branchId,
    productId: record.productId,
    quantity: normalizeQuantity(record.quantity),
    unit: record.unit,
    wasteReason: record.wasteReason,
    inventoryMovementId: record.inventoryMovementId,
    createdByUserId: record.createdByUserId,
    authorizedByUserId: record.authorizedByUserId,
    createdAt: record.createdAt,
  };
}
