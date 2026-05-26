import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { createCustomer } from "../../src/services/customer-service.js";
import { getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import {
  getCashDifferences,
  getCashWithdrawalsByReason,
  getManagerDashboard,
  getReportsSummary,
  getSalesByBranch,
  getSalesByCustomer,
  getSalesByDay,
  getSalesByProduct,
} from "../../src/services/reports-service.js";
import { addSaleItem, completeSale, createSale } from "../../src/services/sale-service.js";

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

async function ensureCashSession(currentUser: AuthenticatedUser, branchId: string) {
  const current = (await getOpenCashSession(currentUser, branchId)).data;
  if (current) return current;
  return (await openCashSession(currentUser, {
    branchId,
    openingAmountCounted: "500.00",
    openingNote: "Reports integration smoke test",
  })).data;
}

test("F3 reports and dashboard use real tenant, branch and date filtered data", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  const cashSession = await ensureCashSession(currentUser, branchId);
  const date = new Date();
  const reportDate = date.toISOString().slice(0, 10);
  const createdAt = new Date(`${reportDate}T14:00:00.000Z`);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });
  const customer = (await createCustomer(currentUser, {
    name: `Cliente Reportes ${Date.now()}`,
    customerType: "cliente_frecuente",
    creditEnabled: false,
    creditLimit: "0.00",
  })).data;

  const sale = (await createSale(currentUser, {
    branchId,
    customerId: customer.id,
    clientGeneratedId: `reports-sale-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `reports-complete-${sale.id}`);
  await prisma.sale.update({ where: { id: sale.id }, data: { createdAt } });

  const reason = await prisma.cashMovementReason.upsert({
    where: { organizationId_name: { organizationId: currentUser.organizationId, name: "QA Reportes" } },
    create: {
      organizationId: currentUser.organizationId,
      name: "QA Reportes",
      movementDirection: "out_",
      requiresAuthorization: false,
    },
    update: { status: "active" },
  });
  await prisma.cashMovement.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      cashSessionId: cashSession.id,
      movementType: "cash_out",
      amount: "12.50",
      reasonId: reason.id,
      description: "QA report withdrawal",
      status: "authorized",
      requestedByUserId: currentUser.id,
      authorizedByUserId: currentUser.id,
      authorizedAt: createdAt,
      createdAt,
    },
  });
  const closedSession = await prisma.cashSession.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      openedByUserId: currentUser.id,
      closedByUserId: currentUser.id,
      openingAmountCounted: "100.00",
      status: "closed",
      openedAt: createdAt,
      closedAt: createdAt,
    },
  });
  await prisma.cashClosing.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      cashSessionId: closedSession.id,
      closedByUserId: currentUser.id,
      openingAmount: "100.00",
      cashSalesTotal: "24.00",
      expectedCashAmount: "124.00",
      countedCashAmount: "127.00",
      differenceAmount: "3.00",
      differenceType: "surplus",
      closedAt: createdAt,
    },
  });

  const filters = { branchId, from: reportDate, to: reportDate };
  const [summary, byDay, byBranch, byProduct, byCustomer, withdrawals, differences, dashboard] = await Promise.all([
    getReportsSummary(currentUser, filters),
    getSalesByDay(currentUser, filters),
    getSalesByBranch(currentUser, filters),
    getSalesByProduct(currentUser, filters),
    getSalesByCustomer(currentUser, filters),
    getCashWithdrawalsByReason(currentUser, filters),
    getCashDifferences(currentUser, filters),
    getManagerDashboard(currentUser, { branchId }),
  ]);

  assert.equal(summary.data.salesByDay.some((point) => point.label === reportDate && point.value >= 24), true);
  assert.equal(byDay.data.some((point) => point.label === reportDate && point.value >= 24), true);
  assert.equal(byBranch.data.some((point) => point.value >= 24), true);
  assert.equal(byProduct.data.some((point) => point.label === tortilla.name && point.value >= 24), true);
  assert.equal(byCustomer.data.some((point) => point.label === customer.name && point.value === 24), true);
  assert.equal(withdrawals.data.some((point) => point.label === reason.name && point.value >= 12.5), true);
  assert.equal(differences.data.some((point) => point.label === "Sobrante" && point.value >= 3), true);
  assert.equal(dashboard.data.salesToday >= 24, true);
  assert.equal(dashboard.data.cashSession?.id, cashSession.id);
});
