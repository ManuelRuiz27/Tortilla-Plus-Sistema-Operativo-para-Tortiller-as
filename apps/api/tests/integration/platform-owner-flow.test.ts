import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { DomainError } from "../../src/lib/domain-error.js";
import { login } from "../../src/services/auth-service.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import {
  cancelPlatformOneTimeCharge,
  createPlatformOneTimeCharge,
  generatePlatformBillingCycle,
  getPlatformBillingSummary,
  getPlatformCfdiUsage,
  listPlatformCommercialPlans,
  markPlatformBillingCyclePaid,
  recalculatePlatformBillingCycle,
  updateOverdueBillingStatuses,
  updatePlatformSubscriptionItems,
} from "../../src/services/billing-cycle-service.js";
import {
  createPlatformManualPayment,
  createPlatformOrganization,
  createPlatformOrganizationOwner,
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
import {
  createOrganizationBranch,
  createOrganizationPosDevice,
  createOrganizationUser,
  getOrganizationSummary,
} from "../../src/services/organization-service.js";

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

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
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

test("pilot role permission matrix does not leak platform permissions", async () => {
  const roles = await prisma.role.findMany({
    where: { code: { in: ["platform_owner", "organization_owner", "manager", "supervisor", "cashier"] } },
    include: { rolePermissionRole: { include: { permission: true } } },
  });
  const permissionsByRole = new Map(
    roles.map((role) => [role.code, role.rolePermissionRole.map((rolePermission) => rolePermission.permission.code)]),
  );

  assert.deepEqual(
    (permissionsByRole.get("platform_owner") ?? []).every((permission) => permission.startsWith("platform.")),
    true,
  );
  for (const role of ["organization_owner", "manager", "supervisor", "cashier"]) {
    assert.equal(
      (permissionsByRole.get(role) ?? []).some((permission) => permission.startsWith("platform.")),
      false,
      `${role} must not have platform permissions`,
    );
  }
  assert.equal((permissionsByRole.get("cashier") ?? []).includes("payments.cancel_terminal_order"), false);
  assert.equal((permissionsByRole.get("manager") ?? []).includes("payments.cancel_terminal_order"), true);
  assert.equal((permissionsByRole.get("supervisor") ?? []).includes("payments.cancel_terminal_order"), true);
  assert.equal((permissionsByRole.get("organization_owner") ?? []).includes("integrations.manage"), true);
  assert.equal((permissionsByRole.get("manager") ?? []).includes("integrations.manage"), false);
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

test("organization_owner can manage internal users, branches and unlicensed POS devices", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const owner = asOperationalUser(ownerSession);
  const suffix = Date.now();
  await updatePlatformSubscriptionItems(platformUser, owner.organizationId, {
    items: [
      { itemType: "extra_branch", quantity: 100, unitPrice: "149.00", currency: "MXN", status: "active" },
      { itemType: "extra_pos", quantity: 100, unitPrice: "99.00", currency: "MXN", status: "active" },
    ],
  });
  const branch = (await createOrganizationBranch(owner, { name: `Owner IT ${suffix}` })).data;
  const user = (await createOrganizationUser(owner, {
    name: `Cajero Owner IT ${suffix}`,
    email: `owner-it-cashier-${suffix}@tortillaplus.mx`,
    role: "cashier",
    branchId: branch.id,
  })).data;
  const posDevice = (await createOrganizationPosDevice(owner, {
    name: `POS Owner IT ${suffix}`,
    branchId: branch.id,
    deviceCode: `OWNER-IT-POS-${suffix}`,
  })).data;
  const summary = (await getOrganizationSummary(owner)).data;

  assert.equal(user.roles.includes("cashier"), true);
  assert.equal(user.branches.some((assignment) => assignment.branchId === branch.id), true);
  assert.equal(posDevice.licensed, false);
  assert.equal(summary.branches.some((item) => item.id === branch.id), true);
  assert.equal(summary.posDevices.some((item) => item.id === posDevice.id && !item.licensed), true);
});

test("organization_owner cannot exceed contracted branch and POS limits", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const created = await createPlatformOrganization(platformUser, {
    name: `IT Limits ${suffix}`,
    contactEmail: `limits-${suffix}@tortillaplus.mx`,
    planCode: "mostrador",
    owner: {
      name: `Owner Limits ${suffix}`,
      email: `owner-limits-${suffix}@tortillaplus.mx`,
      password: "Owner1234!",
      pin: "2468",
    },
  });
  const ownerSession = await login({ email: `owner-limits-${suffix}@tortillaplus.mx`, password: "Owner1234!" });
  const owner = asOperationalUser(ownerSession);
  const businessUnit = await prisma.businessUnit.create({
    data: {
      organizationId: created.data.id,
      name: `Unidad Limits ${suffix}`,
    },
  });
  const branch = await prisma.branch.create({
    data: {
      organizationId: created.data.id,
      businessUnitId: businessUnit.id,
      name: `Sucursal Limits ${suffix}`,
      timezone: "America/Mexico_City",
      status: "active",
    },
  });
  const existingPos = await prisma.posDevice.findFirst({ where: { organizationId: created.data.id } });
  if (!existingPos) {
    await prisma.posDevice.create({
      data: {
        organizationId: created.data.id,
        branchId: branch.id,
        deviceName: `POS Limite Base ${suffix}`,
        deviceCode: `LIMIT-BASE-${suffix}`,
        deviceType: "desktop",
        status: "pending_activation",
        licensed: false,
      },
    });
  }

  await assert.rejects(
    () => createOrganizationBranch(owner, { name: `Sucursal excedente ${suffix}` }),
    (error: unknown) => error instanceof DomainError && error.code === "BRANCH_LIMIT_REACHED",
  );
  await assert.rejects(
    () => createOrganizationPosDevice(owner, {
      name: `POS excedente ${suffix}`,
      branchId: branch.id,
      deviceCode: `LIMIT-EXTRA-${suffix}`,
    }),
    (error: unknown) => error instanceof DomainError && error.code === "POS_LIMIT_REACHED",
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

test("platform_owner generates monthly billing cycle from active subscription items and paid cycles cannot be recalculated", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const created = await createPlatformOrganization(platformUser, {
    name: `IT Billing ${suffix}`,
    contactEmail: `billing-it-${suffix}@tortillaplus.mx`,
    planCode: "paid",
  });
  const organizationId = created.data.id;
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { organizationId },
    include: { subscriptionItemSubscription: true },
  });
  const basePlan = subscription.subscriptionItemSubscription.find((item) => item.itemType === "base_plan");
  assert.ok(basePlan);
  assert.equal(Number(basePlan.unitPrice).toFixed(2), "599.00");

  const cycle = await generatePlatformBillingCycle(platformUser, organizationId, {
    periodStart: "2027-01-01",
    periodEnd: "2027-01-31",
    dueDate: "2027-02-05",
  });

  assert.equal(cycle.data.status, "pending");
  assert.equal(cycle.data.items.some((item) => item.itemType === "base_plan"), true);
  assert.equal(cycle.data.subtotal, "599.00");
  assert.equal(cycle.data.taxTotal, "95.84");
  assert.equal(cycle.data.total, "694.84");

  await prisma.subscriptionItem.update({
    where: { id: basePlan.id },
    data: { unitPrice: "777.00" },
  });

  const persistedCycle = await prisma.billingCycle.findUniqueOrThrow({
    where: { id: cycle.data.id },
    include: { billingCycleItemCycle: true },
  });
  const persistedBasePlan = persistedCycle.billingCycleItemCycle.find((item) => item.itemType === "base_plan");
  assert.equal(Number(persistedBasePlan?.unitPrice).toFixed(2), "599.00");

  const paid = await markPlatformBillingCyclePaid(platformUser, cycle.data.id, {
    reference: `MANUAL-${suffix}`,
    notes: "Pago manual de integracion",
  });
  assert.equal(paid.data.cycle.status, "paid");
  assert.ok(paid.data.payment);
  assert.equal(paid.data.payment.billingCycleId, cycle.data.id);

  await assert.rejects(
    () => recalculatePlatformBillingCycle(platformUser, cycle.data.id),
    (error: unknown) => error instanceof DomainError && error.code === "BILLING_CYCLE_PAID",
  );

  const summary = await getPlatformBillingSummary(platformUser, organizationId);
  assert.equal(summary.data.pendingBalance, "0.00");
});

test("platform billing covers commercial plans, one-time charges, subscription item updates and CFDI overage", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const plans = await listPlatformCommercialPlans(platformUser);
  assert.equal(plans.data.some((plan) => plan.code === "mostrador" && plan.monthlyPrice === "299.00"), true);
  assert.equal(plans.data.some((plan) => plan.code === "comercial" && plan.limits.cfdi === 100), true);

  const created = await createPlatformOrganization(platformUser, {
    name: `IT Billing Completo ${suffix}`,
    contactEmail: `billing-completo-${suffix}@tortillaplus.mx`,
    planCode: "mostrador",
  });
  const organizationId = created.data.id;
  const subscription = await prisma.subscription.findFirstOrThrow({
    where: { organizationId },
    include: { subscriptionItemSubscription: true },
  });
  const basePlan = subscription.subscriptionItemSubscription.find((item) => item.itemType === "base_plan");
  assert.ok(basePlan);
  assert.equal(Number(basePlan.unitPrice).toFixed(2), "299.00");

  await updatePlatformSubscriptionItems(platformUser, organizationId, {
    items: [
      { id: basePlan.id, itemType: "base_plan", quantity: 1, unitPrice: "349.00", currency: "MXN", status: "active" },
      { itemType: "extra_pos", quantity: 1, unitPrice: "99.00", currency: "MXN", status: "active" },
    ],
  });
  await createPlatformOneTimeCharge(platformUser, organizationId, {
    chargeType: "setup",
    description: "Setup inicial Tortilla Plus",
    amount: "1000.00",
  });

  await prisma.invoice.create({
    data: {
      organizationId,
      invoiceType: "individual",
      status: "stamped",
      cfdiUuid: `IT-CFDI-${suffix}`,
      invoiceDate: new Date("2027-03-05T00:00:00.000Z"),
      issuedAt: new Date("2027-03-05T12:00:00.000Z"),
      subtotal: "10.00",
      taxTotal: "1.60",
      total: "11.60",
    },
  });

  const usage = await getPlatformCfdiUsage(platformUser, organizationId, {
    periodStart: "2027-03-01",
    periodEnd: "2027-03-31",
  });
  assert.equal(usage.data.includedLimit, 0);
  assert.equal(usage.data.usedCount, 1);
  assert.equal(usage.data.overageCount, 1);
  assert.equal(usage.data.overageTotal, "6.00");

  const cycle = await generatePlatformBillingCycle(platformUser, organizationId, {
    periodStart: "2027-03-01",
    periodEnd: "2027-03-31",
    dueDate: "2027-04-05",
  });
  assert.equal(cycle.data.items.some((item) => item.itemType === "base_plan" && item.unitPrice === "349.00"), true);
  assert.equal(cycle.data.items.some((item) => item.itemType === "extra_pos" && item.unitPrice === "99.00"), true);
  assert.equal(cycle.data.items.some((item) => item.itemType === "setup" && item.subtotal === "1000.00"), true);
  assert.equal(cycle.data.items.some((item) => item.itemType === "cfdi_overage" && item.total === "6.00"), true);
  assert.equal(cycle.data.subtotal, "1453.17");
  assert.equal(cycle.data.taxTotal, "232.51");
  assert.equal(cycle.data.total, "1685.68");

  const auditTrail = (await listPlatformAuditLog(platformUser, { organizationId })).data;
  assert.equal(auditTrail.some((log) => log.action === "subscription_items_updated"), true);
  assert.equal(auditTrail.some((log) => log.action === "one_time_charge_created"), true);
});

test("billing overdue scheduler transitions cycles, subscriptions and organizations", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const cases = [
    { label: "grace", daysPastDue: 1, cycleStatus: "graced", subscriptionStatus: "grace_period", organizationStatus: "grace_period" },
    { label: "past", daysPastDue: 6, cycleStatus: "overdue", subscriptionStatus: "past_due", organizationStatus: "past_due" },
    { label: "suspended", daysPastDue: 10, cycleStatus: "suspended", subscriptionStatus: "suspended_limited", organizationStatus: "suspended_limited" },
    { label: "cancelled", daysPastDue: 30, cycleStatus: "cancelled", subscriptionStatus: "cancelled", organizationStatus: "cancelled" },
  ] as const;

  for (const scenario of cases) {
    const created = await createPlatformOrganization(platformUser, {
      name: `IT Billing Scheduler ${scenario.label} ${suffix}`,
      contactEmail: `billing-scheduler-${scenario.label}-${suffix}@tortillaplus.mx`,
      planCode: "operativo",
    });
    const organizationId = created.data.id;
    const dueDate = daysAgo(scenario.daysPastDue);
    const cycle = await generatePlatformBillingCycle(platformUser, organizationId, {
      periodStart: `2028-0${cases.indexOf(scenario) + 1}-01`,
      periodEnd: `2028-0${cases.indexOf(scenario) + 1}-28`,
      dueDate: isoDate(dueDate),
    });

    await updateOverdueBillingStatuses();

    const persistedCycle = await prisma.billingCycle.findUniqueOrThrow({ where: { id: cycle.data.id } });
    const subscription = await prisma.subscription.findFirstOrThrow({ where: { organizationId } });
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    assert.equal(persistedCycle.status, scenario.cycleStatus);
    assert.equal(subscription.status, scenario.subscriptionStatus);
    assert.equal(organization.status, scenario.organizationStatus);
  }
});

test("billing overdue scheduler and payment recovery write required audit events", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const created = await createPlatformOrganization(platformUser, {
    name: `IT Billing Audit ${suffix}`,
    contactEmail: `billing-audit-${suffix}@tortillaplus.mx`,
    planCode: "operativo",
  });
  const organizationId = created.data.id;
  const cycle = await generatePlatformBillingCycle(platformUser, organizationId, {
    periodStart: "2028-08-01",
    periodEnd: "2028-08-31",
    dueDate: isoDate(daysAgo(10)),
  });

  await updateOverdueBillingStatuses();
  let auditTrail = (await listPlatformAuditLog(platformUser, { organizationId })).data;
  assert.equal(auditTrail.some((log) => log.action === "subscription_status_changed"), true);
  assert.equal(auditTrail.some((log) => log.action === "organization_suspended_for_non_payment"), true);

  await markPlatformBillingCyclePaid(platformUser, cycle.data.id, {
    reference: `RECOVERY-${suffix}`,
    notes: "Pago de recuperacion",
  });

  const subscription = await prisma.subscription.findFirstOrThrow({ where: { organizationId } });
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  assert.equal(subscription.status, "active");
  assert.equal(organization.status, "active");

  auditTrail = (await listPlatformAuditLog(platformUser, { organizationId })).data;
  assert.equal(auditTrail.some((log) => log.action === "organization_reactivated_after_payment"), true);
});

test("platform_owner can cancel pending one-time charges with audit trail", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();
  const created = await createPlatformOrganization(platformUser, {
    name: `IT One Time Cancel ${suffix}`,
    contactEmail: `one-time-cancel-${suffix}@tortillaplus.mx`,
    planCode: "mostrador",
  });
  const organizationId = created.data.id;
  const charge = await createPlatformOneTimeCharge(platformUser, organizationId, {
    chargeType: "training_extra",
    description: "Capacitacion reagendada",
    amount: "500.00",
  });

  const cancelled = await cancelPlatformOneTimeCharge(platformUser, charge.data.id);
  assert.equal(cancelled.data.status, "cancelled");

  const auditTrail = (await listPlatformAuditLog(platformUser, { organizationId })).data;
  assert.equal(auditTrail.some((log) => log.action === "one_time_charge_cancelled"), true);
});

test("organization users cannot generate platform billing cycles", async () => {
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const manager = asOperationalUser(managerSession);

  await assert.rejects(
    () => generatePlatformBillingCycle(manager, manager.organizationId, {}),
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "PLATFORM_ACCESS_REQUIRED");
      return true;
    },
  );
});

test("platform_owner creates initial organization_owner and rejects duplicates", async () => {
  const platformSession = await login({ email: "admin@tortillaplus.mx", password: "Demo1234!" });
  const platformUser = asPlatformUser(platformSession);
  const suffix = Date.now();

  const created = await createPlatformOrganization(platformUser, {
    name: `IT Owner Inicial ${suffix}`,
    contactEmail: `owner-inicial-org-${suffix}@tortillaplus.mx`,
    planCode: "free",
    owner: {
      name: `Owner Inicial ${suffix}`,
      email: `owner-inicial-${suffix}@tortillaplus.mx`,
      password: "Owner1234!",
      pin: "2468",
    },
  });

  const organization = (await getPlatformOrganization(platformUser, created.data.id)).data;
  assert.ok(created.data.owner);
  assert.equal(created.data.owner?.email, `owner-inicial-${suffix}@tortillaplus.mx`);
  assert.equal(
    organization.users.some((user) => user.email === `owner-inicial-${suffix}@tortillaplus.mx` && user.roles.includes("organization_owner")),
    true,
  );

  const ownerSession = await login({ email: `owner-inicial-${suffix}@tortillaplus.mx`, password: "Owner1234!" });
  assert.equal(ownerSession.user.organizationId, created.data.id);
  assert.ok(ownerSession.user.roles.includes("organization_owner"));

  await assert.rejects(
    () =>
      createPlatformOrganizationOwner(platformUser, created.data.id, {
        name: `Owner Duplicado ${suffix}`,
        email: `owner-duplicado-${suffix}@tortillaplus.mx`,
        password: "Owner1234!",
      }),
    (error: unknown) => error instanceof DomainError && error.code === "ORGANIZATION_OWNER_EXISTS",
  );
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
