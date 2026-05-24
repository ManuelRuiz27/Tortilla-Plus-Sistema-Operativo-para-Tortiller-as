import { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    customer: true;
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
  const range = dateRange(date);
  const invoiceDate = new Date(`${date}T00:00:00.000Z`);

  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
  }

  const [sales, invoices] = await Promise.all([
    prisma.sale.findMany({
      where: {
        organizationId: currentUser.organizationId,
        branchId: branchId ?? undefined,
        status: "completed",
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
      include: {
        customer: true,
        invoiceSaleInvoice: { include: { sale: { include: { customer: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const globalCandidates = sales.filter((sale) => !sale.customerId);
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
  const range = dateRange(date);
  const invoiceDate = new Date(`${date}T00:00:00.000Z`);
  await assertBranchAccess(currentUser, branchId);

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
        customerId: null,
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
      invoiceDate: date,
    });

    await audit(tx, currentUser, branchId, "global_daily_invoice_requested", "invoice", invoice.id, serializeInvoice(invoice));
    return { data: serializeInvoice(invoice) };
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
    invoiceDate?: string;
  },
) {
  const subtotalCents = input.sales.reduce((sum, sale) => sum + toCents(sale.subtotal), 0);
  const taxCents = input.sales.reduce((sum, sale) => sum + toCents(sale.taxTotal), 0);
  const totalCents = input.sales.reduce((sum, sale) => sum + toCents(sale.total), 0);

  const invoice = await tx.invoice.create({
    data: {
      organizationId: currentUser.organizationId,
      branchId: input.branchId,
      customerId: input.customerId,
      invoiceType: input.invoiceType,
      status: "requested",
      subtotal: centsToMoney(subtotalCents),
      taxTotal: centsToMoney(taxCents),
      total: centsToMoney(totalCents),
      invoiceDate: new Date(`${input.invoiceDate ?? dateOnly(input.sales[0]?.createdAt ?? new Date())}T00:00:00.000Z`),
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
    include: {
      customer: true,
      invoiceSaleInvoice: { include: { sale: { include: { customer: true } } } },
    },
  });

  return invoice;
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
    status: sale.customerId ? "billable" : "global_candidate",
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
  if (status === "requested") return "draft";
  if (status === "failed") return "error";
  if (status === "cancel_requested") return "draft";
  return status;
}

function dateRange(date: string) {
  return {
    gte: new Date(`${date}T00:00:00.000Z`),
    lt: new Date(`${date}T23:59:59.999Z`),
  };
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
