import type { Prisma } from "@prisma/client";

import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";
import { assertBranchAccess, assertPermission, getBranchAssignments } from "./permission-service.js";
import { assertFeatureAvailable } from "./subscription-service.js";
import {
  getCashDifferences,
  getCashWithdrawalsByReason,
  getSalesByBranch,
  getSalesByCustomer,
  getSalesByDay,
  getSalesByProduct,
} from "./reports-service.js";

type ExportDocument = {
  filename: string;
  contentType: string;
  body: string | Buffer;
};

type ExportFormat = "csv" | "xlsx";

type ExportQuery = {
  branchId?: string | null;
  from?: string | null;
  to?: string | null;
  format?: string | null;
};

type ParsedExportQuery = {
  branchId: string | null;
  from: string;
  to: string;
  format: ExportFormat;
};

type InvoiceExportRow = {
  folio: string;
  tipo: string;
  estado: string;
  sucursal: string;
  cliente: string;
  uuid: string;
  fecha: string;
  subtotal: number;
  impuestos: number;
  total: number;
};

type ReportExportRow = {
  reporte: string;
  etiqueta: string;
  valor: number;
};

const invoiceHeaders: Array<keyof InvoiceExportRow> = ["folio", "tipo", "estado", "sucursal", "cliente", "uuid", "fecha", "subtotal", "impuestos", "total"];
const reportHeaders: Array<keyof ReportExportRow> = ["reporte", "etiqueta", "valor"];

export async function exportIssuedInvoices(currentUser: AuthenticatedUser, input: unknown): Promise<ExportDocument> {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const query = parseExportQuery(input);
  const rows = await invoiceRows(currentUser, query, {});
  return renderExport({
    basename: `facturas-emitidas-${query.from}-${query.to}`,
    format: query.format,
    headers: invoiceHeaders,
    rows,
  });
}

export async function exportGlobalInvoices(currentUser: AuthenticatedUser, input: unknown): Promise<ExportDocument> {
  await assertFeatureAvailable(currentUser, "billing_cfdi");
  await assertPermission(currentUser.id, "billing.manage");
  const query = parseExportQuery(input);
  const rows = await invoiceRows(currentUser, query, { invoiceType: "global_public" });
  return renderExport({
    basename: `facturas-globales-${query.from}-${query.to}`,
    format: query.format,
    headers: invoiceHeaders,
    rows,
  });
}

export async function exportOperationalReports(currentUser: AuthenticatedUser, input: unknown): Promise<ExportDocument> {
  await assertPermission(currentUser.id, "reports.basic.view");
  const query = parseExportQuery(input);
  const reportInput = {
    branchId: query.branchId,
    from: query.from,
    to: query.to,
  };
  const [salesByDay, salesByBranch, salesByProduct, salesByCustomer, withdrawalsByReason, cashDifferences] = await Promise.all([
    getSalesByDay(currentUser, reportInput),
    getSalesByBranch(currentUser, reportInput),
    getSalesByProduct(currentUser, reportInput),
    getSalesByCustomer(currentUser, reportInput),
    getCashWithdrawalsByReason(currentUser, reportInput),
    getCashDifferences(currentUser, reportInput),
  ]);
  const rows: ReportExportRow[] = [
    ...reportRows("ventas_por_dia", salesByDay.data),
    ...reportRows("ventas_por_sucursal", salesByBranch.data),
    ...reportRows("ventas_por_producto", salesByProduct.data),
    ...reportRows("ventas_por_cliente", salesByCustomer.data),
    ...reportRows("retiros_por_motivo", withdrawalsByReason.data),
    ...reportRows("diferencias_caja", cashDifferences.data),
  ];
  return renderExport({
    basename: `reportes-operativos-${query.from}-${query.to}`,
    format: query.format,
    headers: reportHeaders,
    rows,
  });
}

async function invoiceRows(currentUser: AuthenticatedUser, query: ParsedExportQuery, where: Prisma.InvoiceWhereInput) {
  const branchIds = await resolveBranchIds(currentUser, query.branchId);
  const range = dateRange(query.from, query.to);
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: currentUser.organizationId,
      branchId: { in: branchIds },
      createdAt: range,
      ...where,
    },
    include: {
      branch: true,
      customer: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return invoices.map((invoice): InvoiceExportRow => ({
    folio: invoice.id.slice(0, 8),
    tipo: invoice.invoiceType,
    estado: invoice.status,
    sucursal: invoice.branch?.name ?? "Sin sucursal",
    cliente: invoice.customer?.name ?? "Publico general",
    uuid: invoice.cfdiUuid ?? "",
    fecha: (invoice.issuedAt ?? invoice.createdAt).toISOString(),
    subtotal: moneyNumber(invoice.subtotal),
    impuestos: moneyNumber(invoice.taxTotal),
    total: moneyNumber(invoice.total),
  }));
}

async function resolveBranchIds(currentUser: AuthenticatedUser, branchId: string | null) {
  if (branchId) {
    await assertBranchAccess(currentUser, branchId);
    return [branchId];
  }
  const assignments = await getBranchAssignments(currentUser.id);
  const branchIds = assignments.map((assignment) => assignment.id);
  if (branchIds.length === 0) {
    throw new DomainError(403, "BRANCH_ACCESS_DENIED", "Usuario sin sucursales asignadas.");
  }
  return branchIds;
}

function parseExportQuery(input: unknown): ParsedExportQuery {
  const query = asLooseRecord(input);
  const from = optionalString(query.from) ?? new Date().toISOString().slice(0, 10);
  const to = optionalString(query.to) ?? from;
  const format = parseFormat(optionalString(query.format));
  dateRange(from, to);
  return {
    branchId: optionalString(query.branchId),
    from,
    to,
    format,
  };
}

function parseFormat(value: string | null): ExportFormat {
  if (!value || value === "csv") return "csv";
  if (value === "xlsx") return "xlsx";
  throw new DomainError(400, "INVALID_EXPORT_FORMAT", "Formato de exportacion invalido.");
}

function dateRange(fromText: string, toText: string) {
  const from = new Date(`${fromText}T00:00:00.000Z`);
  const to = new Date(`${toText}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new DomainError(400, "INVALID_DATE_RANGE", "Rango de fechas invalido.");
  }
  return { gte: from, lte: to };
}

function reportRows(reporte: string, points: Array<{ label: string; value: number }>): ReportExportRow[] {
  return points.map((point) => ({
    reporte,
    etiqueta: point.label,
    valor: point.value,
  }));
}

function renderExport<T extends Record<string, string | number>>(input: {
  basename: string;
  format: ExportFormat;
  headers: Array<keyof T>;
  rows: T[];
}): ExportDocument {
  if (input.format === "xlsx") {
    return {
      filename: `${input.basename}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: createXlsx(input.headers.map(String), input.rows.map((row) => input.headers.map((header) => row[header]))),
    };
  }
  return {
    filename: `${input.basename}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: createCsv(input.headers.map(String), input.rows.map((row) => input.headers.map((header) => row[header]))),
  };
}

function createCsv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number) {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function createXlsx(headers: string[], rows: Array<Array<string | number>>) {
  const sheetRows = [headers, ...rows].map((row, index) => xlsxRow(index + 1, row)).join("");
  const files = new Map<string, string | Buffer>([
    ["[Content_Types].xml", contentTypesXml()],
    ["_rels/.rels", rootRelsXml()],
    ["xl/workbook.xml", workbookXml()],
    ["xl/_rels/workbook.xml.rels", workbookRelsXml()],
    ["xl/worksheets/sheet1.xml", worksheetXml(sheetRows)],
  ]);
  return zip(files);
}

function xlsxRow(rowNumber: number, values: Array<string | number>) {
  const cells = values.map((value, index) => {
    const cellRef = `${columnName(index)}${rowNumber}`;
    if (typeof value === "number") {
      return `<c r="${cellRef}"><v>${value}</v></c>`;
    }
    return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
  });
  return `<row r="${rowNumber}">${cells.join("")}</row>`;
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function worksheetXml(rows: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

function workbookXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets></workbook>';
}

function workbookRelsXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
}

function rootRelsXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
}

function contentTypesXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
}

function zip(files: Map<string, string | Buffer>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function xmlEscape(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function asLooseRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new DomainError(400, "INVALID_REQUEST", "Campo string invalido.");
  return value.trim();
}

function moneyNumber(value: Prisma.Decimal | string | number) {
  return Number(Number(value).toFixed(2));
}
