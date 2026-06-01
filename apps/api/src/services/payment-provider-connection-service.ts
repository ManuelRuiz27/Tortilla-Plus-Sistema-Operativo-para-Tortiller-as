import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { getActiveAccessToken, serializeConnection } from "./mercadopago-oauth-service.js";
import { assertPermission } from "./permission-service.js";

export async function getMercadoPagoConnection(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "integrations.view");
  const connection = await prisma.paymentProviderConnection.findFirst({
    where: { organizationId: currentUser.organizationId, provider: "mercadopago" },
    orderBy: { createdAt: "desc" },
  });

  return { data: connection ? serializeConnection(connection) : null };
}

export async function disconnectMercadoPago(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "integrations.manage");
  const connection = await prisma.paymentProviderConnection.findFirst({
    where: { organizationId: currentUser.organizationId, provider: "mercadopago" },
    orderBy: { createdAt: "desc" },
  });
  if (!connection) {
    return { data: null };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.posPaymentTerminalBinding.updateMany({
      where: {
        organizationId: currentUser.organizationId,
        provider: "mercadopago",
        paymentTerminal: { providerConnectionId: connection.id },
        status: "active",
      },
      data: { status: "inactive", updatedAt: new Date() },
    });
    await tx.paymentTerminal.updateMany({
      where: { organizationId: currentUser.organizationId, providerConnectionId: connection.id },
      data: { status: "inactive", updatedAt: new Date() },
    });
    return tx.paymentProviderConnection.update({
      where: { id: connection.id },
      data: {
        status: "revoked",
        accessTokenCiphertext: null,
        refreshTokenCiphertext: null,
        updatedAt: new Date(),
      },
    });
  });

  await audit(currentUser, null, "mercadopago_disconnected", "payment_provider_connection", updated.id, serializeConnection(updated));
  return { data: serializeConnection(updated) };
}

export async function healthCheckMercadoPago(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "integrations.manage");
  const connection = await prisma.paymentProviderConnection.findFirst({
    where: { organizationId: currentUser.organizationId, provider: "mercadopago" },
    orderBy: { createdAt: "desc" },
  });
  if (!connection) {
    throw new DomainError(409, "MERCADOPAGO_NOT_CONNECTED", "Mercado Pago no esta conectado.");
  }

  try {
    await getActiveAccessToken(connection.id);
    const updated = await prisma.paymentProviderConnection.update({
      where: { id: connection.id },
      data: {
        status: "active",
        lastHealthCheckAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      },
    });
    await audit(currentUser, null, "mercadopago_health_check_ok", "payment_provider_connection", updated.id, serializeConnection(updated));
    return { data: serializeConnection(updated) };
  } catch (error) {
    const updated = await prisma.paymentProviderConnection.update({
      where: { id: connection.id },
      data: {
        status: "error",
        lastHealthCheckAt: new Date(),
        lastErrorCode: error instanceof DomainError ? error.code : "MERCADOPAGO_HEALTH_CHECK_FAILED",
        lastErrorMessage: error instanceof Error ? error.message : "Error desconocido.",
        updatedAt: new Date(),
      },
    });
    await audit(currentUser, null, "mercadopago_health_check_failed", "payment_provider_connection", updated.id, serializeConnection(updated));
    return { data: serializeConnection(updated) };
  }
}

async function audit(currentUser: AuthenticatedUser, branchId: string | null, action: string, entityType: string, entityId: string, afterSnapshot: unknown) {
  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType,
      entityId,
      afterSnapshot: afterSnapshot as Prisma.InputJsonValue,
    },
  });
}
