import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";

type BatchWithItems = Prisma.ReconciliationBatchGetPayload<{
  include: {
    branch: true;
    reconciliationItemReconciliationBatch: { include: { salePayment: true } };
  };
}>;

export async function createReconciliationBatch(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  await assertBranchAccess(currentUser, branchId);
  const providerId = optionalString(body.providerId);
  if (providerId) {
    const provider = await prisma.paymentProvider.findFirst({
      where: { id: providerId, organizationId: currentUser.organizationId, status: "active" },
      select: { id: true },
    });
    if (!provider) {
      throw new DomainError(404, "PAYMENT_PROVIDER_NOT_FOUND", "Proveedor de pago no encontrado.");
    }
  }

  const batch = await prisma.reconciliationBatch.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      cashSessionId: optionalString(body.cashSessionId),
      providerId,
      createdByUserId: currentUser.id,
    },
    include: batchInclude,
  });

  await audit(currentUser, branchId, "reconciliation_batch_created", batch.id, serializeBatch(batch));
  return { data: serializeBatch(batch) };
}

export async function addReconciliationItem(currentUser: AuthenticatedUser, batchId: string, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const body = asRecord(input);

  return prisma.$transaction(async (tx) => {
    const batch = await tx.reconciliationBatch.findFirst({
      where: { id: batchId, organizationId: currentUser.organizationId },
    });
    if (!batch) {
      throw new DomainError(404, "RECONCILIATION_BATCH_NOT_FOUND", "Conciliacion no encontrada.");
    }
    await assertBranchAccess(currentUser, batch.branchId);
    if (batch.status === "reviewed" || batch.status === "cancelled") {
      throw new DomainError(409, "RECONCILIATION_BATCH_CLOSED", "Conciliacion cerrada.");
    }

    const salePaymentId = optionalString(body.salePaymentId);
    const providerReference = optionalString(body.providerReference);
    const providerAmount = normalizeMoney(body.providerAmount ?? "0.00");
    let posAmount = normalizeMoney(body.posAmount ?? "0.00");

    if (salePaymentId) {
      const payment = await tx.salePayment.findFirst({
        where: {
          id: salePaymentId,
          organizationId: currentUser.organizationId,
          branchId: batch.branchId,
          status: "completed",
        },
      });
      if (!payment) {
        throw new DomainError(404, "SALE_PAYMENT_NOT_FOUND", "Pago POS no encontrado.");
      }
      posAmount = normalizeMoney(payment.amount);
    }

    const status = classifyItem(posAmount, providerAmount, salePaymentId);
    await tx.reconciliationItem.create({
      data: {
        reconciliationBatchId: batch.id,
        salePaymentId,
        providerReference,
        posAmount,
        providerAmount,
        status,
        notes: optionalString(body.notes),
      },
    });

    const updated = await recalculateBatch(tx, batch.id);
    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: batch.branchId,
        userId: currentUser.id,
        action: "reconciliation_item_added",
        entityType: "reconciliation_batch",
        entityId: batch.id,
        afterSnapshot: serializeBatch(updated) as Prisma.InputJsonValue,
      },
    });
    return { data: serializeBatch(updated) };
  });
}

export async function reviewReconciliationBatch(currentUser: AuthenticatedUser, batchId: string, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const body = asRecord(input);

  return prisma.$transaction(async (tx) => {
    const batch = await tx.reconciliationBatch.findFirst({
      where: { id: batchId, organizationId: currentUser.organizationId },
      include: batchInclude,
    });
    if (!batch) {
      throw new DomainError(404, "RECONCILIATION_BATCH_NOT_FOUND", "Conciliacion no encontrada.");
    }
    await assertBranchAccess(currentUser, batch.branchId);

    const reviewed = await tx.reconciliationBatch.update({
      where: { id: batch.id },
      data: {
        status: "reviewed",
        reviewedByUserId: currentUser.id,
        reviewedAt: new Date(),
      },
      include: batchInclude,
    });
    await tx.auditLog.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: batch.branchId,
        userId: currentUser.id,
        action: "reconciliation_batch_reviewed",
        entityType: "reconciliation_batch",
        entityId: batch.id,
        afterSnapshot: {
          ...serializeBatch(reviewed),
          notes: optionalString(body.notes),
        } as Prisma.InputJsonValue,
      },
    });
    return { data: serializeBatch(reviewed) };
  });
}

export async function listReconciliationBatches(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const batches = await prisma.reconciliationBatch.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: branchId ?? undefined,
    },
    include: batchInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { data: batches.map(serializeBatch) };
}

const batchInclude = {
  branch: true,
  reconciliationItemReconciliationBatch: { include: { salePayment: true } },
} satisfies Prisma.ReconciliationBatchInclude;

async function recalculateBatch(tx: Prisma.TransactionClient, batchId: string) {
  const items = await tx.reconciliationItem.findMany({ where: { reconciliationBatchId: batchId } });
  const posCents = items.reduce((sum, item) => sum + toCents(item.posAmount), 0);
  const providerCents = items.reduce((sum, item) => sum + toCents(item.providerAmount), 0);
  const hasDifference = items.some((item) => item.status !== "matched") || posCents !== providerCents;
  return tx.reconciliationBatch.update({
    where: { id: batchId },
    data: {
      posTotal: centsToMoney(posCents),
      providerReportedTotal: centsToMoney(providerCents),
      differenceTotal: centsToMoney(providerCents - posCents),
      status: hasDifference ? "difference" : "matched",
    },
    include: batchInclude,
  });
}

function classifyItem(posAmount: string, providerAmount: string, salePaymentId: string | null): Prisma.ReconciliationItemCreateInput["status"] {
  if (!salePaymentId) return "missing_in_pos";
  if (toCents(providerAmount) === 0) return "missing_in_provider";
  if (toCents(posAmount) !== toCents(providerAmount)) return "amount_mismatch";
  return "matched";
}

function serializeBatch(batch: BatchWithItems) {
  return {
    id: batch.id,
    branchId: batch.branchId,
    branchName: batch.branch.name,
    status: batch.status,
    posTotal: moneyNumber(batch.posTotal),
    providerReportedTotal: moneyNumber(batch.providerReportedTotal),
    differenceTotal: moneyNumber(batch.differenceTotal),
    reviewedAt: batch.reviewedAt,
    createdAt: batch.createdAt,
    items: batch.reconciliationItemReconciliationBatch.map((item) => ({
      id: item.id,
      salePaymentId: item.salePaymentId,
      providerReference: item.providerReference,
      posAmount: moneyNumber(item.posAmount),
      providerAmount: moneyNumber(item.providerAmount),
      status: item.status,
      notes: item.notes,
    })),
  };
}

async function audit(currentUser: AuthenticatedUser, branchId: string, action: string, entityId: string, afterSnapshot: unknown) {
  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType: "reconciliation_batch",
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

function asString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function normalizeMoney(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "object") {
    throw new DomainError(400, "INVALID_AMOUNT", "Monto invalido.");
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new DomainError(400, "INVALID_AMOUNT", "Monto invalido.");
  }
  return numberValue.toFixed(2);
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 100);
}

function centsToMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function moneyNumber(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}
