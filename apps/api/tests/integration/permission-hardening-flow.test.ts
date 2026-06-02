import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../../src/lib/domain-error.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { createGlobalDailyInvoice, getBillingSummary } from "../../src/services/billing-service.js";
import {
  authorizeCashMovement,
  getOpenCashSession,
  openCashSession,
  requestWithdrawal,
} from "../../src/services/cash-service.js";
import { exportIssuedInvoices, exportOperationalReports } from "../../src/services/export-service.js";
import { createReconciliationBatch, listReconciliationBatches } from "../../src/services/reconciliation-service.js";
import { getReportsSummary } from "../../src/services/reports-service.js";
import { getSettingsSummary } from "../../src/services/settings-service.js";

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

async function assertPermissionDenied(action: () => Promise<unknown>, permission: string) {
  await assert.rejects(
    action,
    (error: unknown) => {
      assert.ok(error instanceof DomainError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "PERMISSION_REQUIRED");
      assert.equal(error.details.permission, permission);
      return true;
    },
  );
}

async function ensureCashSession(currentUser: AuthenticatedUser, branchId: string) {
  const current = (await getOpenCashSession(currentUser, branchId)).data;
  if (current) return current;
  return (await openCashSession(currentUser, {
    branchId,
    openingAmountCounted: "500.00",
    openingNote: "Permission hardening test",
  })).data;
}

test("F6 role permissions block billing, reconciliation, reports, exports and cash withdrawals by role", async () => {
  const ownerSession = await login({ email: "owner.demo@tortillaplus.mx", password: "Demo1234!" });
  const cashierSession = await login({ email: "cashier.demo@tortillaplus.mx", password: "Demo1234!" });
  const supervisorSession = await login({ email: "supervisor.demo@tortillaplus.mx", password: "Demo1234!" });
  const managerSession = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });

  const owner = asAuthenticatedUser(ownerSession);
  const cashier = asAuthenticatedUser(cashierSession);
  const supervisor = asAuthenticatedUser(supervisorSession);
  const manager = asAuthenticatedUser(managerSession);
  const branchId = firstBranchId(managerSession);
  const today = new Date().toISOString().slice(0, 10);
  const filters = { branchId, from: today, to: today };

  await assertPermissionDenied(
    () => getBillingSummary(cashier, { branchId, date: today }),
    "billing.manage",
  );
  await assertPermissionDenied(
    () => createReconciliationBatch(cashier, { branchId }),
    "reports.basic.view",
  );
  await assertPermissionDenied(
    () => getReportsSummary(cashier, filters),
    "reports.basic.view",
  );
  await assertPermissionDenied(
    () => exportOperationalReports(cashier, { ...filters, format: "csv" }),
    "reports.basic.view",
  );
  await assertPermissionDenied(
    () => exportIssuedInvoices(cashier, { ...filters, format: "csv" }),
    "billing.manage",
  );

  await assertPermissionDenied(
    () => createGlobalDailyInvoice(supervisor, { branchId, date: today }),
    "billing.manage",
  );
  assert.ok((await getReportsSummary(supervisor, filters)).data.salesByDay);
  assert.ok((await listReconciliationBatches(supervisor, { branchId })).data);
  assert.ok((await exportOperationalReports(supervisor, { ...filters, format: "csv" })).body);
  assert.ok((await getSettingsSummary(supervisor, { branchId })).data.auditLogs);

  const cashSession = await ensureCashSession(cashier, branchId);
  const withdrawal = (await requestWithdrawal(cashier, {
    branchId,
    cashSessionId: cashSession.id,
    amount: "1.00",
    description: `Permission hardening ${Date.now()}`,
  })).data;
  const authorized = (await authorizeCashMovement(supervisor, withdrawal.id, { pin: "1234" })).data;
  assert.equal(authorized.status, "authorized");

  await assertPermissionDenied(
    () => getBillingSummary(manager, { branchId, date: today }),
    "billing.manage",
  );
  assert.ok((await getReportsSummary(manager, filters)).data);
  assert.ok((await listReconciliationBatches(manager, { branchId })).data);

  assert.ok((await getBillingSummary(owner, { date: today })).data);
  assert.ok((await getReportsSummary(owner, filters)).data);
  assert.ok((await listReconciliationBatches(owner, { branchId })).data);
});
