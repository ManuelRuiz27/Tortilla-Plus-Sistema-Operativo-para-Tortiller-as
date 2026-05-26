import { randomUUID } from "node:crypto";

import { DomainError } from "../lib/domain-error.js";
import { env } from "../config/env.js";

export type PacInvoiceType = "individual" | "global_public";
export type ProviderErrorCode =
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_TAX_DATA"
  | "CERTIFICATE_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_PROVIDER_ERROR";

export type PacStampItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  total: string;
  satProductKey?: string | null;
  satUnitKey?: string | null;
};

export type PacTaxData = {
  rfc: string;
  legalName: string;
  taxRegime: string;
  zipCode: string;
  cfdiUse: string;
  email?: string | null;
};

export type PacStampInput = {
  operationId: string;
  invoiceType: PacInvoiceType;
  invoiceId?: string | null;
  saleIds: string[];
  subtotal: string;
  taxTotal: string;
  total: string;
  customerRfc?: string | null;
  taxData?: PacTaxData | null;
  items?: PacStampItem[];
  paymentFormSat?: string | null;
  paymentMethodSat?: string | null;
};

export type PacStampResult = {
  provider: string;
  providerInvoiceId: string;
  cfdiUuid: string;
  status: "stamped";
  rawResponse: Record<string, unknown>;
};

export type PacCancelInput = {
  operationId: string;
  invoiceId: string;
  providerInvoiceId?: string | null;
  cfdiUuid: string;
  reason: string;
  motive?: string | null;
  substitution?: string | null;
};

export type PacCancelResult = {
  provider: string;
  status: "cancelled";
  rawResponse: Record<string, unknown>;
};

export interface PacAdapter {
  readonly provider: string;
  createInvoice(input: PacStampInput): Promise<PacStampResult>;
  createGlobalInvoice(input: PacStampInput): Promise<PacStampResult>;
  cancelInvoice(input: PacCancelInput): Promise<PacCancelResult>;
  downloadInvoiceDocument?(providerInvoiceId: string, format: "xml" | "pdf"): Promise<Buffer>;
}

export class PacProviderError extends DomainError {
  readonly providerCode: ProviderErrorCode;
  readonly retryable: boolean;
  readonly rawResponse?: unknown;

  constructor(providerCode: ProviderErrorCode, message: string, input: { statusCode?: number; retryable?: boolean; rawResponse?: unknown } = {}) {
    super(input.statusCode ?? statusForProviderCode(providerCode), providerCode, message);
    this.providerCode = providerCode;
    this.retryable = input.retryable ?? isRetryableProviderCode(providerCode);
    this.rawResponse = input.rawResponse;
  }
}

export class MockPacAdapter implements PacAdapter {
  readonly provider = "tortilla-plus-pac-mock";

  async createInvoice(input: PacStampInput): Promise<PacStampResult> {
    return this.stamp(input);
  }

  async createGlobalInvoice(input: PacStampInput): Promise<PacStampResult> {
    return this.stamp(input);
  }

  async cancelInvoice(input: PacCancelInput): Promise<PacCancelResult> {
    return {
      provider: this.provider,
      status: "cancelled",
      rawResponse: {
        provider: this.provider,
        status: "cancelled",
        cfdiUuid: input.cfdiUuid,
        invoiceId: input.invoiceId,
        operationId: input.operationId,
        reason: input.reason,
        motive: input.motive ?? null,
      },
    };
  }

  async downloadInvoiceDocument(providerInvoiceId: string, format: "xml" | "pdf"): Promise<Buffer> {
    if (format === "pdf") {
      return Buffer.from(`%PDF-1.4\n% Tortilla Plus mock CFDI PDF\n${providerInvoiceId}\n%%EOF`, "utf8");
    }
    return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante ProviderInvoiceId="${escapeXml(providerInvoiceId)}" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" />`, "utf8");
  }

  private async stamp(input: PacStampInput): Promise<PacStampResult> {
    const cfdiUuid = randomUUID();
    return {
      provider: this.provider,
      providerInvoiceId: `mock-${input.operationId}`,
      cfdiUuid,
      status: "stamped",
      rawResponse: {
        provider: this.provider,
        providerInvoiceId: `mock-${input.operationId}`,
        status: "stamped",
        cfdiUuid,
        invoiceType: input.invoiceType,
        invoiceId: input.invoiceId ?? null,
        saleIds: input.saleIds,
        subtotal: input.subtotal,
        taxTotal: input.taxTotal,
        total: input.total,
      },
    };
  }
}

export class FacturapiAdapter implements PacAdapter {
  readonly provider = "facturapi";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(input: { apiKey?: string; env?: string; baseUrl?: string; timeoutMs?: number } = {}) {
    const apiKey = input.apiKey ?? env.FACTURAPI_API_KEY;
    const mode = input.env ?? env.FACTURAPI_ENV;
    const baseUrl = input.baseUrl ?? env.FACTURAPI_API_BASE_URL;

    if (!apiKey) {
      throw new DomainError(503, "PROVIDER_NOT_CONFIGURED", "FACTURAPI_API_KEY es requerido para BILLING_PROVIDER=facturapi.");
    }
    if (mode !== "sandbox") {
      throw new DomainError(503, "PROVIDER_NOT_CONFIGURED", "Facturapi V1 solo esta habilitado en sandbox.");
    }
    if (!/^https?:\/\//.test(baseUrl)) {
      throw new DomainError(503, "PROVIDER_NOT_CONFIGURED", "FACTURAPI_API_BASE_URL debe ser una URL absoluta.");
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = input.timeoutMs ?? 15_000;
  }

  async createInvoice(input: PacStampInput): Promise<PacStampResult> {
    const body = buildFacturapiInvoicePayload(input);
    const response = await this.requestJson("POST", "/invoices", body, input.operationId);
    return normalizeFacturapiStampResponse(response);
  }

  async createGlobalInvoice(input: PacStampInput): Promise<PacStampResult> {
    const body = buildFacturapiInvoicePayload({
      ...input,
      taxData: input.taxData ?? {
        rfc: "XAXX010101000",
        legalName: "PUBLICO EN GENERAL",
        taxRegime: "616",
        zipCode: env.FACTURAPI_PUBLIC_ZIP_CODE,
        cfdiUse: "S01",
      },
    });
    const response = await this.requestJson("POST", "/invoices", body, input.operationId);
    return normalizeFacturapiStampResponse(response);
  }

  async cancelInvoice(input: PacCancelInput): Promise<PacCancelResult> {
    const providerInvoiceId = input.providerInvoiceId ?? input.cfdiUuid;
    const params = new URLSearchParams({ motive: input.motive ?? "02" });
    if (input.substitution) {
      params.set("substitution", input.substitution);
    }
    const response = await this.requestJson("DELETE", `/invoices/${encodeURIComponent(providerInvoiceId)}?${params.toString()}`, undefined, input.operationId);
    return {
      provider: this.provider,
      status: "cancelled",
      rawResponse: asObject(response),
    };
  }

  async downloadInvoiceDocument(providerInvoiceId: string, format: "xml" | "pdf"): Promise<Buffer> {
    return this.requestBuffer("GET", `/invoices/${encodeURIComponent(providerInvoiceId)}/${format}`);
  }

  private async requestJson(method: string, path: string, body?: unknown, idempotencyKey?: string) {
    const response = await this.request(method, path, body, idempotencyKey);
    const text = await response.text();
    const parsed = parseJson(text);
    if (!response.ok) {
      throw toPacProviderError(response.status, parsed ?? text);
    }
    return parsed ?? {};
  }

  private async requestBuffer(method: string, path: string) {
    const response = await this.request(method, path);
    if (!response.ok) {
      const text = await response.text();
      throw toPacProviderError(response.status, parseJson(text) ?? text);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async request(method: string, path: string, body?: unknown, idempotencyKey?: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PacProviderError("PROVIDER_TIMEOUT", "Facturapi no respondio dentro del tiempo limite.", { retryable: true });
      }
      throw new PacProviderError("PROVIDER_UNAVAILABLE", "Facturapi no esta disponible.", { retryable: true, rawResponse: String(error) });
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getPacAdapter(provider = process.env.BILLING_PROVIDER ?? "mock"): PacAdapter {
  if (provider === "mock" || provider === "tortilla-plus-pac-mock") {
    return new MockPacAdapter();
  }

  if (provider === "facturapi") {
    return new FacturapiAdapter();
  }

  throw new DomainError(503, "PROVIDER_NOT_CONFIGURED", "Proveedor PAC no soportado.");
}

export function mapFacturapiError(status: number, payload: unknown): ProviderErrorCode {
  const text = JSON.stringify(payload ?? "").toLowerCase();
  if (status === 408 || status === 504) return "PROVIDER_TIMEOUT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 401 || status === 403 || text.includes("certificate") || text.includes("certificado") || text.includes("csd")) {
    return "CERTIFICATE_ERROR";
  }
  if (status === 400 || status === 422 || text.includes("rfc") || text.includes("tax") || text.includes("fiscal")) {
    return "INVALID_TAX_DATA";
  }
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "UNKNOWN_PROVIDER_ERROR";
}

export function buildFacturapiInvoicePayload(input: PacStampInput) {
  const taxData = input.taxData;
  if (!taxData) {
    throw new PacProviderError("INVALID_TAX_DATA", "Datos fiscales del receptor requeridos para timbrar en Facturapi.", { retryable: false });
  }

  const items = input.items?.length ? input.items : [{
    description: input.invoiceType === "global_public" ? "Venta diaria publico general" : "Venta mostrador",
    quantity: "1.000",
    unitPrice: input.subtotal,
    subtotal: input.subtotal,
    total: input.total,
    satProductKey: "50181900",
    satUnitKey: "KGM",
  }];

  return {
    customer: {
      legal_name: taxData.legalName,
      email: taxData.email ?? undefined,
      tax_id: taxData.rfc,
      tax_system: taxData.taxRegime,
      address: { zip: taxData.zipCode },
    },
    items: items.map((item) => ({
      quantity: Number(item.quantity),
      product: {
        description: item.description,
        product_key: item.satProductKey ?? "50181900",
        unit_key: item.satUnitKey ?? "KGM",
        price: Number(item.unitPrice),
        tax_included: false,
        taxes: [],
      },
    })),
    payment_form: input.paymentFormSat ?? "04",
    payment_method: input.paymentMethodSat ?? "PUE",
    use: taxData.cfdiUse,
    currency: "MXN",
    external_id: input.operationId,
    metadata: {
      tortillaPlusOperationId: input.operationId,
      tortillaPlusInvoiceId: input.invoiceId ?? null,
      tortillaPlusSaleIds: input.saleIds,
      invoiceType: input.invoiceType,
    },
  };
}

function normalizeFacturapiStampResponse(response: unknown): PacStampResult {
  const data = asObject(response);
  const id = stringField(data.id) ?? stringField(data.invoice_id);
  const uuid = stringField(data.uuid) ?? stringField(data.folio_number) ?? stringField(data.cfdi_uuid);
  if (!id || !uuid) {
    throw new PacProviderError("UNKNOWN_PROVIDER_ERROR", "Facturapi respondio sin id o UUID de CFDI.", { retryable: true, rawResponse: response });
  }
  return {
    provider: "facturapi",
    providerInvoiceId: id,
    cfdiUuid: uuid,
    status: "stamped",
    rawResponse: data,
  };
}

function toPacProviderError(status: number, payload: unknown) {
  const providerCode = mapFacturapiError(status, payload);
  const message = providerMessage(providerCode, payload);
  return new PacProviderError(providerCode, message, { statusCode: statusForProviderCode(providerCode), rawResponse: payload });
}

function providerMessage(code: ProviderErrorCode, payload: unknown) {
  const payloadMessage = asObjectOrNull(payload)?.message;
  if (typeof payloadMessage === "string" && payloadMessage.trim()) {
    return payloadMessage;
  }
  const defaults: Record<ProviderErrorCode, string> = {
    PROVIDER_TIMEOUT: "Facturapi no respondio dentro del tiempo limite.",
    PROVIDER_UNAVAILABLE: "Facturapi no esta disponible.",
    INVALID_TAX_DATA: "Datos fiscales invalidos para timbrado.",
    CERTIFICATE_ERROR: "Configuracion fiscal o certificados Facturapi invalidos.",
    RATE_LIMITED: "Facturapi rechazo la solicitud por limite de tasa.",
    UNKNOWN_PROVIDER_ERROR: "Facturapi devolvio un error no clasificado.",
  };
  return defaults[code];
}

function statusForProviderCode(code: ProviderErrorCode) {
  if (code === "INVALID_TAX_DATA") return 400;
  if (code === "RATE_LIMITED") return 429;
  return 503;
}

function isRetryableProviderCode(code: ProviderErrorCode) {
  return code === "PROVIDER_TIMEOUT" || code === "PROVIDER_UNAVAILABLE" || code === "RATE_LIMITED" || code === "UNKNOWN_PROVIDER_ERROR";
}

function parseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return asObjectOrNull(value) ?? {};
}

function asObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}
