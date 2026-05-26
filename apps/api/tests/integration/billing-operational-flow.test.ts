import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import type { AuthenticatedUser } from "../../src/services/auth-service.js";
import { login } from "../../src/services/auth-service.js";
import { getPublicBillingCatalogs } from "../../src/services/billing-catalog-service.js";
import {
  cancelInvoice,
  createGlobalDailyInvoice,
  createIndividualInvoice,
  getBillingSummary,
  getInvoiceDocuments,
  processPacWebhook,
  stampInvoice,
} from "../../src/services/billing-service.js";
import { getOpenCashSession, openCashSession } from "../../src/services/cash-service.js";
import { createCustomer } from "../../src/services/customer-service.js";
import {
  expireBillingReceipts,
  getPublicInvoiceDocument,
  getPublicInvoiceStatus,
  getPublicReceipt,
  listBillingReceipts,
  reprintBillingReceipt,
  submitPublicInvoice,
} from "../../src/services/public-autofactura-service.js";
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
    customerRequestedInvoice: true,
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
  assert.equal(individual.status, "processing");
  assert.equal(individual.total, 24);

  const stampedIndividual = (await stampInvoice(currentUser, individual.id)).data;
  assert.equal(stampedIndividual.status, "stamped");
  assert.match(stampedIndividual.folio, /^[0-9a-f-]{36}$/);
  const stampProviderLog = await prisma.billingProviderLog.findFirst({
    where: { relatedEntityType: "invoice", relatedEntityId: individual.id, operation: "createInvoice", success: true },
  });
  assert.ok(stampProviderLog);
  assert.equal(stampProviderLog.provider, "tortilla-plus-pac-mock");

  const documents = (await getInvoiceDocuments(currentUser, individual.id)).data;
  assert.equal(documents.documents.length, 2);
  assert.equal(documents.documents.some((document) => document.type === "xml"), true);
  assert.equal(documents.documents.some((document) => document.type === "pdf"), true);

  const duplicateWebhook = {
    eventId: `pac-webhook-${individual.id}`,
    invoiceId: individual.id,
    provider: "tortilla-plus-pac-mock",
    status: "stamped",
    cfdiUuid: stampedIndividual.folio,
  };
  assert.equal((await processPacWebhook(duplicateWebhook)).data.duplicate, false);
  assert.equal((await processPacWebhook(duplicateWebhook)).data.duplicate, true);

  const cancelledIndividual = (await cancelInvoice(currentUser, individual.id, { reason: "Prueba de cancelacion fiscal" })).data;
  assert.equal(cancelledIndividual.status, "cancelled");
  const cancelProviderLog = await prisma.billingProviderLog.findFirst({
    where: { relatedEntityType: "invoice", relatedEntityId: individual.id, operation: "cancelInvoice", success: true },
  });
  assert.ok(cancelProviderLog);

  const global = (await createGlobalDailyInvoice(currentUser, { branchId, date })).data;
  assert.equal(global.status, "processing");
  assert.equal(global.total, 24);

  const stampedGlobal = (await stampInvoice(currentUser, global.id)).data;
  assert.equal(stampedGlobal.status, "stamped");

  const after = (await getBillingSummary(currentUser, { branchId, date })).data;
  assert.equal(after.billableSales.some((sale) => sale.id === customerSale.id), false);
  assert.equal(after.billableSales.some((sale) => sale.id === publicSale.id), false);
  assert.equal(after.invoices.length >= 2, true);
  assert.equal(after.globalDaily.status, "stamped");
});

test("global daily invoice uses branch fiscal timezone near midnight", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  const fiscalYear = 2200 + Math.floor(Math.random() * 300);
  const fiscalDate = `${fiscalYear}-05-24`;
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });

  const sale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `billing-timezone-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `billing-timezone-complete-${sale.id}`);

  await prisma.sale.update({
    where: { id: sale.id },
    data: {
      customerId: null,
      createdAt: new Date(`${fiscalYear}-05-25T05:30:00.000Z`),
    },
  });

  const summary = (await getBillingSummary(currentUser, { branchId, date: fiscalDate })).data;
  assert.equal(summary.billableSales.some((item) => item.id === sale.id && item.status === "global_candidate"), true);

  const global = (await createGlobalDailyInvoice(currentUser, { branchId, date: fiscalDate })).data;
  assert.equal(global.total, 24);
});

test("public autofactura creates stamped invoice from card sale receipt token", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });

  const sale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `autofactura-card-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "card", amount: "24.00", reference: `card-${Date.now()}`, provider: "terminal-demo" }],
  }, `autofactura-card-complete-${sale.id}`);

  const receipt = await prisma.billingReceipt.findUniqueOrThrow({ where: { saleId: sale.id } });
  assert.equal(receipt.status, "active");
  assert.match(receipt.receiptToken, /^[A-Za-z0-9_-]{32,}$/);

  const publicReceipt = (await getPublicReceipt(receipt.receiptToken)).data;
  assert.equal(publicReceipt.canInvoice, true);
  assert.equal(publicReceipt.folio, sale.saleNumber);
  assert.equal(publicReceipt.total, 24);

  const managerReceipts = (await listBillingReceipts(currentUser, { branchId, date: new Date().toISOString().slice(0, 10) })).data;
  assert.equal(managerReceipts.some((item) => item.id === receipt.id && item.status === "active"), true);

  const reprint = (await reprintBillingReceipt(currentUser, receipt.id)).data;
  assert.equal(reprint.receiptUrl, `/r/${receipt.receiptToken}`);
  assert.equal(reprint.qrContent, `/r/${receipt.receiptToken}`);

  const catalogs = getPublicBillingCatalogs().data;
  assert.equal(catalogs.defaults.taxRegime, "616");
  assert.equal(catalogs.defaults.cfdiUse, "S01");
  assert.equal(catalogs.taxRegimes.some((item) => item.code === "616"), true);
  assert.equal(catalogs.cfdiUses.some((item) => item.code === "S01"), true);

  const invoice = (await submitPublicInvoice(receipt.receiptToken, {
    rfc: "XAXX010101000",
    legalName: "PUBLICO EN GENERAL",
    taxRegime: "616",
    zipCode: "64000",
    cfdiUse: "S01",
    email: "cliente.factura@example.com",
  })).data;
  assert.equal(invoice.status, "stamped");
  assert.equal(invoice.total, 24);
  assert.match(invoice.cfdiUuid ?? "", /^[0-9a-f-]{36}$/);
  const publicProviderLog = await prisma.billingProviderLog.findFirst({
    where: { relatedEntityType: "billing_receipt", relatedEntityId: receipt.id, operation: "createInvoice", success: true },
  });
  assert.ok(publicProviderLog);
  assert.equal(JSON.stringify(publicProviderLog.requestPayloadSanitized).includes("cliente.factura@example.com"), false);

  const status = (await getPublicInvoiceStatus(receipt.receiptToken)).data;
  assert.equal(status.receiptStatus, "used");
  assert.equal(status.status, "stamped");
  assert.equal(status.invoiceId, invoice.invoiceId);

  const xml = await getPublicInvoiceDocument(invoice.invoiceId, "xml");
  assert.equal(xml.contentType, "application/xml; charset=utf-8");
  assert.match(String(xml.body), /cfdi:Comprobante/);

  const pdf = await getPublicInvoiceDocument(invoice.invoiceId, "pdf");
  assert.equal(pdf.contentType, "application/pdf");
  assert.equal(Buffer.isBuffer(pdf.body), true);
  assert.match(pdf.body.toString("utf8"), /%PDF-1.4/);
  assert.match(pdf.body.toString("utf8"), /Tortilla Plus CFDI mock/);

  await assert.rejects(
    () => submitPublicInvoice(receipt.receiptToken, {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "616",
      zipCode: "64000",
      cfdiUse: "S01",
      email: "cliente.factura@example.com",
    }),
    /ticket no esta disponible|ticket ya fue facturado/,
  );
});

test("public autofactura receipt follows Facturapi V1 payment intent rules", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });

  const sale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `autofactura-cash-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
  }, `autofactura-cash-complete-${sale.id}`);

  const receipt = await prisma.billingReceipt.findUnique({ where: { saleId: sale.id } });
  assert.equal(receipt, null);

  const requestedCashSale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `autofactura-cash-request-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, requestedCashSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, requestedCashSale.id, {
    payments: [{ paymentMethod: "cash", amount: "24.00" }],
    customerRequestedInvoice: true,
  }, `autofactura-cash-request-complete-${requestedCashSale.id}`);

  const requestedCashReceipt = await prisma.billingReceipt.findUnique({ where: { saleId: requestedCashSale.id } });
  assert.ok(requestedCashReceipt);
  const requestedCash = await prisma.sale.findUniqueOrThrow({ where: { id: requestedCashSale.id } });
  assert.equal(requestedCash.fiscalIntent, "customer_invoice");
  assert.equal(requestedCash.fiscalStatus, "pending_customer_invoice");

  const transferSale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `autofactura-transfer-request-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, transferSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, transferSale.id, {
    payments: [{ paymentMethod: "transfer", amount: "24.00", reference: `spei-${Date.now()}` }],
    requestInvoice: true,
  }, `autofactura-transfer-request-complete-${transferSale.id}`);

  const transferReceipt = await prisma.billingReceipt.findUnique({ where: { saleId: transferSale.id } });
  assert.ok(transferReceipt);

  const creditCustomer = (await createCustomer(currentUser, {
    name: `Cliente Credito Sin Factura ${Date.now()}`,
    customerType: "cliente_frecuente",
    creditEnabled: true,
    creditLimit: "200.00",
  })).data;
  const creditSale = (await createSale(currentUser, {
    branchId,
    customerId: creditCustomer.id,
    clientGeneratedId: `autofactura-credit-no-request-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, creditSale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, creditSale.id, {
    payments: [{ paymentMethod: "credit", amount: "24.00" }],
  }, `autofactura-credit-no-request-complete-${creditSale.id}`);

  const creditReceipt = await prisma.billingReceipt.findUnique({ where: { saleId: creditSale.id } });
  assert.equal(creditReceipt, null);
  const credit = await prisma.sale.findUniqueOrThrow({ where: { id: creditSale.id } });
  assert.equal(credit.fiscalIntent, "no_invoice");
  assert.equal(credit.fiscalStatus, "eligible_for_daily_global");
});

test("public autofactura rejects fiscal catalog codes outside allowed values", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });

  const sale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `invalid-catalog-autofactura-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "card", amount: "24.00", reference: `invalid-catalog-${Date.now()}`, provider: "terminal-demo" }],
  }, `invalid-catalog-complete-${sale.id}`);

  const receipt = await prisma.billingReceipt.findUniqueOrThrow({ where: { saleId: sale.id } });

  await assert.rejects(
    () => submitPublicInvoice(receipt.receiptToken, {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "999",
      zipCode: "64000",
      cfdiUse: "S01",
      email: "cliente.catalogo@example.com",
    }),
    /Regimen fiscal invalido/,
  );

  await assert.rejects(
    () => submitPublicInvoice(receipt.receiptToken, {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "616",
      zipCode: "64000",
      cfdiUse: "ZZZ",
      email: "cliente.catalogo@example.com",
    }),
    /Uso CFDI invalido/,
  );
});

test("billing receipt expiration job expires active receipts and blocks autofactura", async () => {
  const session = await login({ email: "manager.demo@tortillaplus.mx", password: "Demo1234!" });
  const currentUser = asAuthenticatedUser(session);
  const branchId = firstBranchId(session);
  await ensureCashSession(currentUser, branchId);

  const tortilla = await prisma.product.findFirstOrThrow({
    where: { organizationId: currentUser.organizationId, sku: "TORTILLA-KG" },
  });

  const sale = (await createSale(currentUser, {
    branchId,
    clientGeneratedId: `expired-autofactura-${Date.now()}`,
  })).data;
  await addSaleItem(currentUser, sale.id, {
    productId: tortilla.id,
    saleMode: "by_kg",
    quantity: "1.000",
  });
  await completeSale(currentUser, sale.id, {
    payments: [{ paymentMethod: "card", amount: "24.00", reference: `expired-card-${Date.now()}`, provider: "terminal-demo" }],
  }, `expired-autofactura-complete-${sale.id}`);

  const expiredAt = new Date("2026-01-01T00:00:00.000Z");
  const receipt = await prisma.billingReceipt.update({
    where: { saleId: sale.id },
    data: { expiresAt: expiredAt },
  });

  const result = (await expireBillingReceipts({ now: new Date("2026-01-02T00:00:00.000Z") })).data;
  assert.equal(result.receiptIds.includes(receipt.id), true);
  assert.equal(result.expiredCount >= 1, true);

  const expiredReceipt = await prisma.billingReceipt.findUniqueOrThrow({ where: { id: receipt.id } });
  assert.equal(expiredReceipt.status, "expired");
  assert.ok(expiredReceipt.expiredAt);
  const expiredSale = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id } });
  assert.equal(expiredSale.fiscalStatus, "expired_to_pending_global");

  const publicReceipt = (await getPublicReceipt(receipt.receiptToken)).data;
  assert.equal(publicReceipt.canInvoice, false);
  assert.equal(publicReceipt.status, "expired");

  await assert.rejects(
    () => submitPublicInvoice(receipt.receiptToken, {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "616",
      zipCode: "64000",
      cfdiUse: "S01",
      email: "cliente.expirado@example.com",
    }),
    /ticket ya vencio/,
  );
});
