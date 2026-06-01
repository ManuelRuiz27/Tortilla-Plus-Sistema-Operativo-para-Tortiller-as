import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";

export type MercadoPagoTerminal = {
  terminalId: string;
  terminalName: string | null;
  externalStoreId: string | null;
  externalPosId: string | null;
  mpStoreId: string | null;
  mpPosId: string | null;
  operatingMode: string | null;
};

export type MercadoPagoStoreResult = {
  id: string;
  name: string | null;
  externalStoreId: string | null;
  raw: Prisma.InputJsonValue;
};

export type MercadoPagoPosResult = {
  id: string;
  name: string | null;
  externalPosId: string | null;
  externalStoreId: string | null;
  storeId: string | null;
  status: string | null;
  raw: Prisma.InputJsonValue;
};

export type MercadoPagoTerminalSetupResult = {
  terminals: Array<{ terminalId: string; operatingMode: string | null }>;
  raw: Prisma.InputJsonValue;
};

export type MercadoPagoPointOrderResult = {
  externalOrderId: string;
  externalPaymentId: string | null;
  status: "created" | "sent_to_terminal" | "pending" | "approved" | "rejected" | "expired" | "canceled" | "failed" | "refunded";
  statusDetail: string | null;
  expiresAt: Date | null;
  raw: Prisma.InputJsonValue;
};

export async function createPointOrder(input: {
  accessToken: string;
  terminalId: string;
  amount: string;
  externalReference: string;
  idempotencyKey: string;
}): Promise<MercadoPagoPointOrderResult> {
  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: mercadoPagoHeaders(input.accessToken, input.idempotencyKey),
    body: JSON.stringify({
      type: "point",
      external_reference: input.externalReference,
      transactions: {
        payments: [{ amount: input.amount }],
      },
      config: {
        point: {
          terminal_id: input.terminalId,
          print_on_terminal: "no_ticket",
        },
      },
    }),
  });
  return parseOrderResponse(response, "MERCADOPAGO_POINT_CREATE_FAILED");
}

export async function getOrder(accessToken: string, orderId: string): Promise<MercadoPagoPointOrderResult> {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
    headers: mercadoPagoHeaders(accessToken),
  });
  return parseOrderResponse(response, "MERCADOPAGO_POINT_STATUS_FAILED");
}

export async function cancelOrder(accessToken: string, orderId: string, idempotencyKey: string = randomUUID()): Promise<MercadoPagoPointOrderResult> {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: mercadoPagoHeaders(accessToken, idempotencyKey),
  });
  return parseOrderResponse(response, "MERCADOPAGO_POINT_CANCEL_FAILED");
}

export async function refundOrder(accessToken: string, orderId: string, idempotencyKey: string = randomUUID()): Promise<MercadoPagoPointOrderResult> {
  const response = await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}/refund`, {
    method: "POST",
    headers: mercadoPagoHeaders(accessToken, idempotencyKey),
  });
  return parseOrderResponse(response, "MERCADOPAGO_POINT_REFUND_FAILED");
}

export async function createStore(input: {
  accessToken: string;
  mpUserId: string;
  name: string;
  externalStoreId: string;
  location: {
    streetName: string;
    streetNumber: string;
    cityName: string;
    stateName: string;
    latitude: number;
    longitude: number;
    reference: string;
  };
}): Promise<MercadoPagoStoreResult> {
  const response = await fetch(`https://api.mercadopago.com/users/${encodeURIComponent(input.mpUserId)}/stores`, {
    method: "POST",
    headers: mercadoPagoHeaders(input.accessToken),
    body: JSON.stringify({
      name: input.name,
      external_id: input.externalStoreId,
      location: {
        street_name: input.location.streetName,
        street_number: input.location.streetNumber,
        city_name: input.location.cityName,
        state_name: input.location.stateName,
        latitude: input.location.latitude,
        longitude: input.location.longitude,
        reference: input.location.reference,
      },
    }),
  });
  const payload = await response.json() as {
    id?: string | number;
    name?: string;
    external_id?: string;
    message?: string;
    error?: string;
    cause?: unknown;
  };
  if (!response.ok || payload.id === undefined || payload.id === null) {
    throw new DomainError(502, "MERCADOPAGO_STORE_CREATE_FAILED", "Mercado Pago no pudo crear la sucursal.", sanitizePayload(payload));
  }
  return {
    id: String(payload.id),
    name: payload.name ?? null,
    externalStoreId: payload.external_id ?? input.externalStoreId,
    raw: sanitizePayload(payload) as Prisma.InputJsonValue,
  };
}

export async function createExternalPos(input: {
  accessToken: string;
  name: string;
  storeId: string;
  externalStoreId: string;
  externalPosId: string;
}): Promise<MercadoPagoPosResult> {
  const response = await fetch("https://api.mercadopago.com/pos", {
    method: "POST",
    headers: mercadoPagoHeaders(input.accessToken),
    body: JSON.stringify({
      name: input.name,
      fixed_amount: false,
      store_id: input.storeId,
      external_store_id: input.externalStoreId,
      external_id: input.externalPosId,
      category: 621102,
    }),
  });
  const payload = await response.json() as {
    id?: string | number;
    name?: string;
    external_id?: string;
    external_store_id?: string;
    store_id?: string | number;
    status?: string;
    message?: string;
    error?: string;
    cause?: unknown;
  };
  if (!response.ok || payload.id === undefined || payload.id === null) {
    throw new DomainError(502, "MERCADOPAGO_POS_CREATE_FAILED", "Mercado Pago no pudo crear la caja/POS.", sanitizePayload(payload));
  }
  return {
    id: String(payload.id),
    name: payload.name ?? null,
    externalPosId: payload.external_id ?? input.externalPosId,
    externalStoreId: payload.external_store_id ?? input.externalStoreId,
    storeId: payload.store_id === undefined ? input.storeId : String(payload.store_id),
    status: payload.status ?? null,
    raw: sanitizePayload(payload) as Prisma.InputJsonValue,
  };
}

export async function setupTerminalOperatingMode(input: {
  accessToken: string;
  terminalId: string;
  operatingMode: "PDV" | "STANDALONE";
}): Promise<MercadoPagoTerminalSetupResult> {
  const response = await fetch("https://api.mercadopago.com/terminals/v1/setup", {
    method: "PATCH",
    headers: mercadoPagoHeaders(input.accessToken),
    body: JSON.stringify({
      terminals: [
        {
          id: input.terminalId,
          operating_mode: input.operatingMode,
        },
      ],
    }),
  });
  const payload = await response.json() as {
    terminals?: Array<{ id?: string; operating_mode?: string }>;
    message?: string;
    error?: string;
    cause?: unknown;
  };
  if (!response.ok || !Array.isArray(payload.terminals)) {
    throw new DomainError(502, "MERCADOPAGO_TERMINAL_SETUP_FAILED", "Mercado Pago no pudo actualizar el modo de la terminal.", sanitizePayload(payload));
  }
  return {
    terminals: payload.terminals.map((terminal) => ({
      terminalId: terminal.id ?? input.terminalId,
      operatingMode: terminal.operating_mode ?? null,
    })),
    raw: sanitizePayload(payload) as Prisma.InputJsonValue,
  };
}

export async function listTerminals(accessToken: string, filters: { storeId?: string | null; posId?: string | null } = {}): Promise<MercadoPagoTerminal[]> {
  const params = new URLSearchParams({ limit: "50", offset: "0" });
  if (filters.storeId) params.set("store_id", filters.storeId);
  if (filters.posId) params.set("pos_id", filters.posId);
  const response = await fetch(`https://api.mercadopago.com/terminals/v1/list?${params.toString()}`, {
    headers: mercadoPagoHeaders(accessToken),
  });
  const payload = await response.json() as {
    data?: { terminals?: Array<{ id?: string; external_pos_id?: string; pos_id?: string | number; store_id?: string | number; operating_mode?: string }> };
    message?: string;
  };

  if (!response.ok) {
    throw new DomainError(502, "MERCADOPAGO_TERMINALS_SYNC_FAILED", "Mercado Pago no devolvio terminales.", sanitizePayload(payload));
  }

  return (payload.data?.terminals ?? [])
    .filter((terminal) => typeof terminal.id === "string" && terminal.id.trim() !== "")
    .map((terminal) => ({
      terminalId: terminal.id ?? "",
      terminalName: nonEmptyString(terminal.external_pos_id) ?? terminal.id ?? null,
      externalStoreId: terminal.store_id === undefined ? null : String(terminal.store_id),
      externalPosId: terminal.pos_id === undefined ? terminal.external_pos_id ?? null : String(terminal.pos_id),
      mpStoreId: terminal.store_id === undefined ? null : String(terminal.store_id),
      mpPosId: terminal.pos_id === undefined ? null : String(terminal.pos_id),
      operatingMode: terminal.operating_mode ?? null,
    }));
}

function nonEmptyString(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mercadoPagoHeaders(accessToken: string, idempotencyKey?: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    ...(env.MERCADOPAGO_INTEGRATOR_ID ? { "x-integrator-id": env.MERCADOPAGO_INTEGRATOR_ID } : {}),
    ...(env.MERCADOPAGO_PLATFORM_ID ? { "x-platform-id": env.MERCADOPAGO_PLATFORM_ID } : {}),
  };
}

async function parseOrderResponse(response: Response, errorCode: string): Promise<MercadoPagoPointOrderResult> {
  const payload = await response.json() as {
    id?: string;
    status?: string;
    status_detail?: string;
    expiration_date?: string;
    expires_at?: string;
    transactions?: { payments?: Array<{ id?: string; status?: string; status_detail?: string }> };
  };

  if (!response.ok || !payload.id) {
    throw new DomainError(502, errorCode, "Mercado Pago no acepto la operacion de terminal.", sanitizePayload(payload));
  }

  const payment = payload.transactions?.payments?.[0];
  return {
    externalOrderId: payload.id,
    externalPaymentId: payment?.id ?? null,
    status: mapOrderStatus(payment?.status ?? payload.status),
    statusDetail: payment?.status_detail ?? payload.status_detail ?? null,
    expiresAt: parseDate(payload.expiration_date ?? payload.expires_at),
    raw: sanitizePayload(payload) as Prisma.InputJsonValue,
  };
}

function mapOrderStatus(status: string | undefined): MercadoPagoPointOrderResult["status"] {
  if (status === "processed" || status === "approved") return "approved";
  if (status === "at_terminal") return "sent_to_terminal";
  if (status === "created") return "created";
  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "expired") return "expired";
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "refunded") return "refunded";
  return "failed";
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sanitizePayload<T>(payload: T): T {
  return payload;
}
