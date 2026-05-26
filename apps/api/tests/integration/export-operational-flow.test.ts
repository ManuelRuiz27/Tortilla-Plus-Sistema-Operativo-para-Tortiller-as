import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { createIndividualInvoice, createGlobalDailyInvoice, stampInvoice } from "../../src/services/billing-service.js";
import { getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { createCustomer } from "../../src/services/customer-service.js";
import { exportGlobalInvoices, exportIssuedInvoices, exportOperationalReports } from "../../src/services/export-service.js";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueInvoiceDate() {
  const year = 2300 + Math.floor(Math.random() * 5000);
  return `${year}-06-15`;
}

async function ensureCashSession(currentUser: AuthenticatedUser, branchId: string) {
  const current = (await getOpenCashSession(currentUser, branchId)).data;
  if (current) return current;
  return (await openCashSession(currentUser, {
    branchId,
    openingAmountCounted: "500.00",
    openingNote: "Export integration smoke test",
  })).data;
}

test("F4 exports issued invoices, global invoices and operational reports as CSV/XLSX downloads", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);
  const invoiceDate = uniqueInvoiceDate();
  const reportDate = today();

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });
  const customer = (await createCustomer(currentUser, {
    name: `Cliente Export ${Date.now()}`,
    customerType: "cliente_frecuente",
    creditEnabled: false,
    creditLimit: "0.00",
  })).data;

  const individualSale = (await createSale(currentUser, {
    branchId,
    customerId: customer.id,
    clientGeneratedId: `export-individual-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, individualSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, individualSale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `export-individual-complete-${individualSale.id}`);
  const individual = (await createIndividualInvoice(currentUser, { saleId: individualSale.id })).data;
  const stampedIndividual = (await stampInvoice(currentUser, individual.id)).data;

  const globalSale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `export-global-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, globalSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, globalSale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `export-global-complete-${globalSale.id}`);
  await prisma.sale.update({
    where: { id: globalSale.id },
    data: { customerId: null, createdAt: new Date(`${invoiceDate}T12:00:00.000Z`) },
  });
  const global = (await createGlobalDailyInvoice(currentUser, { branchId, date: invoiceDate })).data;
  const stampedGlobal = (await stampInvoice(currentUser, global.id)).data;

  const issuedCsv = await exportIssuedInvoices(currentUser, { branchId, from: reportDate, to: reportDate, format: "csv" });
  assert.equal(issuedCsv.contentType, "text/csv; charset=utf-8");
  assert.match(issuedCsv.filename, /facturas-emitidas.*\.csv$/);
  assert.match(String(issuedCsv.body), /folio,tipo,estado,sucursal,cliente,uuid,fecha,subtotal,impuestos,total/);
  assert.match(String(issuedCsv.body), new RegExp(stampedIndividual.folio));

  const globalXlsx = await exportGlobalInvoices(currentUser, { branchId, from: reportDate, to: reportDate, format: "xlsx" });
  assert.equal(globalXlsx.contentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.match(globalXlsx.filename, /facturas-globales.*\.xlsx$/);
  assert.ok(Buffer.isBuffer(globalXlsx.body));
  assert.equal((globalXlsx.body as Buffer).subarray(0, 2).toString("utf8"), "PK");
  assert.ok((globalXlsx.body as Buffer).includes(Buffer.from(stampedGlobal.folio)));

  const reportCsv = await exportOperationalReports(currentUser, { branchId, from: reportDate, to: reportDate, format: "csv" });
  assert.equal(reportCsv.contentType, "text/csv; charset=utf-8");
  assert.match(String(reportCsv.body), /reporte,etiqueta,valor/);
  assert.match(String(reportCsv.body), /ventas_por_producto/);
  assert.match(String(reportCsv.body), /ventas_por_cliente/);
});
