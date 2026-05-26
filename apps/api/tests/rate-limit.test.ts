import assert from "node:assert/strict";
import test from "node:test";

import { assertRateLimit, resetRateLimitsForTests } from "../src/lib/rate-limit.js";

test("rate limit blocks requests after configured threshold", () => {
  resetRateLimitsForTests();

  assertRateLimit({ key: "public-autofactura:lookup:test-token:127.0.0.1", limit: 2, windowMs: 60_000, message: "Bloqueado." });
  assertRateLimit({ key: "public-autofactura:lookup:test-token:127.0.0.1", limit: 2, windowMs: 60_000, message: "Bloqueado." });

  assert.throws(
    () => assertRateLimit({ key: "public-autofactura:lookup:test-token:127.0.0.1", limit: 2, windowMs: 60_000, message: "Bloqueado." }),
    /Bloqueado/,
  );
});

test("rate limit is isolated by token and client key", () => {
  resetRateLimitsForTests();

  assertRateLimit({ key: "public-autofactura:submit:token-a:127.0.0.1", limit: 1, windowMs: 60_000, message: "Bloqueado." });
  assertRateLimit({ key: "public-autofactura:submit:token-b:127.0.0.1", limit: 1, windowMs: 60_000, message: "Bloqueado." });
  assertRateLimit({ key: "public-autofactura:submit:token-a:127.0.0.2", limit: 1, windowMs: 60_000, message: "Bloqueado." });

  assert.throws(
    () => assertRateLimit({ key: "public-autofactura:submit:token-a:127.0.0.1", limit: 1, windowMs: 60_000, message: "Bloqueado." }),
    /Bloqueado/,
  );
});
