import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { env } from "../config/env.js";
import { getPacAdapter, PacProviderError } from "./billing-pac-adapter.js";
import { recordBillingProviderLog } from "./billing-provider-log-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    customer: true;
    billingProfile: true;
    invoiceItemInvoice: true;
    invoiceSaleInvoice: { include: { sale: { include: { customer: true } } } };
  };
}>;

type SaleWithRelations = Prisma.SaleGetPayload<{
  include: {
    customer: true;
    saleItemSale: true;
    invoiceSaleSale: true;
  };
}>;

export async function getBillingSummary(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const body = asRecord(input);
  const branchId = optionalString(body.branchId);
  const date = asDateOnly(body.date);
  const branch = branchId ? await assertBranchAccess(currentUser, branchId) : null;
  const range = fiscalDateRange(date, branch?.timezone ?? "UTC");
  const invoiceDate = range.gte;

  const [sales, invoices] = await Promise.all([
    prisma.sale.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: branchId ?? undefined,
        status: "completed",
        fiscalStatus: { in: ["eligible_for_daily_global", "pending_customer_invoice", "invoice_failed"] },
        createdAt: range,
        invoiceSaleSale: { none: {} },
      },
      include: {
        customer: true,
        saleItemSale: true,
        invoiceSaleSale: true,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: branchId ?? undefined,
        invoiceDate,
      },
      include: invoiceInclude(),
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const globalCandidates = sales.filter((sale) => sale.fiscalStatus === "eligible_for_daily_global");
  const globalInvoice = invoices.find((invoice) => invoice.invoiceType === "global_public");

  return {
    data: {
      billableSales: sales.map(serializeBillableSale),
      invoices: invoices.map(serializeInvoice),
      globalDaily: {
        date,
        total: moneyNumber(globalInvoice?.total ?? globalCandidates.reduce((sum, sale) => sum + toCents(sale.total), 0) / 100),
        status: globalInvoice ? invoiceUiStatus(globalInvoice.status) : "not_created",
      },
      stampErrors: invoices.filter((invoice) => invoice.status === "failed").length,
    },
  };
}

export async function createIndividualInvoice(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const body = asRecord(input);
  const saleId = asString(body.saleId, "saleId");

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: {
        id: saleId,
        organizationId: currentUser.organizationId,
      },
      include: {
        customer: true,
        saleItemSale: true,
        invoiceSaleSale: true,
      },
    });

    if (!sale) {
      throw new DomainError(404, "SALE_NOT_FOUND", "Venta no encontrada.");
    }
    await assertBranchAccess(currentUser, sale.branchId);
    assertInvoiceableSale(sale);
    if (!sale.customerId) {
      throw new DomainError(400, "CUSTOMER_REQUIRED_FOR_INVOICE", "Factura individual requiere cliente.");
    }

    const invoice = await createInvoiceFromSales(tx, currentUser, {
      branchId: sale.branchId,
      customerId: sale.customerId,
      invoiceType: "individual",
      sales: [sale],
    });

    await audit(tx, currentUser, sale.branchId, "individual_invoice_requested", "invoice", invoice.id, serializeInvoice(invoice));
    return { data: serializeInvoice(invoice) };
  });
}

export async function createGlobalDailyInvoice(currentUser: AuthenticatedUser, input: unknown) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const body = asRecord(input);
  const branchId = asString(body.branchId, "branchId");
  const date = asDateOnly(body.date);
  const branch = await assertBranchAccess(currentUser, branchId);
  const range = fiscalDateRange(date, branch.timezone);
  const invoiceDate = range.gte;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        branchId,
        invoiceType: "global_public",
        invoiceDate,
        status: { not: "cancelled" },
      },
    });

    if (existing) {
      throw new DomainError(409, "GLOBAL_INVOICE_ALREADY_EXISTS", "La factura global del dia ya existe.");
    }

    const sales = await tx.sale.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId,
        status: "completed",
        fiscalStatus: "eligible_for_daily_global",
        createdAt: range,
        invoiceSaleSale: { none: {} },
      },
      include: {
        customer: true,
        saleItemSale: true,
        invoiceSaleSale: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (sales.length === 0) {
      throw new DomainError(400, "NO_GLOBAL_SALES", "No hay ventas publicas para factura global.");
    }

    const invoice = await createInvoiceFromSales(tx, currentUser, {
      branchId,
      customerId: null,
      invoiceType: "global_public",
      sales,
      invoiceDate,
    });

    await audit(tx, currentUser, branchId, "global_daily_invoice_requested", "invoice", invoice.id, serializeInvoice(invoice));
    return { data: serializeInvoice(invoice) };
  });
}

export async function stampInvoice(currentUser: AuthenticatedUser, invoiceId: string) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId: currentUser.organizationId },
      include: invoiceInclude(),
    });

    if (!invoice) {
      throw new DomainError(404, "INVOICE_NOT_FOUND", "Factura no encontrada.");
    }
    if (invoice.branchId) {
      await assertBranchAccess(currentUser, invoice.branchId);
    }
    if (invoice.status === "cancelled" || invoice.status === "cancel_requested") {
      throw new DomainError(409, "INVOICE_CANCELLED", "Factura cancelada no se puede timbrar.");
    }
    if (invoice.status === "stamped") {
      return { data: serializeInvoice(invoice) };
    }

    const pac = getPacAdapter();
    const pacInput = toPacStampInput(invoice);
    const startedAt = Date.now();
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "processing", updatedAt: new Date() } });
    let pacResult;
    try {
      pacResult = invoice.invoiceType === "global_public"
        ? await pac.createGlobalInvoice(pacInput)
        : await pac.createInvoice(pacInput);
    } catch (error) {
      await recordPacFailure(tx, {
        organizationId: currentUser.organizationId,
        provider: pac.provider,
        operation: invoice.invoiceType === "global_public" ? "createGlobalInvoice" : "createInvoice",
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        requestPayload: pacInput,
        durationMs: Date.now() - startedAt,
        error,
        idempotencyKey: pacInput.operationId,
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: isRetryablePacError(error) ? "requires_manual_review" : "failed",
          pacProvider: pac.provider,
          pacStatus: errorCode(error),
          rawResponse: errorRawResponse(error),
          updatedAt: new Date(),
        },
      });
      throw error;
    }
    await recordBillingProviderLog(tx, {
      organizationId: currentUser.organizationId,
      provider: pacResult.provider,
      operation: invoice.invoiceType === "global_public" ? "createGlobalInvoice" : "createInvoice",
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
      requestPayload: pacInput,
      responsePayload: pacResult.rawResponse,
      durationMs: Date.now() - startedAt,
      success: true,
      idempotencyKey: pacInput.operationId,
    });
    const cfdiUuid = invoice.cfdiUuid ?? pacResult.cfdiUuid;
    const stamped = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "stamped",
        cfdiUuid,
        providerInvoiceId: pacResult.providerInvoiceId,
        pacProvider: pacResult.provider,
        pacStatus: pacResult.status,
        issuedAt: new Date(),
        rawResponse: pacResult.rawResponse as Prisma.InputJsonValue,
      },
      include: invoiceInclude(),
    });

    await ensureInvoiceDocuments(tx, stamped, pac);
    await tx.sale.updateMany({
      where: { id: { in: stamped.invoiceSaleInvoice.map((item) => item.sale.id) } },
      data: {
        fiscalStatus: stamped.invoiceType === "global_public" ? "included_in_global" : "customer_invoiced",
        fiscalLockedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await audit(tx, currentUser, stamped.branchId, "invoice_stamped", "invoice", stamped.id, serializeInvoice(stamped));
    return { data: serializeInvoice(stamped) };
  });
}

export async function cancelInvoice(currentUser: AuthenticatedUser, invoiceId: string, input: unknown) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const body = asRecord(input);
  const reason = optionalString(body.internalReason) ?? optionalString(body.reason) ?? "Cancelacion solicitada por usuario.";
  const motive = optionalString(body.motive) ?? "02";

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId: currentUser.organizationId },
      include: invoiceInclude(),
    });

    if (!invoice) {
      throw new DomainError(404, "INVOICE_NOT_FOUND", "Factura no encontrada.");
    }
    if (invoice.branchId) {
      await assertBranchAccess(currentUser, invoice.branchId);
    }
    if (invoice.status !== "stamped") {
      throw new DomainError(409, "INVOICE_NOT_STAMPED", "Solo se cancela fiscalmente una factura timbrada.");
    }

    const pac = getPacAdapter();
    const pacInput = {
      operationId: `invoice-cancel:${invoice.id}`,
      invoiceId: invoice.id,
      providerInvoiceId: invoice.providerInvoiceId,
      cfdiUuid: invoice.cfdiUuid ?? invoice.id,
      reason,
      motive,
    };
    const startedAt = Date.now();
    await tx.invoice.update({ where: { id: invoice.id }, data: { status: "cancel_processing", updatedAt: new Date() } });
    let pacResult;
    try {
      pacResult = await pac.cancelInvoice(pacInput);
    } catch (error) {
      await recordPacFailure(tx, {
        organizationId: currentUser.organizationId,
        provider: pac.provider,
        operation: "cancelInvoice",
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        requestPayload: pacInput,
        durationMs: Date.now() - startedAt,
        error,
        idempotencyKey: pacInput.operationId,
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "cancel_failed",
          pacProvider: pac.provider,
          pacStatus: errorCode(error),
          rawResponse: errorRawResponse(error),
          updatedAt: new Date(),
        },
      });
      throw error;
    }
    await recordBillingProviderLog(tx, {
      organizationId: currentUser.organizationId,
      provider: pacResult.provider,
      operation: "cancelInvoice",
      relatedEntityType: "invoice",
      relatedEntityId: invoice.id,
      requestPayload: pacInput,
      responsePayload: pacResult.rawResponse,
      durationMs: Date.now() - startedAt,
      success: true,
      idempotencyKey: pacInput.operationId,
    });

    const cancelled = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "cancelled",
        pacProvider: pacResult.provider,
        pacStatus: pacResult.status,
        cancelledAt: new Date(),
        cancellationReason: reason,
        rawResponse: pacResult.rawResponse as Prisma.InputJsonValue,
      },
      include: invoiceInclude(),
    });

    await audit(tx, currentUser, cancelled.branchId, "invoice_cancelled", "invoice", cancelled.id, serializeInvoice(cancelled));
    return { data: serializeInvoice(cancelled) };
  });
}

export async function getInvoiceDocuments(currentUser: AuthenticatedUser, invoiceId: string) {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: currentUser.organizationId },
    include: {
      invoiceDocumentInvoice: { orderBy: { documentType: "asc" } },
    },
  });

  if (!invoice) {
    throw new DomainError(404, "INVOICE_NOT_FOUND", "Factura no encontrada.");
  }
  if (invoice.branchId) {
    await assertBranchAccess(currentUser, invoice.branchId);
  }
  if (invoice.status !== "stamped" && invoice.status !== "cancelled") {
    throw new DomainError(409, "INVOICE_DOCUMENTS_NOT_READY", "Documentos disponibles despues del timbrado.");
  }

  return {
    data: {
      invoiceId: invoice.id,
      cfdiUuid: invoice.cfdiUuid,
      documents: invoice.invoiceDocumentInvoice.map((document) => ({
        id: document.id,
        type: document.documentType,
        url: document.storageUrl,
        contentType: document.contentType,
        contentSha256: document.contentSha256,
        createdAt: document.createdAt,
      })),
    },
  };
}

export async function getInvoiceDocumentFile(currentUser: AuthenticatedUser, invoiceId: string, documentType: "xml" | "pdf") {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: currentUser.organizationId },
    include: {
      organization: true,
      branch: true,
      invoiceDocumentInvoice: true,
    },
  });

  if (!invoice) {
    throw new DomainError(404, "INVOICE_NOT_FOUND", "Factura no encontrada.");
  }
  if (invoice.branchId) {
    await assertBranchAccess(currentUser, invoice.branchId);
  }
  if (invoice.status !== "stamped" && invoice.status !== "cancelled") {
    throw new DomainError(409, "INVOICE_DOCUMENTS_NOT_READY", "Documentos disponibles despues del timbrado.");
  }

  if (documentType === "xml") {
    const xml = invoice.invoiceDocumentInvoice.find((document) => document.documentType === "xml" && document.storageContent);
    if (!xml?.storageContent) {
      throw new DomainError(404, "INVOICE_DOCUMENT_NOT_FOUND", "XML fiscal no encontrado.");
    }
    return {
      filename: `cfdi-${invoice.cfdiUuid ?? invoice.id}.xml`,
      contentType: xml.contentType ?? "application/xml; charset=utf-8",
      body: xml.storageContent,
    };
  }

  if (invoice.pacProvider === "facturapi" && invoice.providerInvoiceId) {
    const pac = getPacAdapter("facturapi");
    return {
      filename: `cfdi-${invoice.cfdiUuid ?? invoice.id}.pdf`,
      contentType: "application/pdf",
      body: await pac.downloadInvoiceDocument?.(invoice.providerInvoiceId, "pdf") ?? buildManagerMockPdf(invoice),
    };
  }

  return {
    filename: `cfdi-${invoice.cfdiUuid ?? invoice.id}.pdf`,
    contentType: "application/pdf",
    body: buildManagerMockPdf(invoice),
  };
}

export async function processPacWebhook(input: unknown) {
  const body = asRecord(input);
  const eventId = asString(body.eventId, "eventId");
  const invoiceId = optionalString(body.invoiceId);
  const provider = optionalString(body.provider) ?? "tortilla-plus-pac-mock";
  const status = optionalString(body.status) ?? "stamped";

  return prisma.$transaction(async (tx) => {
    const existing = await tx.pacWebhookEvent.findUnique({ where: { eventId } });
    if (existing) {
      return { data: { eventId, processed: existing.processed, duplicate: true } };
    }

    const event = await tx.pacWebhookEvent.create({
      data: {
        provider,
        eventId,
        invoiceId,
        rawPayload: body as Prisma.InputJsonValue,
      },
    });

    if (invoiceId && status === "stamped") {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice && invoice.status !== "cancelled") {
        const cfdiUuid = optionalString(body.cfdiUuid) ?? invoice.cfdiUuid ?? randomUUID();
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "stamped",
            cfdiUuid,
            pacProvider: provider,
            pacStatus: "stamped",
            issuedAt: invoice.issuedAt ?? new Date(),
            rawResponse: body as Prisma.InputJsonValue,
          },
        });
        const stamped = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: invoiceInclude() });
        await ensureInvoiceDocuments(tx, stamped, getPacAdapter(provider === "facturapi" ? "facturapi" : "mock"));
      }
    }

    await tx.pacWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return { data: { eventId, processed: true, duplicate: false } };
  });
}

async function createInvoiceFromSales(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  input: {
    branchId: string;
    customerId: string | null;
    invoiceType: "individual" | "global_public";
    sales: SaleWithRelations[];
    invoiceDate?: Date;
  },
) {
  const subtotalCents = input.sales.reduce((sum, sale) => sum + toCents(sale.subtotal), 0);
  const taxCents = input.sales.reduce((sum, sale) => sum + toCents(sale.taxTotal), 0);
  const totalCents = input.sales.reduce((sum, sale) => sum + toCents(sale.total), 0);
  const billingProfile = input.customerId
    ? await tx.billingProfile.findFirst({
      where: { organizationId: currentUser.organizationId, customerId: input.customerId, status: "active" },
      orderBy: { createdAt: "desc" },
    })
    : null;

  const invoice = await tx.invoice.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId: input.branchId,
      customerId: input.customerId,
      billingProfileId: billingProfile?.id ?? null,
      invoiceType: input.invoiceType,
      status: "requested",
      subtotal: centsToMoney(subtotalCents),
      taxTotal: centsToMoney(taxCents),
      total: centsToMoney(totalCents),
      invoiceDate: input.invoiceDate ?? new Date(`${dateOnly(input.sales[0]?.createdAt ?? new Date())}T00:00:00.000Z`),
      issuedAt: new Date(),
      rawRequest: {
        mode: "internal_stub",
        provider: null,
        saleIds: input.sales.map((sale) => sale.id),
      },
      rawResponse: {
        status: "pending_stamp",
        message: "Factura interna creada sin timbrado PAC.",
      },
      invoiceSaleInvoice: {
        create: input.sales.map((sale) => ({ saleId: sale.id })),
      },
      invoiceItemInvoice: {
        create: consolidateItems(input.sales),
      },
    },
    include: invoiceInclude(),
  });

  return invoice;
}

function toPacStampInput(invoice: InvoiceWithRelations) {
  return {
    operationId: `invoice-stamp:${invoice.id}`,
    invoiceId: invoice.id,
    invoiceType: invoice.invoiceType,
    saleIds: invoice.invoiceSaleInvoice.map((item) => item.sale.id),
    subtotal: normalizeMoney(invoice.subtotal),
    taxTotal: normalizeMoney(invoice.taxTotal),
    total: normalizeMoney(invoice.total),
    customerRfc: invoice.billingProfile?.rfc ?? invoice.customer?.taxId ?? null,
    taxData: invoice.billingProfile ? {
      rfc: invoice.billingProfile.rfc,
      legalName: invoice.billingProfile.legalName,
      taxRegime: invoice.billingProfile.taxRegime,
      zipCode: invoice.billingProfile.zipCode,
      cfdiUse: invoice.cfdiUse ?? "G03",
      email: invoice.billingProfile.email,
    } : invoice.invoiceType === "global_public" ? {
      rfc: "XAXX010101000",
      legalName: "PUBLICO EN GENERAL",
      taxRegime: "616",
      zipCode: env.FACTURAPI_PUBLIC_ZIP_CODE,
      cfdiUse: "S01",
      email: null,
    } : null,
    items: invoice.invoiceItemInvoice.map((item) => ({
      description: item.description,
      quantity: normalizeQuantity(item.quantity),
      unitPrice: normalizeMoney(item.unitPrice),
      subtotal: normalizeMoney(item.subtotal),
      total: normalizeMoney(item.total),
      satProductKey: item.satProductKey,
      satUnitKey: item.satUnitKey,
    })),
    paymentFormSat: invoice.paymentFormSat,
    paymentMethodSat: invoice.paymentMethodSat,
  };
}

function consolidateItems(sales: SaleWithRelations[]) {
  return sales.flatMap((sale) =>
    sale.saleItemSale.map((item) => ({
      productId: item.productId,
      description: item.productNameSnapshot,
      quantity: normalizeQuantity(item.quantity),
      unit: item.unit,
      unitPrice: normalizeMoney(item.unitPrice),
      subtotal: normalizeMoney(item.total),
      taxAmount: "0.00",
      total: normalizeMoney(item.total),
    })),
  );
}

function assertInvoiceableSale(sale: SaleWithRelations) {
  if (sale.status !== "completed") {
    throw new DomainError(409, "SALE_NOT_COMPLETED", "Solo se facturan ventas completadas.");
  }
  if (sale.invoiceSaleSale.length > 0) {
    throw new DomainError(409, "SALE_ALREADY_INVOICED", "La venta ya tiene factura.");
  }
  if (sale.saleItemSale.length === 0) {
    throw new DomainError(400, "SALE_WITHOUT_ITEMS", "La venta no tiene partidas.");
  }
}

function serializeBillableSale(sale: SaleWithRelations) {
  return {
    id: sale.id,
    folio: sale.saleNumber,
    customerName: sale.customer?.name ?? "Publico general",
    saleDate: sale.createdAt,
    total: moneyNumber(sale.total),
    status: sale.fiscalStatus === "eligible_for_daily_global" ? "global_candidate" : "billable",
    fiscalStatus: sale.fiscalStatus,
  };
}

function serializeInvoice(invoice: InvoiceWithRelations) {
  const sale = invoice.invoiceSaleInvoice[0]?.sale;
  return {
    id: invoice.id,
    folio: invoice.cfdiUuid ?? `INT-${invoice.id.slice(0, 8)}`,
    customerName: invoice.customer?.name ?? sale?.customer?.name ?? "Publico general",
    issuedAt: invoice.issuedAt ?? invoice.createdAt,
    total: moneyNumber(invoice.total),
    status: invoiceUiStatus(invoice.status),
  };
}

function invoiceUiStatus(status: string) {
  if (status === "requested") return "processing";
  return status;
}

function fiscalDateRange(date: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const start = zonedTimeToUtc(year, month, day, 0, 0, 0, timezone);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = zonedTimeToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, 0, timezone);

  return {
    gte: start,
    lt: end,
  };
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
) {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  for (let index = 0; index < 2; index += 1) {
    const offsetMs = timezoneOffsetMs(utc, timezone);
    utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs);
  }
  return utc;
}

function timezoneOffsetMs(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new DomainError(400, "INVALID_REQUEST", "Body invalido.");
  }
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

function asDateOnly(value: unknown): string {
  const date = asString(value, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new DomainError(400, "INVALID_REQUEST", "Fecha invalida.");
  }
  return date;
}

function toCents(value: Prisma.Decimal | string | number) {
  return Math.round(Number(value) * 100);
}

function centsToMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function moneyNumber(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}

function normalizeMoney(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(2);
}

function normalizeQuantity(value: Prisma.Decimal | string | number) {
  return Number(value).toFixed(3);
}

async function audit(
  tx: Prisma.TransactionClient,
  currentUser: AuthenticatedUser,
  branchId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  afterSnapshot: unknown,
) {
  await tx.auditLog.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId,
      userId: currentUser.id,
      action,
      entityType,
      entityId,
      afterSnapshot: afterSnapshot as Prisma.InputJsonValue,
    },
  });
}

function invoiceInclude() {
  return {
    customer: true,
    billingProfile: true,
    invoiceItemInvoice: true,
    invoiceSaleInvoice: { include: { sale: { include: { customer: true } } } },
  } satisfies Prisma.InvoiceInclude;
}

async function ensureInvoiceDocuments(tx: Prisma.TransactionClient, invoice: InvoiceWithRelations, pac = getPacAdapter()) {
  const existing = await tx.invoiceDocument.findMany({
    where: { invoiceId: invoice.id },
    select: { documentType: true },
  });
  const existingTypes = new Set(existing.map((document) => document.documentType));
  const providerInvoiceId = invoice.providerInvoiceId ?? invoice.cfdiUuid ?? invoice.id;
  const xmlBody = existingTypes.has("xml") ? null : await downloadOrBuildXml(pac, providerInvoiceId);
  const documents = [
    xmlBody ? {
      documentType: "xml" as const,
      storageUrl: `/api/v1/billing/invoices/${invoice.id}/documents/${invoice.cfdiUuid ?? invoice.id}.xml`,
      contentType: "application/xml; charset=utf-8",
      contentSha256: sha256(xmlBody),
      storageContent: xmlBody.toString("utf8"),
    } : null,
    !existingTypes.has("pdf") ? {
      documentType: "pdf" as const,
      storageUrl: `/api/v1/billing/invoices/${invoice.id}/documents/${invoice.cfdiUuid ?? invoice.id}.pdf`,
      contentType: "application/pdf",
      contentSha256: null,
      storageContent: null,
    } : null,
  ].filter((document): document is NonNullable<typeof document> => Boolean(document));

  if (documents.length === 0) return;

  await tx.invoiceDocument.createMany({
    data: documents.map((document) => ({
      invoiceId: invoice.id,
      documentType: document.documentType,
      storageUrl: document.storageUrl,
      contentType: document.contentType,
      contentSha256: document.contentSha256,
      storageContent: document.storageContent,
    })),
  });
}

async function downloadOrBuildXml(pac: ReturnType<typeof getPacAdapter>, providerInvoiceId: string) {
  if (pac.downloadInvoiceDocument) {
    return pac.downloadInvoiceDocument(providerInvoiceId, "xml");
  }
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><cfdi:Comprobante ProviderInvoiceId="${providerInvoiceId}" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" />`, "utf8");
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function buildManagerMockPdf(invoice: {
  id: string;
  cfdiUuid: string | null;
  total: Prisma.Decimal | string | number;
  organization: { name: string };
  branch: { name: string } | null;
}) {
  const lines = [
    "%PDF-1.4",
    "% Tortilla Plus manager CFDI PDF",
    `UUID: ${invoice.cfdiUuid ?? invoice.id}`,
    `Emisor: ${invoice.organization.name}`,
    `Sucursal: ${invoice.branch?.name ?? "Sin sucursal"}`,
    `Total: ${normalizeMoney(invoice.total)} MXN`,
    "%%EOF",
  ];
  return Buffer.from(lines.join("\n"), "utf8");
}

async function recordPacFailure(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    provider: string;
    operation: string;
    relatedEntityType: string;
    relatedEntityId: string;
    requestPayload: unknown;
    durationMs: number;
    error: unknown;
    idempotencyKey: string;
  },
) {
  await recordBillingProviderLog(tx, {
    organizationId: input.organizationId,
    provider: input.provider,
    operation: input.operation,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    requestPayload: input.requestPayload,
    responsePayload: errorRawResponse(input.error),
    durationMs: input.durationMs,
    success: false,
    errorCode: errorCode(input.error),
    errorMessage: errorMessage(input.error),
    idempotencyKey: input.idempotencyKey,
  });
}

function isRetryablePacError(error: unknown) {
  return error instanceof PacProviderError && error.retryable;
}

function errorCode(error: unknown) {
  if (error instanceof DomainError) return error.code;
  return "UNKNOWN_PROVIDER_ERROR";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Error desconocido de proveedor.";
}

function errorRawResponse(error: unknown): Prisma.InputJsonValue {
  if (error instanceof PacProviderError && error.rawResponse !== undefined) {
    return error.rawResponse as Prisma.InputJsonValue;
  }
  return { error: errorMessage(error) };
}
