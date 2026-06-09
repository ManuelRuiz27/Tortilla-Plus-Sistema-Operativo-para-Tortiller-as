import { InventoryMovementType, Prisma, ProductUnit } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";

type DbClient = Prisma.TransactionClient;

export type InventoryLedgerMovementInput = {
  organizationId: string;
  branchId: string;
  productId: string;
  movementType: InventoryMovementType;
  quantity: string;
  reason: string;
  referenceType: string;
  referenceId: string | null;
  createdByUserId: string;
  authorizedByUserId?: string | null;
  allowNegative?: boolean;
  insufficientStockCode?: string;
  insufficientStockMessage?: string;
  affectsStock?: boolean;
};

export function calculateStockQuantity(
  currentQuantity: string,
  movementType: InventoryMovementType,
  quantity: string,
) {
  const current = toMillis(currentQuantity);
  const delta = toMillis(quantity);
  const next = isInboundMovement(movementType) ? current + delta : current - delta;

  return (next / 1000).toFixed(3);
}

export function isInboundMovement(movementType: InventoryMovementType) {
  return ["production_in", "manual_adjustment_in", "route_return_in", "return_in"].includes(movementType);
}

export async function applyInventoryMovement(
  tx: DbClient,
  input: InventoryLedgerMovementInput,
) {
  if (input.referenceId) {
    const existing = await tx.inventoryMovement.findFirst({
      where: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        productId: input.productId,
        movementType: input.movementType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    });

    if (existing) {
      return existing;
    }
  }

  const product = await tx.product.findFirst({
    where: {
      id: input.productId,
      organizationId: input.organizationId,
      status: "active",
    },
  });

  if (!product) {
    throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
  }

  if (!product.isStockTracked) {
    throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Producto sin control de inventario.");
  }

  await tx.inventoryStock.upsert({
    where: {
      branchId_productId: {
        branchId: input.branchId,
        productId: input.productId,
      },
    },
    update: {},
    create: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      productId: input.productId,
      quantity: "0.000",
      reservedQuantity: "0.000",
      minimumQuantity: "0.000",
    },
  });

  const allowNegative = input.allowNegative ?? product.allowNegativeStock;

  const movementResult = await createMovementOrReturnExisting(tx, {
    ...input,
    unit: product.unit,
  });

  if (movementResult.alreadyApplied) {
    return movementResult.movement;
  }

  if (input.affectsStock === false) {
    return movementResult.movement;
  }

  if (isInboundMovement(input.movementType)) {
    await tx.inventoryStock.update({
      where: {
        branchId_productId: {
          branchId: input.branchId,
          productId: input.productId,
        },
      },
      data: {
        quantity: { increment: input.quantity },
        updatedAt: new Date(),
      },
    });
  } else {
    const update = await tx.inventoryStock.updateMany({
      where: {
        branchId: input.branchId,
        productId: input.productId,
        ...(allowNegative ? {} : { quantity: { gte: input.quantity } }),
      },
      data: {
        quantity: { decrement: input.quantity },
        updatedAt: new Date(),
      },
    });

    if (update.count !== 1) {
      throw new DomainError(
        409,
        input.insufficientStockCode ?? "INSUFFICIENT_STOCK",
        input.insufficientStockMessage ?? "Stock insuficiente.",
      );
    }
  }

  return movementResult.movement;
}

async function createMovementOrReturnExisting(
  tx: DbClient,
  input: InventoryLedgerMovementInput & { unit: ProductUnit },
) {
  try {
    const movement = await tx.inventoryMovement.create({
      data: {
        organizationId: input.organizationId,
        branchId: input.branchId,
        productId: input.productId,
        movementType: input.movementType,
        quantity: input.quantity,
        unit: input.unit,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdByUserId: input.createdByUserId,
        authorizedByUserId: input.authorizedByUserId ?? null,
      },
    });
    return { movement, alreadyApplied: false };
  } catch (error) {
    if (
      input.referenceId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await tx.inventoryMovement.findFirst({
        where: {
          organizationId: input.organizationId,
          branchId: input.branchId,
          productId: input.productId,
          movementType: input.movementType,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      });

      if (existing) {
        return { movement: existing, alreadyApplied: true };
      }
    }

    throw error;
  }
}

function toMillis(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 1000);
}
