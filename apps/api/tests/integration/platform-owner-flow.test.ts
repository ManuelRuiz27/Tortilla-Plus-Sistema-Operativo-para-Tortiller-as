import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { DomainError } from "../../src/lib/domain-error.js";
import { login } from "../../src/services/auth-service.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import {
  createPlatformManualPayment,
  createPlatformOrganization,
  getPlatformDashboard,
  getPlatformOrganization,
  getPlatformSubscription,
  listPlatformOrganizations,
  listPlatformAuditLog,
  listPlatformOrganizationPosDevices,
  listPlatformPayments,
  requirePlatformOwner,
  updatePlatformOrganization,
  updatePlatformOrganizationStatus,
  updatePlatformPosDeviceLicense,
  updatePlatformPosDeviceStatus,
  updatePlatformSubscription,
} from "../../src/services/platform-service.js";
import { openCashSession } from "../../src/services/cash-service.js";

function asPlatformUser(session: Awaited<ReturnType<typeof login>>): AuthenticatedUser {
  assert.equal(session.user.organizationId, null);
  return {
    id: session.user.id,
    organizationId: "",
    email: session.user.email,
  };
}

function asOperationalUser(session: Awaited<ReturnType<typeof login>>): AuthenticatedUser {
  assert.ok(session.user.organizationId);
  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email,
  };
}

function firstBranchId(session: Awaited<ReturnType<typeof login>>) {
  const branchId = session.user.branches[0]?.branchId;
  assert.ok(branchId);
  return branchId;
}

test("platform seed exposes platform_owner and no platform_admin", async () => {
  const platformOwner = await prisma.role.findUnique({ where: { code: "platform_owner" } });
  const platformAdmin = await prisma.role.findUnique({ where: { code: "platform_admin" } });
  const platformUser = await prisma.user.findFirst({
    where: { email: "admin@tortillaplus.mx", organizationId: null },
    include: { userRoleUser: { include: { role: true } } },
  });

  assert.equal(platformOwner?.scope, "platform");
  assert.equal(platformAdmin, null);
  assert.ok(platformUser);
  assert.ok(platformUser.userRoleUser.some((userRole) => userRole.role.code === "platform_owner"));
});

test("platform_owner can access platform services without branch or organization", async () => {
  const session = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  assert.equal(session.user.organizationId, null);
  assert.deepEqual(session.user.branches, []);
  assert.ok(session.user.roles.includes("platform_owner"));

  const currentUser: AuthenticatedUser = {
    id: session.user.id,
    organizationId: "",
    email: session.user.email,
  };

  await assert.doesNotReject(() => requirePlatformOwner(currentUser));
  assert.equal(typeof (await getPlatformDashboard(currentUser)).data.organizationsTotal, "number");
  assert.ok(Array.isArray((await listPlatformOrganizations(currentUser)).data));
});

test("organization users cannot access platform services", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  assert.ok(session.user.organizationId);

  const currentUser: AuthenticatedUser = {
    id: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email,
  };

  await assert.rejects(
    () => getPlatformDashboard(currentUser),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "PLATFORM_ACCESS_REQUIRED");
      return true;
    },
  );
});

test("platform_owner can execute organization, subscription, POS and payment mutations with audit trail", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();

  const created = await createPlatformOrganization(platformUser, {
    name: `IT Plataforma ${suffix}`,
    legalName: `IT Plataforma Legal ${suffix}`,
    taxId: `IT${String(suffix).slice(-10)}`,
    contactEmail: `platform-it-${suffix}@tortillaplus.mx`,
    contactPhone: "5550001234",
    planCode: "free",
  });

  const organizationId = created.data.id;
  const businessUnit = await prisma.businessUnit.create({
    data: {
      organizationId,
      name: `Unidad ${suffix}`,
    },
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId,
      businessUnitId: businessUnit.id,
      name: `Sucursal ${suffix}`,
      timezone: "America/Mexico_City",
    },
  });
  const posDevice = await prisma.posDevice.create({
    data: {
      organizationId,
      branchId: branch.id,
      deviceName: `POS IT ${suffix}`,
      deviceCode: `IT-PLATFORM-POS-${suffix}`,
      deviceType: "desktop",
      status: "pending_activation",
      licensed: false,
    },
  });

  const initialSubscription = (await getPlatformSubscription(platformUser, organizationId)).data;
  assert.ok(initialSubscription);

  await updatePlatformOrganization(platformUser, organizationId, {
    name: `IT Plataforma Editada ${suffix}`,
    contactPhone: "5550005678",
  });
  await updatePlatformOrganizationStatus(platformUser, organizationId, {
    status: "past_due",
  });
  await updatePlatformSubscription(platformUser, organizationId, {
    planCode: "paid",
    status: "active",
    billingPeriod: "annual",
    currentPeriodStart: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2026-12-31T23:59:59.000Z",
  });
  await updatePlatformPosDeviceStatus(platformUser, posDevice.id, {
    status: "active",
  });
  await updatePlatformPosDeviceLicense(platformUser, posDevice.id, {
    licensed: true,
  });

  const payment = await createPlatformManualPayment(platformUser, {
    organizationId,
    subscriptionId: initialSubscription.id,
    amount: "999.00",
    currency: "MXN",
    paidAt: "2026-01-15T12:00:00.000Z",
    note: "Integration platform payment",
  });

  const organization = (await getPlatformOrganization(platformUser, organizationId)).data;
  const devices = (await listPlatformOrganizationPosDevices(platformUser, organizationId)).data;
  const payments = (await listPlatformPayments(platformUser)).data.filter((item) => item.organizationId === organizationId);
  const auditTrail = (await listPlatformAuditLog(platformUser, { organizationId })).data;
  const paymentAudits = (await listPlatformAuditLog(platformUser, {
    organizationId,
    action: "platform_manual_payment_recorded",
  })).data;

  assert.equal(organization.name, `IT Plataforma Editada ${suffix}`);
  assert.equal(organization.contactPhone, "5550005678");
  assert.equal(organization.status, "past_due");
  assert.equal(organization.subscription?.planCode, "paid");
  assert.equal(organization.subscription?.status, "active");
  assert.equal(organization.subscription?.billingPeriod, "annual");
  assert.equal(devices.some((device) => device.id === posDevice.id && device.status === "active" && device.licensed), true);
  assert.equal(
    payments.some((item) => item.id === payment.data.id && Number(item.amount).toFixed(2) === "999.00"),
    true,
  );

  const expectedActions = [
    "platform_organization_created",
    "platform_organization_updated",
    "platform_organization_status_updated",
    "platform_subscription_updated",
    "platform_pos_device_status_updated",
    "platform_pos_device_license_updated",
    "platform_manual_payment_recorded",
  ];
  for (const action of expectedActions) {
    assert.equal(auditTrail.some((log) => log.action === action), true, `missing audit action ${action}`);
  }
  assert.equal(paymentAudits.length >= 1, true);
  assert.equal(paymentAudits.every((log) => log.action === "platform_manual_payment_recorded"), true);
});

test("platform suspension blocks opening cash sessions for operational users", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const cashier = asOperationalUser(cashierSession);
  const branchId = firstBranchId(cashierSession);
  const originalOrganization = await prisma.organization.findUniqueOrThrow({
    where: { id: cashier.organizationId },
    select: { status: true },
  });

  try {
    await updatePlatformOrganizationStatus(platformUser, cashier.organizationId, {
      status: "suspended_limited",
    });

    await assert.rejects(
      () => openCashSession(cashier, {
        branchId,
        openingAmountCounted: "250.00",
        openingNote: "blocked by platform suspension",
      }),
      (error: unknown) => error instanceof DomainError && error.code === "ORGANIZATION_NOT_OPERATIONAL",
    );
  } finally {
    await updatePlatformOrganizationStatus(platformUser, cashier.organizationId, {
      status: originalOrganization.status,
    });
  }
});
