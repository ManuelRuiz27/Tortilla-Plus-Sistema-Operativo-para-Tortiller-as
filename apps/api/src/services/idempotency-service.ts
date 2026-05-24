import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";

export async function runIdempotent<T>(
  organizationId: string,
  operation: string,
  idempotencyKey: string | null | undefined,
  requestPayload: unknown,
  handler: () => Promise<T>,
): Promise<T> {
  const key = idempotencyKey?.trim();
  if (!key) {
    throw new DomainError(400, "IDEMPOTENCY_KEY_REQUIRED", "Operacion requiere Idempotency-Key.");
  }

  const requestHash = hashPayload(requestPayload);
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      organizationId_operation_key: {
        organizationId,
        operation,
        key,
      },
    },
  });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new DomainError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency-Key reutilizada con payload distinto.");
    }

    if (existing.status === "completed" && existing.responseBody !== null) {
      return existing.responseBody as T;
    }

    throw new DomainError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "Operacion idempotente en proceso.");
  }

  await prisma.idempotencyRecord.create({
    data: {
      organizationId,
      operation,
      key,
      requestHash,
      status: "pending",
    },
  });

  try {
    const response = await handler();
    await prisma.idempotencyRecord.update({
      where: {
        organizationId_operation_key: {
          organizationId,
          operation,
          key,
        },
      },
      data: {
        responseBody: response as Prisma.InputJsonValue,
        status: "completed",
        updatedAt: new Date(),
      },
    });

    return response;
  } catch (error) {
    await prisma.idempotencyRecord.deleteMany({
      where: {
        organizationId,
        operation,
        key,
        status: "pending",
      },
    });
    throw error;
  }
}

function hashPayload(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
