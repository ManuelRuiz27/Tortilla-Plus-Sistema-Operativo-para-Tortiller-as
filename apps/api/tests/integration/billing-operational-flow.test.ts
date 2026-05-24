import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { createGlobalDailyInvoice, createIndividualInvoice, getBillingSummary } from "../../src/services/billing-service.js";
import { getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { createCustomer } from "../../src/services/customer-service.js";
import { addSaleItem, completeSale, createSale } from "../../src/services/sale-service.js";

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

function uniqueDateOnly() {
  const year = 2100 + (Date.now() % 800);
  return `${year}-05-24`;
}

async function ensureCashSession(currentUser: AuthenticatedUser, branchId: string) {
  const current = (await getOpenCashSession(currentUser, branchId)).data;
  if (current) return current;
  return (await openCashSession(currentUser, {
    branchId,
    openingAmountCounted: "500.00",
    openingNote: "Billing integration smoke test",
  })).data;
}

test("billing summary creates individual and global internal invoices from real sales", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  const date = uniqueDateOnly();
  const invoiceDate = new Date(`${date}T12:00:00.000Z`);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });
  const customer = (await createCustomer(currentUser, {
    name: `Cliente Facturacion ${Date.now()}`,
    customerType: "cliente_frecuente",
    creditEnabled: false,
    creditLimit: "0.00",
  })).data;

  const customerSale = (await createSale(currentUser, {
    branchId,
    customerId: customer.id,
    clientGeneratedId: `billing-individual-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, customerSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, customerSale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `billing-individual-complete-${customerSale.id}`);
  await prisma.sale.update({ where: { id: customerSale.id }, data: { createdAt: invoiceDate } });

  const publicSale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `billing-global-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, publicSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, publicSale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `billing-global-complete-${publicSale.id}`);
  await prisma.sale.update({ where: { id: publicSale.id }, data: { createdAt: invoiceDate, customerId: null } });

  const before = (await getBillingSummary(currentUser, { branchId, date })).data;
  assert.equal(before.billableSales.some((sale) => sale.id === customerSale.id && sale.status === "billable"), true);
  assert.equal(before.billableSales.some((sale) => sale.id === publicSale.id && sale.status === "global_candidate"), true);
  assert.equal(before.globalDaily.status, "not_created");
  assert.equal(before.globalDaily.total, 24);

  const individual = (await createIndividualInvoice(currentUser, { saleId: customerSale.id })).data;
  assert.equal(individual.status, "draft");
  assert.equal(individual.total, 24);

  const global = (await createGlobalDailyInvoice(currentUser, { branchId, date })).data;
  assert.equal(global.status, "draft");
  assert.equal(global.total, 24);

  const after = (await getBillingSummary(currentUser, { branchId, date })).data;
  assert.equal(after.billableSales.some((sale) => sale.id === customerSale.id), false);
  assert.equal(after.billableSales.some((sale) => sale.id === publicSale.id), false);
  assert.equal(after.invoices.length >= 2, true);
  assert.equal(after.globalDaily.status, "draft");
});
