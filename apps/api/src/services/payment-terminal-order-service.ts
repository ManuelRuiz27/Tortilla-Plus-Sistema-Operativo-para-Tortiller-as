import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { checkoutSale } from "./sale-service.js";
import { createPointOrder, getOrder, cancelOrder } from "./mercadopago-point-adapter.js";
import { getActiveAccessToken } from "./mercadopago-oauth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { resolveActiveBinding } from "./payment-terminal-service.js";
import { assertTerminalReadyForOrder } from "./mercadopago-point-provisioning-service.js";

const provider = "mercadopago" as const;
const openTerminalOrderStatuses = ["created", "sent_to_terminal", "pending"] as const;

export async function createTerminalOrder(currentUser: AuthenticatedUser, input: unknown, idempotencyKey?: string | null) {
  await assertPermission(currentUser.id, "payments.create");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  await assertBranchAccess(currentUser, branchId);
  const posDeviceId = optionalString(body.posDeviceId);
  const amount = asMoney(body.amount, "amount");
  const saleDraft = asSaleDraft(body.saleDraft);
  const authorizationPin = optionalString(body.authorizationPin);
  const checkoutPayments = asOptionalPayments(body.payments);
  const key = idempotencyKey || randomUUID();

  if (env.PHYSICAL_INTEGRATIONS_MODE === "real" && !posDeviceId) {
    throw new DomainError(409, "POS_DEVICE_REQUIRED", "Cobro Mercado Pago requiere caja/POS identificada.");
  }

  const existing = await prisma.paymentTerminalOrder.findFirst({
    where: { organizationId: currentUser.organizationId, provider, idempotencyKey: key },
  });
  if (existing) {
    return { data: serializeOrder(existing) };
  }

  const { posDevice, binding } = await resolveActiveBinding({
    organizationId: currentUser.organizationId,
    branchId,
    posDeviceId,
  });
  const terminal = binding.paymentTerminal;
  await assertTerminalReadyForOrder({
    organizationId: currentUser.organizationId,
    branchId,
    posDeviceId: posDevice.id,
    terminal,
  });
  if (terminal.operatingMode && terminal.operatingMode !== "PDV") {
    throw new DomainError(409, "TERMINAL_NOT_PDV", "La terminal Mercado Pago no esta en modo PDV.");
  }
  const connectionId = terminal.providerConnectionId;
  const externalReference = `TP_${randomUUID().replace(/-/g, "").slice(0, 28)}`;

  const created = await prisma.paymentTerminalOrder.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      posDeviceId: posDevice.id,
      paymentTerminalId: terminal.id,
      providerConnectionId: connectionId,
      provider,
      externalReference,
      idempotencyKey: key,
      amount,
      currency: "MXN",
      status: "created",
      saleDraft: { ...saleDraft, authorizationPin } as Prisma.InputJsonValue,
      checkoutPayments: checkoutPayments as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      createdByUserId: currentUser.id,
    },
  });

  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real"
    ? await createPointOrder({
        accessToken: await getActiveAccessToken(connectionId),
        terminalId: terminal.terminalId,
        amount,
        externalReference,
        idempotencyKey: key,
      })
    : {
        externalOrderId: `mock-order-${created.id}`,
        externalPaymentId: null,
        status: "sent_to_terminal" as const,
        statusDetail: "mock-awaiting-terminal",
        expiresAt: created.expiresAt,
        raw: { mode: "mock", terminalId: terminal.terminalId },
      };

  const updated = await prisma.paymentTerminalOrder.update({
    where: { id: created.id },
    data: {
      externalOrderId: remote.externalOrderId,
      externalPaymentId: remote.externalPaymentId,
      status: remote.status,
      statusDetail: remote.statusDetail,
      expiresAt: remote.expiresAt ?? created.expiresAt,
      rawCreateResponse: remote.raw,
      updatedAt: new Date(),
    },
  });
  await recordEvent(updated, "order_created", updated.status, remote.raw);
  await audit(currentUser, branchId, "mercadopago_terminal_order_created", "payment_terminal_order", updated.id, serializeOrder(updated));
  return { data: serializeOrder(updated) };
}

export async function getOpenTerminalOrder(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "payments.create");
  const query = asLooseRecord(input);
  const branchId = asString(query.branchId, "branchId");
  const posDeviceId = asString(query.posDeviceId, "posDeviceId");
  await assertBranchAccess(currentUser, branchId);

  const order = await prisma.paymentTerminalOrder.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      posDeviceId,
      provider,
      status: { in: [...openTerminalOrderStatuses] },
      saleId: null,
      salePaymentId: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return { data: null };
  }

  const refreshed = await refreshOrderStatus(order);
  if (!openTerminalOrderStatuses.includes(refreshed.status as (typeof openTerminalOrderStatuses)[number]) && refreshed.status !== "approved") {
    return { data: null };
  }
  return { data: serializeOrder(refreshed) };
}

export async function getTerminalOrderStatus(currentUser: AuthenticatedUser, orderId: string) {
  await assertPermission(currentUser.id, "payments.create");
  const order = await getOrderForUser(currentUser, orderId);
  await assertBranchAccess(currentUser, order.branchId);
  const refreshed = await refreshOrderStatus(order);
  return { data: serializeOrder(refreshed) };
}

export async function cancelTerminalOrder(currentUser: AuthenticatedUser, orderId: string, idempotencyKey?: string | null) {
  await assertPermission(currentUser.id, "payments.cancel_terminal_order");
  const order = await getOrderForUser(currentUser, orderId);
  await assertBranchAccess(currentUser, order.branchId);
  if (["approved", "canceled", "expired", "refunded"].includes(order.status)) {
    return { data: serializeOrder(order) };
  }

  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real" && order.externalOrderId
    ? await cancelOrder(await getActiveAccessToken(order.providerConnectionId), order.externalOrderId, idempotencyKey || randomUUID())
    : {
        status: "canceled" as const,
        statusDetail: "mock-canceled",
        raw: { mode: "mock", canceled: true },
      };

  const updated = await prisma.paymentTerminalOrder.update({
    where: { id: order.id },
    data: {
      status: remote.status,
      statusDetail: remote.statusDetail,
      canceledAt: new Date(),
      rawLastStatusResponse: remote.raw,
      updatedAt: new Date(),
    },
  });
  await recordEvent(updated, "order_canceled", updated.status, remote.raw);
  await audit(currentUser, order.branchId, "mercadopago_terminal_order_canceled", "payment_terminal_order", updated.id, serializeOrder(updated));
  return { data: serializeOrder(updated) };
}

export async function confirmTerminalOrderAndCheckout(currentUser: AuthenticatedUser, orderId: string, idempotencyKey?: string | null) {
  await assertPermission(currentUser.id, "payments.create");
  const order = await refreshOrderStatus(await getOrderForUser(currentUser, orderId));
  await assertBranchAccess(currentUser, order.branchId);
  if (order.status !== "approved") {
    throw new DomainError(409, "TERMINAL_PAYMENT_NOT_APPROVED", "El pago en terminal aun no esta aprobado.");
  }
  if (order.saleId) {
    throw new DomainError(409, "TERMINAL_ORDER_ALREADY_CHECKED_OUT", "La orden de terminal ya fue usada en una venta.");
  }

  const saleDraft = asSaleDraft(order.saleDraft);
  const storedPayments = asOptionalPayments(order.checkoutPayments);
  const otherPayments = storedPayments.filter((payment) => !(payment.paymentMethod === "card" && payment.provider === "mercadopago"));
  const checkout = await checkoutSale(currentUser, {
    branchId: order.branchId,
    customerId: saleDraft.customerId ?? undefined,
    items: saleDraft.items,
    payments: [
      ...otherPayments,
      {
        paymentMethod: "card",
        amount: Number(order.amount).toFixed(2),
        reference: order.externalPaymentId ?? order.externalOrderId ?? order.externalReference,
        provider: "mercadopago",
        terminalOrderId: order.id,
      },
    ],
    authorizationPin: saleDraft.authorizationPin ?? undefined,
    clientGeneratedId: saleDraft.clientGeneratedId ?? undefined,
  }, idempotencyKey || `terminal-checkout-${order.id}`);

  await audit(currentUser, order.branchId, "mercadopago_terminal_checkout_completed", "payment_terminal_order", order.id, {
    orderId: order.id,
    saleId: checkout.data.id,
  });
  return checkout;
}

export async function assertApprovedTerminalOrderForPayment(input: {
  organizationId: string;
  branchId: string;
  amount: string;
  terminalOrderId: string;
}) {
  const order = await prisma.paymentTerminalOrder.findFirst({
    where: {
      id: input.terminalOrderId,
      organizationId: input.organizationId,
      branchId: input.branchId,
      provider,
      status: "approved",
      saleId: null,
      salePaymentId: null,
    },
  });
  if (!order) {
    throw new DomainError(409, "TERMINAL_PAYMENT_NOT_APPROVED", "Pago Mercado Pago no aprobado o ya utilizado.");
  }
  if (Number(order.amount).toFixed(2) !== input.amount) {
    throw new DomainError(409, "TERMINAL_PAYMENT_AMOUNT_MISMATCH", "El monto aprobado en terminal no coincide.");
  }
  return order;
}

export async function attachTerminalOrderToSale(input: {
  terminalOrderId: string;
  saleId: string;
  salePaymentId: string;
}) {
  await prisma.paymentTerminalOrder.update({
    where: { id: input.terminalOrderId },
    data: {
      saleId: input.saleId,
      salePaymentId: input.salePaymentId,
      updatedAt: new Date(),
    },
  });
}

export async function processMercadoPagoTerminalWebhook(input: unknown) {
  const payload = asRecord(input);
  const externalOrderId = extractExternalOrderId(payload);
  const eventType = optionalString(payload.type) ?? optionalString(payload.action) ?? "mercadopago_order_event";
  const eventStatus = optionalString(payload.status) ?? optionalString(payload.data_status);
  const externalEventId = optionalString(payload.id) ?? hashPayload(payload);

  if (!externalOrderId) {
    return { data: { processed: false, reason: "order_id_not_found" } };
  }

  const order = await prisma.paymentTerminalOrder.findFirst({
    where: { provider, externalOrderId },
  });
  if (!order) {
    return { data: { processed: false, reason: "terminal_order_not_found", externalOrderId } };
  }

  await prisma.paymentTerminalEvent.create({
    data: {
      organizationId: order.organizationId,
      branchId: order.branchId,
      terminalOrderId: order.id,
      provider,
      externalEventId,
      eventType,
      eventStatus,
      payload: payload as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);

  const mappedStatus = mapProviderStatus(eventStatus);
  if (mappedStatus) {
    const updated = await prisma.paymentTerminalOrder.update({
      where: { id: order.id },
      data: {
        status: mappedStatus,
        statusDetail: eventStatus,
        rawLastStatusResponse: payload as Prisma.InputJsonValue,
        approvedAt: mappedStatus === "approved" ? new Date() : order.approvedAt,
        rejectedAt: mappedStatus === "rejected" ? new Date() : order.rejectedAt,
        canceledAt: mappedStatus === "canceled" ? new Date() : order.canceledAt,
        updatedAt: new Date(),
      },
    });
    return { data: { processed: true, order: serializeOrder(updated) } };
  }

  const refreshed = await refreshOrderStatus(order);
  return { data: { processed: true, order: serializeOrder(refreshed) } };
}

async function refreshOrderStatus(order: Awaited<ReturnType<typeof getOrderForUser>>) {
  if (order.status === "approved" || order.status === "rejected" || order.status === "expired" || order.status === "canceled") {
    return order;
  }

  if (order.expiresAt && order.expiresAt.getTime() < Date.now()) {
    const expired = await prisma.paymentTerminalOrder.update({
      where: { id: order.id },
      data: { status: "expired", statusDetail: "ttl-expired", updatedAt: new Date() },
    });
    await recordEvent(expired, "order_expired", "expired", { reason: "ttl-expired" });
    return expired;
  }

  const remote = env.PHYSICAL_INTEGRATIONS_MODE === "real" && order.externalOrderId
    ? await getOrder(await getActiveAccessToken(order.providerConnectionId), order.externalOrderId)
    : {
        externalOrderId: order.externalOrderId ?? `mock-order-${order.id}`,
        externalPaymentId: order.externalPaymentId ?? `mock-payment-${order.id}`,
        status: "approved" as const,
        statusDetail: "mock-approved",
        expiresAt: order.expiresAt,
        raw: { mode: "mock", approved: true },
      };

  const updateData: Prisma.PaymentTerminalOrderUpdateInput = {
    externalOrderId: remote.externalOrderId,
    externalPaymentId: remote.externalPaymentId,
    status: remote.status,
    statusDetail: remote.statusDetail,
    expiresAt: remote.expiresAt ?? order.expiresAt,
    rawLastStatusResponse: remote.raw,
    updatedAt: new Date(),
  };
  if (remote.status === "approved") updateData.approvedAt = new Date();
  if (remote.status === "rejected") updateData.rejectedAt = new Date();
  if (remote.status === "canceled") updateData.canceledAt = new Date();

  const updated = await prisma.paymentTerminalOrder.update({
    where: { id: order.id },
    data: updateData,
  });
  await recordEvent(updated, "order_status_polled", updated.status, remote.raw);
  return updated;
}

async function getOrderForUser(currentUser: AuthenticatedUser, orderId: string) {
  const order = await prisma.paymentTerminalOrder.findFirst({
    where: { id: orderId, organizationId: currentUser.organizationId, provider },
  });
  if (!order) {
    throw new DomainError(404, "TERMINAL_ORDER_NOT_FOUND", "Orden de terminal no encontrada.");
  }
  return order;
}

async function recordEvent(order: { id: string; organizationId: string; branchId: string; provider: "mercadopago"; externalOrderId: string | null }, eventType: string, status: string, payload: unknown) {
  await prisma.paymentTerminalEvent.create({
    data: {
      organizationId: order.organizationId,
      branchId: order.branchId,
      terminalOrderId: order.id,
      provider: order.provider,
      externalEventId: `${eventType}:${order.externalOrderId ?? order.id}:${status}`,
      eventType,
      eventStatus: status,
      payload: payload as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);
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

function serializeOrder(order: {
  id: string;
  provider: string;
  externalOrderId: string | null;
  externalPaymentId: string | null;
  externalReference: string;
  amount: Prisma.Decimal;
  currency: string;
  status: string;
  statusDetail: string | null;
  paymentTerminalId: string;
  expiresAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: order.id,
    provider: order.provider,
    externalOrderId: order.externalOrderId,
    externalPaymentId: order.externalPaymentId,
    externalReference: order.externalReference,
    amount: Number(order.amount).toFixed(2),
    currency: order.currency,
    status: order.status,
    statusDetail: order.statusDetail,
    paymentTerminalId: order.paymentTerminalId,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    approvedAt: order.approvedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function extractExternalOrderId(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data as Record<string, unknown>
    : {};
  return optionalString(payload.order_id)
    ?? optionalString(payload.resource)
    ?? optionalString(payload.resource_id)
    ?? optionalString(data.id)
    ?? optionalString(data.order_id);
}

function mapProviderStatus(status: string | null) {
  if (!status) return null;
  if (status === "processed" || status === "approved") return "approved";
  if (status === "at_terminal") return "sent_to_terminal";
  if (status === "created") return "created";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "expired") return "expired";
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";
  return null;
}

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function asSaleDraft(value: unknown) {
  const body = asRecord(value);
  const customerId = optionalString(body.customerId);
  const clientGeneratedId = optionalString(body.clientGeneratedId);
  const authorizationPin = optionalString(body.authorizationPin);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new DomainError(400, "INVALID_REQUEST", "saleDraft.items requeridos.");
  }
  return {
    customerId,
    clientGeneratedId,
    authorizationPin,
    items: body.items,
  };
}

function asOptionalPayments(value: unknown): Array<Record<string, unknown>> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new DomainError(400, "INVALID_REQUEST", "payments debe ser arreglo.");
  }
  return value.map(asRecord);
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

function asMoney(value: unknown, field: string): string {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DomainError(400, "INVALID_REQUEST", `Monto invalido: ${field}.`);
  }
  return amount.toFixed(2);
}
