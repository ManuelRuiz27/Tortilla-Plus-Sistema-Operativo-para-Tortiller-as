import type { IncomingMessage } from "node:http";

import { env } from "../config/env.js";
import { DomainError } from "../lib/domain-error.js";
import { hashSecret, hashToken, verifySecret } from "../lib/password.js";
import { createRefreshToken, signAccessToken, verifyAccessToken } from "../lib/token.js";
import { prisma } from "../lib/prisma.js";
import {
  getBranchAssignments,
  getPermissionCodes,
  getRoleCodes,
} from "./permission-service.js";

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  email: string;
};

export async function login(input: unknown) {
  const body = asRecord(input);
  const email = asString(body.email, "email").toLowerCase();
  const password = asString(body.password, "password");

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user || !(await verifySecret(password, user.passwordHash))) {
    if (user?.id) {
      await audit(user.organizationId, user.id, "login_failed", "user", user.id);
    }

    throw new DomainError(401, "INVALID_CREDENTIALS", "Credenciales invalidas.");
  }

  if (user.status !== "active") {
    await audit(user.organizationId, user.id, "login_blocked_inactive_user", "user", user.id);
    throw new DomainError(403, "USER_INACTIVE", "Usuario inactivo.");
  }

  if (!user.organizationId) {
    throw new DomainError(403, "INVALID_TENANT_REFERENCE", "Usuario sin organizacion operativa.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });

  if (!organization || organization.status === "cancelled") {
    throw new DomainError(403, "INVALID_TENANT_REFERENCE", "Organizacion no operativa.");
  }

  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "login_success",
        entityType: "user",
        entityId: user.id,
      },
    }),
  ]);

  return {
    accessToken: signAccessToken({
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
    }),
    refreshToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function refresh(input: unknown) {
  const body = asRecord(input);
  const refreshToken = asString(body.refreshToken, "refreshToken");
  const tokenHash = hashToken(refreshToken);

  const session = await prisma.userSession.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new DomainError(401, "INVALID_TOKEN", "Refresh token invalido.");
  }

  if (session.user.status !== "active" || !session.user.organizationId) {
    throw new DomainError(403, "USER_INACTIVE", "Usuario inactivo.");
  }

  const nextRefreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: hashToken(nextRefreshToken),
      expiresAt,
    },
  });

  return {
    accessToken: signAccessToken({
      sub: session.user.id,
      organizationId: session.user.organizationId,
      email: session.user.email,
    }),
    refreshToken: nextRefreshToken,
    tokenType: "Bearer",
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function logout(input: unknown) {
  const body = asRecord(input);
  const refreshToken = asString(body.refreshToken, "refreshToken");

  await prisma.userSession.updateMany({
    where: {
      refreshTokenHash: hashToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return { success: true };
}

export async function validatePin(currentUser: AuthenticatedUser, input: unknown) {
  const body = asRecord(input);
  const pin = asString(body.pin, "pin");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUser.id },
  });

  const valid = await verifySecret(pin, user.pinHash);

  if (!valid) {
    await audit(user.organizationId, user.id, "pin_validation_failed", "user", user.id);
    throw new DomainError(401, "INVALID_PIN", "PIN invalido.");
  }

  return { valid: true };
}

export async function getMe(currentUser: AuthenticatedUser) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: currentUser.id },
  });
  return {
    id: user.id,
    organizationId: user.organizationId,
    name: user.name,
    email: user.email,
    status: user.status,
    roles: await getRoleCodes(currentUser.id),
    permissions: await getPermissionCodes(currentUser.id),
    branches: await getBranchAssignments(currentUser.id),
  };
}

export async function authenticate(request: IncomingMessage): Promise<AuthenticatedUser> {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    throw new DomainError(401, "INVALID_TOKEN", "Token requerido.");
  }

  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user || user.status !== "active" || !user.organizationId) {
    throw new DomainError(403, "USER_INACTIVE", "Usuario inactivo.");
  }

  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
  };
}

export { hashSecret };

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }

  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }

  return value.trim();
}

async function audit(
  organizationId: string | null,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
) {
  if (!organizationId) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      entityType,
      entityId,
    },
  });
}
