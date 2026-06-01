import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import { decryptSecret, encryptSecret } from "../lib/secret-crypto.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertPermission } from "./permission-service.js";

const provider = "mercadopago" as const;

export async function startMercadoPagoOAuth(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "integrations.manage");

  if (env.PHYSICAL_INTEGRATIONS_MODE !== "real") {
    const connection = await upsertMockConnection(currentUser);
    await audit(currentUser, null, "mercadopago_oauth_completed", "payment_provider_connection", connection.id, {
      mode: "mock",
      status: connection.status,
    });
    return { data: serializeConnection(connection, { authUrl: null }) };
  }

  assertOAuthConfigured();
  const state = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const connection = await prisma.paymentProviderConnection.create({
    data: {
      organizationId: currentUser.organizationId,
      provider,
      connectionName: "Mercado Pago",
      status: "pending",
      oauthStateHash: hashState(state),
      oauthStateExpiresAt: expiresAt,
      connectedByUserId: currentUser.id,
    },
  });

  const url = new URL("https://auth.mercadopago.com.mx/authorization");
  url.searchParams.set("client_id", env.MERCADOPAGO_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", env.MERCADOPAGO_PLATFORM_ID);
  url.searchParams.set("redirect_uri", env.MERCADOPAGO_REDIRECT_URI);
  url.searchParams.set("state", state);

  await audit(currentUser, null, "mercadopago_oauth_started", "payment_provider_connection", connection.id, {
    expiresAt: expiresAt.toISOString(),
  });

  return { data: serializeConnection(connection, { authUrl: url.toString() }) };
}

export async function completeMercadoPagoOAuthCallback(input: unknown) {
  const query = asLooseRecord(input);
  const state = asString(query.state, "state");
  const code = asString(query.code, "code");
  assertOAuthConfigured();

  const connection = await prisma.paymentProviderConnection.findFirst({
    where: {
      provider,
      oauthStateHash: hashState(state),
      status: "pending",
      oauthStateExpiresAt: { gt: new Date() },
    },
  });
  if (!connection) {
    throw new DomainError(400, "INVALID_OAUTH_STATE", "Estado OAuth invalido o expirado.");
  }

  const token = await exchangeCode(code);
  const updated = await prisma.paymentProviderConnection.update({
    where: { id: connection.id },
    data: {
      status: "active",
      mpUserId: token.user_id === undefined ? null : String(token.user_id),
      accessTokenCiphertext: encryptSecret(token.access_token),
      refreshTokenCiphertext: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: token.scope ? token.scope.split(" ").filter(Boolean) : [],
      connectedAt: new Date(),
      oauthStateHash: null,
      oauthStateExpiresAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: new Date(),
    },
  });

  await audit(
    { id: updated.connectedByUserId ?? "00000000-0000-0000-0000-000000000000", organizationId: updated.organizationId, email: "" },
    null,
    "mercadopago_oauth_completed",
    "payment_provider_connection",
    updated.id,
    { mode: "real", mpUserId: updated.mpUserId },
  );

  return { data: serializeConnection(updated) };
}

export async function getActiveAccessToken(connectionId: string) {
  const connection = await prisma.paymentProviderConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.provider !== provider || connection.status !== "active") {
    throw new DomainError(409, "MERCADOPAGO_CONNECTION_INACTIVE", "La conexion Mercado Pago no esta activa.");
  }
  if (!connection.accessTokenCiphertext) {
    throw new DomainError(409, "MERCADOPAGO_CONNECTION_MISSING_TOKEN", "La conexion Mercado Pago no tiene token.");
  }

  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return decryptSecret(connection.accessTokenCiphertext);
  }

  if (!connection.refreshTokenCiphertext) {
    await markConnectionError(connection.id, "MERCADOPAGO_REFRESH_TOKEN_MISSING", "No hay refresh token.");
    throw new DomainError(409, "MERCADOPAGO_CONNECTION_EXPIRED", "La conexion Mercado Pago expiro.");
  }

  const refreshed = await refreshAccessToken(decryptSecret(connection.refreshTokenCiphertext));
  await prisma.paymentProviderConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenCiphertext: encryptSecret(refreshed.access_token),
      refreshTokenCiphertext: encryptSecret(refreshed.refresh_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scopes: refreshed.scope ? refreshed.scope.split(" ").filter(Boolean) : connection.scopes,
      status: "active",
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: new Date(),
    },
  });
  return refreshed.access_token;
}

export async function upsertMockConnection(currentUser: AuthenticatedUser) {
  return prisma.paymentProviderConnection.upsert({
    where: {
      id: (await prisma.paymentProviderConnection.findFirst({
        where: { organizationId: currentUser.organizationId, provider },
        select: { id: true },
      }))?.id ?? "00000000-0000-0000-0000-000000000000",
    },
    update: {
      connectionName: "Mercado Pago Demo",
      status: "active",
      mpUserId: "mock-mp-user",
      accessTokenCiphertext: encryptSecret("mock-access-token"),
      refreshTokenCiphertext: encryptSecret("mock-refresh-token"),
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      connectedByUserId: currentUser.id,
      connectedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
      updatedAt: new Date(),
    },
    create: {
      organizationId: currentUser.organizationId,
      provider,
      connectionName: "Mercado Pago Demo",
      status: "active",
      mpUserId: "mock-mp-user",
      accessTokenCiphertext: encryptSecret("mock-access-token"),
      refreshTokenCiphertext: encryptSecret("mock-refresh-token"),
      tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      connectedByUserId: currentUser.id,
      connectedAt: new Date(),
    },
  });
}

export function serializeConnection(connection: {
  id: string;
  provider: string;
  connectionName: string;
  status: string;
  mpUserId: string | null;
  tokenExpiresAt: Date | null;
  connectedAt: Date | null;
  lastHealthCheckAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
}, extra: Record<string, unknown> = {}) {
  return {
    id: connection.id,
    provider: connection.provider,
    connectionName: connection.connectionName,
    status: connection.status,
    mpUserId: connection.mpUserId,
    tokenExpiresAt: connection.tokenExpiresAt?.toISOString() ?? null,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    lastHealthCheckAt: connection.lastHealthCheckAt?.toISOString() ?? null,
    lastErrorCode: connection.lastErrorCode,
    lastErrorMessage: connection.lastErrorMessage,
    ...extra,
  };
}

async function exchangeCode(code: string) {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_secret: env.MERCADOPAGO_CLIENT_SECRET,
      client_id: env.MERCADOPAGO_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.MERCADOPAGO_REDIRECT_URI,
    }),
  });
  return parseTokenResponse(response, "MERCADOPAGO_OAUTH_EXCHANGE_FAILED");
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_secret: env.MERCADOPAGO_CLIENT_SECRET,
      client_id: env.MERCADOPAGO_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  return parseTokenResponse(response, "MERCADOPAGO_OAUTH_REFRESH_FAILED");
}

async function parseTokenResponse(response: Response, errorCode: string) {
  const payload = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    user_id?: string | number;
    message?: string;
  };
  if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.expires_in) {
    throw new DomainError(502, errorCode, "Mercado Pago no devolvio credenciales validas.", payload);
  }
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    scope: payload.scope,
    user_id: payload.user_id,
  };
}

async function markConnectionError(connectionId: string, code: string, message: string) {
  await prisma.paymentProviderConnection.update({
    where: { id: connectionId },
    data: {
      status: "expired",
      lastErrorCode: code,
      lastErrorMessage: message,
      updatedAt: new Date(),
    },
  });
}

function assertOAuthConfigured() {
  if (!env.MERCADOPAGO_CLIENT_ID || !env.MERCADOPAGO_CLIENT_SECRET || !env.MERCADOPAGO_REDIRECT_URI) {
    throw new DomainError(503, "MERCADOPAGO_OAUTH_NOT_CONFIGURED", "OAuth Mercado Pago requiere client id, secret y redirect URI.");
  }
}

function hashState(state: string) {
  return createHash("sha256").update(state).digest("hex");
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
