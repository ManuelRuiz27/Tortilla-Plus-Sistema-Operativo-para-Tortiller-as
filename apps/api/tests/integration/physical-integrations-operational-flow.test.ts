import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import {
  createTerminalPayment,
  getTerminalPaymentStatus,
  lookupBarcode,
  readScale,
} from "../../src/services/physical-integration-service.js";

type LoginResult = Awaited<ReturnType<typeof login>>;

function asAuthenticatedUser(session: LoginResult): AuthenticatedUser {
  assert.ok(session.user.organizationId, "demo user must have an organization");
  return {
    id: session.user.id,
    organizationId: session.user.organizationId,
    email: session.user.email,
  };
}

function firstBranchId(session: LoginResult): string {
  const branchId = session.user.branches[0]?.branchId;
  assert.ok(branchId, "demo user must have a branch assignment");
  return branchId;
}

test("F5 physical integrations expose isolated mocks and operational fallbacks", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  const product = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });
  const barcode = `750${Date.now()}`;
  await prisma.product.update({
    where: { id: product.id },
    data: { barcode },
  });

  const mp = (await createTerminalPayment(currentUser, "mercadopago", {
    branchId,
    amount: "24.00",
    externalReference: `mp-${Date.now()}`,
  })).data;
  assert.equal(mp.provider, "mercadopago");
  assert.equal(mp.mode, "mock");
  assert.equal(mp.status, "approved");
  assert.equal(mp.fallback, "manual_reference_allowed");
  assert.match(mp.reference, /^MERCADOPAGO-/);

  const clip = (await createTerminalPayment(currentUser, "clip", {
    branchId,
    amount: "24.00",
    externalReference: `clip-${Date.now()}`,
  })).data;
  assert.equal(clip.provider, "clip");
  assert.equal(clip.mode, "mock");
  assert.match(clip.reference, /^CLIP-/);

  const status = (await getTerminalPaymentStatus(currentUser, "mercadopago", mp.reference, { branchId })).data;
  assert.equal(status.status, "approved");

  const scale = (await readScale(currentUser, { branchId, deviceId: "scale-qa", weightKg: "1.250" })).data;
  assert.equal(scale.mode, "mock");
  assert.equal(scale.weightKg, 1.25);
  assert.equal(scale.fallback, "manual_weight_allowed");

  const scanned = (await lookupBarcode(currentUser, barcode, { branchId })).data;
  assert.equal(scanned.id, product.id);
  assert.equal(scanned.barcode, barcode);
  assert.equal(scanned.fallback, "manual_product_search_allowed");

  const auditCount = await prisma.auditLog.count({
    where: {
      organizationId: currentUser.organizationId,
      branchId,
      entityType: "physical_integration",
      action: { in: ["mercadopago_terminal_payment_created", "clip_terminal_payment_created", "scale_read"] },
    },
  });
  assert.equal(auditCount >= 3, true);
});
