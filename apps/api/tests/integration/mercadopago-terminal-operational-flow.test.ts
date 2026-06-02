import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { DomainError } from "../../src/lib/domain-error.js";
import { env } from "../../src/config/env.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { closeCashSession, getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { startMercadoPagoOAuth } from "../../src/services/mercadopago-oauth-service.js";
import { createOrSyncExternalPosForPosDevice, createOrSyncStoreForBranch } from "../../src/services/mercadopago-point-provisioning-service.js";
import { bindMercadoPagoTerminalToPos, syncMercadoPagoTerminals } from "../../src/services/payment-terminal-service.js";
import { updatePlatformOrganizationStatus } from "../../src/services/platform-service.js";
import {
  confirmTerminalOrderAndCheckout,
  createTerminalOrder,
  getOpenTerminalOrder,
  getTerminalOrderStatus,
} from "../../src/services/payment-terminal-order-service.js";
import { addTerminalReconciliationIncidents, createReconciliationBatch } from "../../src/services/reconciliation-service.js";

type LoginResult = Awaited<ReturnType<typeof login>>;

env.PHYSICAL_INTEGRATIONS_MODE = "mock";

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

function asPlatformUser(session: LoginResult): AuthenticatedUser {
  assert.equal(session.user.organizationId, null);
  return {
    id: session.user.id,
    organizationId: "",
    email: session.user.email,
  };
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

async function ensureExtraPosDevice(organizationId: string, branchId: string) {
  return prisma.posDevice.upsert({
    where: { deviceCode: `IT-MP-POS-EXTRA-${branchId}` },
    update: {
      organizationId,
      branchId,
      deviceName: "Caja integracion MP extra",
      deviceType: "desktop",
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
    create: {
      organizationId,
      branchId,
      deviceName: "Caja integracion MP extra",
      deviceCode: `IT-MP-POS-EXTRA-${branchId}`,
      deviceType: "desktop",
      status: "active",
      licensed: true,
      lastSeenAt: new Date(),
    },
  });
}

async function prepareMercadoPagoPos(configurator: AuthenticatedUser, branchId: string, posDeviceId: string) {
  await createOrSyncStoreForBranch(configurator, branchId);
  await createOrSyncExternalPosForPosDevice(configurator, posDeviceId);
}

async function prepareMercadoPagoTerminal(configurator: AuthenticatedUser, branchId: string, posDeviceId: string) {
  await startMercadoPagoOAuth(configurator);
  await prepareMercadoPagoPos(configurator, branchId, posDeviceId);
  const terminals = (await syncMercadoPagoTerminals(configurator, { branchId })).data;
  assert.equal(terminals.length > 0, true);
  await bindMercadoPagoTerminalToPos(configurator, posDeviceId, { paymentTerminalId: mockTerminal(terminals).id });
  return terminals;
}

function mockTerminal(terminals: Array<{ id: string; terminalId: string }>) {
  const terminal = terminals.find((item) => item.terminalId.includes("__TP")) ?? terminals[0];
  assert.ok(terminal, "Mercado Pago mock terminal must be synced");
  return terminal;
}

test("Mercado Pago terminal mock order approves and completes POS checkout once", async () => {
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
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
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);

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

test("Mercado Pago real terminal order requires explicit POS device", async () => {
  const previousMode = env.PHYSICAL_INTEGRATIONS_MODE;
  env.PHYSICAL_INTEGRATIONS_MODE = "real";
  try {
    const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
    const cashier = asAuthenticatedUser(cashierSession);
    const branchId = firstBranchId(cashierSession);
    const tortilla = await prisma.product.findFirstOrThrow({
      where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
    });

    await assert.rejects(
      () => createTerminalOrder(cashier, {
        branchId,
        amount: "24.00",
        saleDraft: {
          items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
        },
      }, `it-mp-real-pos-required-${Date.now()}`),
      (error) => error instanceof DomainError && error.code === "POS_DEVICE_REQUIRED",
    );
  } finally {
    env.PHYSICAL_INTEGRATIONS_MODE = previousMode;
  }
});

test("Mercado Pago terminal order is restricted to the selected POS binding and PDV mode", async () => {
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  const extraPosDevice = await ensureExtraPosDevice(cashier.organizationId, branchId);
  const terminals = await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);
  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });

  await assert.rejects(
    () => createTerminalOrder(cashier, {
      branchId,
      posDeviceId: extraPosDevice.id,
      amount: "24.00",
      saleDraft: {
        items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
      },
    }, `it-mp-wrong-pos-${Date.now()}`),
    (error) => error instanceof DomainError && error.code === "TERMINAL_NOT_ASSIGNED",
  );

  await prisma.paymentTerminal.update({
    where: { id: mockTerminal(terminals).id },
    data: { operatingMode: "STANDALONE" },
  });

  await assert.rejects(
    () => createTerminalOrder(cashier, {
      branchId,
      posDeviceId: posDevice.id,
      amount: "24.00",
      saleDraft: {
        items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
      },
    }, `it-mp-not-pdv-${Date.now()}`),
    (error) => error instanceof DomainError && error.code === "TERMINAL_NOT_PDV",
  );

  await prisma.paymentTerminal.update({
    where: { id: mockTerminal(terminals).id },
    data: { operatingMode: "PDV" },
  });
});

test("Mercado Pago terminal order is blocked when the organization is suspended by platform", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);
  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: cashier.organizationId, sku: "TORTILLA-KG" },
  });
  const originalOrganization = await prisma.organization.findUniqueOrThrow({
    where: { id: cashier.organizationId },
    select: { status: true },
  });

  try {
    await updatePlatformOrganizationStatus(platformUser, cashier.organizationId, {
      status: "suspended_limited",
    });

    await assert.rejects(
      () => createTerminalOrder(cashier, {
        branchId,
        posDeviceId: posDevice.id,
        amount: "24.00",
        saleDraft: {
          items: [{ productId: tortilla.id, saleMode: "by_kg", quantity: "1.000" }],
        },
      }, `it-mp-suspended-${Date.now()}`),
      (error) => error instanceof DomainError && error.code === "ORGANIZATION_NOT_OPERATIONAL",
    );
  } finally {
    await updatePlatformOrganizationStatus(platformUser, cashier.organizationId, {
      status: originalOrganization.status,
    });
  }
});

test("Mercado Pago open terminal order returns the active POS order only", async () => {
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);
  await prisma.paymentTerminalOrder.updateMany({
    where: {
      organizationId: cashier.organizationId,
      branchId,
      posDeviceId: posDevice.id,
      provider: "mercadopago",
      status: { in: ["created", "sent_to_terminal", "pending"] },
    },
    data: { status: "canceled", canceledAt: new Date() },
  });
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
  }, `it-mp-open-order-${Date.now()}`)).data;

  const openOrder = (await getOpenTerminalOrder(cashier, { branchId, posDeviceId: posDevice.id })).data;
  assert.equal(openOrder?.id, order.id);

  await prisma.paymentTerminalOrder.update({
    where: { id: order.id },
    data: { status: "canceled", canceledAt: new Date() },
  });

  const closedOrder = (await getOpenTerminalOrder(cashier, { branchId, posDeviceId: posDevice.id })).data;
  assert.equal(closedOrder, null);
});

test("Mercado Pago rejected terminal order blocks checkout", async () => {
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);
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
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const posDevice = await ensurePosDevice(cashier.organizationId, branchId);
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);

  let cashSession = (await getOpenCashSession(cashier, branchId)).data;
  if (!cashSession) {
    cashSession = (await openCashSession(cashier, {
      branchId,
      openingAmountCounted: "500.00",
      openingNote: "Pending terminal close test",
    })).data;
  }
  await prisma.cashMovement.updateMany({
    where: {
      cashSessionId: cashSession.id,
      status: "pending_authorization",
    },
    data: { status: "cancelled" },
  });

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
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const owner = asAuthenticatedUser(ownerSession);
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  const posDevice = await ensurePosDevice(manager.organizationId, branchId);
  await prepareMercadoPagoTerminal(owner, branchId, posDevice.id);
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
