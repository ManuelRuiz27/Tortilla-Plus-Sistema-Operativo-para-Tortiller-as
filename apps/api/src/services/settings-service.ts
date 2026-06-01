import { prisma } from "../lib/prisma.js";
import { DomainError } from "../lib/domain-error.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission, getBranchAssignments } from "./permission-service.js";

export async function getSettingsSummary(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "reports.basic.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  const branchIds = await resolveBranchIds(currentUser, branchId);

  const [posDevices, reasons, packageConfigs, auditLogs] = await Promise.all([
    prisma.posDevice.findMany({
      where: { organizationId: currentUser.organizationId, branchId: { in: branchIds } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.cashMovementReason.findMany({
      where: { organizationId: currentUser.organizationId, status: "active" },
      orderBy: { name: "asc" },
    }),
    prisma.productPackageConfig.findMany({
      where: { product: { organizationId: currentUser.organizationId, status: "active" } },
      include: { product: true, baseProduct: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: { in: branchIds },
        action: {
          in: [
            "sale_completed",
            "invoice_stamped",
            "invoice_cancelled",
            "public_invoice_requested",
            "billing_receipt_reprinted",
            "reconciliation_batch_reviewed",
            "cash_session_closed",
            "delivery_settlement_deposited",
            "mercadopago_terminal_payment_created",
            "mercadopago_oauth_completed",
            "mercadopago_terminals_synced",
            "mercadopago_terminal_bound_to_pos",
            "mercadopago_terminal_order_created",
            "mercadopago_terminal_checkout_completed",
            "manual_card_reference_used",
            "clip_terminal_payment_created",
            "scale_read",
          ],
        },
      },
      include: { user: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return {
    data: {
      posDevices: posDevices.map((device) => ({
        id: device.id,
        branchId: device.branchId,
        name: device.deviceName,
        status: device.status,
        lastSeen: (device.lastSeenAt ?? device.updatedAt).toISOString(),
      })),
      withdrawalReasons: reasons.map((reason) => ({
        id: reason.id,
        name: reason.name,
        direction: reason.movementDirection === "out_" ? "out" : "in",
        requiresAuthorization: reason.requiresAuthorization,
      })),
      packageConfig: packageConfigs.map((config) => ({
        productName: config.product.name,
        baseProductName: config.baseProduct.name,
        packageWeightGrams: Number(config.packageWeightGrams),
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        branchName: log.branch?.name ?? null,
        userName: log.user?.name ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
    },
  };
}

export async function listOperationalPosDevices(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "payments.create");
  const query = asLooseRecord(input);
  const branchId = asString(query.branchId, "branchId");
  await assertBranchAccess(currentUser, branchId);

  const devices = await prisma.posDevice.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      status: "active",
      licensed: true,
    },
    orderBy: [{ deviceName: "asc" }, { updatedAt: "desc" }],
  });

  return {
    data: devices.map((device) => ({
      id: device.id,
      branchId: device.branchId,
      name: device.deviceName,
      status: device.status,
      lastSeen: (device.lastSeenAt ?? device.updatedAt).toISOString(),
    })),
  };
}

async function resolveBranchIds(currentUser: AuthenticatedUser, branchId: string | null) {
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
    return [branchId];
  }
  const assignments = await getBranchAssignments(currentUser.id);
  return assignments.map((assignment) => assignment.id);
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return value.trim();
}

function asString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  return value.trim();
}
