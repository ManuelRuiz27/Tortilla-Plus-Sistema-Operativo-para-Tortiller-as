import { createHmac, randomBytes } from "node:crypto";

import { env } from "../config/env.js";
import { DomainError } from "./domain-error.js";

type AccessTokenPayload = {
  sub: string;
  organizationId: string | null;
  email: string;
  exp: number;
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + env.ACCESS_TOKEN_TTL_SECONDS;
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode({ ...payload, exp });
  const signature = sign(`${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const [header, body, signature] = token.split(".");

  if (!header || !body || !signature || sign(`${header}.${body}`) !== signature) {
    throw new DomainError(401, "INVALID_TOKEN", "Token invalido.");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AccessTokenPayload;

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new DomainError(401, "TOKEN_EXPIRED", "Token expirado.");
  }

  return payload;
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

function encode(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(value).digest("base64url");
}
