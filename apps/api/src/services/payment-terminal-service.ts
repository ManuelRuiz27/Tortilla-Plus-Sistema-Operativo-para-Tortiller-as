import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { getActiveAccessToken, upsertMockConnection } from "./mercadopago-oauth-service.js";
import { listTerminals as listMercadoPagoTerminals } from "./mercadopago-point-adapter.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";

export async function listMercadoPagoTerminalsForManager(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "integrations.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const terminals = await prisma.paymentTerminal.findMany({
    where: {
      organizationId: currentUser.organizationId,
      provider: "mercadopago",
      branchId: branchId ?? undefined,
    },
    include: {
      posPaymentTerminalBindingTerminal: {
        where: { status: "active" },
        include: { posDevice: true },
        take: 1,
      },
    },
    orderBy: [{ status: "asc" }, { terminalName: "asc" }],
  });

  return { data: terminals.map(serializeTerminal) };
}

export async function syncMercadoPagoTerminals(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "integrations.manage");
  const body = asLooseRecord(input);
  const branchId = optionalString(body.branchId);
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const connection = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await getActiveConnection(currentUser.organizationId)
    : await upsertMockConnection(currentUser);

  const remoteTerminals = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await listMercadoPagoTerminals(await getActiveAccessToken(connection.id))
    : buildMockTerminals(branchId);

  const synced = [];
  for (const terminal of remoteTerminals) {
    const stored = await prisma.paymentTerminal.upsert({
      where: {
        providerConnectionId_terminalId: {
          providerConnectionId: connection.id,
          terminalId: terminal.terminalId,
        },
      },
      update: {
        branchId: branchId ?? undefined,
        terminalName: terminal.terminalName,
        externalStoreId: terminal.externalStoreId,
        externalPosId: terminal.externalPosId,
        mpStoreId: terminal.mpStoreId,
        mpPosId: terminal.mpPosId,
        operatingMode: terminal.operatingMode,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        organizationId: currentUser.organizationId,
        branchId,
        providerConnectionId: connection.id,
        provider: "mercadopago",
        terminalId: terminal.terminalId,
        terminalName: terminal.terminalName,
        externalStoreId: terminal.externalStoreId,
        externalPosId: terminal.externalPosId,
        mpStoreId: terminal.mpStoreId,
        mpPosId: terminal.mpPosId,
        operatingMode: terminal.operatingMode,
        status: "unassigned",
        lastSeenAt: new Date(),
      },
    });
    const activeBindingCount = await prisma.posPaymentTerminalBinding.count({
      where: {
        paymentTerminalId: stored.id,
        provider: "mercadopago",
        status: "active",
      },
    });
    const terminalWithStatus = activeBindingCount > 0 && stored.status !== "active"
      ? await prisma.paymentTerminal.update({
          where: { id: stored.id },
          data: { status: "active", updatedAt: new Date() },
        })
      : stored;
    synced.push(terminalWithStatus);
  }

  await audit(currentUser, branchId, "mercadopago_terminals_synced", "payment_provider_connection", connection.id, {
    count: synced.length,
    terminalIds: synced.map((terminal) => terminal.terminalId),
  });

  return listMercadoPagoTerminalsForManager(currentUser, { branchId });
}

export async function bindMercadoPagoTerminalToPos(currentUser: AuthenticatedUser, posDeviceId: string, input: unknown) {
  await assertPermission(currentUser.id, "integrations.manage");
  const body = asRecord(input);
  const paymentTerminalId = asString(body.paymentTerminalId, "paymentTerminalId");

  const posDevice = await prisma.posDevice.findFirst({
    where: { id: posDeviceId, organizationId: currentUser.organizationId },
  });
  if (!posDevice) {
    throw new DomainError(404, "POS_DEVICE_NOT_FOUND", "POS no encontrado.");
  }
  await assertBranchAccess(currentUser, posDevice.branchId);

  const terminal = await prisma.paymentTerminal.findFirst({
    where: { id: paymentTerminalId, organizationId: currentUser.organizationId, provider: "mercadopago" },
  });
  if (!terminal) {
    throw new DomainError(404, "PAYMENT_TERMINAL_NOT_FOUND", "Terminal no encontrada.");
  }

  const binding = await prisma.$transaction(async (tx) => {
    await tx.posPaymentTerminalBinding.updateMany({
      where: {
        organizationId: currentUser.organizationId,
        provider: "mercadopago",
        OR: [
          { posDeviceId },
          { paymentTerminalId },
        ],
        status: "active",
      },
      data: { status: "inactive", updatedAt: new Date() },
    });

    const created = await tx.posPaymentTerminalBinding.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId: posDevice.branchId,
        posDeviceId,
        paymentTerminalId,
        provider: "mercadopago",
        status: "active",
        createdByUserId: currentUser.id,
      },
    });

    await tx.paymentTerminal.update({
      where: { id: paymentTerminalId },
      data: {
        branchId: posDevice.branchId,
        status: "active",
        updatedAt: new Date(),
      },
    });

    return created;
  });

  await audit(currentUser, posDevice.branchId, "mercadopago_terminal_bound_to_pos", "pos_payment_terminal_binding", binding.id, {
    posDeviceId,
    paymentTerminalId,
  });

  return { data: binding };
}

export async function unbindMercadoPagoTerminalFromPos(currentUser: AuthenticatedUser, posDeviceId: string, bindingId: string) {
  await assertPermission(currentUser.id, "integrations.manage");
  const binding = await prisma.posPaymentTerminalBinding.findFirst({
    where: { id: bindingId, posDeviceId, organizationId: currentUser.organizationId, provider: "mercadopago" },
  });
  if (!binding) {
    throw new DomainError(404, "TERMINAL_BINDING_NOT_FOUND", "Asignacion de terminal no encontrada.");
  }
  await assertBranchAccess(currentUser, binding.branchId);

  const updated = await prisma.posPaymentTerminalBinding.update({
    where: { id: binding.id },
    data: { status: "inactive", updatedAt: new Date() },
  });
  await audit(currentUser, binding.branchId, "mercadopago_terminal_unbound_from_pos", "pos_payment_terminal_binding", binding.id, updated);
  return { data: updated };
}

export async function resolveActiveBinding(input: {
  organizationId: string;
  branchId: string;
  posDeviceId?: string | null;
}) {
  const posDevice = input.posDeviceId
    ? await prisma.posDevice.findFirst({
        where: { id: input.posDeviceId, organizationId: input.organizationId, branchId: input.branchId },
      })
    : await prisma.posDevice.findFirst({
        where: { organizationId: input.organizationId, branchId: input.branchId, status: "active" },
        orderBy: { updatedAt: "desc" },
      });

  if (!posDevice) {
    throw new DomainError(409, "POS_DEVICE_NOT_CONFIGURED", "No hay POS activo para esta sucursal.");
  }

  const binding = await prisma.posPaymentTerminalBinding.findFirst({
    where: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      posDeviceId: posDevice.id,
      provider: "mercadopago",
      status: "active",
    },
    include: {
      paymentTerminal: true,
    },
  });

  if (!binding) {
    throw new DomainError(409, "TERMINAL_NOT_ASSIGNED", "No hay terminal Mercado Pago asignada a este POS.");
  }
  return { posDevice, binding };
}

function serializeTerminal(terminal: Prisma.PaymentTerminalGetPayload<{
  include: { posPaymentTerminalBindingTerminal: { include: { posDevice: true } } };
}>) {
  const binding = terminal.posPaymentTerminalBindingTerminal[0] ?? null;
  return {
    id: terminal.id,
    branchId: terminal.branchId,
    providerConnectionId: terminal.providerConnectionId,
    terminalId: terminal.terminalId,
    terminalName: terminal.terminalName,
    externalStoreId: terminal.externalStoreId,
    externalPosId: terminal.externalPosId,
    mpStoreId: terminal.mpStoreId,
    mpPosId: terminal.mpPosId,
    operatingMode: terminal.operatingMode,
    status: terminal.status,
    lastSeenAt: terminal.lastSeenAt?.toISOString() ?? null,
    binding: binding
      ? {
          id: binding.id,
          posDeviceId: binding.posDeviceId,
          posDeviceName: binding.posDevice.deviceName,
          status: binding.status,
        }
      : null,
  };
}

async function getActiveConnection(organizationId: string) {
  const connection = await prisma.paymentProviderConnection.findFirst({
    where: { organizationId, provider: "mercadopago", status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!connection) {
    throw new DomainError(409, "MERCADOPAGO_NOT_CONNECTED", "Mercado Pago no esta conectado.");
  }
  return connection;
}

function buildMockTerminals(branchId: string | null) {
  const suffix = (branchId ?? "ORG").replace(/-/g, "").slice(0, 10).toUpperCase();
  return [
    {
      terminalId: `NEWLAND_N950__TP${suffix}01`,
      terminalName: "Mercado Pago Point Mostrador",
      externalStoreId: branchId ? `store-${suffix}` : null,
      externalPosId: branchId ? `pos-${suffix}-01` : null,
      mpStoreId: branchId ? `mock-store-${branchId.slice(0, 8)}` : null,
      mpPosId: null,
      operatingMode: "PDV",
    },
  ];
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

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }
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
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}
