import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { DomainError } from "../../src/lib/domain-error.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { closeCashSession, getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { startMercadoPagoOAuth } from "../../src/services/mercadopago-oauth-service.js";
import { bindMercadoPagoTerminalToPos, syncMercadoPagoTerminals } from "../../src/services/payment-terminal-service.js";
import {
  confirmTerminalOrderAndCheckout,
  createTerminalOrder,
  getTerminalOrderStatus,
} from "../../src/services/payment-terminal-order-service.js";
import { addTerminalReconciliationIncidents, createReconciliationBatch } from "../../src/services/reconciliation-service.js";

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

async function ensurePosDevice(organizationId: string, branchId: string) {
  return prisma.posDevice.upsert({
    where: { deviceCode: `IT-MP-POS-${branchId}` },
    update: {
      organizationId,
      branchId,
      deviceName: "Caja integracion MP",
      deviceType: "desktop",
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
    create: {
      organizationId,
      branchId,
      deviceName: "Caja integracion MP",
      deviceCode: `IT-MP-POS-${branchId}`,
      deviceType: "desktop",
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
  });
}

test("Mercado Pago terminal mock order approves and completes POS checkout once", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);

  let cashSession = (await getOpenCashSession(cashier, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(cashier, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Mercado Pago terminal test",
    })).data;
  }

  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await startMercadoPagoOAuth(manager);
  const terminals = (await syncMercadoPagoTerminals(manager, { branchId })).data;
  assert.equal(terminals.length > 0, true);
  await bindMercadoPagoTerminalToPos(manager, posDevice.id, { paymentTerminalId: terminals[0]?.id });

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });

  const order = (await createTerminalOrder(cashier, {
    branchId,
    posDeviceId: posDevice.id,
    amount: "24.00",
    saleDraft: {
      items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
    },
  }, `it-mp-order-${Date.now()}`)).data;

  assert.equal(order.status, "sent_to_terminal");

  const approved = (await getTerminalOrderStatus(cashier, order.id)).data;
  assert.equal(approved.status, "approved");

  const sale = (await confirmTerminalOrderAndCheckout(cashier, order.id, `it-mp-checkout-${order.id}`)).data;
  assert.equal(sale.status, "completed");
  assert.equal(sale.payments.some((payment) => payment.provider === "mercadopago" && payment.reference), true);

  await assert.rejects(
    () => confirmTerminalOrderAndCheckout(cashier, order.id, `it-mp-checkout-again-${order.id}`),
    (error) => error instanceof DomainError && error.code === "TERMINAL_ORDER_ALREADY_CHECKED_OUT",
  );
});

test("Mercado Pago rejected terminal order blocks checkout", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await startMercadoPagoOAuth(manager);
  const terminals = (await syncMercadoPagoTerminals(manager, { branchId })).data;
  await bindMercadoPagoTerminalToPos(manager, posDevice.id, { paymentTerminalId: terminals[0]?.id });
  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });

  const order = (await createTerminalOrder(cashier, {
    branchId,
    posDeviceId: posDevice.id,
    amount: "24.00",
    saleDraft: {
      items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
    },
  }, `it-mp-rejected-${Date.now()}`)).data;

  await prisma.paymentTerminalOrder.update({
    where: { id: order.id },
    data: { status: "rejected", rejectedAt: new Date() },
  });

  await assert.rejects(
    () => confirmTerminalOrderAndCheckout(cashier, order.id, `it-mp-rejected-checkout-${order.id}`),
    (error) => error instanceof DomainError && error.code === "TERMINAL_PAYMENT_NOT_APPROVED",
  );
});

test("cash closing blocks pending Mercado Pago terminal orders", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await startMercadoPagoOAuth(manager);
  const terminals = (await syncMercadoPagoTerminals(manager, { branchId })).data;
  await bindMercadoPagoTerminalToPos(manager, posDevice.id, { paymentTerminalId: terminals[0]?.id });

  let cashSession = (await getOpenCashSession(cashier, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(cashier, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Pending terminal close test",
    })).data;
  }

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });
  const order = (await createTerminalOrder(cashier, {
    branchId,
    posDeviceId: posDevice.id,
    amount: "24.00",
    saleDraft: {
      items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
    },
  }, `it-mp-pending-close-${Date.now()}`)).data;

  await assert.rejects(
    () => closeCashSession(cashier, cashSession.id, { countedCashAmount: "500.00" }),
    (error) => error instanceof DomainError && error.code === "PENDING_TERMINAL_ORDERS",
  );

  await prisma.paymentTerminalOrder.update({
    where: { id: order.id },
    data: { status: "canceled", canceledAt: new Date() },
  });
});

test("terminal reconciliation detects approved order without POS sale", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  const posDevice = await ensurePosDevice(manager.organizationId, branchId);
  await startMercadoPagoOAuth(manager);
  const terminals = (await syncMercadoPagoTerminals(manager, { branchId })).data;
  await bindMercadoPagoTerminalToPos(manager, posDevice.id, { paymentTerminalId: terminals[0]?.id });
  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: manager.organizationId, sku: "TORTILLA-KG" },
  });
  const order = (await createTerminalOrder(manager, {
    branchId,
    posDeviceId: posDevice.id,
    amount: "24.00",
    saleDraft: {
      items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
    },
  }, `it-mp-reconcile-${Date.now()}`)).data;
  await getTerminalOrderStatus(manager, order.id);

  const batch = (await createReconciliationBatch(manager, { branchId })).data;
  const reconciled = (await addTerminalReconciliationIncidents(manager, batch.id)).data;
  assert.equal(reconciled.items.some((item) => item.providerReference && item.status === "missing_in_pos"), true);
});
