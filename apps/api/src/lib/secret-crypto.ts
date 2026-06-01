import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "../config/env.js";
import { DomainError } from "./domain-error.js";

const algorithm = "aes-256-gcm";

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string): string {
  const [version, iv, authTag, ciphertext] = value.split(":");
  if (version !== "v1" || !iv || !authTag || !ciphertext) {
    throw new DomainError(500, "SECRET_DECRYPTION_FAILED", "Formato de secreto invalido.");
  }

  const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptionKey() {
  const configured = env.PAYMENT_SECRET_ENCRYPTION_KEY.trim();
  if (!configured && env.NODE_ENV === "production") {
    throw new DomainError(500, "PAYMENT_SECRET_KEY_REQUIRED", "PAYMENT_SECRET_ENCRYPTION_KEY es requerida.");
  }

  return createHash("sha256")
    .update(configured || env.JWT_SECRET || "local-payment-secret")
    .digest();
}
