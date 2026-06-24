import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import {
  addReconciliationItem,
  createReconciliationBatch,
  listReconciliationBatches,
  reviewReconciliationBatch,
} from "../../src/services/reconciliation-service.js";
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
    openingNote: "Reconciliation integration smoke test",
  })).data;
}

async function activePosDeviceId(organizationId: string, branchId: string) {
  const device = await prisma.posDevice.upsert({
    where: { deviceCode: `INTEGRATION-REC-POS-${branchId}` },
    update: {
      organizationId,
      branchId,
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
    create: {
      organizationId,
      branchId,
      deviceName: "POS Integracion Conciliacion",
      deviceCode: `INTEGRATION-REC-POS-${branchId}`,
      deviceType: "desktop",
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
  });

  return device.id;
}

test("QA-REC reconciles POS payments against provider import and audits manual review", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });
  const sale = (await createSale(currentUser, {
    branchId,
    deviceId: await activePosDeviceId(currentUser.organizationId, branchId),
    clientGeneratedId: `qa-rec-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "card", amount: "24.00", reference: `qa-rec-card-${Date.now()}`, provider: "terminal-demo" }],
  }, `qa-rec-complete-${sale.id}`);

  const salePayment = await prisma.salePayment.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, branchId, saleId: sale.id, paymentMethod: "card" },
  });
  const provider = await prisma.paymentProvider.upsert({
    where: { organizationId_name: { organizationId: currentUser.organizationId, name: "Terminal Demo QA-REC" } },
    create: {
      organizationId: currentUser.organizationId,
      name: "Terminal Demo QA-REC",
      providerType: "card_terminal",
    },
    update: { status: "active" },
  });

  const batch = (await createReconciliationBatch(currentUser, { branchId, providerId: provider.id })).data;
  assert.equal(batch.branchId, branchId);
  assert.equal(batch.status, "draft");

  const matched = (await addReconciliationItem(currentUser, batch.id, {
    salePaymentId: salePayment.id,
    providerReference: salePayment.reference,
    providerAmount: "24.00",
  })).data;
  assert.equal(matched.status, "matched");
  assert.equal(matched.posTotal, 24);
  assert.equal(matched.providerReportedTotal, 24);
  assert.equal(matched.differenceTotal, 0);
  assert.equal(matched.items[0]?.status, "matched");

  const withDifference = (await addReconciliationItem(currentUser, batch.id, {
    providerReference: `provider-only-${Date.now()}`,
    providerAmount: "5.00",
    notes: "Deposito reportado sin pago POS",
  })).data;
  assert.equal(withDifference.status, "difference");
  assert.equal(withDifference.providerReportedTotal, 29);
  assert.equal(withDifference.differenceTotal, 5);
  assert.equal(withDifference.items.some((item) => item.status === "missing_in_pos"), true);

  const listed = (await listReconciliationBatches(currentUser, { branchId })).data;
  assert.equal(listed.some((item) => item.id === batch.id && item.branchId === branchId), true);

  const reviewed = (await reviewReconciliationBatch(currentUser, batch.id, { notes: "Diferencia validada contra reporte bancario" })).data;
  assert.equal(reviewed.status, "reviewed");
  assert.ok(reviewed.reviewedAt);

  const auditLog = await prisma.auditLog.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      action: "reconciliation_batch_reviewed",
      entityId: batch.id,
    },
  });
  assert.ok(auditLog, "manual reconciliation review must be audited");
});
