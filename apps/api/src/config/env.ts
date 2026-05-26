import { existsSync, readFileSync } from "node:fs";

loadDotEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  HOST: process.env.HOST ?? "0.0.0.0",
  DATABASE_URL: databaseUrl,
  JWT_SECRET: process.env.JWT_SECRET ?? "change_me_in_local_development",
  ACCESS_TOKEN_TTL_SECONDS: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  BILLING_RECEIPT_EXPIRATION_ENABLED: process.env.BILLING_RECEIPT_EXPIRATION_ENABLED !== "false",
  BILLING_RECEIPT_EXPIRATION_INTERVAL_MS: Number(process.env.BILLING_RECEIPT_EXPIRATION_INTERVAL_MS ?? 5 * 60 * 1000),
  BILLING_PROVIDER: process.env.BILLING_PROVIDER ?? "mock",
  FACTURAPI_API_KEY: process.env.FACTURAPI_API_KEY ?? "",
  FACTURAPI_ENV: process.env.FACTURAPI_ENV ?? "sandbox",
  FACTURAPI_API_BASE_URL: process.env.FACTURAPI_API_BASE_URL ?? "https://www.facturapi.io/v2",
  FACTURAPI_PUBLIC_ZIP_CODE: process.env.FACTURAPI_PUBLIC_ZIP_CODE ?? "64000",
  FACTURAPI_WEBHOOK_SECRET: process.env.FACTURAPI_WEBHOOK_SECRET ?? "",
  PHYSICAL_INTEGRATIONS_MODE: process.env.PHYSICAL_INTEGRATIONS_MODE ?? "mock",
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  MERCADOPAGO_TERMINAL_ID: process.env.MERCADOPAGO_TERMINAL_ID ?? "",
  CLIP_API_KEY: process.env.CLIP_API_KEY ?? "",
  CLIP_TERMINAL_ID: process.env.CLIP_TERMINAL_ID ?? "",
};

function loadDotEnv() {
  if (!existsSync(".env")) {
    return;
  }

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
