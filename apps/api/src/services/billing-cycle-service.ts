import type { BillingCycle, BillingCycleItem, Prisma, SaasOneTimeCharge } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { requirePlatformOwner } from "./platform-service.js";

const activeSubscriptionStatuses = ["trial", "active", "past_due", "grace_period", "suspended_limited"] as const;
const taxRate = 0.16;
const cfdiOverageUnitPrice = 6;
const commercialPlans = [
  {
    code: "mostrador",
    name: "Mostrador",
    monthlyPrice: "299.00",
    limits: { branches: 1, pos: 1, terminals: 1, cfdi: 0, routes: false, billingCfdi: false, advancedReports: false },
  },
  {
    code: "operativo",
    name: "Operativo",
    monthlyPrice: "599.00",
    limits: { branches: 1, pos: 2, terminals: 2, cfdi: 50, routes: false, billingCfdi: true, advancedReports: false },
  },
  {
    code: "comercial",
    name: "Comercial",
    monthlyPrice: "999.00",
    limits: { branches: 2, pos: 3, terminals: 3, cfdi: 100, routes: true, billingCfdi: true, advancedReports: true },
  },
] as const;

type ManualCycleItemInput = {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  metadata?: Prisma.InputJsonValue;
};

export async function getPlatformBillingSummary(currentUser: AuthenticatedUser, organizationId: string) {
  await requirePlatformOwner(currentUser);
  return getOrganizationBillingSummary(organizationId);
}

export async function listPlatformCommercialPlans(currentUser: AuthenticatedUser) {
  await requirePlatformOwner(currentUser);
  return { data: commercialPlans };
}

export async function getOrganizationBillingSummary(organizationId: string) {
  const subscription = await getCurrentSubscription(organizationId);
  const activeItems = subscription?.subscriptionItemSubscription.filter((item) => item.status === "active") ?? [];
  const [cycles, payments, posDevices, branches, cfdiUsage, oneTimeCharges] = await Promise.all([
    prisma.billingCycle.findMany({
      where: { organizationId },
      include: { billingCycleItemCycle: true, saasPaymentCycle: true },
      orderBy: { periodStart: "desc" },
      take: 12,
    }),
    prisma.saasPayment.findMany({
      where: { organizationId, status: "approved" },
      orderBy: { paidAt: "desc" },
      take: 12,
    }),
    prisma.posDevice.findMany({ where: { organizationId } }),
    prisma.branch.findMany({ where: { organizationId } }),
    getCurrentCfdiUsage(organizationId, subscription?.currentPeriodStart ?? null, subscription?.currentPeriodEnd ?? null, activeItems),
    prisma.saasOneTimeCharge.findMany({ where: { organizationId, status: "pending" }, orderBy: { createdAt: "desc" } }),
  ]);

  const entitlements = calculateEntitlements(activeItems);
  const pendingBalance = sum(cycles.filter((cycle) => cycle.status !== "paid").map((cycle) => Number(cycle.total)));
  const currentCycle = cycles[0] ?? null;

  return {
    data: {
      subscription: subscription ? serializeSubscription(subscription) : null,
      currentCycle: currentCycle ? serializeCycle(currentCycle) : null,
      pendingBalance: money(pendingBalance),
      limits: {
        branches: entitlements.branches,
        pos: entitlements.pos,
        terminals: entitlements.terminals,
        cfdi: entitlements.cfdi,
      },
      usage: {
        branches: branches.filter((branch) => branch.status === "active").length,
        pos: posDevices.filter((device) => device.status === "active").length,
        licensedPos: posDevices.filter((device) => device.licensed).length,
        terminals: 0,
        cfdi: cfdiUsage.usedCount,
      },
      cfdiUsage: serializeCfdiUsage(cfdiUsage),
      pendingOneTimeCharges: oneTimeCharges.map(serializeOneTimeCharge),
      cycles: cycles.map(serializeCycle),
      payments: payments.map(serializePayment),
    },
  };
}

export async function listPlatformBillingCycles(currentUser: AuthenticatedUser, organizationId: string) {
  await requirePlatformOwner(currentUser);
  const cycles = await prisma.billingCycle.findMany({
    where: { organizationId },
    include: { billingCycleItemCycle: true, saasPaymentCycle: true },
    orderBy: { periodStart: "desc" },
  });
  return { data: cycles.map(serializeCycle) };
}

export async function getPlatformCfdiUsage(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  return getOrganizationCfdiUsage(organizationId, input);
}

export async function getOrganizationCfdiUsage(organizationId: string, input: unknown) {
  const subscription = await getCurrentSubscription(organizationId);
  const period = parsePeriod(asLooseRecord(input), subscription?.currentPeriodStart ?? null, subscription?.currentPeriodEnd ?? null);
  const usage = await calculateAndUpsertCfdiUsage(
    organizationId,
    period.periodStart,
    period.periodEnd,
    calculateEntitlements(subscription?.subscriptionItemSubscription ?? []).cfdi,
  );
  return { data: serializeCfdiUsage(usage) };
}

export async function createPlatformOneTimeCharge(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const subscription = await getCurrentSubscription(organizationId);
  const amount = Number(asPositiveMoney(body.amount));
  const taxAmount = round(amount * taxRate);
  const charge = await prisma.$transaction(async (tx) => {
    const created = await tx.saasOneTimeCharge.create({
      data: {
        organizationId,
        subscriptionId: subscription?.id ?? null,
        chargeType: asString(body.chargeType, "chargeType"),
        description: asString(body.description, "description"),
        amount: money(amount),
        taxAmount: money(taxAmount),
        total: money(amount + taxAmount),
        currency: optionalString(body.currency) ?? "MXN",
        status: "pending",
        createdByUserId: currentUser.id,
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "one_time_charge_created",
        entityType: "saas_one_time_charge",
        entityId: created.id,
        afterSnapshot: serialize(created),
      },
    });
    return created;
  });
  return { data: serializeOneTimeCharge(charge) };
}

export async function cancelPlatformOneTimeCharge(currentUser: AuthenticatedUser, chargeId: string) {
  await requirePlatformOwner(currentUser);
  const before = await prisma.saasOneTimeCharge.findUnique({ where: { id: chargeId } });
  if (!before) throw new DomainError(404, "ONE_TIME_CHARGE_NOT_FOUND", "Cargo unico no encontrado.");
  if (before.status !== "pending") {
    throw new DomainError(409, "ONE_TIME_CHARGE_NOT_PENDING", "Solo se pueden cancelar cargos unicos pendientes.");
  }

  const charge = await prisma.$transaction(async (tx) => {
    const updated = await tx.saasOneTimeCharge.update({
      where: { id: chargeId },
      data: { status: "cancelled", updatedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId: before.organizationId,
        userId: currentUser.id,
        action: "one_time_charge_cancelled",
        entityType: "saas_one_time_charge",
        entityId: chargeId,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(updated),
      },
    });
    return updated;
  });

  return { data: serializeOneTimeCharge(charge) };
}

export async function updatePlatformSubscriptionItems(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const subscription = await getCurrentSubscription(organizationId);
  if (!subscription) throw new DomainError(404, "SUBSCRIPTION_NOT_FOUND", "Suscripcion activa no encontrada.");
  if (!Array.isArray(body.items)) throw new DomainError(400, "INVALID_REQUEST", "items debe ser una lista.");
  const before = subscription.subscriptionItemSubscription;
  const after = await prisma.$transaction(async (tx) => {
    const updated = [];
    for (const rawItem of body.items as unknown[]) {
      const item = asRecord(rawItem);
      const existingId = optionalString(item.id);
      const data = {
        itemType: asSubscriptionItemType(item.itemType),
        quantity: asPositiveInteger(item.quantity),
        unitPrice: asPositiveMoney(item.unitPrice),
        currency: optionalString(item.currency) ?? "MXN",
        status: asGenericStatus(item.status ?? "active"),
        updatedAt: new Date(),
      };
      updated.push(existingId
        ? await tx.subscriptionItem.update({ where: { id: existingId }, data })
        : await tx.subscriptionItem.create({ data: { ...data, subscriptionId: subscription.id } }));
    }
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "subscription_items_updated",
        entityType: "subscription",
        entityId: subscription.id,
        beforeSnapshot: serialize(before),
        afterSnapshot: serialize(updated),
      },
    });
    return updated;
  });
  return { data: after.map(serializeSubscriptionItem) };
}

export async function generatePlatformBillingCycle(currentUser: AuthenticatedUser, organizationId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asLooseRecord(input);
  const subscription = await getCurrentSubscription(organizationId);
  if (!subscription) throw new DomainError(404, "SUBSCRIPTION_NOT_FOUND", "Suscripcion activa no encontrada.");

  const period = parsePeriod(body, subscription.currentPeriodStart, subscription.currentPeriodEnd);
  const dueDate = optionalDate(body.dueDate) ?? period.periodEnd;
  const manualItems = parseManualItems(body.manualItems);

  const cycle = await prisma.$transaction(async (tx) => {
    const existing = await tx.billingCycle.findUnique({
      where: {
        subscriptionId_periodStart_periodEnd: {
          subscriptionId: subscription.id,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        },
      },
    });
    if (existing) throw new DomainError(409, "BILLING_CYCLE_EXISTS", "Ya existe un corte para el periodo.");

    const entitlements = calculateEntitlements(subscription.subscriptionItemSubscription);
    const cfdiUsage = await calculateAndUpsertCfdiUsage(organizationId, period.periodStart, period.periodEnd, entitlements.cfdi);
    const pendingCharges = await tx.saasOneTimeCharge.findMany({
      where: { organizationId, status: "pending", OR: [{ subscriptionId: null }, { subscriptionId: subscription.id }] },
    });
    const draftItems = buildCycleItems(subscription.subscriptionItemSubscription, manualItems, cfdiUsage, pendingCharges);
    const totals = calculateTotals(draftItems);
    const created = await tx.billingCycle.create({
      data: {
        organizationId,
        subscriptionId: subscription.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        dueDate,
        subtotal: money(totals.subtotal),
        taxTotal: money(totals.taxTotal),
        total: money(totals.total),
        currency: "MXN",
        billingCycleItemCycle: {
          create: draftItems.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity.toFixed(3),
            unitPrice: money(item.unitPrice),
            subtotal: money(item.subtotal),
            taxAmount: money(item.taxAmount),
            total: money(item.total),
            currency: item.currency,
            metadata: item.metadata,
          })),
        },
      },
      include: { billingCycleItemCycle: true, saasPaymentCycle: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: currentUser.id,
        action: "billing_cycle_generated",
        entityType: "billing_cycle",
        entityId: created.id,
        afterSnapshot: serialize(created),
      },
    });
    await tx.cfdiUsageCounter.update({
      where: { id: cfdiUsage.id },
      data: { billingCycleId: created.id, updatedAt: new Date() },
    });
    await tx.saasOneTimeCharge.updateMany({
      where: { id: { in: pendingCharges.map((charge) => charge.id) } },
      data: { billingCycleId: created.id, status: "included_in_cycle", updatedAt: new Date() },
    });

    return created;
  });

  return { data: serializeCycle(cycle) };
}

export async function recalculatePlatformBillingCycle(currentUser: AuthenticatedUser, billingCycleId: string) {
  await requirePlatformOwner(currentUser);
  const existing = await prisma.billingCycle.findUnique({
    where: { id: billingCycleId },
    include: { subscription: { include: { subscriptionItemSubscription: true } }, billingCycleItemCycle: true },
  });
  if (!existing) throw new DomainError(404, "BILLING_CYCLE_NOT_FOUND", "Corte no encontrado.");
  if (existing.status === "paid") throw new DomainError(409, "BILLING_CYCLE_PAID", "No se puede recalcular un corte pagado.");

  const cycle = await prisma.$transaction(async (tx) => {
    const entitlements = calculateEntitlements(existing.subscription.subscriptionItemSubscription);
    const cfdiUsage = await calculateAndUpsertCfdiUsage(existing.organizationId, existing.periodStart, existing.periodEnd, entitlements.cfdi);
    const cycleCharges = await tx.saasOneTimeCharge.findMany({
      where: { organizationId: existing.organizationId, billingCycleId },
    });
    const draftItems = buildCycleItems(existing.subscription.subscriptionItemSubscription, [], cfdiUsage, cycleCharges);
    const totals = calculateTotals(draftItems);
    await tx.billingCycleItem.deleteMany({ where: { billingCycleId } });
    const updated = await tx.billingCycle.update({
      where: { id: billingCycleId },
      data: {
        subtotal: money(totals.subtotal),
        taxTotal: money(totals.taxTotal),
        total: money(totals.total),
        updatedAt: new Date(),
        billingCycleItemCycle: {
          create: draftItems.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity.toFixed(3),
            unitPrice: money(item.unitPrice),
            subtotal: money(item.subtotal),
            taxAmount: money(item.taxAmount),
            total: money(item.total),
            currency: item.currency,
            metadata: item.metadata,
          })),
        },
      },
      include: { billingCycleItemCycle: true, saasPaymentCycle: true },
    });

    await tx.auditLog.create({
      data: {
        organizationId: existing.organizationId,
        userId: currentUser.id,
        action: "billing_cycle_recalculated",
        entityType: "billing_cycle",
        entityId: billingCycleId,
        beforeSnapshot: serialize(existing),
        afterSnapshot: serialize(updated),
      },
    });

    return updated;
  });

  return { data: serializeCycle(cycle) };
}

export async function markPlatformBillingCyclePaid(currentUser: AuthenticatedUser, billingCycleId: string, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asLooseRecord(input);
  const cycle = await prisma.billingCycle.findUnique({
    where: { id: billingCycleId },
    include: { saasPaymentCycle: true },
  });
  if (!cycle) throw new DomainError(404, "BILLING_CYCLE_NOT_FOUND", "Corte no encontrado.");
  if (cycle.status === "paid") return { data: { cycle: serializeCycle(cycle), payment: null } };

  const amount = optionalMoney(body.amount) ?? Number(cycle.total);
  const paidAt = optionalDate(body.paidAt) ?? new Date();
  const payment = await applyManualPaymentToCycle(currentUser.id, cycle, {
    amount,
    paidAt,
    paymentMethod: optionalString(body.paymentMethod) ?? "manual",
    reference: optionalString(body.reference),
    notes: optionalString(body.notes ?? body.note),
  });

  return { data: { cycle: payment.cycle, payment: payment.payment } };
}

export async function applyPlatformManualPayment(currentUser: AuthenticatedUser, input: unknown) {
  await requirePlatformOwner(currentUser);
  const body = asRecord(input);
  const billingCycleId = optionalString(body.billingCycleId);
  if (!billingCycleId) return null;
  const cycle = await prisma.billingCycle.findUnique({ where: { id: billingCycleId }, include: { saasPaymentCycle: true } });
  if (!cycle) throw new DomainError(404, "BILLING_CYCLE_NOT_FOUND", "Corte no encontrado.");
  const organizationId = asString(body.organizationId, "organizationId");
  const subscriptionId = asString(body.subscriptionId, "subscriptionId");
  if (cycle.organizationId !== organizationId || cycle.subscriptionId !== subscriptionId) {
    throw new DomainError(400, "BILLING_CYCLE_MISMATCH", "El corte no pertenece a la organizacion o suscripcion indicada.");
  }

  return applyManualPaymentToCycle(currentUser.id, cycle, {
    amount: Number(asPositiveMoney(body.amount)),
    paidAt: optionalDate(body.paidAt) ?? new Date(),
    paymentMethod: optionalString(body.paymentMethod) ?? "manual",
    reference: optionalString(body.reference ?? body.providerPaymentId),
    notes: optionalString(body.notes ?? body.note),
    currency: optionalString(body.currency) ?? "MXN",
  });
}

export async function updateOverdueBillingStatuses() {
  const now = new Date();
  const cycles = await prisma.billingCycle.findMany({
    where: { status: { in: ["pending", "graced", "overdue", "suspended"] } },
  });
  let updated = 0;
  for (const cycle of cycles) {
    const daysPastDue = Math.floor((startOfDay(now).getTime() - startOfDay(cycle.dueDate).getTime()) / (24 * 60 * 60 * 1000));
    const nextStatus = daysPastDue >= 30 ? "cancelled" : daysPastDue >= 10 ? "suspended" : daysPastDue >= 6 ? "overdue" : daysPastDue >= 1 ? "graced" : "pending";
    if (cycle.status === nextStatus) continue;

    await prisma.$transaction(async (tx) => {
      await tx.billingCycle.update({ where: { id: cycle.id }, data: { status: nextStatus, updatedAt: now } });
      const subscriptionStatus = nextStatus === "cancelled"
        ? "cancelled"
        : nextStatus === "suspended"
          ? "suspended_limited"
          : nextStatus === "overdue"
            ? "past_due"
            : nextStatus === "graced"
              ? "grace_period"
              : null;
      if (subscriptionStatus) {
        const beforeSubscription = await tx.subscription.findUnique({ where: { id: cycle.subscriptionId } });
        const beforeOrganization = await tx.organization.findUnique({ where: { id: cycle.organizationId } });
        const organizationStatus = subscriptionStatus === "suspended_limited" ? "suspended_limited" : subscriptionStatus === "cancelled" ? "cancelled" : subscriptionStatus;
        const updatedSubscription = await tx.subscription.update({ where: { id: cycle.subscriptionId }, data: { status: subscriptionStatus, updatedAt: now } });
        const updatedOrganization = await tx.organization.update({ where: { id: cycle.organizationId }, data: { status: organizationStatus, updatedAt: now } });
        await tx.auditLog.create({
          data: {
            organizationId: cycle.organizationId,
            userId: null,
            action: "subscription_status_changed",
            entityType: "subscription",
            entityId: cycle.subscriptionId,
            beforeSnapshot: serialize(beforeSubscription),
            afterSnapshot: serialize(updatedSubscription),
            metadata: serialize({ source: "billing_overdue_scheduler", billingCycleId: cycle.id, cycleStatus: nextStatus }),
          },
        });
        if (organizationStatus === "suspended_limited") {
          await tx.auditLog.create({
            data: {
              organizationId: cycle.organizationId,
              userId: null,
              action: "organization_suspended_for_non_payment",
              entityType: "organization",
              entityId: cycle.organizationId,
              beforeSnapshot: serialize(beforeOrganization),
              afterSnapshot: serialize(updatedOrganization),
              metadata: serialize({ source: "billing_overdue_scheduler", billingCycleId: cycle.id }),
            },
          });
        }
      }
    });
    updated += 1;
  }
  return { data: { updated } };
}

export async function generateMonthlyCyclesForActiveSubscriptions() {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: { in: [...activeSubscriptionStatuses] } },
    include: { subscriptionItemSubscription: { where: { status: "active" } } },
  });
  let generated = 0;
  for (const subscription of subscriptions) {
    const periodStart = startOfMonth(new Date());
    const periodEnd = endOfMonth(periodStart);
    const existing = await prisma.billingCycle.findUnique({
      where: {
        subscriptionId_periodStart_periodEnd: {
          subscriptionId: subscription.id,
          periodStart,
          periodEnd,
        },
      },
    });
    if (existing) continue;

    const entitlements = calculateEntitlements(subscription.subscriptionItemSubscription);
    const cfdiUsage = await calculateAndUpsertCfdiUsage(subscription.organizationId, periodStart, periodEnd, entitlements.cfdi);
    const pendingCharges = await prisma.saasOneTimeCharge.findMany({
      where: { organizationId: subscription.organizationId, status: "pending", OR: [{ subscriptionId: null }, { subscriptionId: subscription.id }] },
    });
    const draftItems = buildCycleItems(subscription.subscriptionItemSubscription, [], cfdiUsage, pendingCharges);
    const totals = calculateTotals(draftItems);
    const cycle = await prisma.billingCycle.create({
      data: {
        organizationId: subscription.organizationId,
        subscriptionId: subscription.id,
        periodStart,
        periodEnd,
        dueDate: periodEnd,
        subtotal: money(totals.subtotal),
        taxTotal: money(totals.taxTotal),
        total: money(totals.total),
        currency: "MXN",
        billingCycleItemCycle: {
          create: draftItems.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            quantity: item.quantity.toFixed(3),
            unitPrice: money(item.unitPrice),
            subtotal: money(item.subtotal),
            taxAmount: money(item.taxAmount),
            total: money(item.total),
            currency: item.currency,
            metadata: item.metadata,
          })),
        },
      },
    });
    await prisma.cfdiUsageCounter.update({ where: { id: cfdiUsage.id }, data: { billingCycleId: cycle.id, updatedAt: new Date() } });
    await prisma.saasOneTimeCharge.updateMany({
      where: { id: { in: pendingCharges.map((charge) => charge.id) } },
      data: { billingCycleId: cycle.id, status: "included_in_cycle", updatedAt: new Date() },
    });
    generated += 1;
  }
  return { data: { generated } };
}

async function applyManualPaymentToCycle(
  userId: string,
  cycle: BillingCycle & { saasPaymentCycle: Array<{ amount: Prisma.Decimal; status: string }> },
  input: { amount: number; paidAt: Date; paymentMethod?: string | null; reference?: string | null; notes?: string | null; currency?: string },
) {
  const result = await prisma.$transaction(async (tx) => {
    const existingPaid = sum(cycle.saasPaymentCycle.filter((payment) => payment.status === "approved").map((payment) => Number(payment.amount)));
    const newPaid = round(existingPaid + input.amount);
    const coversCycle = newPaid >= Number(cycle.total);
    const subtotal = round(input.amount / (1 + taxRate));
    const taxTotal = round(input.amount - subtotal);

    const payment = await tx.saasPayment.create({
      data: {
        organizationId: cycle.organizationId,
        subscriptionId: cycle.subscriptionId,
        billingCycleId: cycle.id,
        provider: "manual",
        providerPaymentId: input.reference,
        subtotal: money(subtotal),
        taxTotal: money(taxTotal),
        amount: money(input.amount),
        currency: input.currency ?? cycle.currency,
        status: "approved",
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        notes: input.notes,
        paidAt: input.paidAt,
        rawPayload: input.notes ? { note: input.notes } : undefined,
      },
    });

    const updated = coversCycle
      ? await tx.billingCycle.update({
          where: { id: cycle.id },
          data: { status: "paid", paidAt: input.paidAt, updatedAt: new Date() },
          include: { billingCycleItemCycle: true, saasPaymentCycle: true },
        })
      : await tx.billingCycle.findUniqueOrThrow({
          where: { id: cycle.id },
          include: { billingCycleItemCycle: true, saasPaymentCycle: true },
        });

    if (coversCycle) {
      const unpaidCycles = await tx.billingCycle.count({
        where: {
          organizationId: cycle.organizationId,
          status: { not: "paid" },
        },
      });
      if (unpaidCycles === 0) {
        const [beforeSubscription, beforeOrganization] = await Promise.all([
          tx.subscription.findUnique({ where: { id: cycle.subscriptionId } }),
          tx.organization.findUnique({ where: { id: cycle.organizationId } }),
        ]);
        const reactivableSubscription = beforeSubscription && ["grace_period", "past_due", "suspended_limited"].includes(beforeSubscription.status);
        const reactivableOrganization = beforeOrganization && ["grace_period", "past_due", "suspended_limited"].includes(beforeOrganization.status);
        if (reactivableSubscription) {
          const subscription = await tx.subscription.update({
            where: { id: cycle.subscriptionId },
            data: { status: "active", updatedAt: new Date() },
          });
          await tx.auditLog.create({
            data: {
              organizationId: cycle.organizationId,
              userId,
              action: "subscription_status_changed",
              entityType: "subscription",
              entityId: cycle.subscriptionId,
              beforeSnapshot: serialize(beforeSubscription),
              afterSnapshot: serialize(subscription),
              metadata: serialize({ source: "billing_cycle_payment", billingCycleId: cycle.id }),
            },
          });
        }
        if (reactivableOrganization) {
          const organization = await tx.organization.update({
            where: { id: cycle.organizationId },
            data: { status: "active", updatedAt: new Date() },
          });
          await tx.auditLog.create({
            data: {
              organizationId: cycle.organizationId,
              userId,
              action: "organization_reactivated_after_payment",
              entityType: "organization",
              entityId: cycle.organizationId,
              beforeSnapshot: serialize(beforeOrganization),
              afterSnapshot: serialize(organization),
              metadata: serialize({ source: "billing_cycle_payment", billingCycleId: cycle.id }),
            },
          });
        }
      }
    }

    await tx.auditLog.create({
      data: {
        organizationId: cycle.organizationId,
        userId,
        action: coversCycle ? "billing_cycle_marked_paid" : "platform_manual_payment_recorded",
        entityType: coversCycle ? "billing_cycle" : "saas_payment",
        entityId: coversCycle ? cycle.id : payment.id,
        afterSnapshot: serialize({ payment, cycle: updated }),
      },
    });

    return { payment, cycle: updated };
  });

  return { payment: serializePayment(result.payment), cycle: serializeCycle(result.cycle) };
}

async function getCurrentSubscription(organizationId: string) {
  return prisma.subscription.findFirst({
    where: { organizationId, status: { in: [...activeSubscriptionStatuses] } },
    include: { plan: true, subscriptionItemSubscription: { where: { status: "active" }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getCurrentCfdiUsage(
  organizationId: string,
  periodStart: Date | null,
  periodEnd: Date | null,
  activeItems: Array<{ itemType: string; quantity: number }>,
) {
  const now = new Date();
  const start = startOfMonth(periodStart ?? now);
  const end = endOfMonth(periodEnd ?? start);
  return calculateAndUpsertCfdiUsage(organizationId, start, end, calculateEntitlements(activeItems).cfdi);
}

async function calculateAndUpsertCfdiUsage(organizationId: string, periodStart: Date, periodEnd: Date, includedLimit: number) {
  const invoices = await prisma.invoice.groupBy({
    by: ["invoiceType"],
    where: {
      organizationId,
      status: "stamped",
      invoiceDate: { gte: periodStart, lte: periodEnd },
    },
    _count: { _all: true },
  });
  const globalInvoiceCount = invoices.find((item) => item.invoiceType === "global_public")?._count._all ?? 0;
  const individualInvoiceCount = invoices.find((item) => item.invoiceType === "individual")?._count._all ?? 0;
  const usedCount = globalInvoiceCount + individualInvoiceCount;
  const overageCount = Math.max(0, usedCount - includedLimit);

  return prisma.cfdiUsageCounter.upsert({
    where: { organizationId_periodStart_periodEnd: { organizationId, periodStart, periodEnd } },
    update: {
      includedLimit,
      usedCount,
      globalInvoiceCount,
      individualInvoiceCount,
      overageCount,
      overageUnitPrice: money(cfdiOverageUnitPrice),
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      periodStart,
      periodEnd,
      includedLimit,
      usedCount,
      globalInvoiceCount,
      individualInvoiceCount,
      overageCount,
      overageUnitPrice: money(cfdiOverageUnitPrice),
      currency: "MXN",
    },
  });
}

function buildCycleItems(
  subscriptionItems: Array<{ id: string; itemType: string; quantity: number; unitPrice: Prisma.Decimal; currency: string }>,
  manualItems: ManualCycleItemInput[],
  cfdiUsage?: Awaited<ReturnType<typeof calculateAndUpsertCfdiUsage>>,
  oneTimeCharges: SaasOneTimeCharge[] = [],
) {
  return [
    ...subscriptionItems.map((item) => buildItem({
      itemType: item.itemType,
      description: descriptionForItem(item.itemType),
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      currency: item.currency,
      metadata: { subscriptionItemId: item.id },
    })),
    ...(cfdiUsage && cfdiUsage.overageCount > 0 ? [buildCfdiOverageItem(cfdiUsage)] : []),
    ...oneTimeCharges.map((charge) => ({
      itemType: charge.chargeType,
      description: charge.description,
      quantity: 1,
      unitPrice: Number(charge.amount),
      currency: charge.currency,
      subtotal: Number(charge.amount),
      taxAmount: Number(charge.taxAmount),
      total: Number(charge.total),
      metadata: { oneTimeChargeId: charge.id },
    })),
    ...manualItems.map(buildItem),
  ];
}

function buildCfdiOverageItem(cfdiUsage: Awaited<ReturnType<typeof calculateAndUpsertCfdiUsage>>) {
  const total = round(cfdiUsage.overageCount * Number(cfdiUsage.overageUnitPrice));
  const subtotal = round(total / (1 + taxRate));
  const taxAmount = round(total - subtotal);
  return {
    itemType: "cfdi_overage",
    description: "CFDI adicionales excedentes",
    quantity: cfdiUsage.overageCount,
    unitPrice: Number(cfdiUsage.overageUnitPrice),
    currency: cfdiUsage.currency,
    subtotal,
    taxAmount,
    total,
    metadata: { cfdiUsageCounterId: cfdiUsage.id, ivaIncluded: true },
  };
}

function buildItem(input: ManualCycleItemInput) {
  const subtotal = round(input.quantity * input.unitPrice);
  const taxAmount = round(subtotal * taxRate);
  return {
    ...input,
    subtotal,
    taxAmount,
    total: round(subtotal + taxAmount),
  };
}

function calculateTotals(items: Array<{ subtotal: number; taxAmount: number; total: number }>) {
  return {
    subtotal: round(sum(items.map((item) => item.subtotal))),
    taxTotal: round(sum(items.map((item) => item.taxAmount))),
    total: round(sum(items.map((item) => item.total))),
  };
}

function calculateEntitlements(items: Array<{ itemType: string; quantity: number }>) {
  const quantity = (type: string) => sum(items.filter((item) => item.itemType === type).map((item) => item.quantity));
  return {
    branches: quantity("included_branch") + quantity("extra_branch"),
    pos: quantity("included_pos") + quantity("extra_pos") + quantity("pos_device"),
    terminals: quantity("included_terminal") + quantity("extra_terminal"),
    cfdi: quantity("included_cfdi"),
  };
}

function parsePeriod(body: Record<string, unknown>, fallbackStart: Date | null, fallbackEnd: Date | null) {
  const now = new Date();
  const periodStart = optionalDate(body.periodStart) ?? startOfMonth(fallbackStart ?? now);
  const periodEnd = optionalDate(body.periodEnd) ?? endOfMonth(fallbackEnd ?? periodStart);
  if (periodEnd < periodStart) throw new DomainError(400, "INVALID_PERIOD", "El fin de periodo no puede ser anterior al inicio.");
  return { periodStart: asDateOnly(periodStart), periodEnd: asDateOnly(periodEnd) };
}

function parseManualItems(value: unknown): ManualCycleItemInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new DomainError(400, "INVALID_REQUEST", "manualItems debe ser una lista.");
  return value.map((raw) => {
    const item = asRecord(raw);
    return {
      itemType: asString(item.itemType, "itemType"),
      description: asString(item.description, "description"),
      quantity: Number(asPositiveMoney(item.quantity ?? "1")),
      unitPrice: Number(asPositiveMoney(item.unitPrice)),
      currency: optionalString(item.currency) ?? "MXN",
      metadata: item.metadata && typeof item.metadata === "object" ? serialize(item.metadata) : undefined,
    };
  });
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function asDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function serializeSubscription(subscription: NonNullable<Awaited<ReturnType<typeof getCurrentSubscription>>>) {
  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    status: subscription.status,
    billingPeriod: subscription.billingPeriod,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
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

function serializeCycle(cycle: BillingCycle & { billingCycleItemCycle?: BillingCycleItem[]; saasPaymentCycle?: Array<{ amount: Prisma.Decimal; status: string }> }) {
  const paidTotal = sum((cycle.saasPaymentCycle ?? []).filter((payment) => payment.status === "approved").map((payment) => Number(payment.amount)));
  return {
    id: cycle.id,
    organizationId: cycle.organizationId,
    subscriptionId: cycle.subscriptionId,
    periodStart: cycle.periodStart.toISOString(),
    periodEnd: cycle.periodEnd.toISOString(),
    dueDate: cycle.dueDate.toISOString(),
    status: cycle.status,
    subtotal: decimalMoney(cycle.subtotal),
    taxTotal: decimalMoney(cycle.taxTotal),
    total: decimalMoney(cycle.total),
    paidTotal: money(paidTotal),
    balanceDue: money(Math.max(0, Number(cycle.total) - paidTotal)),
    currency: cycle.currency,
    paidAt: cycle.paidAt?.toISOString() ?? null,
    createdAt: cycle.createdAt.toISOString(),
    items: (cycle.billingCycleItemCycle ?? []).map((item) => ({
      id: item.id,
      itemType: item.itemType,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: decimalMoney(item.unitPrice),
      subtotal: decimalMoney(item.subtotal),
      taxAmount: decimalMoney(item.taxAmount),
      total: decimalMoney(item.total),
      currency: item.currency,
    })),
  };
}

function serializePayment(payment: {
  id: string;
  organizationId: string;
  subscriptionId: string;
  billingCycleId?: string | null;
  provider: string;
  subtotal?: Prisma.Decimal;
  taxTotal?: Prisma.Decimal;
  amount: Prisma.Decimal;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: payment.id,
    organizationId: payment.organizationId,
    subscriptionId: payment.subscriptionId,
    billingCycleId: payment.billingCycleId ?? null,
    provider: payment.provider,
    subtotal: payment.subtotal ? decimalMoney(payment.subtotal) : "0.00",
    taxTotal: payment.taxTotal ? decimalMoney(payment.taxTotal) : "0.00",
    amount: decimalMoney(payment.amount),
    currency: payment.currency,
    status: payment.status,
    paymentMethod: payment.paymentMethod ?? null,
    reference: payment.reference ?? null,
    notes: payment.notes ?? null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function serializeCfdiUsage(usage: {
  id: string;
  organizationId: string;
  billingCycleId: string | null;
  periodStart: Date;
  periodEnd: Date;
  includedLimit: number;
  usedCount: number;
  globalInvoiceCount: number;
  individualInvoiceCount: number;
  overageCount: number;
  overageUnitPrice: Prisma.Decimal;
  currency: string;
}) {
  return {
    id: usage.id,
    organizationId: usage.organizationId,
    billingCycleId: usage.billingCycleId,
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
    includedLimit: usage.includedLimit,
    usedCount: usage.usedCount,
    globalInvoiceCount: usage.globalInvoiceCount,
    individualInvoiceCount: usage.individualInvoiceCount,
    overageCount: usage.overageCount,
    overageUnitPrice: decimalMoney(usage.overageUnitPrice),
    overageTotal: money(usage.overageCount * Number(usage.overageUnitPrice)),
    currency: usage.currency,
  };
}

function serializeOneTimeCharge(charge: SaasOneTimeCharge) {
  return {
    id: charge.id,
    organizationId: charge.organizationId,
    subscriptionId: charge.subscriptionId,
    billingCycleId: charge.billingCycleId,
    chargeType: charge.chargeType,
    description: charge.description,
    amount: decimalMoney(charge.amount),
    taxAmount: decimalMoney(charge.taxAmount),
    total: decimalMoney(charge.total),
    currency: charge.currency,
    status: charge.status,
    createdAt: charge.createdAt.toISOString(),
  };
}

function serializeSubscriptionItem(item: {
  id: string;
  subscriptionId: string;
  itemType: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  currency: string;
  status: string;
}) {
  return {
    id: item.id,
    subscriptionId: item.subscriptionId,
    itemType: item.itemType,
    quantity: item.quantity,
    unitPrice: decimalMoney(item.unitPrice),
    currency: item.currency,
    status: item.status,
  };
}

function descriptionForItem(itemType: string) {
  const descriptions: Record<string, string> = {
    base_plan: "Suscripcion mensual Tortilla Plus",
    included_pos: "POS incluido",
    included_terminal: "Terminal vinculada incluida",
    included_branch: "Sucursal incluida",
    included_cfdi: "CFDI incluidos",
    extra_pos: "POS adicional",
    extra_terminal: "Terminal vinculada adicional",
    extra_branch: "Sucursal adicional",
    support_priority: "Soporte prioritario",
  };
  return descriptions[itemType] ?? itemType;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number) {
  return round(value).toFixed(2);
}

function decimalMoney(value: Prisma.Decimal) {
  return Number(value).toFixed(2);
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
  if (typeof value !== "string") return null;
  return value.trim();
}

function asPositiveMoney(value: unknown) {
  const raw = typeof value === "number" ? value.toString() : asString(value, "amount");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, "INVALID_AMOUNT", "El monto debe ser mayor a cero.");
  }
  return amount.toFixed(2);
}

function asPositiveInteger(value: unknown) {
  const raw = typeof value === "number" ? value : Number(asString(value, "quantity"));
  if (!Number.isInteger(raw) || raw <= 0) {
    throw new DomainError(400, "INVALID_QUANTITY", "La cantidad debe ser entero mayor a cero.");
  }
  return raw;
}

function asSubscriptionItemType(value: unknown) {
  const allowed = [
    "base_plan",
    "included_pos",
    "included_terminal",
    "included_branch",
    "included_cfdi",
    "extra_pos",
    "extra_terminal",
    "extra_branch",
    "support_priority",
    "pos_device",
    "branch_extra",
    "user_extra",
  ];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new DomainError(400, "INVALID_ITEM_TYPE", "Tipo de item invalido.");
  }
  return value as Prisma.SubscriptionItemCreateInput["itemType"];
}

function asGenericStatus(value: unknown): "active" | "inactive" | "deleted" {
  if (value !== "active" && value !== "inactive" && value !== "deleted") {
    throw new DomainError(400, "INVALID_STATUS", "Estado invalido.");
  }
  return value;
}

function optionalMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return Number(asPositiveMoney(value));
}

function optionalDate(value: unknown) {
  const raw = optionalString(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida.");
  return date;
}

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, current) => {
    if (typeof current?.toString === "function" && current.constructor?.name === "Decimal") return current.toString();
    if (current instanceof Date) return current.toISOString();
    return current;
  })) as Prisma.InputJsonValue;
}
