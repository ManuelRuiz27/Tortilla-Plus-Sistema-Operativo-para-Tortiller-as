import type { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission, getBranchAssignments } from "./permission-service.js";

type ReportPoint = {
  label: string;
  value: number;
};

type ReportFilters = {
  branchId?: string | null;
  from?: string | null;
  to?: string | null;
  recipeId?: string | null;
  outputProductId?: string | null;
};

type DateRange = {
  from: Date;
  to: Date;
};

export async function getManagerDashboard(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  const branchIds = await resolveBranchIds(currentUser, branchId);
  const today = new Date();
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  const [salesToday, cashSessions, pendingWithdrawals, negativeStockItems, activeRoutes, pendingBilling] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        status: { in: ["completed", "partially_refunded", "invoiced"] },
        createdAt: { gte: from, lt: to },
      },
    }),
    prisma.cashSession.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        status: "open",
      },
      include: { openedByUser: true },
      orderBy: { openedAt: "desc" },
      take: 1,
    }),
    prisma.cashMovement.count({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        status: "pending_authorization",
      },
    }),
    prisma.inventoryStock.count({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        quantity: { lt: 0 },
      },
    }),
    prisma.deliveryRoute.count({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        status: "active",
      },
    }),
    prisma.sale.count({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        status: "completed",
        invoiceSaleSale: { none: {} },
      },
    }),
  ]);

  const cashSession = cashSessions[0] ?? null;
  const cashExpected = cashSession
    ? await getExpectedCash(currentUser.organizationId, cashSession.id)
    : 0;

  return {
    data: {
      salesToday: moneyNumber(salesToday._sum.total ?? 0),
      cashExpected,
      pendingWithdrawals,
      negativeStockItems,
      activeRoutes,
      pendingBilling,
      cashSession: cashSession
        ? {
            id: cashSession.id,
            status: cashSession.status,
            openedBy: cashSession.openedByUser.name,
            openedAt: cashSession.openedAt.toISOString(),
          }
        : null,
    },
  };
}

export async function getReportsSummary(currentUser: AuthenticatedUser, input: unknown) {
  return {
    data: {
      salesByDay: (await getSalesByDay(currentUser, input)).data,
      salesByBranch: (await getSalesByBranch(currentUser, input)).data,
      salesByProduct: (await getSalesByProduct(currentUser, input)).data,
      salesByCustomer: (await getSalesByCustomer(currentUser, input)).data,
      withdrawalsByReason: (await getCashWithdrawalsByReason(currentUser, input)).data,
      cashDifferences: (await getCashDifferences(currentUser, input)).data,
      production: (await getProductionReport(currentUser, input)).data,
    },
  };
}

export async function getProductionReport(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const query = asLooseRecord(input);
  const recipeId = optionalString(query.recipeId);
  const outputProductId = optionalString(query.outputProductId);
  const batches = await prisma.productionBatch.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: { in: branchIds },
      productionMode: "recipe_based",
      status: "closed",
      productionDate: { gte: range.from, lte: range.to },
      ...(recipeId ? { recipeVersion: { recipeId } } : {}),
      ...(outputProductId ? { outputProductId } : {}),
    },
    include: {
      branch: { select: { name: true } },
      outputProduct: { select: { id: true, name: true, unit: true } },
      recipeVersion: {
        select: {
          version: true,
          recipe: { select: { id: true, name: true } },
        },
      },
      productionBatchIngredientProductionBatch: {
        include: {
          product: { select: { id: true, name: true, unit: true } },
        },
      },
    },
    orderBy: [{ productionDate: "desc" }, { createdAt: "desc" }],
  });

  const authorizedBatchIds = new Set(
    (await prisma.inventoryMovement.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        referenceType: "production_batch",
        referenceId: { in: batches.map((batch) => batch.id) },
        authorizedByUserId: { not: null },
      },
      select: { referenceId: true },
    })).flatMap((movement) => movement.referenceId ? [movement.referenceId] : []),
  );

  const byRecipe = new Map<string, { label: string; value: number }>();
  const byOutputProduct = new Map<string, { label: string; value: number }>();
  const ingredientConsumption = new Map<string, { label: string; value: number; expectedQuantity: number; actualQuantity: number; varianceQuantity: number; unit: string }>();
  const recentBatches = [];
  let totalExpectedOutput = 0;
  let totalActualOutput = 0;
  let totalYield = 0;
  let yieldedBatches = 0;
  let batchesWithVarianceReason = 0;
  let batchesWithHighVarianceAuthorization = 0;

  for (const batch of batches) {
    const expectedOutput = Number(batch.expectedOutputQuantity ?? 0);
    const actualOutput = Number(batch.actualOutputQuantity ?? 0);
    const outputVariancePercentage = expectedOutput > 0 ? Math.abs(actualOutput - expectedOutput) / expectedOutput * 100 : 0;
    const yieldPercentage = Number(batch.yieldPercentage ?? 0);
    const recipeName = batch.recipeVersion?.recipe.name ?? "Produccion por receta";
    const outputName = batch.outputProduct?.name ?? "Producto producido";

    totalExpectedOutput += expectedOutput;
    totalActualOutput += actualOutput;
    if (yieldPercentage > 0) {
      totalYield += yieldPercentage;
      yieldedBatches += 1;
    }
    if (batch.varianceReason) batchesWithVarianceReason += 1;
    if (authorizedBatchIds.has(batch.id)) batchesWithHighVarianceAuthorization += 1;

    addReportPoint(byRecipe, recipeName, actualOutput);
    addReportPoint(byOutputProduct, outputName, actualOutput);

    const ingredientSummaries = [];
    for (const ingredient of batch.productionBatchIngredientProductionBatch) {
      const expected = Number(ingredient.expectedQuantity);
      const actual = Number(ingredient.actualQuantity);
      const ingredientName = ingredient.product.name;
      const consumption = ingredientConsumption.get(ingredient.productId) ?? {
        label: ingredientName,
        value: 0,
        expectedQuantity: 0,
        actualQuantity: 0,
        varianceQuantity: 0,
        unit: ingredient.unit,
      };
      consumption.expectedQuantity = roundQuantity(consumption.expectedQuantity + expected);
      consumption.actualQuantity = roundQuantity(consumption.actualQuantity + actual);
      consumption.varianceQuantity = roundQuantity(consumption.actualQuantity - consumption.expectedQuantity);
      consumption.value = consumption.actualQuantity;
      ingredientConsumption.set(ingredient.productId, consumption);
      ingredientSummaries.push({
        productId: ingredient.productId,
        productName: ingredientName,
        expectedQuantity: roundQuantity(expected),
        actualQuantity: roundQuantity(actual),
        varianceQuantity: roundQuantity(actual - expected),
        unit: ingredient.unit,
      });
    }

    if (recentBatches.length < 10) {
      recentBatches.push({
        id: batch.id,
        productionDate: batch.productionDate.toISOString().slice(0, 10),
        branchName: batch.branch.name,
        recipeName,
        recipeVersion: batch.recipeVersion?.version ?? null,
        outputProductName: outputName,
        expectedOutputQuantity: roundQuantity(expectedOutput),
        actualOutputQuantity: roundQuantity(actualOutput),
        outputUnit: batch.outputUnit ?? batch.outputProduct?.unit ?? null,
        yieldPercentage: roundMoney(yieldPercentage),
        outputVariancePercentage: roundMoney(outputVariancePercentage),
        varianceReason: batch.varianceReason,
        ingredients: ingredientSummaries,
      });
    }
  }

  return {
    data: {
      summary: {
        closedBatches: batches.length,
        expectedOutputQuantity: roundQuantity(totalExpectedOutput),
        actualOutputQuantity: roundQuantity(totalActualOutput),
        outputVarianceQuantity: roundQuantity(totalActualOutput - totalExpectedOutput),
        averageYieldPercentage: yieldedBatches > 0 ? roundMoney(totalYield / yieldedBatches) : 0,
        batchesWithVarianceReason,
        batchesWithHighVarianceAuthorization,
      },
      byRecipe: sortPoints(Array.from(byRecipe.values())),
      byOutputProduct: sortPoints(Array.from(byOutputProduct.values())),
      ingredientConsumption: Array.from(ingredientConsumption.values()).sort((a, b) => b.value - a.value),
      recentBatches,
    },
  };
}

export async function getSalesByDay(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const sales = await prisma.sale.findMany({
    where: completedSaleWhere(currentUser.organizationId, branchIds, range),
    select: { createdAt: true, total: true },
    orderBy: { createdAt: "asc" },
  });
  const grouped = new Map<string, number>();
  for (const sale of sales) {
    const label = sale.createdAt.toISOString().slice(0, 10);
    grouped.set(label, roundMoney((grouped.get(label) ?? 0) + Number(sale.total)));
  }
  return { data: Array.from(grouped, ([label, value]) => ({ label, value })) };
}

export async function getSalesByBranch(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const sales = await prisma.sale.groupBy({
    by: ["branchId"],
    _sum: { total: true },
    where: completedSaleWhere(currentUser.organizationId, branchIds, range),
  });
  const branches = await prisma.branch.findMany({
    where: { id: { in: sales.map((sale) => sale.branchId) }, organizationId: currentUser.organizationId },
    select: { id: true, name: true },
  });
  const names = new Map(branches.map((branch) => [branch.id, branch.name]));
  return { data: sortPoints(sales.map((sale) => ({ label: names.get(sale.branchId) ?? "Sucursal", value: moneyNumber(sale._sum.total ?? 0) }))) };
}

export async function getSalesByProduct(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const items = await prisma.saleItem.findMany({
    where: {
      sale: completedSaleWhere(currentUser.organizationId, branchIds, range),
    },
    select: { productNameSnapshot: true, total: true },
  });
  return { data: groupByLabel(items.map((item) => ({ label: item.productNameSnapshot, value: Number(item.total) }))) };
}

export async function getSalesByCustomer(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const sales = await prisma.sale.findMany({
    where: completedSaleWhere(currentUser.organizationId, branchIds, range),
    include: { customer: true },
  });
  return { data: groupByLabel(sales.map((sale) => ({ label: sale.customer?.name ?? "Mostrador", value: Number(sale.total) }))) };
}

export async function getCashWithdrawalsByReason(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const movements = await prisma.cashMovement.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: { in: branchIds },
      movementType: { in: ["cash_out", "adjustment_out"] },
      status: { in: ["recorded", "authorized"] },
      createdAt: { gte: range.from, lte: range.to },
    },
    include: { reason: true },
  });
  return { data: groupByLabel(movements.map((movement) => ({ label: movement.reason?.name ?? "Sin motivo", value: Number(movement.amount) }))) };
}

export async function getCashDifferences(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const { branchIds, range } = await resolveReportScope(currentUser, input);
  const closings = await prisma.cashClosing.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: { in: branchIds },
      closedAt: { gte: range.from, lte: range.to },
      status: "active",
    },
    select: { differenceType: true, differenceAmount: true },
  });
  return {
    data: groupByLabel(closings.map((closing) => ({
      label: closing.differenceType === "shortage" ? "Faltante" : closing.differenceType === "surplus" ? "Sobrante" : "Sin diferencia",
      value: Math.abs(Number(closing.differenceAmount)),
    }))),
  };
}

async function resolveReportScope(currentUser: AuthenticatedUser, input: unknown) {
  const query = asLooseRecord(input);
  return {
    branchIds: await resolveBranchIds(currentUser, optionalString(query.branchId)),
    range: parseDateRange({ from: optionalString(query.from), to: optionalString(query.to) }),
  };
}

async function resolveBranchIds(currentUser: AuthenticatedUser, branchId: string | null) {
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
    return [branchId];
  }
  const assignments = await getBranchAssignments(currentUser.id);
  const branchIds = assignments.map((assignment) => assignment.id);
  if (branchIds.length === 0) {
    throw new DomainError(403, "BRANCH_ACCESS_DENIED", "Usuario sin sucursales asignadas.");
  }
  return branchIds;
}

function parseDateRange(filters: ReportFilters): DateRange {
  const fromText = filters.from ?? new Date().toISOString().slice(0, 10);
  const toText = filters.to ?? fromText;
  const from = new Date(`${fromText}T00:00:00.000Z`);
  const to = new Date(`${toText}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new DomainError(400, "INVALID_DATE_RANGE", "Rango de fechas invalido.");
  }
  return { from, to };
}

function completedSaleWhere(organizationId: string, branchIds: string[], range: DateRange): Prisma.SaleWhereInput {
  return {
    organizationId,
    branchId: { in: branchIds },
    status: { in: ["completed", "partially_refunded", "invoiced"] },
    createdAt: { gte: range.from, lte: range.to },
  };
}

async function getExpectedCash(organizationId: string, cashSessionId: string) {
  const session = await prisma.cashSession.findFirstOrThrow({
    where: { id: cashSessionId, organizationId },
    select: { openingAmountCounted: true },
  });
  const [cashSales, cashIn, cashOut] = await Promise.all([
    prisma.salePayment.aggregate({
      _sum: { amount: true },
      where: { organizationId, sale: { cashSessionId }, paymentMethod: "cash", status: "completed" },
    }),
    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      where: { organizationId, cashSessionId, movementType: { in: ["cash_in", "adjustment_in", "route_cash_in"] }, status: { in: ["recorded", "authorized"] } },
    }),
    prisma.cashMovement.aggregate({
      _sum: { amount: true },
      where: { organizationId, cashSessionId, movementType: { in: ["cash_out", "adjustment_out"] }, status: { in: ["recorded", "authorized"] } },
    }),
  ]);
  return roundMoney(Number(session.openingAmountCounted) + Number(cashSales._sum.amount ?? 0) + Number(cashIn._sum.amount ?? 0) - Number(cashOut._sum.amount ?? 0));
}

function groupByLabel(points: ReportPoint[]) {
  const grouped = new Map<string, number>();
  for (const point of points) {
    grouped.set(point.label, roundMoney((grouped.get(point.label) ?? 0) + point.value));
  }
  return sortPoints(Array.from(grouped, ([label, value]) => ({ label, value })));
}

function addReportPoint(grouped: Map<string, ReportPoint>, label: string, value: number) {
  grouped.set(label, { label, value: roundQuantity((grouped.get(label)?.value ?? 0) + value) });
}

function sortPoints(points: ReportPoint[]) {
  return points.sort((a, b) => b.value - a.value);
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function moneyNumber(value: Prisma.Decimal | string | number) {
  return roundMoney(Number(value));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundQuantity(value: number) {
  return Number(value.toFixed(3));
}
