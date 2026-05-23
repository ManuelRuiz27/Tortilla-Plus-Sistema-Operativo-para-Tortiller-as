import assert from "node:assert/strict";
import test from "node:test";

import { hashSecret, verifySecret } from "../src/lib/password.js";
import { signAccessToken, verifyAccessToken } from "../src/lib/token.js";

test("scrypt password hashes verify only matching secrets", async () => {
  const hash = await hashSecret("Demo1234!");

  assert.equal(await verifySecret("Demo1234!", hash), true);
  assert.equal(await verifySecret("wrong", hash), false);
});

test("access tokens round trip signed payload", () => {
  const token = signAccessToken({
    sub: "user-id",
    organizationId: "org-id",
    email: "owner.demo@tortillaplus.mx",
  });

  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, "user-id");
  assert.equal(payload.organizationId, "org-id");
  assert.equal(payload.email, "owner.demo@tortillaplus.mx");
});
