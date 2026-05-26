import { randomBytes, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { isValidCfdiUse, isValidTaxRegime } from "./billing-catalog-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";

type ReceiptWithSale = Prisma.BillingReceiptGetPayload<{
  include: {
    organization: true;
    branch: true;
    sale: {
      include: {
        saleItemSale: true;
        salePaymentSale: true;
        invoiceSaleSale: { include: { invoice: true } };
      };
    };
    billingInvoiceRequestBillingReceipt: { include: { invoice: true } };
  };
}>;

type InvoiceDocumentPayload = {
  filename: string;
  contentType: string;
  body: string | Buffer;
};

export async function createBillingReceiptForSale(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    branchId: string;
    saleId: string;
    payments: Array<{ paymentMethod: string }>;
  },
) {
  if (!input.payments.some((payment) => payment.paymentMethod === "card")) {
    return null;
  }

  const existing = await tx.billingReceipt.findUnique({ where: { saleId: input.saleId } });
  if (existing) return existing;

  const token = randomBytes(24).toString("base64url");
  return tx.billingReceipt.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      saleId: input.saleId,
      receiptToken: token,
      receiptUrl: `/r/${token}`,
      expiresAt: endOfMonth(new Date()),
    },
  });
}

export async function getPublicReceipt(token: string) {
  const receipt = await findReceiptByToken(token);
  await expireIfNeeded(receipt);
  const fresh = await findReceiptByToken(token);
  return { data: serializeReceipt(fresh) };
}

export async function getBillingReceiptBySale(currentUser: AuthenticatedUser, saleId: string) {
  await assertPermission(currentUser.id, "billing.manage");
  const receipt = await prisma.billingReceipt.findFirst({
    where: {
      saleId,
      organizationId: currentUser.organizationId,
    },
  });

  if (!receipt) {
    throw new DomainError(404, "BILLING_RECEIPT_NOT_FOUND", "Receipt de autofactura no encontrado.");
  }

  await assertBranchAccess(currentUser, receipt.branchId);
  return {
    data: {
      receiptId: receipt.id,
      token: receipt.receiptToken,
      receiptUrl: receipt.receiptUrl,
      status: receipt.status,
      expiresAt: receipt.expiresAt,
    },
  };
}

export async function listBillingReceipts(currentUser: AuthenticatedUser, input: unknown) {
  await assertPermission(currentUser.id, "billing.manage");
  const query = asLooseRecord(input);
  const branchId = optionalString(query.branchId);
  const date = optionalString(query.date);
  const status = optionalString(query.status);

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const receipts = await prisma.billingReceipt.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: branchId ?? undefined,
      status: isBillingReceiptStatus(status) ? status : undefined,
      sale: date ? { createdAt: dateRange(date) } : undefined,
    },
    include: {
      branch: true,
      sale: { include: { invoiceSaleSale: { include: { invoice: true } } } },
      billingInvoiceRequestBillingReceipt: {
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { data: receipts.map(serializeManagerReceipt) };
}

export async function reprintBillingReceipt(currentUser: AuthenticatedUser, receiptId: string) {
  await assertPermission(currentUser.id, "billing.manage");
  const receipt = await prisma.billingReceipt.findFirst({
    where: {
      id: receiptId,
      organizationId: currentUser.organizationId,
    },
    include: {
      branch: true,
      sale: { include: { invoiceSaleSale: { include: { invoice: true } } } },
      billingInvoiceRequestBillingReceipt: {
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!receipt) {
    throw new DomainError(404, "BILLING_RECEIPT_NOT_FOUND", "Receipt de autofactura no encontrado.");
  }

  await assertBranchAccess(currentUser, receipt.branchId);
  await prisma.auditLog.create({
    data: {
      organizationId: receipt.organizationId,
      branchId: receipt.branchId,
      userId: currentUser.id,
      action: "billing_receipt_reprinted",
      entityType: "billing_receipt",
      entityId: receipt.id,
      afterSnapshot: {
        receiptId: receipt.id,
        saleId: receipt.saleId,
        receiptUrl: receipt.receiptUrl,
      },
    },
  });

  return {
    data: {
      ...serializeManagerReceipt(receipt),
      qrContent: receipt.receiptUrl,
    },
  };
}

export async function expireBillingReceipts(input: { now?: Date; limit?: number } = {}) {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 500;

  const receipts = await prisma.billingReceipt.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });

  if (receipts.length === 0) {
    return { data: { expiredCount: 0, receiptIds: [] as string[] } };
  }

  const receiptIds = receipts.map((receipt) => receipt.id);
  await prisma.$transaction(async (tx) => {
    await tx.billingReceipt.updateMany({
      where: {
        id: { in: receiptIds },
        status: "active",
      },
      data: {
        status: "expired",
        expiredAt: now,
        updatedAt: now,
      },
    });

    await tx.auditLog.createMany({
      data: receipts.map((receipt) => ({
        organizationId: receipt.organizationId,
        branchId: receipt.branchId,
        userId: null,
        action: "billing_receipt_expired",
        entityType: "billing_receipt",
        entityId: receipt.id,
        afterSnapshot: {
          receiptId: receipt.id,
          saleId: receipt.saleId,
          expiredAt: now.toISOString(),
          source: "scheduler",
        },
      })),
    });
  });

  return { data: { expiredCount: receiptIds.length, receiptIds } };
}

export async function expireBillingReceiptsForManager(currentUser: AuthenticatedUser) {
  await assertPermission(currentUser.id, "billing.manage");
  return expireBillingReceipts();
}

export async function submitPublicInvoice(token: string, input: unknown) {
  const body = asRecord(input);
  const taxData = {
    rfc: asRfc(body.rfc),
    legalName: asString(body.legalName, "legalName"),
    taxRegime: asTaxRegime(body.taxRegime),
    zipCode: asZipCode(body.zipCode),
    cfdiUse: asCfdiUse(body.cfdiUse),
    email: asEmail(body.email),
  };

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.billingReceipt.findUnique({
      where: { receiptToken: token },
      include: {
        organization: true,
        branch: true,
        sale: {
          include: {
            saleItemSale: true,
            salePaymentSale: true,
            invoiceSaleSale: { include: { invoice: true } },
          },
        },
        billingInvoiceRequestBillingReceipt: { include: { invoice: true } },
      },
    });

    if (!receipt) {
      throw new DomainError(404, "PUBLIC_RECEIPT_NOT_FOUND", "Ticket de autofactura no encontrado.");
    }
    assertReceiptCanInvoice(receipt);

    const previousStamped = receipt.billingInvoiceRequestBillingReceipt.find((request) => request.status === "stamped" && request.invoiceId);
    if (previousStamped?.invoiceId) {
      throw new DomainError(409, "PUBLIC_INVOICE_ALREADY_CREATED", "Este ticket ya fue facturado.");
    }

    const request = await tx.billingInvoiceRequest.create({
      data: {
        organizationId: receipt.organizationId,
        branchId: receipt.branchId,
        billingReceiptId: receipt.id,
        saleId: receipt.saleId,
        status: "processing",
        ...taxData,
        rawRequest: taxData,
      },
    });

    const invoice = await createStampedPublicInvoice(tx, receipt, taxData);
    await tx.billingInvoiceRequest.update({
      where: { id: request.id },
      data: { status: "stamped", invoiceId: invoice.id, updatedAt: new Date() },
    });
    await tx.billingReceipt.update({
      where: { id: receipt.id },
      data: { status: "used", usedAt: new Date(), updatedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId: receipt.organizationId,
        branchId: receipt.branchId,
        userId: receipt.sale.createdByUserId,
        action: "public_autofactura_stamped",
        entityType: "invoice",
        entityId: invoice.id,
        afterSnapshot: {
          receiptId: receipt.id,
          invoiceId: invoice.id,
          rfc: taxData.rfc,
        },
      },
    });

    return { data: serializeInvoiceResult(receipt, invoice) };
  });
}

export async function getPublicInvoiceStatus(token: string) {
  const receipt = await findReceiptByToken(token);
  const latest = receipt.billingInvoiceRequestBillingReceipt[0];
  return {
    data: {
      receiptId: receipt.id,
      receiptStatus: receipt.status,
      status: latest?.status ?? "not_requested",
      invoiceId: latest?.invoiceId ?? null,
      cfdiUuid: latest?.invoice?.cfdiUuid ?? null,
      xmlUrl: latest?.invoiceId ? `/api/v1/public/billing/invoices/${latest.invoiceId}/xml` : null,
      pdfUrl: latest?.invoiceId ? `/api/v1/public/billing/invoices/${latest.invoiceId}/pdf` : null,
    },
  };
}

export async function getPublicInvoiceDocument(invoiceId: string, documentType: "pdf" | "xml"): Promise<InvoiceDocumentPayload> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      status: { in: ["stamped", "cancelled"] },
    },
    include: {
      organization: true,
      branch: true,
      invoiceItemInvoice: true,
      billingInvoiceRequestInvoice: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!invoice) {
    throw new DomainError(404, "PUBLIC_INVOICE_NOT_FOUND", "Factura no encontrada.");
  }

  const request = invoice.billingInvoiceRequestInvoice[0];
  if (!request) {
    throw new DomainError(403, "PUBLIC_INVOICE_NOT_PUBLIC", "Factura no disponible en portal publico.");
  }

  if (documentType === "xml") {
    return {
      filename: `cfdi-${invoice.cfdiUuid ?? invoice.id}.xml`,
      contentType: "application/xml; charset=utf-8",
      body: buildMockCfdiXml(invoice, request),
    };
  }

  return {
    filename: `cfdi-${invoice.cfdiUuid ?? invoice.id}.pdf`,
    contentType: "application/pdf",
    body: buildMockPdf(invoice, request),
  };
}

async function findReceiptByToken(token: string): Promise<ReceiptWithSale> {
  const receipt = await prisma.billingReceipt.findUnique({
    where: { receiptToken: token },
    include: {
      organization: true,
      branch: true,
      sale: {
        include: {
          saleItemSale: true,
          salePaymentSale: true,
          invoiceSaleSale: { include: { invoice: true } },
        },
      },
      billingInvoiceRequestBillingReceipt: {
        include: { invoice: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!receipt) {
    throw new DomainError(404, "PUBLIC_RECEIPT_NOT_FOUND", "Ticket de autofactura no encontrado.");
  }
  return receipt;
}

async function expireIfNeeded(receipt: ReceiptWithSale) {
  if (receipt.status !== "active" || receipt.expiresAt >= new Date()) return;
  await prisma.billingReceipt.update({
    where: { id: receipt.id },
    data: { status: "expired", expiredAt: new Date(), updatedAt: new Date() },
  });
}

function assertReceiptCanInvoice(receipt: ReceiptWithSale) {
  if (receipt.status === "expired" || receipt.expiresAt < new Date()) {
    throw new DomainError(410, "PUBLIC_RECEIPT_EXPIRED", "Este ticket ya vencio para autofactura.");
  }
  if (receipt.status !== "active") {
    throw new DomainError(409, "PUBLIC_RECEIPT_NOT_ACTIVE", "Este ticket no esta disponible para autofactura.");
  }
  if (receipt.sale.status !== "completed") {
    throw new DomainError(409, "PUBLIC_SALE_NOT_COMPLETED", "La venta no esta disponible para autofactura.");
  }
  if (receipt.sale.invoiceSaleSale.length > 0) {
    throw new DomainError(409, "PUBLIC_SALE_ALREADY_INVOICED", "Este ticket ya fue facturado.");
  }
  if (receipt.sale.saleItemSale.length === 0) {
    throw new DomainError(400, "PUBLIC_SALE_WITHOUT_ITEMS", "La venta no tiene partidas.");
  }
}

async function createStampedPublicInvoice(
  tx: Prisma.TransactionClient,
  receipt: ReceiptWithSale,
  taxData: {
    rfc: string;
    legalName: string;
    taxRegime: string;
    zipCode: string;
    cfdiUse: string;
    email: string;
  },
) {
  const cfdiUuid = randomUUID();
  const invoice = await tx.invoice.create({
    data: {
      organizationId: receipt.organizationId,
      branchId: receipt.branchId,
      customerId: receipt.sale.customerId,
      invoiceType: "individual",
      status: "stamped",
      cfdiUse: taxData.cfdiUse,
      paymentMethodSat: "PUE",
      paymentFormSat: "04",
      subtotal: normalizeMoney(receipt.sale.subtotal),
      taxTotal: normalizeMoney(receipt.sale.taxTotal),
      total: normalizeMoney(receipt.sale.total),
      cfdiUuid,
      pacProvider: "tortilla-plus-pac-mock",
      pacStatus: "stamped",
      issuedAt: new Date(),
      invoiceDate: new Date(`${receipt.sale.createdAt.toISOString().slice(0, 10)}T00:00:00.000Z`),
      rawRequest: {
        mode: "public_autofactura",
        receiptId: receipt.id,
        saleId: receipt.saleId,
        taxData,
      },
      rawResponse: {
        provider: "tortilla-plus-pac-mock",
        status: "stamped",
        cfdiUuid,
      },
      invoiceSaleInvoice: {
        create: [{ saleId: receipt.saleId }],
      },
      invoiceItemInvoice: {
        create: receipt.sale.saleItemSale.map((item) => ({
          productId: item.productId,
          description: item.productNameSnapshot,
          quantity: normalizeQuantity(item.quantity),
          unit: item.unit,
          unitPrice: normalizeMoney(item.unitPrice),
          subtotal: normalizeMoney(item.total),
          taxAmount: "0.00",
          total: normalizeMoney(item.total),
        })),
      },
      invoiceDocumentInvoice: {
        create: [
          { documentType: "xml", storageUrl: `/api/v1/public/billing/invoices/${cfdiUuid}.xml` },
          { documentType: "pdf", storageUrl: `/api/v1/public/billing/invoices/${cfdiUuid}.pdf` },
        ],
      },
    },
  });

  return invoice;
}

function serializeReceipt(receipt: ReceiptWithSale) {
  const invoice = receipt.billingInvoiceRequestBillingReceipt.find((request) => request.invoice)?.invoice ?? null;
  return {
    receiptId: receipt.id,
    token: receipt.receiptToken,
    status: receipt.status,
    folio: receipt.sale.saleNumber,
    businessName: receipt.organization.name,
    branchName: receipt.branch.name,
    saleDate: receipt.sale.createdAt,
    total: moneyNumber(receipt.sale.total),
    deadline: receipt.expiresAt,
    canInvoice: receipt.status === "active" && receipt.expiresAt >= new Date() && receipt.sale.invoiceSaleSale.length === 0,
    items: receipt.sale.saleItemSale.map((item) => ({
      description: item.productNameSnapshot,
      quantity: Number(item.quantity),
      unit: item.unit,
      total: moneyNumber(item.total),
    })),
    invoiceId: invoice?.id ?? null,
    cfdiUuid: invoice?.cfdiUuid ?? null,
  };
}

function serializeManagerReceipt(
  receipt: Prisma.BillingReceiptGetPayload<{
    include: {
      branch: true;
      sale: { include: { invoiceSaleSale: { include: { invoice: true } } } };
      billingInvoiceRequestBillingReceipt: { include: { invoice: true } };
    };
  }>,
) {
  const latestRequest = receipt.billingInvoiceRequestBillingReceipt[0];
  const invoice = latestRequest?.invoice ?? receipt.sale.invoiceSaleSale[0]?.invoice ?? null;
  return {
    id: receipt.id,
    saleId: receipt.saleId,
    saleFolio: receipt.sale.saleNumber,
    branchName: receipt.branch.name,
    token: receipt.receiptToken,
    receiptUrl: receipt.receiptUrl,
    status: receipt.status,
    saleDate: receipt.sale.createdAt,
    expiresAt: receipt.expiresAt,
    usedAt: receipt.usedAt,
    expiredAt: receipt.expiredAt,
    total: moneyNumber(receipt.sale.total),
    invoiceId: invoice?.id ?? null,
    cfdiUuid: invoice?.cfdiUuid ?? null,
  };
}

function serializeInvoiceResult(receipt: ReceiptWithSale, invoice: { id: string; cfdiUuid: string | null; total: Prisma.Decimal | string | number }) {
  return {
    receiptId: receipt.id,
    invoiceId: invoice.id,
    status: "stamped",
    cfdiUuid: invoice.cfdiUuid,
    total: moneyNumber(invoice.total),
    xmlUrl: `/api/v1/public/billing/invoices/${invoice.id}/xml`,
    pdfUrl: `/api/v1/public/billing/invoices/${invoice.id}/pdf`,
  };
}

function buildMockCfdiXml(
  invoice: Prisma.InvoiceGetPayload<{
    include: {
      organization: true;
      branch: true;
      invoiceItemInvoice: true;
      billingInvoiceRequestInvoice: true;
    };
  }>,
  request: { rfc: string; legalName: string; taxRegime: string; zipCode: string; cfdiUse: string },
) {
  const issuedAt = (invoice.issuedAt ?? invoice.createdAt).toISOString();
  const items = invoice.invoiceItemInvoice.map((item) => (
    `    <cfdi:Concepto ClaveProdServ="${item.satProductKey ?? "50181900"}" Cantidad="${normalizeQuantity(item.quantity)}" ClaveUnidad="${item.satUnitKey ?? "KGM"}" Descripcion="${escapeXml(item.description)}" ValorUnitario="${normalizeMoney(item.unitPrice)}" Importe="${normalizeMoney(item.subtotal)}" />`
  )).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante Version="4.0" Serie="TP" Folio="${invoice.id.slice(0, 8)}" Fecha="${issuedAt}" Moneda="MXN" SubTotal="${normalizeMoney(invoice.subtotal)}" Total="${normalizeMoney(invoice.total)}" TipoDeComprobante="I" MetodoPago="${invoice.paymentMethodSat ?? "PUE"}" FormaPago="${invoice.paymentFormSat ?? "04"}" Exportacion="01" LugarExpedicion="${request.zipCode}" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital">
  <cfdi:Emisor Rfc="${escapeXml(invoice.organization.taxId ?? "XAXX010101000")}" Nombre="${escapeXml(invoice.organization.legalName ?? invoice.organization.name)}" RegimenFiscal="601" />
  <cfdi:Receptor Rfc="${escapeXml(request.rfc)}" Nombre="${escapeXml(request.legalName)}" DomicilioFiscalReceptor="${escapeXml(request.zipCode)}" RegimenFiscalReceptor="${escapeXml(request.taxRegime)}" UsoCFDI="${escapeXml(request.cfdiUse)}" />
  <cfdi:Conceptos>
${items}
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital Version="1.1" UUID="${escapeXml(invoice.cfdiUuid ?? invoice.id)}" FechaTimbrado="${issuedAt}" RfcProvCertif="TPP010101FAK" SelloCFD="MOCK" NoCertificadoSAT="00001000000500000000" SelloSAT="MOCK" />
  </cfdi:Complemento>
</cfdi:Comprobante>
`;
}

function buildMockPdf(
  invoice: Prisma.InvoiceGetPayload<{
    include: {
      organization: true;
      branch: true;
      invoiceItemInvoice: true;
      billingInvoiceRequestInvoice: true;
    };
  }>,
  request: { rfc: string; legalName: string; email: string },
) {
  const lines = [
    "%PDF-1.4",
    "% Tortilla Plus mock CFDI PDF",
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length 240 >> stream`,
    "BT /F1 12 Tf 72 720 Td",
    `(Tortilla Plus CFDI mock) Tj 0 -18 Td`,
    `(UUID: ${pdfText(invoice.cfdiUuid ?? invoice.id)}) Tj 0 -18 Td`,
    `(Emisor: ${pdfText(invoice.organization.name)}) Tj 0 -18 Td`,
    `(Sucursal: ${pdfText(invoice.branch?.name ?? "Sin sucursal")}) Tj 0 -18 Td`,
    `(Receptor: ${pdfText(request.legalName)} / ${pdfText(request.rfc)}) Tj 0 -18 Td`,
    `(Total: ${normalizeMoney(invoice.total)} MXN) Tj 0 -18 Td`,
    `(Correo: ${pdfText(request.email)}) Tj`,
    "ET",
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f ",
    "trailer << /Root 1 0 R /Size 5 >>",
    "startxref",
    "0",
    "%%EOF",
  ];
  return Buffer.from(lines.join("\n"), "utf8");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function pdfText(value: string) {
  return value.replace(/[()\\]/g, "");
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 5, 59, 59, 999));
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }
  return input as Record<string, unknown>;
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new DomainError(400, "INVALID_REQUEST", `Campo requerido: ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function isBillingReceiptStatus(value: string | null): value is "active" | "used" | "expired" | "cancelled" {
  return value === "active" || value === "used" || value === "expired" || value === "cancelled";
}

function dateRange(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida.");
  }
  return {
    gte: new Date(`${date}T00:00:00.000Z`),
    lt: new Date(`${date}T23:59:59.999Z`),
  };
}

function asRfc(value: unknown): string {
  const rfc = asString(value, "rfc").toUpperCase();
  if (!/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
    throw new DomainError(400, "INVALID_RFC", "RFC invalido.");
  }
  return rfc;
}

function asZipCode(value: unknown): string {
  const zipCode = asString(value, "zipCode");
  if (!/^\d{5}$/.test(zipCode)) {
    throw new DomainError(400, "INVALID_ZIP_CODE", "Codigo postal invalido.");
  }
  return zipCode;
}

function asTaxRegime(value: unknown): string {
  const taxRegime = asString(value, "taxRegime");
  if (!isValidTaxRegime(taxRegime)) {
    throw new DomainError(400, "INVALID_TAX_REGIME", "Regimen fiscal invalido.");
  }
  return taxRegime;
}

function asCfdiUse(value: unknown): string {
  const cfdiUse = asString(value, "cfdiUse").toUpperCase();
  if (!isValidCfdiUse(cfdiUse)) {
    throw new DomainError(400, "INVALID_CFDI_USE", "Uso CFDI invalido.");
  }
  return cfdiUse;
}

function asEmail(value: unknown): string {
  const email = asString(value, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError(400, "INVALID_EMAIL", "Correo invalido.");
  }
  return email;
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

function moneyNumber(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}
