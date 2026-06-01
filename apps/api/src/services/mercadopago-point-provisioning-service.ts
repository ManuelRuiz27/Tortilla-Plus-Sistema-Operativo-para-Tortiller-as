import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { getActiveAccessToken } from "./mercadopago-oauth-service.js";
import {
  createExternalPos,
  createStore,
  setupTerminalOperatingMode,
} from "./mercadopago-point-adapter.js";
import { syncMercadoPagoTerminals } from "./payment-terminal-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";

const provider = "mercadopago" as const;

export async function getMercadoPagoProvisioningSummary(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "integrations.view");
  const query = asLooseRecord(input);
  const branchId = asString(query.branchId, "branchId");
  const posDeviceId = optionalString(query.posDeviceId);
  await assertBranchAccess(currentUser, branchId);

  const [branchConfig, posConfig] = await Promise.all([
    prisma.mercadoPagoBranchConfig.findUnique({
      where: { organizationId_branchId: { organizationId: currentUser.organizationId, branchId } },
    }),
    posDeviceId
      ? prisma.mercadoPagoPosConfig.findUnique({
          where: { organizationId_posDeviceId: { organizationId: currentUser.organizationId, posDeviceId } },
        })
      : null,
  ]);

  return {
    data: {
      branchConfig: branchConfig ? serializeBranchConfig(branchConfig) : null,
      posConfig: posConfig ? serializePosConfig(posConfig) : null,
    },
  };
}

export async function createOrSyncStoreForBranch(currentUser: AuthenticatedUser, branchId: string) {
  await assertPermission(currentUser.id, "integrations.manage");
  await assertBranchAccess(currentUser, branchId);
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: currentUser.organizationId },
  });
  if (!branch) {
    throw new DomainError(404, "BRANCH_NOT_FOUND", "Sucursal no encontrada.");
  }

  const connection = await getActiveConnection(currentUser.organizationId);
  const externalStoreId = externalStoreIdForBranch(branch.id);
  const storeName = branch.name;
  const existing = await prisma.mercadoPagoBranchConfig.findUnique({
    where: { organizationId_branchId: { organizationId: currentUser.organizationId, branchId } },
  });
  if (existing?.mpStoreId) {
    return { data: serializeBranchConfig(existing) };
  }
  if (env.PHYSICAL_INTEGRATIONS_MODE === "real" && !connection.mpUserId) {
    throw new DomainError(409, "MERCADOPAGO_USER_ID_MISSING", "La conexion Mercado Pago no tiene user_id.");
  }
  const mpUserId = connection.mpUserId ?? "";

  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await createStore({
        accessToken: await getActiveAccessToken(connection.id),
        mpUserId,
        name: storeName,
        externalStoreId,
        location: locationForBranch(branch),
      })
    : {
        id: `mock-store-${branch.id.slice(0, 8)}`,
        name: storeName,
        externalStoreId,
        raw: { mode: "mock", externalStoreId },
      };

  const config = await prisma.mercadoPagoBranchConfig.upsert({
    where: { organizationId_branchId: { organizationId: currentUser.organizationId, branchId } },
    update: {
      providerConnectionId: connection.id,
      mpStoreId: remote.id,
      externalStoreId: remote.externalStoreId ?? externalStoreId,
      storeName: remote.name ?? storeName,
      status: "active",
      updatedAt: new Date(),
    },
    create: {
      organizationId: currentUser.organizationId,
      branchId,
      providerConnectionId: connection.id,
      mpStoreId: remote.id,
      externalStoreId: remote.externalStoreId ?? externalStoreId,
      storeName: remote.name ?? storeName,
      status: "active",
    },
  });

  await audit(currentUser, branchId, "mercadopago_store_provisioned", "mercadopago_branch_config", config.id, {
    config: serializeBranchConfig(config),
    providerResponse: remote.raw,
  });

  return { data: serializeBranchConfig(config) };
}

export async function createOrSyncExternalPosForPosDevice(currentUser: AuthenticatedUser, posDeviceId: string) {
  await assertPermission(currentUser.id, "integrations.manage");
  const posDevice = await prisma.posDevice.findFirst({
    where: { id: posDeviceId, organizationId: currentUser.organizationId },
  });
  if (!posDevice) {
    throw new DomainError(404, "POS_DEVICE_NOT_FOUND", "POS no encontrado.");
  }
  await assertBranchAccess(currentUser, posDevice.branchId);
  const branchConfig = await prisma.mercadoPagoBranchConfig.findUnique({
    where: { organizationId_branchId: { organizationId: currentUser.organizationId, branchId: posDevice.branchId } },
  });
  if (!branchConfig?.mpStoreId) {
    throw new DomainError(409, "MP_STORE_NOT_CONFIGURED", "Prepara la sucursal Mercado Pago antes de crear la caja.");
  }

  const existing = await prisma.mercadoPagoPosConfig.findUnique({
    where: { organizationId_posDeviceId: { organizationId: currentUser.organizationId, posDeviceId } },
  });
  if (existing?.mpPosId) {
    return { data: serializePosConfig(existing) };
  }

  const externalPosId = externalPosIdForDevice(posDevice.id);
  const connectionId = branchConfig.providerConnectionId;
  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await createExternalPos({
        accessToken: await getActiveAccessToken(connectionId),
        name: posDevice.deviceName,
        storeId: branchConfig.mpStoreId,
        externalStoreId: branchConfig.externalStoreId,
        externalPosId,
      })
    : {
        id: `mock-pos-${posDevice.id.slice(0, 8)}`,
        name: posDevice.deviceName,
        externalPosId,
        externalStoreId: branchConfig.externalStoreId,
        storeId: branchConfig.mpStoreId,
        status: "active",
        raw: { mode: "mock", externalPosId },
      };

  const config = await prisma.mercadoPagoPosConfig.upsert({
    where: { organizationId_posDeviceId: { organizationId: currentUser.organizationId, posDeviceId } },
    update: {
      providerConnectionId: connectionId,
      mpBranchConfigId: branchConfig.id,
      mpPosId: remote.id,
      externalPosId: remote.externalPosId ?? externalPosId,
      posName: remote.name ?? posDevice.deviceName,
      status: remote.status ?? "active",
      updatedAt: new Date(),
    },
    create: {
      organizationId: currentUser.organizationId,
      branchId: posDevice.branchId,
      posDeviceId,
      providerConnectionId: connectionId,
      mpBranchConfigId: branchConfig.id,
      mpPosId: remote.id,
      externalPosId: remote.externalPosId ?? externalPosId,
      posName: remote.name ?? posDevice.deviceName,
      status: remote.status ?? "active",
    },
  });

  await audit(currentUser, posDevice.branchId, "mercadopago_pos_provisioned", "mercadopago_pos_config", config.id, {
    config: serializePosConfig(config),
    providerResponse: remote.raw,
  });

  return { data: serializePosConfig(config) };
}

export async function activateTerminalPdvMode(currentUser: AuthenticatedUser, paymentTerminalId: string) {
  await assertPermission(currentUser.id, "integrations.manage");
  const terminal = await prisma.paymentTerminal.findFirst({
    where: { id: paymentTerminalId, organizationId: currentUser.organizationId, provider },
  });
  if (!terminal) {
    throw new DomainError(404, "PAYMENT_TERMINAL_NOT_FOUND", "Terminal no encontrada.");
  }
  if (terminal.branchId) {
    await assertBranchAccess(currentUser, terminal.branchId);
  }

  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await setupTerminalOperatingMode({
        accessToken: await getActiveAccessToken(terminal.providerConnectionId),
        terminalId: terminal.terminalId,
        operatingMode: "PDV",
      })
    : {
        terminals: [{ terminalId: terminal.terminalId, operatingMode: "PDV" }],
        raw: { mode: "mock", terminalId: terminal.terminalId, operatingMode: "PDV" },
      };

  const updated = await prisma.paymentTerminal.update({
    where: { id: terminal.id },
    data: {
      operatingMode: remote.terminals[0]?.operatingMode ?? "PDV",
      updatedAt: new Date(),
    },
  });

  if (terminal.branchId) {
    await syncMercadoPagoTerminals(currentUser, { branchId: terminal.branchId }).catch(() => undefined);
  }

  await audit(currentUser, terminal.branchId, "mercadopago_terminal_pdv_activated", "payment_terminal", terminal.id, {
    terminalId: terminal.terminalId,
    providerResponse: remote.raw,
  });

  return { data: { terminal: serializeTerminalReadiness(updated), setup: remote.terminals } };
}

export async function validateTerminalReadyForPosDevice(currentUser: AuthenticatedUser, paymentTerminalId: string) {
  await assertPermission(currentUser.id, "integrations.manage");
  const terminal = await prisma.paymentTerminal.findFirst({
    where: { id: paymentTerminalId, organizationId: currentUser.organizationId, provider },
    include: {
      posPaymentTerminalBindingTerminal: {
        where: { status: "active" },
        include: { posDevice: true },
        take: 1,
      },
    },
  });
  if (!terminal) {
    throw new DomainError(404, "PAYMENT_TERMINAL_NOT_FOUND", "Terminal no encontrada.");
  }
  const binding = terminal.posPaymentTerminalBindingTerminal[0] ?? null;
  if (!binding) {
    throw new DomainError(409, "TERMINAL_NOT_ASSIGNED", "Esta terminal no esta asignada a una caja.");
  }
  await assertBranchAccess(currentUser, binding.branchId);
  const readiness = await assertTerminalReadyForOrder({
    organizationId: currentUser.organizationId,
    branchId: binding.branchId,
    posDeviceId: binding.posDeviceId,
    terminal,
  });

  return {
    data: {
      ready: true,
      branchConfig: serializeBranchConfig(readiness.branchConfig),
      posConfig: serializePosConfig(readiness.posConfig),
      terminal: serializeTerminalReadiness(terminal),
    },
  };
}

export async function assertTerminalReadyForOrder(input: {
  organizationId: string;
  branchId: string;
  posDeviceId: string;
  terminal: {
    id: string;
    mpStoreId: string | null;
    mpPosId: string | null;
    externalStoreId: string | null;
    externalPosId: string | null;
    operatingMode: string | null;
  };
}) {
  const branchConfig = await prisma.mercadoPagoBranchConfig.findUnique({
    where: { organizationId_branchId: { organizationId: input.organizationId, branchId: input.branchId } },
  });
  if (!branchConfig?.mpStoreId) {
    throw new DomainError(409, "MP_STORE_NOT_CONFIGURED", "La sucursal no tiene Store Mercado Pago configurado.");
  }

  const posConfig = await prisma.mercadoPagoPosConfig.findUnique({
    where: { organizationId_posDeviceId: { organizationId: input.organizationId, posDeviceId: input.posDeviceId } },
  });
  if (!posConfig?.mpPosId) {
    throw new DomainError(409, "MP_POS_NOT_CONFIGURED", "La caja no tiene POS Mercado Pago configurado.");
  }

  if (input.terminal.mpStoreId && input.terminal.mpStoreId !== branchConfig.mpStoreId) {
    throw new DomainError(409, "TERMINAL_STORE_MISMATCH", "La terminal esta asociada a otra sucursal Mercado Pago.");
  }
  if (input.terminal.mpPosId && input.terminal.mpPosId !== posConfig.mpPosId) {
    throw new DomainError(409, "TERMINAL_POS_MISMATCH", "La terminal esta asociada a otro POS Mercado Pago.");
  }
  if (input.terminal.operatingMode && input.terminal.operatingMode !== "PDV") {
    throw new DomainError(409, "TERMINAL_NOT_PDV", "La terminal Mercado Pago no esta en modo PDV.");
  }
  return { branchConfig, posConfig };
}

async function getActiveConnection(organizationId: string) {
  const connection = await prisma.paymentProviderConnection.findFirst({
    where: { organizationId, provider, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!connection) {
    throw new DomainError(409, "MERCADOPAGO_NOT_CONNECTED", "Mercado Pago no esta conectado.");
  }
  return connection;
}

function externalStoreIdForBranch(branchId: string) {
  return `TP-${branchId.replace(/-/g, "").slice(0, 24)}`;
}

function externalPosIdForDevice(posDeviceId: string) {
  return `TPPOS-${posDeviceId.replace(/-/g, "").slice(0, 24)}`;
}

function locationForBranch(branch: { address: string | null }) {
  return {
    streetName: branch.address?.slice(0, 80) || "Tortilla Plus",
    streetNumber: "1",
    cityName: "Monterrey",
    stateName: "Nuevo Leon",
    latitude: 25.6866,
    longitude: -100.3161,
    reference: "Configurado desde Tortilla Plus",
  };
}

function serializeBranchConfig(config: {
  id: string;
  organizationId: string;
  branchId: string;
  providerConnectionId: string;
  mpStoreId: string | null;
  externalStoreId: string;
  storeName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: config.id,
    organizationId: config.organizationId,
    branchId: config.branchId,
    providerConnectionId: config.providerConnectionId,
    mpStoreId: config.mpStoreId,
    externalStoreId: config.externalStoreId,
    storeName: config.storeName,
    status: config.status,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

function serializePosConfig(config: {
  id: string;
  organizationId: string;
  branchId: string;
  posDeviceId: string;
  providerConnectionId: string;
  mpBranchConfigId: string;
  mpPosId: string | null;
  externalPosId: string;
  posName: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: config.id,
    organizationId: config.organizationId,
    branchId: config.branchId,
    posDeviceId: config.posDeviceId,
    providerConnectionId: config.providerConnectionId,
    mpBranchConfigId: config.mpBranchConfigId,
    mpPosId: config.mpPosId,
    externalPosId: config.externalPosId,
    posName: config.posName,
    status: config.status,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

function serializeTerminalReadiness(terminal: {
  id: string;
  terminalId: string;
  terminalName: string | null;
  mpStoreId: string | null;
  mpPosId: string | null;
  externalStoreId: string | null;
  externalPosId: string | null;
  operatingMode: string | null;
}) {
  return {
    id: terminal.id,
    terminalId: terminal.terminalId,
    terminalName: terminal.terminalName,
    mpStoreId: terminal.mpStoreId,
    mpPosId: terminal.mpPosId,
    externalStoreId: terminal.externalStoreId,
    externalPosId: terminal.externalPosId,
    operatingMode: terminal.operatingMode,
  };
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
