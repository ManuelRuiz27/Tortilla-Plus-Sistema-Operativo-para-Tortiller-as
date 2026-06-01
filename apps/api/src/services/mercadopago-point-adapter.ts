import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";

export type MercadoPagoTerminal = {
  terminalId: string;
  terminalName: string | null;
  externalStoreId: string | null;
  externalPosId: string | null;
  operatingMode: string | null;
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

export async function listTerminals(accessToken: string): Promise<MercadoPagoTerminal[]> {
  const response = await fetch("https://api.mercadopago.com/terminals/v1/list?limit=50&offset=0", {
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
      terminalName: terminal.external_pos_id ?? terminal.id ?? null,
      externalStoreId: terminal.store_id === undefined ? null : String(terminal.store_id),
      externalPosId: terminal.pos_id === undefined ? terminal.external_pos_id ?? null : String(terminal.pos_id),
      operatingMode: terminal.operating_mode ?? null,
    }));
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
