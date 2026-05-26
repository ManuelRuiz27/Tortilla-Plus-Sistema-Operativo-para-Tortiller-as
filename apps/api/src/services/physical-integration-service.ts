import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";

type TerminalProvider = "mercadopago" | "clip";

type TerminalPaymentResult = {
  provider: TerminalProvider;
  mode: "mock" | "real";
  status: "approved" | "pending" | "rejected";
  reference: string;
  amount: number;
  externalReference: string;
  fallback: "manual_reference_allowed";
  rawProviderStatus: string;
};

const terminalProviders = new Set(["mercadopago", "clip"]);

export async function createTerminalPayment(currentUser: AuthenticatedUser, provider: TerminalProvider, input: unknown) {
  assertTerminalProvider(provider);
  await assertPermission(currentUser.id, "payments.create");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  await assertBranchAccess(currentUser, branchId);
  const amount = normalizeMoney(body.amount);
  const externalReference = optionalString(body.externalReference) ?? `tp-${randomUUID()}`;
  const terminalId = optionalString(body.terminalId);

  const result = integrationMode() === "real"
    ? await createRealTerminalPayment(provider, amount, externalReference, terminalId)
    : createMockTerminalPayment(provider, amount, externalReference, terminalId);

  await audit(currentUser, branchId, `${provider}_terminal_payment_created`, result);
  return { data: result };
}

export async function getTerminalPaymentStatus(currentUser: AuthenticatedUser, provider: TerminalProvider, reference: string, input: unknown) {
  assertTerminalProvider(provider);
  await assertPermission(currentUser.id, "payments.create");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }
  const result: TerminalPaymentResult = {
    provider,
    mode: integrationMode(),
    status: "approved",
    reference: asString(reference, "reference"),
    amount: 0,
    externalReference: optionalString(query.externalReference) ?? reference,
    fallback: "manual_reference_allowed",
    rawProviderStatus: integrationMode() === "mock" ? "mock-approved" : "real-status-not-configured",
  };
  if (integrationMode() === "real") {
    ensureRealTerminalConfigured(provider);
    throw new DomainError(501, "TERMINAL_STATUS_REAL_PENDING", "Consulta real de terminal pendiente de adaptador certificado.");
  }
  return { data: result };
}

export async function readScale(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "sales.view");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  await assertBranchAccess(currentUser, branchId);
  const deviceId = optionalString(body.deviceId) ?? "scale-mock";
  const manualWeightKg = body.weightKg === undefined ? null : normalizeQuantity(body.weightKg);
  if (integrationMode() === "real") {
    throw new DomainError(501, "SCALE_REAL_PENDING", "Lectura real de bascula pendiente de driver local certificado.");
  }
  const weightKg = manualWeightKg ?? deterministicWeight(deviceId);
  const result = {
    mode: "mock" as const,
    deviceId,
    weightKg,
    unit: "kg",
    fallback: "manual_weight_allowed",
  };
  await audit(currentUser, branchId, "scale_read", result);
  return { data: result };
}

export async function lookupBarcode(currentUser: AuthenticatedUser, barcode: string, input: unknown) {
  await assertPermission(currentUser.id, "products.view");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }
  const cleanBarcode = asString(barcode, "barcode");
  const product = await prisma.product.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      barcode: cleanBarcode,
      status: "active",
    },
    include: {
      branchProductPriceProduct: branchId
        ? {
            where: { branchId, status: "active" },
            orderBy: { activeFrom: "desc" },
            take: 1,
          }
        : false,
    },
  });
  if (!product) {
    throw new DomainError(404, "BARCODE_NOT_FOUND", "Codigo de barras no encontrado.");
  }
  return {
    data: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      productType: product.productType,
      unit: product.unit,
      isSellable: product.isSellable,
      price: product.branchProductPriceProduct?.[0] ? Number(product.branchProductPriceProduct[0].price) : null,
      fallback: "manual_product_search_allowed",
    },
  };
}

function createMockTerminalPayment(provider: TerminalProvider, amount: number, externalReference: string, terminalId: string | null): TerminalPaymentResult {
  return {
    provider,
    mode: "mock",
    status: "approved",
    reference: `${provider.toUpperCase()}-${createHash("sha1").update(`${provider}:${amount}:${externalReference}:${terminalId ?? ""}`).digest("hex").slice(0, 12)}`,
    amount,
    externalReference,
    fallback: "manual_reference_allowed",
    rawProviderStatus: "mock-approved",
  };
}

async function createRealTerminalPayment(provider: TerminalProvider, amount: number, externalReference: string, terminalId: string | null): Promise<TerminalPaymentResult> {
  ensureRealTerminalConfigured(provider);
  if (provider === "mercadopago") {
    const response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        type: "point",
        external_reference: externalReference,
        transactions: { payments: [{ amount: amount.toFixed(2) }] },
        config: { point: { terminal_id: terminalId ?? env.MERCADOPAGO_TERMINAL_ID, print_on_terminal: "no_ticket" } },
      }),
    });
    const payload = await response.json() as { id?: string; status?: string; transactions?: { payments?: Array<{ id?: string; status?: string }> } };
    if (!response.ok || !payload.id) {
      throw new DomainError(502, "MERCADOPAGO_TERMINAL_ERROR", "Mercado Pago no acepto la orden.", payload);
    }
    return {
      provider,
      mode: "real",
      status: payload.status === "processed" ? "approved" : "pending",
      reference: payload.transactions?.payments?.[0]?.id ?? payload.id,
      amount,
      externalReference,
      fallback: "manual_reference_allowed",
      rawProviderStatus: payload.status ?? "created",
    };
  }

  throw new DomainError(501, "CLIP_TERMINAL_REAL_PENDING", "Clip real requiere SDK Terminal o PinPad certificado en cliente/dispositivo.");
}

function ensureRealTerminalConfigured(provider: TerminalProvider) {
  if (provider === "mercadopago" && (!env.MERCADOPAGO_ACCESS_TOKEN || !env.MERCADOPAGO_TERMINAL_ID)) {
    throw new DomainError(503, "MERCADOPAGO_NOT_CONFIGURED", "Mercado Pago real requiere MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_TERMINAL_ID.");
  }
  if (provider === "clip" && (!env.CLIP_API_KEY || !env.CLIP_TERMINAL_ID)) {
    throw new DomainError(503, "CLIP_NOT_CONFIGURED", "Clip real requiere CLIP_API_KEY y CLIP_TERMINAL_ID.");
  }
}

async function audit(currentUser: AuthenticatedUser, branchId: string, action: string, afterSnapshot: unknown) {
  await prisma.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType: "physical_integration",
      entityId: branchId,
      afterSnapshot: afterSnapshot as Prisma.InputJsonValue,
    },
  });
}

function integrationMode() {
  return env.PHYSICAL_INTEGRATIONS_MODE === "real" ? "real" : "mock";
}

function assertTerminalProvider(value: string): asserts value is TerminalProvider {
  if (!terminalProviders.has(value)) {
    throw new DomainError(400, "INVALID_TERMINAL_PROVIDER", "Proveedor de terminal invalido.");
  }
}

function deterministicWeight(seed: string) {
  const hash = createHash("sha1").update(seed).digest();
  return Number((0.5 + hash[0] / 100).toFixed(3));
}

function normalizeMoney(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new DomainError(400, "INVALID_AMOUNT", "Monto invalido.");
  }
  return Number(numberValue.toFixed(2));
}

function normalizeQuantity(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new DomainError(400, "INVALID_QUANTITY", "Cantidad invalida.");
  }
  return Number(numberValue.toFixed(3));
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
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}
