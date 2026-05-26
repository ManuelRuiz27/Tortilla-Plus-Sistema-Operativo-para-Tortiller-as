import { Prisma } from "@prisma/client";

export async function recordBillingProviderLog(
  tx: Prisma.TransactionClient,
  input: {
    organizationId?: string | null;
    provider: string;
    operation: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    requestPayload?: unknown;
    responsePayload?: unknown;
    durationMs?: number | null;
    success: boolean;
    errorCode?: string | null;
    errorMessage?: string | null;
    idempotencyKey?: string | null;
  },
) {
  await tx.billingProviderLog.create({
    data: {
      organizationId: input.organizationId ?? null,
      provider: input.provider,
      operation: input.operation,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      requestPayloadSanitized: sanitizeBillingProviderJson(input.requestPayload),
      responsePayloadSanitized: sanitizeBillingProviderJson(input.responsePayload),
      durationMs: input.durationMs ?? null,
      success: input.success,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    },
  });
}

export function sanitizeBillingProviderJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return sanitizeValue(value) as Prisma.InputJsonValue;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      if (isSecretKey(key)) {
        return [key, "[REDACTED]"];
      }
      return [key, sanitizeValue(child)];
    }),
  );
}

function isSecretKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    normalized.includes("apikey") ||
    normalized.includes("api_key") ||
    normalized.includes("secret") ||
    normalized.includes("password") ||
    normalized.includes("privatekey") ||
    normalized.includes("private_key") ||
    normalized.includes("token") ||
    normalized === "email" ||
    normalized.endsWith("_email")
  );
}
