import type { Prisma } from "@prisma/client";

import { commercialPlanDefinitions } from "../bootstrap/system-catalog.js";
import { DomainError } from "../lib/domain-error.js";
import { hashSecret } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";

const activeSubscriptionStatuses = ["trial", "active", "past_due", "grace_period", "suspended_limited"] as const;
const organizationStatuses = ["active", "past_due", "grace_period", "suspended_limited", "cancelled"] as const;
const subscriptionStatuses = ["trial", "active", "past_due", "grace_period", "suspended_limited", "cancelled", "expired"] as const;
const billingPeriods = ["monthly", "annual"] as const;
const deviceStatuses = ["pending_activation", "active", "inactive", "blocked"] as const;
type OrganizationOwnerInput = {
  name: string;
  email: string;
  password: string;
  phone: string | null;
  pin: string | null;
};

export async function requirePlatformOwner(currentUser: AuthenticatedUser) {
  if (currentUser.organizationId !== "") {
    throw new DomainError(403, "PLATFORM_ACCESS_REQUIRED", "Acceso exclusivo de plataforma.");
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { userRoleUser: { include: { role: true } } },
  });

  const platformRole = user?.userRoleUser.find(
    (userRole) =>
      userRole.organizationId === null &&
      userRole.role.code === "platform_owner" &&
      userRole.role.scope === "platform",
  );

  if (!user || user.status !== "active" || user.organizationId !== null || !platformRole) {
    throw new DomainError(403, "PLATFORM_ACCESS_REQUIRED", "Acceso exclusivo de plataforma.");
  }

  return user;
}

export async function getPlatformDashboard(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const [
    organizationsTotal,
    organizationsActive,
    organizationsSuspended,
    branchesActive,
    posDevicesActive,
    posDevicesLicensed,
    subscriptionsActive,
    subscriptionsTrial,
    subscriptionsPastDue,
    subscriptionsGrace,
    organizationsGrace,
    payments,
    pendingCycles,
    setupCharges,
    cfdiOverages,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "active" } }),
    prisma.organization.count({ where: { status: { in: ["suspended_limited", "cancelled"] } } }),
    prisma.branch.count({ where: { status: "active" } }),
    prisma.posDevice.count({ where: { status: "active" } }),
    prisma.posDevice.count({ where: { licensed: true } }),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({ where: { status: "trial" } }),
    prisma.subscription.count({ where: { status: "past_due" } }),
    prisma.subscription.count({ where: { status: "grace_period" } }),
    prisma.organization.count({ where: { status: "grace_period" } }),
    prisma.saasPayment.findMany({
      where: { status: "approved", paidAt: { gte: currentMonthStart } },
      select: { amount: true, subtotal: true, taxTotal: true },
    }),
    prisma.billingCycle.findMany({ where: { status: { not: "paid" } }, select: { total: true, taxTotal: true } }),
    prisma.saasOneTimeCharge.findMany({ where: { chargeType: "setup", status: { in: ["included_in_cycle", "paid"] }, createdAt: { gte: currentMonthStart } }, select: { amount: true } }),
    prisma.billingCycleItem.findMany({ where: { itemType: "cfdi_overage", createdAt: { gte: currentMonthStart } }, select: { subtotal: true } }),
  ]);

  const paymentsCurrentMonth = sumDecimals(payments.map((payment) => payment.amount));
  const paymentsSubtotalCurrentMonth = sumDecimals(payments.map((payment) => payment.subtotal));
  const paymentsTaxCurrentMonth = sumDecimals(payments.map((payment) => payment.taxTotal));
  const accountsReceivable = sumDecimals(pendingCycles.map((cycle) => cycle.total));
  const taxReceivable = sumDecimals(pendingCycles.map((cycle) => cycle.taxTotal));
  const setupRevenueCurrentMonth = sumDecimals(setupCharges.map((charge) => charge.amount));
  const cfdiOverageRevenueCurrentMonth = sumDecimals(cfdiOverages.map((item) => item.subtotal));
  const monthlyRecurringRevenue = await calculateMonthlyRecurringRevenue();
  const alerts = [];
  if (subscriptionsPastDue > 0) alerts.push({ type: "past_due", message: "Hay suscripciones vencidas.", count: subscriptionsPastDue });
  if (organizationsSuspended > 0) alerts.push({ type: "suspended", message: "Hay organizaciones suspendidas o canceladas.", count: organizationsSuspended });

  return {
    data: {
      organizationsTotal,
      organizationsActive,
      organizationsSuspended,
      branchesActive,
      posDevicesActive,
      posDevicesLicensed,
      subscriptionsActive,
      subscriptionsTrial,
      subscriptionsPastDue,
      subscriptionsGrace,
      organizationsGrace,
      monthlyRecurringRevenue,
      paymentsCurrentMonth,
      paymentsSubtotalCurrentMonth,
      paymentsTaxCurrentMonth,
      accountsReceivable,
      taxReceivable,
      setupRevenueCurrentMonth,
      cfdiOverageRevenueCurrentMonth,
      alerts,
    },
  };
}

export async function listPlatformOrganizations(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  const organizations = await prisma.organization.findMany({
    include: {
      branchOrganization: true,
      posDeviceOrganization: true,
      saasPaymentOrganization: { orderBy: { paidAt: "desc" }, take: 1 },
      subscriptionOrganization: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    data: organizations.map((organization) => {
      const subscription = organization.subscriptionOrganization[0] ?? null;
      return {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        taxId: organization.taxId,
        contactEmail: organization.contactEmail,
        contactPhone: organization.contactPhone,
        status: organization.status,
        plan: subscription?.plan.code ?? null,
        subscriptionId: subscription?.id ?? null,
        subscriptionStatus: subscription?.status ?? null,
        branches: organization.branchOrganization.length,
        posDevicesActive: organization.posDeviceOrganization.filter((device) => device.status === "active").length,
        posDevicesLicensed: organization.posDeviceOrganization.filter((device) => device.licensed).length,
        lastPaymentAt: organization.saasPaymentOrganization[0]?.paidAt?.toISOString() ?? null,
        createdAt: organization.createdAt.toISOString(),
      };
    }),
  };
}

export async function createPlatformOrganization(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const planCode = optionalString(body.planCode) ?? "free";
  const plan = await getPlanByCode(planCode);
  const ownerInput = getOptionalOwnerInput(body);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: asString(body.name, "name"),
        legalName: optionalString(body.legalName),
        taxId: optionalString(body.taxId),
        contactEmail: asString(body.contactEmail, "contactEmail"),
        contactPhone: optionalString(body.contactPhone),
        status: "active",
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        status: plan.code === "paid" ? "active" : "trial",
        provider: "manual",
        billingPeriod: "monthly",
        startedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextMonth(),
      },
    });
    await createDefaultSubscriptionItems(tx, subscription.id, plan.code);

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: currentUser.id,
        action: "platform_organization_created",
        entityType: "organization",
        entityId: organization.id,
        afterSnapshot: serialize(organization),
      },
    });

    const owner = ownerInput ? await createOrganizationOwner(tx, currentUser, organization.id, ownerInput) : null;
    return { organization, owner };
  });

  return {
    data: {
      id: result.organization.id,
      name: result.organization.name,
      status: result.organization.status,
      owner: result.owner,
    },
  };
}

export async function createPlatformOrganizationOwner(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Organizacion no encontrada.");
  const owner = await prisma.$transaction((tx) => createOrganizationOwner(tx, currentUser, organizationId, asOwnerInput(asRecord(input))));
  return { data: owner };
}

export async function getPlatformOrganization(currentUser: AuthenticatedUser, organizationId: string) {
  await requirePlatformOwner(currentUser);
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      branchOrganization: true,
      userOrganization: { include: { userRoleUser: { include: { role: true } } } },
      posDeviceOrganization: { include: { organization: true, branch: true } },
      saasPaymentOrganization: { orderBy: { createdAt: "desc" }, take: 20 },
      auditLogOrganization: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 25 },
      subscriptionOrganization: {
        include: { plan: true, subscriptionItemSubscription: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!organization) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Organizacion no encontrada.");

  return {
    data: {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName,
      taxId: organization.taxId,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      status: organization.status,
      createdAt: organization.createdAt.toISOString(),
      branches: organization.branchOrganization.map((branch) => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
      })),
      users: organization.userOrganization.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        roles: user.userRoleUser.map((userRole) => userRole.role.code),
      })),
      subscription: serializeSubscription(organization.subscriptionOrganization[0] ?? null),
      posDevices: organization.posDeviceOrganization.map(serializePosDevice),
      payments: organization.saasPaymentOrganization.map(serializePayment),
      auditLogs: organization.auditLogOrganization.map(serializeAuditLog),
    },
  };
}

export async function updatePlatformOrganization(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const before = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!before) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Organizacion no encontrada.");

  const after = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.update({
      where: { id: organizationId },
      data: {
        name: optionalString(body.name) ?? before.name,
        legalName: optionalString(body.legalName) ?? before.legalName,
        taxId: optionalString(body.taxId) ?? before.taxId,
        contactEmail: optionalString(body.contactEmail) ?? before.contactEmail,
        contactPhone: optionalString(body.contactPhone) ?? before.contactPhone,
        updatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "platform_organization_updated",
        entityType: "organization",
        entityId: organizationId,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(organization),
      },
    });

    return organization;
  });

  return { data: { id: after.id, name: after.name, status: after.status } };
}

export async function updatePlatformOrganizationStatus(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const status = enumValue(body.status, organizationStatuses, "status");
  const before = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!before) throw new DomainError(404, "ORGANIZATION_NOT_FOUND", "Organizacion no encontrada.");

  const after = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.update({
      where: { id: organizationId },
      data: { status, updatedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "platform_organization_status_updated",
        entityType: "organization",
        entityId: organizationId,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(organization),
      },
    });
    return organization;
  });

  return { data: { id: after.id, status: after.status } };
}

export async function getPlatformSubscription(currentUser: AuthenticatedUser, organizationId: string) {
  await requirePlatformOwner(currentUser);
  const subscription = await getCurrentOrganizationSubscription(organizationId);
  return { data: serializeSubscription(subscription) };
}

export async function updatePlatformSubscription(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const before = await getCurrentOrganizationSubscription(organizationId);
  if (!before) throw new DomainError(404, "SUBSCRIPTION_NOT_FOUND", "Suscripcion no encontrada.");
  const planCode = optionalString(body.planCode);
  const plan = planCode ? await getPlanByCode(planCode) : null;

  const after = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { id: before.id },
      data: {
        planId: plan?.id ?? before.planId,
        status: enumValue(body.status ?? before.status, subscriptionStatuses, "status"),
        billingPeriod: enumValue(body.billingPeriod ?? before.billingPeriod, billingPeriods, "billingPeriod"),
        currentPeriodStart: optionalDate(body.currentPeriodStart) ?? before.currentPeriodStart,
        currentPeriodEnd: optionalDate(body.currentPeriodEnd) ?? before.currentPeriodEnd,
        graceUntil: optionalDate(body.graceUntil),
        provider: "manual",
        updatedAt: new Date(),
      },
      include: { plan: true, subscriptionItemSubscription: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "platform_subscription_updated",
        entityType: "subscription",
        entityId: subscription.id,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(subscription),
      },
    });

    return subscription;
  });

  return { data: serializeSubscription(after) };
}

export async function listPlatformOrganizationPosDevices(currentUser: AuthenticatedUser, organizationId: string) {
  await requirePlatformOwner(currentUser);
  const devices = await prisma.posDevice.findMany({
    where: { organizationId },
    include: { organization: true, branch: true },
    orderBy: [{ status: "asc" }, { deviceName: "asc" }],
  });
  return { data: devices.map(serializePosDevice) };
}

export async function listPlatformPosDevices(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  const devices = await prisma.posDevice.findMany({
    include: { organization: true, branch: true },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  return { data: devices.map(serializePosDevice) };
}

export async function updatePlatformPosDeviceStatus(currentUser: AuthenticatedUser, posDeviceId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const status = enumValue(asRecord(input).status, deviceStatuses, "status");
  return updatePosDevice(currentUser, posDeviceId, { status }, "platform_pos_device_status_updated");
}

export async function updatePlatformPosDeviceLicense(currentUser: AuthenticatedUser, posDeviceId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  if (typeof body.licensed !== "boolean") throw new DomainError(400, "INVALID_REQUEST", "Campo requerido: licensed.");
  return updatePosDevice(currentUser, posDeviceId, { licensed: body.licensed }, "platform_pos_device_license_updated");
}

export async function listPlatformPayments(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  const payments = await prisma.saasPayment.findMany({
    include: { organization: true, subscription: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return { data: payments.map(serializePayment) };
}

export async function createPlatformManualPayment(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const organizationId = asString(body.organizationId, "organizationId");
  const subscriptionId = asString(body.subscriptionId, "subscriptionId");
  const amount = asPositiveMoney(body.amount);
  const paidAt = optionalDate(body.paidAt) ?? new Date();
  const note = optionalString(body.note ?? body.notes);
  const paymentMethod = optionalString(body.paymentMethod) ?? "manual";
  const reference = optionalString(body.reference ?? body.providerPaymentId);
  const billingCycleId = optionalString(body.billingCycleId);

  const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, organizationId } });
  if (!subscription) throw new DomainError(404, "SUBSCRIPTION_NOT_FOUND", "Suscripcion no encontrada.");
  const billingCycle = billingCycleId
    ? await prisma.billingCycle.findFirst({
        where: { id: billingCycleId, organizationId, subscriptionId },
        include: { saasPaymentCycle: true },
      })
    : null;
  if (billingCycleId && !billingCycle) throw new DomainError(404, "BILLING_CYCLE_NOT_FOUND", "Corte no encontrado.");

  const payment = await prisma.$transaction(async (tx) => {
    const subtotal = optionalString(body.subtotal) ?? (Number(amount) / 1.16).toFixed(2);
    const taxTotal = optionalString(body.taxTotal) ?? (Number(amount) - Number(subtotal)).toFixed(2);
    const created = await tx.saasPayment.create({
      data: {
        organizationId,
        subscriptionId,
        billingCycleId,
        provider: "manual",
        providerPaymentId: reference,
        subtotal,
        taxTotal,
        amount,
        currency: optionalString(body.currency) ?? "MXN",
        status: "approved",
        paymentMethod,
        reference,
        notes: note,
        paidAt,
        rawPayload: note ? { note } : undefined,
      },
    });

    let paidCycle = null;
    if (billingCycle) {
      const paidTotal = sumDecimals(billingCycle.saasPaymentCycle
        .filter((cyclePayment) => cyclePayment.status === "approved")
        .map((cyclePayment) => cyclePayment.amount)) + Number(amount);
      if (paidTotal >= Number(billingCycle.total) && billingCycle.status !== "paid") {
        paidCycle = await tx.billingCycle.update({
          where: { id: billingCycle.id },
          data: { status: "paid", paidAt, updatedAt: new Date() },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: paidCycle ? "billing_cycle_marked_paid" : "platform_manual_payment_recorded",
        entityType: paidCycle ? "billing_cycle" : "saas_payment",
        entityId: paidCycle?.id ?? created.id,
        afterSnapshot: serialize(created),
        metadata: { ...(note ? { note } : {}), ...(billingCycleId ? { billingCycleId } : {}) },
      },
    });

    return created;
  });

  return { data: serializePayment(payment) };
}

export async function listPlatformAuditLog(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const query = asLooseRecord(input);
  const organizationId = optionalString(query.organizationId);
  const userId = optionalString(query.userId);
  const action = optionalString(query.action);
  const from = optionalDate(query.from);
  const to = optionalDate(query.to);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: { organization: true, user: true, branch: true, device: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return { data: logs.map(serializeAuditLog) };
}

export async function exportPlatformSaasIncome(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const { from, to } = reportPeriod(input);
  const payments = await prisma.saasPayment.findMany({
    where: { status: "approved", paidAt: { gte: from, lte: to } },
    include: { organization: true, billingCycle: true },
    orderBy: { paidAt: "asc" },
  });
  const rows = payments.map((payment) => [
    payment.organization.name,
    payment.organization.taxId ?? "",
    payment.billingCycle ? `${dateOnly(payment.billingCycle.periodStart)}-${dateOnly(payment.billingCycle.periodEnd)}` : "",
    payment.subtotal.toString(),
    payment.taxTotal.toString(),
    payment.amount.toString(),
    payment.currency,
    payment.paidAt ? dateOnly(payment.paidAt) : "",
    payment.paymentMethod ?? "",
    payment.reference ?? payment.providerPaymentId ?? "",
    payment.notes ?? "",
    "no",
    "",
    payment.status,
  ]);
  return csvDocument("saas-income", from, to, [
    "cliente",
    "rfc_cliente",
    "periodo",
    "subtotal",
    "iva",
    "total",
    "moneda",
    "fecha_pago",
    "metodo_pago",
    "referencia",
    "nota",
    "cfdi_emitido",
    "uuid_cfdi",
    "estatus",
  ], rows);
}

export async function exportPlatformAccountsReceivable(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const { from, to } = reportPeriod(input);
  const cycles = await prisma.billingCycle.findMany({
    where: { status: { not: "paid" }, periodStart: { gte: from }, periodEnd: { lte: to } },
    include: { organization: true, billingCycleItemCycle: true, saasPaymentCycle: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
  const rows = cycles.map((cycle) => {
    const paid = sumDecimals(cycle.saasPaymentCycle.filter((payment) => payment.status === "approved").map((payment) => payment.amount));
    return [
      cycle.organization.name,
      cycle.organization.taxId ?? "",
      `${dateOnly(cycle.periodStart)}-${dateOnly(cycle.periodEnd)}`,
      cycle.subtotal.toString(),
      cycle.taxTotal.toString(),
      cycle.total.toString(),
      paid.toFixed(2),
      Math.max(0, Number(cycle.total) - paid).toFixed(2),
      cycle.currency,
      dateOnly(cycle.dueDate),
      cycle.status,
      cycle.billingCycleItemCycle.map((item) => `${item.itemType}:${item.total.toString()}`).join(" | "),
    ];
  });
  return csvDocument("accounts-receivable", from, to, [
    "cliente",
    "rfc_cliente",
    "periodo",
    "subtotal",
    "iva",
    "total",
    "pagado",
    "saldo",
    "moneda",
    "fecha_vencimiento",
    "estatus",
    "conceptos",
  ], rows);
}

export async function startPlatformImpersonation(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  throw new DomainError(501, "IMPERSONATION_NOT_IMPLEMENTED", "Impersonacion deshabilitada para V1 inicial.");
}

export async function endPlatformImpersonation(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  throw new DomainError(501, "IMPERSONATION_NOT_IMPLEMENTED", "Impersonacion deshabilitada para V1 inicial.");
}

async function updatePosDevice(
  currentUser: AuthenticatedUser,
  posDeviceId: string,
  data: Prisma.PosDeviceUpdateInput,
  action: string,
) {
  const before = await prisma.posDevice.findUnique({ where: { id: posDeviceId } });
  if (!before) throw new DomainError(404, "POS_DEVICE_NOT_FOUND", "POS no encontrado.");

  const after = await prisma.$transaction(async (tx) => {
    const device = await tx.posDevice.update({
      where: { id: posDeviceId },
      data: { ...data, updatedAt: new Date() },
      include: { organization: true, branch: true },
    });
    await tx.auditLog.create({
      data: {
        organizationId: device.organizationId,
        branchId: device.branchId,
        deviceId: device.id,
        userId: currentUser.id,
        action,
        entityType: "pos_device",
        entityId: device.id,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(device),
      },
    });
    return device;
  });

  return { data: serializePosDevice(after) };
}

async function createOrganizationOwner(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  organizationId: string,
  input: OrganizationOwnerInput,
) {
  const ownerRole = await tx.role.findUnique({ where: { code: "organization_owner" } });
  if (!ownerRole) throw new DomainError(500, "ROLE_NOT_CONFIGURED", "Rol organization_owner no configurado.");

  const existingOwner = await tx.user.findFirst({
    where: {
      organizationId,
      status: { not: "deleted" },
      userRoleUser: {
        some: {
          organizationId,
          role: { code: "organization_owner" },
        },
      },
    },
  });
  if (existingOwner) {
    throw new DomainError(409, "ORGANIZATION_OWNER_EXISTS", "La organizacion ya tiene duenio asignado.");
  }

  const email = input.email.toLowerCase();
  const existingEmail = await tx.user.findFirst({ where: { organizationId, email } });
  if (existingEmail) {
    throw new DomainError(409, "USER_EMAIL_EXISTS", "Ya existe un usuario con ese correo en la organizacion.");
  }

  const user = await tx.user.create({
    data: {
      organizationId,
      name: input.name,
      email,
      phone: input.phone,
      passwordHash: await hashSecret(input.password),
      pinHash: input.pin ? await hashSecret(input.pin) : null,
      status: "active",
    },
  });

  await tx.userRole.create({
    data: {
      userId: user.id,
      roleId: ownerRole.id,
      organizationId,
    },
  });

  await tx.auditLog.create({
    data: {
      organizationId,
      userId: currentUser.id,
      action: "platform_organization_owner_created",
      entityType: "user",
      entityId: user.id,
      afterSnapshot: serialize({ id: user.id, email: user.email, role: "organization_owner" }),
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "organization_owner",
  };
}

async function createDefaultSubscriptionItems(tx: Prisma.TransactionClient, subscriptionId: string, planCode: string) {
  const catalog: Record<string, { price: string; branches: number; pos: number; terminals: number; cfdi: number }> = {
    free: { price: "0.00", branches: 1, pos: 1, terminals: 1, cfdi: 0 },
    paid: { price: "599.00", branches: 1, pos: 2, terminals: 2, cfdi: 50 },
    mostrador: { price: "299.00", branches: 1, pos: 1, terminals: 1, cfdi: 0 },
    operativo: { price: "599.00", branches: 1, pos: 2, terminals: 2, cfdi: 50 },
    comercial: { price: "999.00", branches: 2, pos: 3, terminals: 3, cfdi: 100 },
  };
  const plan = catalog[planCode] ?? catalog.free;
  const items: Array<{ itemType: Prisma.SubscriptionItemCreateInput["itemType"]; quantity: number; unitPrice: string }> = [
    { itemType: "base_plan", quantity: 1, unitPrice: plan.price },
    { itemType: "included_branch", quantity: plan.branches, unitPrice: "0.00" },
    { itemType: "included_pos", quantity: plan.pos, unitPrice: "0.00" },
    { itemType: "included_terminal", quantity: plan.terminals, unitPrice: "0.00" },
    { itemType: "included_cfdi", quantity: plan.cfdi, unitPrice: "0.00" },
  ];
  await tx.subscriptionItem.createMany({
    data: items.filter((item) => item.quantity > 0).map((item) => ({
      subscriptionId,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      currency: "MXN",
      status: "active",
    })),
  });
}

async function getPlanByCode(code: string) {
  const commercialPlan = commercialPlanDefinitions.find((definition) => definition.code === code);
  if (commercialPlan) {
    return prisma.plan.upsert({
      where: { code },
      update: {
        name: commercialPlan.name,
        description: commercialPlan.description,
        status: "active",
      },
      create: {
        code: commercialPlan.code,
        name: commercialPlan.name,
        description: commercialPlan.description,
        status: "active",
      },
    });
  }

  const plan = await prisma.plan.findUnique({ where: { code } });
  if (!plan || plan.status !== "active") throw new DomainError(400, "INVALID_PLAN", "Plan invalido.");
  return plan;
}

async function getCurrentOrganizationSubscription(organizationId: string) {
  return prisma.subscription.findFirst({
    where: { organizationId, status: { in: [...activeSubscriptionStatuses] } },
    include: { plan: true, subscriptionItemSubscription: true },
    orderBy: { createdAt: "desc" },
  });
}

async function calculateMonthlyRecurringRevenue() {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: "active" },
    include: { subscriptionItemSubscription: { where: { status: "active" } } },
  });

  return sumDecimals(
    subscriptions.flatMap((subscription) =>
      subscription.subscriptionItemSubscription.map((item) => item.unitPrice.mul(item.quantity)),
    ),
  );
}

function serializeSubscription(subscription: Awaited<ReturnType<typeof getCurrentOrganizationSubscription>>) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    status: subscription.status,
    billingPeriod: subscription.billingPeriod,
    provider: subscription.provider,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    graceUntil: subscription.graceUntil?.toISOString() ?? null,
    items: subscription.subscriptionItemSubscription.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      currency: item.currency,
      status: item.status,
    })),
  };
}

function serializePosDevice(device: Prisma.PosDeviceGetPayload<{ include: { organization: true; branch: true } }> | Prisma.PosDeviceGetPayload<{ include: { branch: true } }> | Prisma.PosDeviceGetPayload<Record<string, never>>) {
  const withRelations = device as typeof device & {
    organization?: { name: string } | null;
    branch?: { name: string } | null;
  };
  return {
    id: device.id,
    organizationId: device.organizationId,
    organizationName: withRelations.organization?.name ?? null,
    branchId: device.branchId,
    branchName: withRelations.branch?.name ?? null,
    name: device.deviceName,
    code: device.deviceCode,
    type: device.deviceType,
    status: device.status,
    licensed: device.licensed,
    lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
    updatedAt: device.updatedAt.toISOString(),
  };
}

function serializePayment(payment: Prisma.SaasPaymentGetPayload<Record<string, never>>) {
  const withRelations = payment as typeof payment & {
    organization?: { name: string } | null;
    subscription?: { plan?: { code: string } | null } | null;
  };
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    organizationName: withRelations.organization?.name ?? null,
    subscriptionId: payment.subscriptionId,
    planCode: withRelations.subscription?.plan?.code ?? null,
    provider: payment.provider,
    billingCycleId: (payment as typeof payment & { billingCycleId?: string | null }).billingCycleId ?? null,
    subtotal: (payment as typeof payment & { subtotal?: Prisma.Decimal }).subtotal?.toString() ?? "0.00",
    taxTotal: (payment as typeof payment & { taxTotal?: Prisma.Decimal }).taxTotal?.toString() ?? "0.00",
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    paymentMethod: (payment as typeof payment & { paymentMethod?: string | null }).paymentMethod ?? null,
    reference: (payment as typeof payment & { reference?: string | null }).reference ?? null,
    notes: (payment as typeof payment & { notes?: string | null }).notes ?? extractPaymentNote(payment.rawPayload),
    note: (payment as typeof payment & { notes?: string | null }).notes ?? extractPaymentNote(payment.rawPayload),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function extractPaymentNote(rawPayload: Prisma.JsonValue | null) {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const note = (rawPayload as { note?: unknown }).note;
  return typeof note === "string" ? note : null;
}

function serializeAuditLog(log: Prisma.AuditLogGetPayload<Record<string, never>>) {
  const withRelations = log as typeof log & {
    organization?: { name: string } | null;
    user?: { name: string } | null;
    branch?: { name: string } | null;
    device?: { deviceName: string } | null;
  };
  return {
    id: log.id,
    organizationId: log.organizationId,
    organizationName: withRelations.organization?.name ?? null,
    branchId: log.branchId,
    branchName: withRelations.branch?.name ?? null,
    userId: log.userId,
    userName: withRelations.user?.name ?? null,
    deviceId: log.deviceId,
    deviceName: withRelations.device?.deviceName ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt.toISOString(),
  };
}

function nextMonth() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

function reportPeriod(input: unknown) {
  const query = asLooseRecord(input);
  const from = optionalDate(query.from) ?? startOfCurrentMonth();
  const to = optionalDate(query.to) ?? endOfMonth(from);
  return { from, to };
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function csvDocument(slug: string, from: Date, to: Date, headers: string[], rows: string[][]) {
  const body = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return {
    filename: `${slug}-${dateOnly(from)}-${dateOnly(to)}.csv`,
    contentType: "text/csv; charset=utf-8",
    body,
  };
}

function csvCell(value: string) {
  const escaped = value.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function sumDecimals(values: Array<Prisma.Decimal>) {
  return values.reduce((total, value) => total + Number(value), 0);
}

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (typeof current?.toString === "function" && current.constructor?.name === "Decimal") return current.toString();
    if (current instanceof Date) return current.toISOString();
    return current;
  })) as Prisma.InputJsonValue;
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

function asPositiveMoney(value: unknown) {
  const raw = asString(value, "amount");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, "INVALID_AMOUNT", "El monto debe ser mayor a cero.");
  }
  return amount.toFixed(2);
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return value.trim();
}

function getOptionalOwnerInput(body: Record<string, unknown>) {
  if (body.owner !== undefined) {
    if (!body.owner || typeof body.owner !== "object" || Array.isArray(body.owner)) {
      throw new DomainError(400, "INVALID_REQUEST", "owner debe ser un objeto.");
    }
    return asOwnerInput(body.owner as Record<string, unknown>);
  }

  if (body.ownerEmail !== undefined || body.ownerName !== undefined || body.ownerPassword !== undefined) {
    return asOwnerInput({
      name: body.ownerName,
      email: body.ownerEmail,
      password: body.ownerPassword,
      phone: body.ownerPhone,
      pin: body.ownerPin,
    });
  }

  return null;
}

function asOwnerInput(body: Record<string, unknown>): OrganizationOwnerInput {
  const password = asString(body.password, "password");
  if (password.length < 8) {
    throw new DomainError(400, "WEAK_PASSWORD", "La contrasena temporal debe tener al menos 8 caracteres.");
  }

  const pin = optionalString(body.pin);
  if (pin && !/^[0-9]{4,8}$/.test(pin)) {
    throw new DomainError(400, "INVALID_PIN", "El PIN debe tener de 4 a 8 digitos.");
  }

  return {
    name: asString(body.name, "name"),
    email: asString(body.email, "email").toLowerCase(),
    password,
    phone: optionalString(body.phone),
    pin,
  };
}

function optionalDate(value: unknown) {
  const raw = optionalString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida.");
  return date;
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T, field: string): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new DomainError(400, "INVALID_REQUEST", `Valor invalido: ${field}.`);
  }
  return value;
}
