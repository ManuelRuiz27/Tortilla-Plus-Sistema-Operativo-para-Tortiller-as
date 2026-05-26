import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { verifySecret } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { runIdempotent } from "./idempotency-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";
import { classifyFiscalSale, invoiceDeadlineEndOfMonth } from "./billing-fiscal-classifier.js";
import { createBillingReceiptForSale } from "./public-autofactura-service.js";

const saleModes = ["by_kg", "by_amount", "by_package", "by_unit"] as const;
const paymentMethods = ["cash", "card", "transfer", "credit"] as const;
const inventoryConditions = ["sellable", "waste", "review_required"] as const;
type SaleModeInput = (typeof saleModes)[number];
type PaymentMethodInput = (typeof paymentMethods)[number];

export async function createSale(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.create");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const deviceId = optionalString(body.deviceId);
  const customerId = optionalString(body.customerId);
  const clientGeneratedId = optionalString(body.clientGeneratedId);

  await assertBranchAccess(currentUser, branchId);
  const cashSession = await getOpenCashSession(currentUser.organizationId, branchId);

  return prisma.$transaction(async (tx) => {
    if (customerId) {
      await assertCustomer(tx, currentUser.organizationId, customerId);
    }

    const sale = await tx.sale.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        cashSessionId: cashSession.id,
        deviceId,
        customerId,
        saleNumber: await nextSaleNumber(tx, branchId),
        createdByUserId: currentUser.id,
        clientGeneratedId,
        status: "draft",
        saleType: "counter",
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "sale_draft_created",
        entityType: "sale",
        entityId: sale.id,
        afterSnapshot: serializeSale(sale),
      },
    });

    return { data: await getSalePayload(tx, currentUser.organizationId, sale.id) };
  });
}

export async function quoteSale(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.create");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const customerId = optionalString(body.customerId);
  const items = asQuoteItems(body.items);

  await assertBranchAccess(currentUser, branchId);
  if (customerId) {
    await assertCustomer(prisma, currentUser.organizationId, customerId);
  }

  const quotedItems = [];
  let subtotalCents = 0;

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
        organizationId: currentUser.organizationId,
        status: "active",
        isSellable: true,
      },
    });

    if (!product) {
      throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
    }

    const price = await resolveBranchPrice(
      prisma,
      currentUser.organizationId,
      branchId,
      product.id,
      item.saleMode,
      customerId,
    );
    const calculation = calculateSaleItem({
      saleMode: item.saleMode,
      inputQuantityOrAmount: item.quantity,
      unitPrice: price.price,
    });

    subtotalCents += toCents(calculation.total);
    quotedItems.push({
      productId: product.id,
      productName: product.name,
      productType: product.productType,
      saleMode: item.saleMode,
      quantity: calculation.quantity,
      unit: product.unit,
      unitPrice: calculation.unitPrice,
      priceSource: price.priceSource,
      total: calculation.total,
    });
  }

  return {
    data: {
      branchId,
      customerId,
      items: quotedItems,
      subtotal: (subtotalCents / 100).toFixed(2),
      total: (subtotalCents / 100).toFixed(2),
    },
  };
}

export async function addSaleItem(currentUser: AuthenticatedUser, saleId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.create");
  const body = asRecord(input);
  const productId = asString(body.productId, "productId");
  const saleMode = asEnum(body.saleMode, "saleMode", saleModes);
  const quantityInput = asQuantity(body.quantity ?? body.amount, saleMode === "by_amount" ? "amount" : "quantity");

  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  if (sale.status !== "draft") {
    throw new DomainError(409, "SALE_NOT_DRAFT", "La venta no esta en borrador.");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId: currentUser.organizationId,
        status: "active",
      },
      include: {
        productPackageConfigProduct: true,
      },
    });

    if (!product) {
      throw new DomainError(404, "PRODUCT_NOT_FOUND", "Producto no encontrado.");
    }

    const price = await resolveBranchPrice(
      tx,
      currentUser.organizationId,
      sale.branchId,
      product.id,
      saleMode,
      sale.customerId,
    );
    const calculation = calculateSaleItem({
      saleMode,
      inputQuantityOrAmount: quantityInput,
      unitPrice: normalizeMoney(price.price),
    });

    const item = await tx.saleItem.create({
      data: {
        saleId,
        productId: product.id,
        productNameSnapshot: product.name,
        productTypeSnapshot: product.productType,
        quantity: calculation.quantity,
        unit: product.unit,
        unitPrice: calculation.unitPrice,
        total: calculation.total,
        saleMode,
      },
    });

    await recalculateSaleTotals(tx, saleId);

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        userId: currentUser.id,
        action: "sale_item_added",
        entityType: "sale",
        entityId: saleId,
        afterSnapshot: serializeSaleItem(item),
      },
    });

    return { data: await getSalePayload(tx, currentUser.organizationId, saleId) };
  });
}

export async function completeSale(
  currentUser: AuthenticatedUser,
  saleId: string,
  input: unknown,
  idempotencyKey?: string | null,
) {
  return runIdempotent(
    currentUser.organizationId,
    `sales.complete.${saleId}`,
    idempotencyKey,
    { saleId, input },
    () => completeSaleOnce(currentUser, saleId, input),
  );
}

async function completeSaleOnce(currentUser: AuthenticatedUser, saleId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "payments.create");
  const body = asRecord(input);
  const payments = parseSalePayments(body.payments);
  const customerRequestedInvoice = optionalBoolean(body.customerRequestedInvoice ?? body.requestInvoice) ?? false;
  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  if (sale.status !== "draft") {
    throw new DomainError(409, "SALE_NOT_DRAFT", "La venta no esta en borrador.");
  }

  return prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashSession.findFirst({
      where: {
        id: sale.cashSessionId,
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        status: "open",
      },
    });

    if (!cashSession) {
      throw new DomainError(409, "NO_OPEN_CASH_SESSION", "No hay caja abierta para la venta.");
    }

    const draft = await tx.sale.findFirstOrThrow({
      where: {
        id: saleId,
        organizationId: currentUser.organizationId,
      },
      include: {
        saleItemSale: true,
      },
    });

    if (draft.saleItemSale.length === 0) {
      throw new DomainError(400, "INVALID_REQUEST", "La venta no tiene items.");
    }

    assertPaymentTotal(normalizeMoney(draft.total), payments);
    await assertCreditPayments(tx, currentUser, draft, payments, body);
    const fiscalClassification = classifyFiscalSale({ payments, customerRequestedInvoice });
    const invoiceDeadlineAt = fiscalClassification.requiresReceipt ? invoiceDeadlineEndOfMonth(new Date()) : null;

    const createdPayments = [];
    for (const payment of payments) {
      const created = await tx.salePayment.create({
        data: {
          organizationId: currentUser.organizationId,
          branchId: sale.branchId,
          saleId,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          reference: payment.reference,
          provider: payment.provider,
          status: "completed",
          createdByUserId: currentUser.id,
        },
      });
      createdPayments.push(created);

      if (payment.paymentMethod === "card") {
        await tx.paymentTerminalReference.create({
          data: {
            organizationId: currentUser.organizationId,
            branchId: sale.branchId,
            salePaymentId: created.id,
            reference: payment.reference ?? "",
            terminalName: payment.provider,
            amount: payment.amount,
          },
        });
      }
    }

    const movements = [];
    for (const item of draft.saleItemSale) {
      const movement = await createSaleInventoryMovement(tx, currentUser, sale.branchId, item);
      if (movement) {
        movements.push(movement);
      }
    }

    const completed = await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "completed",
        fiscalIntent: fiscalClassification.fiscalIntent,
        fiscalStatus: fiscalClassification.fiscalStatus,
        invoiceDeadlineAt,
        updatedAt: new Date(),
      },
      include: {
        saleItemSale: true,
        salePaymentSale: true,
      },
    });

    await createBillingReceiptForSale(tx, {
      organizationId: currentUser.organizationId,
      branchId: sale.branchId,
      saleId,
      payments: createdPayments,
      requiresReceipt: fiscalClassification.requiresReceipt,
      expiresAt: invoiceDeadlineAt ?? undefined,
    });

    for (const payment of payments.filter((item) => item.paymentMethod === "credit")) {
      const customerId = draft.customerId;

      if (!customerId) {
        throw new DomainError(400, "CUSTOMER_REQUIRED_FOR_CREDIT", "Credito requiere cliente.");
      }

      await tx.customerBalanceMovement.create({
        data: {
          organizationId: currentUser.organizationId,
          customerId,
          movementType: "charge",
          amount: payment.amount,
          referenceType: "sale",
          referenceId: saleId,
          createdByUserId: currentUser.id,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: addMoney((await tx.customer.findUniqueOrThrow({ where: { id: customerId } })).currentBalance, payment.amount),
          updatedAt: new Date(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        userId: currentUser.id,
        action: "sale_completed",
        entityType: "sale",
        entityId: saleId,
        afterSnapshot: {
          sale: serializeSale(completed),
          payments: createdPayments.map(serializeSalePayment),
          fiscalClassification,
          inventoryMovements: movements.map(serializeInventoryMovement),
        },
      },
    });

    return { data: await getSalePayload(tx, currentUser.organizationId, saleId) };
  });
}

export async function cancelDraftSale(currentUser: AuthenticatedUser, saleId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.cancel_before_payment");
  const body = asRecord(input);
  const reason = optionalString(body.reason);
  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  if (sale.status !== "draft") {
    throw new DomainError(409, "SALE_NOT_DRAFT", "Solo se cancela borrador aqui.");
  }

  return cancelSale(currentUser, saleId, reason, "sale_draft_cancelled");
}

export async function cancelPaidSale(currentUser: AuthenticatedUser, saleId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.cancel_after_payment");
  const body = asRecord(input);
  const reason = optionalString(body.reason);
  const pin = optionalString(body.pin);
  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  if (sale.status === "invoiced") {
    throw new DomainError(
      409,
      "INVOICED_SALE_CANNOT_BE_CANCELLED_DIRECTLY",
      "Venta facturada no se cancela directo.",
    );
  }

  if (sale.status !== "completed") {
    throw new DomainError(409, "SALE_NOT_COMPLETED", "La venta no esta completada.");
  }

  if (pin) {
    await assertValidPin(currentUser.id, pin);
  }

  return cancelSale(currentUser, saleId, reason, "sale_paid_cancelled");
}

export async function getSale(currentUser: AuthenticatedUser, saleId: string) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.view");
  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  return { data: await getSalePayload(prisma, currentUser.organizationId, saleId) };
}

export async function listSales(currentUser: AuthenticatedUser, branchId: string | null) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.view");

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const sales = await prisma.sale.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: branchId ?? undefined,
    },
    include: {
      saleItemSale: true,
      salePaymentSale: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return { data: sales.map(serializeSaleWithRelations) };
}

export async function createSaleReturn(currentUser: AuthenticatedUser, saleId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "pos_basic");
  await assertPermission(currentUser.id, "sales.cancel_after_payment");
  const body = asRecord(input);
  const reason = asString(body.reason, "reason");
  const pin = optionalString(body.pin);
  const items = asReturnItems(body.items);

  if (pin) {
    await assertValidPin(currentUser.id, pin);
  }

  const sale = await getSaleOrThrow(currentUser.organizationId, saleId);
  await assertBranchAccess(currentUser, sale.branchId);

  if (sale.status === "invoiced") {
    throw new DomainError(
      409,
      "INVOICED_SALE_CANNOT_BE_CANCELLED_DIRECTLY",
      "Venta facturada no se devuelve directo.",
    );
  }

  if (!["completed", "partially_refunded"].includes(sale.status)) {
    throw new DomainError(409, "SALE_NOT_COMPLETED", "La venta no esta completada.");
  }

  return prisma.$transaction(async (tx) => {
    const saleWithItems = await tx.sale.findFirstOrThrow({
      where: {
        id: saleId,
        organizationId: currentUser.organizationId,
      },
      include: {
        saleItemSale: true,
      },
    });

    const saleReturn = await tx.saleReturn.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        saleId,
        status: "approved",
        reason,
        authorizedByUserId: currentUser.id,
        createdByUserId: currentUser.id,
      },
    });

    const returnItems = [];
    const movements = [];

    for (const item of items) {
      const saleItem = saleWithItems.saleItemSale.find((candidate) => candidate.id === item.saleItemId);

      if (!saleItem) {
        throw new DomainError(400, "INVALID_RETURN_QUANTITY", "Item de venta invalido.");
      }

      const previouslyReturned = await getReturnedQuantity(tx, saleItem.id);
      const remainingQuantity = subtractQuantity(normalizeQuantity(saleItem.quantity), previouslyReturned);

      if (Number(item.quantity) > Number(remainingQuantity)) {
        throw new DomainError(400, "INVALID_RETURN_QUANTITY", "Cantidad de devolucion excede lo vendido.");
      }

      const amountRefunded = calculateReturnAmount({
        itemTotal: normalizeMoney(saleItem.total),
        itemQuantity: normalizeQuantity(saleItem.quantity),
        returnQuantity: item.quantity,
      });

      let movementId: string | null = null;
      if (item.returnToInventory) {
        const movement = await createReturnInventoryMovement(tx, currentUser, sale.branchId, saleItem, item);
        movementId = movement?.id ?? null;
        if (movement) {
          movements.push(movement);
        }
      }

      const createdItem = await tx.saleReturnItem.create({
        data: {
          saleReturnId: saleReturn.id,
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          quantity: item.quantity,
          amountRefunded,
          returnToInventory: item.returnToInventory,
          inventoryCondition: item.inventoryCondition,
          inventoryMovementId: movementId,
        },
      });
      returnItems.push(createdItem);
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "partially_refunded",
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        userId: currentUser.id,
        action: "sale_return_approved",
        entityType: "sale_return",
        entityId: saleReturn.id,
        afterSnapshot: {
          saleReturn: serializeSaleReturn(saleReturn),
          items: returnItems.map(serializeSaleReturnItem),
          movements: movements.map(serializeInventoryMovement),
        },
      },
    });

    return {
      data: {
        ...serializeSaleReturn(saleReturn),
        items: returnItems.map(serializeSaleReturnItem),
        inventoryMovements: movements.map(serializeInventoryMovement),
      },
    };
  });
}

export function calculateSaleItem(input: {
  saleMode: SaleModeInput;
  inputQuantityOrAmount: string;
  unitPrice: string;
}) {
  const unitPriceCents = toCents(input.unitPrice);

  if (unitPriceCents <= 0) {
    throw new DomainError(400, "INVALID_REQUEST", "Precio invalido.");
  }

  if (input.saleMode === "by_amount") {
    const totalCents = toCents(input.inputQuantityOrAmount);
    const quantity = totalCents / unitPriceCents;
    return {
      quantity: quantity.toFixed(3),
      unitPrice: input.unitPrice,
      total: (totalCents / 100).toFixed(2),
    };
  }

  const quantityMillis = toMillis(input.inputQuantityOrAmount);
  const totalCents = Math.round((quantityMillis / 1000) * unitPriceCents);

  return {
    quantity: (quantityMillis / 1000).toFixed(3),
    unitPrice: input.unitPrice,
    total: (totalCents / 100).toFixed(2),
  };
}

export function validatePaymentTotal(total: string, payments: Array<{ amount: string }>) {
  const expected = toCents(total);
  const actual = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);

  return expected === actual;
}

export function calculateCreditUsage(input: {
  currentBalance: string;
  creditLimit: string;
  creditAmount: string;
}) {
  const nextBalanceCents = toCents(input.currentBalance) + toCents(input.creditAmount);
  const limitCents = toCents(input.creditLimit);
  const availableCents = limitCents - toCents(input.currentBalance);

  return {
    nextBalance: (nextBalanceCents / 100).toFixed(2),
    availableCredit: (availableCents / 100).toFixed(2),
    exceedsLimit: nextBalanceCents > limitCents,
  };
}

export function calculateReturnAmount(input: {
  itemTotal: string;
  itemQuantity: string;
  returnQuantity: string;
}) {
  const totalCents = toCents(input.itemTotal);
  const itemMillis = toMillis(input.itemQuantity);
  const returnMillis = toMillis(input.returnQuantity);

  return ((Math.round((totalCents * returnMillis) / itemMillis)) / 100).toFixed(2);
}

async function cancelSale(
  currentUser: AuthenticatedUser,
  saleId: string,
  reason: string | null,
  action: string,
) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "cancelled",
        cancelledByUserId: currentUser.id,
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      },
    });

    await tx.salePayment.updateMany({
      where: { saleId },
      data: { status: "cancelled" },
    });

    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: sale.branchId,
        userId: currentUser.id,
        action,
        entityType: "sale",
        entityId: sale.id,
        afterSnapshot: serializeSale(sale),
      },
    });

    return { data: await getSalePayload(tx, currentUser.organizationId, saleId) };
  });
}

async function createSaleInventoryMovement(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  item: {
    id: string;
    productId: string;
    quantity: Prisma.Decimal;
    saleMode: string;
  },
) {
  const product = await tx.product.findFirstOrThrow({
    where: {
      id: item.productId,
      organizationId: currentUser.organizationId,
    },
    include: {
      productPackageConfigProduct: true,
    },
  });

  if (!product.isStockTracked && product.productType !== "package") {
    return null;
  }

  const stockProductId =
    product.productType === "package" ? product.productPackageConfigProduct?.baseProductId : product.id;

  if (!stockProductId) {
    throw new DomainError(400, "PRODUCT_NOT_STOCK_TRACKED", "Paquete sin producto base.");
  }

  const stockProduct = await tx.product.findFirstOrThrow({
    where: {
      id: stockProductId,
      organizationId: currentUser.organizationId,
    },
  });

  const quantity =
    product.productType === "package"
      ? ((toMillis(item.quantity) / 1000) *
          Number(product.productPackageConfigProduct?.packageWeightGrams ?? 0) /
          1000).toFixed(3)
      : normalizeQuantity(item.quantity);

  const stock = await tx.inventoryStock.upsert({
    where: {
      branchId_productId: {
        branchId,
        productId: stockProductId,
      },
    },
    update: {},
    create: {
      organizationId: currentUser.organizationId,
      branchId,
      productId: stockProductId,
      quantity: "0.000",
      reservedQuantity: "0.000",
      minimumQuantity: "0.000",
    },
  });

  const nextQuantity = ((toMillis(stock.quantity) - toMillis(quantity)) / 1000).toFixed(3);
  const allowsNegative = ["tortilla", "masa"].includes(stockProduct.productType);

  if (Number(nextQuantity) < 0 && !allowsNegative) {
    throw new DomainError(409, "NEGATIVE_STOCK_NOT_ALLOWED", "Stock insuficiente para producto retail.");
  }

  const movement = await tx.inventoryMovement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      productId: stockProductId,
      movementType: "sale_out",
      quantity,
      unit: stockProduct.unit,
      reason: "Venta POS",
      referenceType: "sale_item",
      referenceId: item.id,
      createdByUserId: currentUser.id,
    },
  });

  await tx.inventoryStock.update({
    where: {
      branchId_productId: {
        branchId,
        productId: stockProductId,
      },
    },
    data: {
      quantity: nextQuantity,
      updatedAt: new Date(),
    },
  });

  if (Number(nextQuantity) < 0) {
    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        userId: currentUser.id,
        action: "negative_stock_sale_allowed",
        entityType: "inventory_stock",
        entityId: stock.id,
        afterSnapshot: {
          productId: stockProductId,
          quantity: nextQuantity,
          movementId: movement.id,
        },
      },
    });
  }

  return movement;
}

async function createReturnInventoryMovement(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string,
  saleItem: {
    id: string;
    productId: string;
    quantity: Prisma.Decimal;
  },
  returnItem: {
    quantity: string;
    inventoryCondition: (typeof inventoryConditions)[number];
  },
) {
  const product = await tx.product.findFirstOrThrow({
    where: {
      id: saleItem.productId,
      organizationId: currentUser.organizationId,
    },
    include: {
      productPackageConfigProduct: true,
    },
  });

  const stockProductId =
    product.productType === "package" ? product.productPackageConfigProduct?.baseProductId : product.id;

  if (!stockProductId) {
    return null;
  }

  const stockProduct = await tx.product.findFirstOrThrow({
    where: {
      id: stockProductId,
      organizationId: currentUser.organizationId,
    },
  });
  const quantity =
    product.productType === "package"
      ? ((toMillis(returnItem.quantity) / 1000) *
          Number(product.productPackageConfigProduct?.packageWeightGrams ?? 0) /
          1000).toFixed(3)
      : returnItem.quantity;
  const movementType = returnItem.inventoryCondition === "sellable" ? "return_in" : "return_waste";

  const movement = await tx.inventoryMovement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      productId: stockProductId,
      movementType,
      quantity,
      unit: stockProduct.unit,
      reason: "Devolucion de venta",
      referenceType: "sale_return_item",
      referenceId: null,
      createdByUserId: currentUser.id,
    },
  });

  if (returnItem.inventoryCondition === "sellable") {
    const stock = await tx.inventoryStock.upsert({
      where: {
        branchId_productId: {
          branchId,
          productId: stockProductId,
        },
      },
      update: {},
      create: {
        organizationId: currentUser.organizationId,
        branchId,
        productId: stockProductId,
        quantity: "0.000",
        reservedQuantity: "0.000",
        minimumQuantity: "0.000",
      },
    });

    await tx.inventoryStock.update({
      where: {
        branchId_productId: {
          branchId,
          productId: stockProductId,
        },
      },
      data: {
        quantity: addQuantity(stock.quantity, quantity),
        updatedAt: new Date(),
      },
    });
  }

  return movement;
}

async function getOpenCashSession(organizationId: string, branchId: string) {
  const session = await prisma.cashSession.findFirst({
    where: {
      organizationId,
      branchId,
      status: "open",
    },
    orderBy: {
      openedAt: "desc",
    },
  });

  if (!session) {
    throw new DomainError(409, "NO_OPEN_CASH_SESSION", "No hay caja abierta para la sucursal.");
  }

  return session;
}

async function getSaleOrThrow(organizationId: string, saleId: string) {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      organizationId,
    },
  });

  if (!sale) {
    throw new DomainError(404, "SALE_NOT_FOUND", "Venta no encontrada.");
  }

  return sale;
}

async function getSalePayload(
  db: typeof prisma | Prisma.TransactionClient,
  organizationId: string,
  saleId: string,
) {
  const sale = await db.sale.findFirstOrThrow({
    where: {
      id: saleId,
      organizationId,
    },
    include: {
      saleItemSale: true,
      salePaymentSale: true,
    },
  });

  return serializeSaleWithRelations(sale);
}

async function nextSaleNumber(tx: Prisma.TransactionClient, branchId: string) {
  const count = await tx.sale.count({
    where: { branchId },
  });

  return `POS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(count + 1).padStart(6, "0")}`;
}

async function assertCustomer(
  tx: typeof prisma | Prisma.TransactionClient,
  organizationId: string,
  customerId: string,
) {
  const customer = await tx.customer.findFirst({
    where: {
      id: customerId,
      organizationId,
      status: "active",
    },
  });

  if (!customer) {
    throw new DomainError(400, "INVALID_TENANT_REFERENCE", "Cliente invalido.");
  }
}

async function resolveBranchPrice(
  tx: typeof prisma | Prisma.TransactionClient,
  organizationId: string,
  branchId: string,
  productId: string,
  saleMode: SaleModeInput,
  customerId: string | null,
) {
  const lookupSaleMode = saleMode === "by_amount" ? "by_kg" : saleMode;
  if (customerId) {
    const customerPrice = await tx.customerProductPrice.findFirst({
      where: {
        organizationId,
        customerId,
        productId,
        saleMode: lookupSaleMode,
        status: "active",
        activeTo: null,
        OR: [{ branchId }, { branchId: null }],
      },
      orderBy: [{ branchId: "desc" }, { activeFrom: "desc" }],
    });

    if (customerPrice) {
      return { price: normalizeMoney(customerPrice.price), priceSource: "customer" as const };
    }
  }

  const price = await tx.branchProductPrice.findFirst({
    where: {
      organizationId,
      branchId,
      productId,
      saleMode: lookupSaleMode,
      status: "active",
      activeTo: null,
    },
    orderBy: {
      activeFrom: "desc",
    },
  });

  if (!price) {
    throw new DomainError(400, "PRICE_NOT_FOUND", "Precio no configurado.");
  }

  return { price: normalizeMoney(price.price), priceSource: "branch" as const };
}

async function assertCreditPayments(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  sale: {
    customerId: string | null;
    organizationId: string;
  },
  payments: Array<{ paymentMethod: PaymentMethodInput; amount: string }>,
  body: Record<string, unknown>,
) {
  const creditTotal = payments
    .filter((payment) => payment.paymentMethod === "credit")
    .reduce((sum, payment) => sum + toCents(payment.amount), 0);

  if (creditTotal === 0) {
    return;
  }

  await assertFeatureAvailable(currentUser, "customer_credit");

  if (!sale.customerId) {
    throw new DomainError(400, "CUSTOMER_REQUIRED_FOR_CREDIT", "Credito requiere cliente.");
  }

  const customer = await tx.customer.findFirstOrThrow({
    where: {
      id: sale.customerId,
      organizationId: sale.organizationId,
    },
  });

  if (!customer.creditEnabled) {
    throw new DomainError(400, "CUSTOMER_CREDIT_DISABLED", "Cliente sin credito habilitado.");
  }

  const creditUsage = calculateCreditUsage({
    currentBalance: normalizeMoney(customer.currentBalance),
    creditLimit: normalizeMoney(customer.creditLimit),
    creditAmount: (creditTotal / 100).toFixed(2),
  });

  if (creditUsage.exceedsLimit) {
    await assertPermission(currentUser.id, "customers.manage");
    const authorizationPin = optionalString(body.authorizationPin);
    if (!authorizationPin) {
      throw new DomainError(403, "CUSTOMER_CREDIT_LIMIT_EXCEEDED", "Credito excede limite.");
    }
    await assertValidPin(currentUser.id, authorizationPin);
  }
}

async function recalculateSaleTotals(tx: Prisma.TransactionClient, saleId: string) {
  const items = await tx.saleItem.findMany({
    where: { saleId },
  });
  const subtotal = items.reduce((sum, item) => sum + toCents(item.total), 0);

  await tx.sale.update({
    where: { id: saleId },
    data: {
      subtotal: (subtotal / 100).toFixed(2),
      total: (subtotal / 100).toFixed(2),
      updatedAt: new Date(),
    },
  });
}

function assertPaymentTotal(total: string, payments: Array<{ amount: string }>) {
  if (!validatePaymentTotal(total, payments)) {
    throw new DomainError(400, "PAYMENT_TOTAL_MISMATCH", "La suma de pagos no coincide con el total.");
  }
}

async function assertValidPin(userId: string, pin: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (!(await verifySecret(pin, user.pinHash))) {
    throw new DomainError(401, "INVALID_PIN", "PIN invalido.");
  }
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

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  }

  return value.trim();
}

function asEnum<T extends readonly string[]>(value: unknown, field: string, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }

  return value as T[number];
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

function asMoney(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Monto invalido: ${field}.`);
  }

  return amount.toFixed(2);
}

export function parseSalePayments(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DomainError(400, "INVALID_REQUEST", "Pagos requeridos.");
  }

  return value.map((payment) => {
    const body = asRecord(payment);
    const paymentMethod = asEnum(body.paymentMethod, "paymentMethod", paymentMethods);
    const amount = asMoney(body.amount, "amount");
    const reference = optionalString(body.reference);
    const provider = optionalString(body.provider);

    if (paymentMethod === "card" && !reference) {
      throw new DomainError(400, "CARD_REFERENCE_REQUIRED", "Pago con tarjeta requiere referencia.");
    }

    if (paymentMethod === "transfer" && !reference) {
      throw new DomainError(400, "TRANSFER_REFERENCE_REQUIRED", "Pago por transferencia requiere referencia.");
    }

    return {
      paymentMethod,
      amount,
      reference,
      provider,
    };
  });
}

function asQuoteItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DomainError(400, "INVALID_REQUEST", "Items requeridos.");
  }

  return value.map((item) => {
    const body = asRecord(item);
    const saleMode = asEnum(body.saleMode, "items.saleMode", saleModes);
    return {
      productId: asString(body.productId, "items.productId"),
      saleMode,
      quantity: asQuantity(body.quantity ?? body.amount, saleMode === "by_amount" ? "items.amount" : "items.quantity"),
    };
  });
}

function asReturnItems(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new DomainError(400, "INVALID_REQUEST", "Items de devolucion requeridos.");
  }

  return value.map((item) => {
    const body = asRecord(item);
    return {
      saleItemId: asString(body.saleItemId, "items.saleItemId"),
      quantity: asQuantity(body.quantity, "items.quantity"),
      returnToInventory: optionalBoolean(body.returnToInventory) ?? false,
      inventoryCondition:
        optionalEnum(body.inventoryCondition, "items.inventoryCondition", inventoryConditions) ?? "review_required",
    };
  });
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

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

function addMoney(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toCents(left) + toCents(right)) / 100).toFixed(2);
}

function addQuantity(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toMillis(left) + toMillis(right)) / 1000).toFixed(3);
}

function subtractQuantity(left: Prisma.Decimal | string | number, right: Prisma.Decimal | string | number) {
  return ((toMillis(left) - toMillis(right)) / 1000).toFixed(3);
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 100);
}

function toMillis(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 1000);
}

function serializeSale(sale: {
  id: string;
  organizationId: string;
  branchId: string;
  cashSessionId: string;
  customerId: string | null;
  saleNumber: string;
  status: string;
  fiscalIntent: string;
  fiscalStatus: string;
  invoiceDeadlineAt: Date | null;
  fiscalLockedAt: Date | null;
  subtotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  createdByUserId: string;
  cancelledByUserId: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: sale.id,
    organizationId: sale.organizationId,
    branchId: sale.branchId,
    cashSessionId: sale.cashSessionId,
    customerId: sale.customerId,
    saleNumber: sale.saleNumber,
    status: sale.status,
    fiscalIntent: sale.fiscalIntent,
    fiscalStatus: sale.fiscalStatus,
    invoiceDeadlineAt: sale.invoiceDeadlineAt,
    fiscalLockedAt: sale.fiscalLockedAt,
    subtotal: normalizeMoney(sale.subtotal),
    discountTotal: normalizeMoney(sale.discountTotal),
    taxTotal: normalizeMoney(sale.taxTotal),
    total: normalizeMoney(sale.total),
    createdByUserId: sale.createdByUserId,
    cancelledByUserId: sale.cancelledByUserId,
    cancelledAt: sale.cancelledAt,
    cancellationReason: sale.cancellationReason,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}

function serializeSaleWithRelations(sale: Parameters<typeof serializeSale>[0] & {
  saleItemSale: Array<Parameters<typeof serializeSaleItem>[0]>;
  salePaymentSale: Array<Parameters<typeof serializeSalePayment>[0]>;
}) {
  return {
    ...serializeSale(sale),
    items: sale.saleItemSale.map(serializeSaleItem),
    payments: sale.salePaymentSale.map(serializeSalePayment),
  };
}

function serializeSaleItem(item: {
  id: string;
  saleId: string;
  productId: string;
  productNameSnapshot: string;
  productTypeSnapshot: string;
  quantity: Prisma.Decimal;
  unit: string;
  unitPrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  saleMode: string;
  createdAt: Date;
}) {
  return {
    id: item.id,
    saleId: item.saleId,
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    productTypeSnapshot: item.productTypeSnapshot,
    quantity: normalizeQuantity(item.quantity),
    unit: item.unit,
    unitPrice: normalizeMoney(item.unitPrice),
    discountAmount: normalizeMoney(item.discountAmount),
    total: normalizeMoney(item.total),
    saleMode: item.saleMode,
    createdAt: item.createdAt,
  };
}

function serializeSalePayment(payment: {
  id: string;
  organizationId: string;
  branchId: string;
  saleId: string;
  paymentMethod: string;
  amount: Prisma.Decimal;
  status: string;
  reference: string | null;
  provider: string | null;
  createdByUserId: string;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    branchId: payment.branchId,
    saleId: payment.saleId,
    paymentMethod: payment.paymentMethod,
    amount: normalizeMoney(payment.amount),
    status: payment.status,
    reference: payment.reference,
    provider: payment.provider,
    createdByUserId: payment.createdByUserId,
    createdAt: payment.createdAt,
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
    createdAt: movement.createdAt,
  };
}

async function getReturnedQuantity(tx: Prisma.TransactionClient, saleItemId: string) {
  const returns = await tx.saleReturnItem.findMany({
    where: {
      saleItemId,
      saleReturn: {
        status: "approved",
      },
    },
  });

  return returns.reduce((sum, item) => addQuantity(sum, item.quantity), "0.000");
}

function serializeSaleReturn(saleReturn: {
  id: string;
  organizationId: string;
  branchId: string;
  saleId: string;
  status: string;
  reason: string;
  authorizedByUserId: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: saleReturn.id,
    organizationId: saleReturn.organizationId,
    branchId: saleReturn.branchId,
    saleId: saleReturn.saleId,
    status: saleReturn.status,
    reason: saleReturn.reason,
    authorizedByUserId: saleReturn.authorizedByUserId,
    createdByUserId: saleReturn.createdByUserId,
    createdAt: saleReturn.createdAt,
    updatedAt: saleReturn.updatedAt,
  };
}

function serializeSaleReturnItem(item: {
  id: string;
  saleReturnId: string;
  saleItemId: string;
  productId: string;
  quantity: Prisma.Decimal;
  amountRefunded: Prisma.Decimal;
  returnToInventory: boolean;
  inventoryCondition: string;
  inventoryMovementId: string | null;
  createdAt: Date;
}) {
  return {
    id: item.id,
    saleReturnId: item.saleReturnId,
    saleItemId: item.saleItemId,
    productId: item.productId,
    quantity: normalizeQuantity(item.quantity),
    amountRefunded: normalizeMoney(item.amountRefunded),
    returnToInventory: item.returnToInventory,
    inventoryCondition: item.inventoryCondition,
    inventoryMovementId: item.inventoryMovementId,
    createdAt: item.createdAt,
  };
}
