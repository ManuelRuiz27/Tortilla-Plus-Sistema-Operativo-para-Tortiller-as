# Tortilla Plus — Billing DTO Catalog V0.1

## 1. Propósito

Este documento define el catálogo de DTOs compartidos del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Debe servir como referencia para:

```txt
backend
frontend
OpenAPI
packages/api-contracts
QA
```

Ubicación recomendada:

```txt
docs/contracts/billing-dto-catalog-v0.1.md
```

---

## 2. Principios DTO

Los DTOs deben respetar estas reglas:

```txt
JSON en camelCase
enums en snake_case
IDs como string
dinero como string decimal
fechas ISO 8601
moneda MXN
estados explícitos
sin datos sensibles innecesarios
```

---

## 3. Convenciones base

## 3.1 Money

```ts
type Money = string;
// Formato: "86.00"
```

No usar number/float para montos.

---

## 3.2 Currency

```ts
type Currency = "MXN";
```

---

## 3.3 DateTime

```ts
type DateTime = string;
// ISO 8601: "2026-05-24T10:35:00-06:00"
```

---

## 3.4 DateOnly

```ts
type DateOnly = string;
// "2026-05-24"
```

---

## 3.5 MonthPeriod

```ts
type MonthPeriod = string;
// "2026-05"
```

---

## 4. Enums compartidos

## 4.1 UserRole

```ts
type UserRole =
  | "cashier"
  | "supervisor"
  | "manager";
```

---

## 4.2 PaymentMethod

```ts
type PaymentMethod =
  | "cash"
  | "card"
  | "mixed"
  | "credit";
```

---

## 4.3 FiscalIntent

```ts
type FiscalIntent =
  | "no_invoice"
  | "customer_invoice"
  | "auto_customer_invoice"
  | "daily_global"
  | "pending_global";
```

---

## 4.4 FiscalStatus

```ts
type FiscalStatus =
  | "no_invoice"
  | "eligible_for_daily_global"
  | "pending_customer_invoice"
  | "processing_invoice"
  | "customer_invoiced"
  | "requires_manual_review"
  | "expired"
  | "included_in_global"
  | "cancel_requested"
  | "cancelled";
```

---

## 4.5 ReceiptStatus

```ts
type ReceiptStatus =
  | "active"
  | "used"
  | "expired"
  | "cancelled"
  | "manual_review";
```

---

## 4.6 InvoiceStatus

```ts
type InvoiceStatus =
  | "draft"
  | "processing"
  | "stamped"
  | "failed"
  | "requires_manual_review"
  | "cancel_requested"
  | "cancel_processing"
  | "cancelled"
  | "cancel_failed";
```

---

## 4.7 InvoiceType

```ts
type InvoiceType =
  | "individual"
  | "global_daily"
  | "global_pending_period";
```

---

## 4.8 TicketTemplate

```ts
type TicketTemplate =
  | "ticket_simple"
  | "ticket_qr_autofactura"
  | "ticket_facturado"
  | "ticket_vencido"
  | "ticket_en_revision"
  | "ticket_pending_reference";
```

---

## 4.9 GlobalBatchStatus

```ts
type GlobalBatchStatus =
  | "not_prepared"
  | "prepared"
  | "confirmed"
  | "stamping"
  | "stamped"
  | "failed"
  | "requires_review";
```

---

## 4.10 ManualReviewStatus

```ts
type ManualReviewStatus =
  | "requires_manual_review"
  | "retry_scheduled"
  | "retrying"
  | "resolved"
  | "closed";
```

---

## 4.11 ReconciliationProvider

```ts
type ReconciliationProvider =
  | "bbva"
  | "mercadopago"
  | "clip"
  | "other";
```

---

## 4.12 ReconciliationStatus

```ts
type ReconciliationStatus =
  | "unmatched"
  | "matched"
  | "high_confidence"
  | "needs_review"
  | "duplicate_candidate"
  | "pending_reference"
  | "ignored"
  | "resolved";
```

---

## 4.13 ReconciliationImportStatus

```ts
type ReconciliationImportStatus =
  | "uploaded"
  | "processing"
  | "processed"
  | "processed_with_warnings"
  | "failed"
  | "cancelled";
```

---

## 4.14 ReconciliationIncidentType

```ts
type ReconciliationIncidentType =
  | "unmatched"
  | "duplicate_candidate"
  | "pending_reference"
  | "possible_cash_error"
  | "manual_review_required";
```

---

## 4.15 ReconciliationIncidentStatus

```ts
type ReconciliationIncidentStatus =
  | "open"
  | "in_review"
  | "resolved"
  | "ignored"
  | "closed";
```

---

## 4.16 ExportType

```ts
type ExportType =
  | "facturas_emitidas"
  | "xml_facturas"
  | "global_diaria"
  | "global_rezagados"
  | "ventas_fiscales"
  | "autofacturas_pendientes"
  | "manual_review"
  | "cancelaciones_cfdi"
  | "conciliacion"
  | "incidencias_conciliacion";
```

---

## 4.17 ExportFormat

```ts
type ExportFormat =
  | "csv"
  | "xlsx"
  | "zip";
```

---

## 4.18 ExportStatus

```ts
type ExportStatus =
  | "queued"
  | "processing"
  | "ready"
  | "failed"
  | "expired";
```

---

## 4.19 FiscalConfigStatus

```ts
type FiscalConfigStatus =
  | "draft"
  | "validating"
  | "ready"
  | "active"
  | "error"
  | "expired_certificates"
  | "provider_connection_error"
  | "test_stamp_failed";
```

---

## 5. DTOs base

## 5.1 Pagination

```ts
interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

---

## 5.2 ErrorResponse

```ts
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: ErrorDetail[];
}

interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}
```

---

## 5.3 Warning

```ts
interface Warning {
  code: string;
  message: string;
}
```

---

## 6. Permissions DTOs

## 6.1 UserPermissionsResponse

```ts
interface UserPermissionsResponse {
  data: {
    userId: string;
    role: UserRole;
    permissions: string[];
  };
}
```

---

## 6.2 BillingPermissionsResponse

```ts
interface BillingPermissionsResponse {
  data: {
    role: UserRole;
    modules: ModuleAccess[];
  };
}

interface ModuleAccess {
  module: string;
  access:
    | "allowed"
    | "denied"
    | "limited"
    | "requires_manager"
    | "requires_supervisor_or_manager";
  allowedActions: string[];
}
```

---

## 7. POS Sales DTOs

## 7.1 SaleItemInput

```ts
interface SaleItemInput {
  productId: string;
  name: string;
  quantity: string;
  unit: "kg" | "pza" | "paquete" | string;
  unitPrice: Money;
  total: Money;
}
```

---

## 7.2 SaleItem

```ts
interface SaleItem extends SaleItemInput {
  saleItemId: string;
}
```

---

## 7.3 PaymentInput

```ts
interface PaymentInput {
  method: PaymentMethod;
  amount: Money;
  provider?: "bbva" | "mercadopago" | "clip" | "other" | string;
  reference?: string | null;
  authorization?: string | null;
  last4?: string | null;
  terminalId?: string | null;
}
```

---

## 7.4 Payment

```ts
interface Payment extends PaymentInput {
  paymentId: string;
  reconciliationStatus?: ReconciliationStatus;
}
```

---

## 7.5 CreateSaleRequest

```ts
interface CreateSaleRequest {
  branchId: string;
  registerId: string;
  customerId?: string | null;
  items: SaleItemInput[];
  notes?: string | null;
}
```

---

## 7.6 CompleteSaleRequest

```ts
interface CompleteSaleRequest {
  payments: PaymentInput[];
  customerRequestedInvoice?: boolean | null;
  amountReceived?: Money;
}
```

`customerRequestedInvoice` solo aplica cuando el método de pago no obliga QR automático.

---

## 7.7 Sale

```ts
interface Sale {
  saleId: string;
  folio: string;
  branchId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  items: SaleItem[];
  payments: Payment[];
  subtotal: Money;
  tax: Money;
  total: Money;
  currency: Currency;
  fiscalIntent: FiscalIntent;
  fiscalStatus: FiscalStatus;
  createdAt: DateTime;
}
```

---

## 7.8 CompleteSaleResponse

```ts
interface CompleteSaleResponse {
  data: {
    sale: Sale;
    printRequired: boolean;
    printPayload?: PrintPayload;
    warnings?: Warning[];
  };
}
```

---

## 8. Print DTOs

## 8.1 PrintPayload

```ts
interface PrintPayload {
  template: TicketTemplate;
  folio: string;
  businessName: string;
  branchName: string;
  businessRfc?: string | null;
  cashierName: string;
  cashRegister: string;
  dateTime: DateTime;
  items: SaleItem[];
  payments: Payment[];
  total: Money;
  fiscal?: PrintFiscalData;
}
```

---

## 8.2 PrintFiscalData

```ts
interface PrintFiscalData {
  status: FiscalStatus;
  qrUrl?: string | null;
  deadline?: DateTime | null;
  invoiceUuid?: string | null;
  invoiceDate?: DateTime | null;
  reprintCount: number;
  showQr: boolean;
}
```

---

## 8.3 ReprintRequest

```ts
interface ReprintRequest {
  reason?: string | null;
}
```

---

## 9. Public Billing DTOs

## 9.1 PublicReceipt

```ts
interface PublicReceipt {
  receiptId: string;
  token: string;
  status: ReceiptStatus;
  folio: string;
  businessName: string;
  branchName: string;
  saleDate: DateTime;
  total: Money;
  currency: Currency;
  deadline: DateTime;
  canInvoice: boolean;
  contact?: PublicBusinessContact;
  items: SaleItem[];
  invoice?: PublicInvoiceSummary | null;
}
```

---

## 9.2 PublicBusinessContact

```ts
interface PublicBusinessContact {
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}
```

---

## 9.3 PublicInvoiceRequest

```ts
interface PublicInvoiceRequest {
  rfc: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  cfdiUse: string;
  email: string;
}
```

---

## 9.4 PublicInvoiceStatus

```ts
interface PublicInvoiceStatus {
  receiptId: string;
  invoiceId?: string | null;
  status: InvoiceStatus;
  message?: string;
  download?: InvoiceDownloadLinks;
}
```

---

## 9.5 PublicInvoiceSummary

```ts
interface PublicInvoiceSummary {
  invoiceId: string;
  status: InvoiceStatus;
  uuid?: string | null;
  stampedAt?: DateTime | null;
}
```

---

## 9.6 InvoiceDownloadLinks

```ts
interface InvoiceDownloadLinks {
  pdfUrl?: string | null;
  xmlUrl?: string | null;
}
```

---

## 10. Manager Billing DTOs

## 10.1 BillingMetric

```ts
interface BillingMetric {
  key: string;
  label: string;
  value: number;
  amount?: Money;
  targetRoute?: string;
}
```

---

## 10.2 BillingDashboardResponse

```ts
interface BillingDashboardResponse {
  data: {
    metrics: BillingMetric[];
  };
}
```

---

## 10.3 InvoiceListItem

```ts
interface InvoiceListItem {
  invoiceId: string;
  uuid: string;
  type: InvoiceType;
  status: InvoiceStatus;
  customerName?: string | null;
  customerRfc?: string | null;
  total: Money;
  stampedAt: DateTime;
}
```

---

## 10.4 InvoiceDetail

```ts
interface InvoiceDetail extends InvoiceListItem {
  saleId?: string | null;
  folio?: string | null;
  cfdiUse?: string | null;
  taxRegime?: string | null;
  subtotal: Money;
  tax: Money;
  availableActions: string[];
}
```

---

## 10.5 CancelInvoiceRequest

```ts
interface CancelInvoiceRequest {
  satReason: "01" | "02" | "03" | "04";
  internalReason: string;
  evidenceUrl?: string | null;
  replacementInvoiceUuid?: string | null;
}
```

---

## 10.6 CancelInvoiceResponse

```ts
interface CancelInvoiceResponse {
  data: {
    invoiceId: string;
    status: InvoiceStatus;
    message?: string;
  };
}
```

---

## 11. Global Invoice DTOs

## 11.1 PrepareGlobalRequest

```ts
interface PrepareGlobalRequest {
  branchId: string;
  businessDate: DateOnly;
}
```

---

## 11.2 PreparePendingPeriodGlobalRequest

```ts
interface PreparePendingPeriodGlobalRequest {
  branchId: string;
  period: MonthPeriod;
}
```

---

## 11.3 ConfirmGlobalRequest

```ts
interface ConfirmGlobalRequest {
  confirmationNote?: string | null;
}
```

---

## 11.4 GlobalBatchPreview

```ts
interface GlobalBatchPreview {
  branchId: string;
  businessDate?: DateOnly | null;
  period?: MonthPeriod | null;
  subtotal: Money;
  tax: Money;
  total: Money;
  includedSalesCount: number;
  excludedSalesCount: number;
  warnings: Warning[];
}
```

---

## 11.5 GlobalBatch

```ts
interface GlobalBatch {
  batchId: string;
  type: InvoiceType;
  status: GlobalBatchStatus;
  branchId: string;
  businessDate?: DateOnly | null;
  period?: MonthPeriod | null;
  subtotal: Money;
  tax: Money;
  total: Money;
  invoiceId?: string | null;
  uuid?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: DateTime | null;
}
```

---

## 12. Manual Review DTOs

## 12.1 ManualReviewCase

```ts
interface ManualReviewCase {
  caseId: string;
  saleId: string;
  folio: string;
  status: ManualReviewStatus;
  customerRfc?: string | null;
  customerName?: string | null;
  total: Money;
  attempts: number;
  lastErrorSummary?: string | null;
  editableFields: Array<"email" | "cfdiUse" | "postalCode">;
}
```

---

## 12.2 UpdateManualReviewRequest

```ts
interface UpdateManualReviewRequest {
  email?: string;
  cfdiUse?: string;
  postalCode?: string;
  reason?: string | null;
}
```

No incluir:

```txt
RFC
razón social
```

---

## 12.3 CloseManualReviewRequest

```ts
interface CloseManualReviewRequest {
  reason?: string | null;
}
```

---

## 13. Reconciliation DTOs

## 13.1 ReconciliationImportUploadRequest

```ts
interface ReconciliationImportUploadRequest {
  branchId: string;
  provider: ReconciliationProvider;
  period?: MonthPeriod;
  notes?: string | null;
  file: File;
}
```

Este DTO se envía como `multipart/form-data`.

---

## 13.2 ReconciliationImport

```ts
interface ReconciliationImport {
  importId: string;
  branchId: string;
  provider: ReconciliationProvider;
  status: ReconciliationImportStatus;
  period?: MonthPeriod | null;
  movementsCount: number;
  matchesCount: number;
  incidentsCount: number;
  uploadedAt: DateTime;
}
```

---

## 13.3 ReconciliationMovement

```ts
interface ReconciliationMovement {
  movementId: string;
  date: DateTime;
  amount: Money;
  provider: ReconciliationProvider;
  reference?: string | null;
  status: ReconciliationStatus;
  score?: number | null;
}
```

---

## 13.4 ReconciliationCandidate

```ts
interface ReconciliationCandidate {
  matchId: string;
  saleId: string;
  folio: string;
  saleTime: DateTime;
  amount: Money;
  cashierName: string;
  reference?: string | null;
  terminal?: string | null;
  score: number;
  scoreLabel: "alto" | "medio" | "bajo";
}
```

---

## 13.5 ConfirmMatchRequest

```ts
interface ConfirmMatchRequest {
  note?: string | null;
}
```

---

## 13.6 RejectMatchRequest

```ts
interface RejectMatchRequest {
  reason?: string | null;
}
```

---

## 13.7 ReconciliationIncident

```ts
interface ReconciliationIncident {
  incidentId: string;
  type: ReconciliationIncidentType;
  status: ReconciliationIncidentStatus;
  branchId: string;
  provider: ReconciliationProvider;
  amount: Money;
  reference?: string | null;
  score?: number | null;
  note?: string | null;
}
```

---

## 13.8 ResolveIncidentRequest

```ts
interface ResolveIncidentRequest {
  note?: string | null;
  reference?: string | null;
}
```

---

## 13.9 IgnoreIncidentRequest

```ts
interface IgnoreIncidentRequest {
  reason: string;
}
```

---

## 13.10 ManualSaleSearchRequest

```ts
interface ManualSaleSearchRequest {
  folio?: string;
  amount?: Money;
  reference?: string;
  last4?: string;
  branchId?: string;
}
```

---

## 14. Export DTOs

## 14.1 ExportTypeDefinition

```ts
interface ExportTypeDefinition {
  type: ExportType;
  formats: ExportFormat[];
}
```

---

## 14.2 CreateExportRequest

```ts
interface CreateExportRequest {
  type: ExportType;
  format: ExportFormat;
  filters: ExportFilters;
}
```

---

## 14.3 ExportFilters

```ts
interface ExportFilters {
  startDate: DateOnly;
  endDate: DateOnly;
  branchId?: string | null;
  status?: string | null;
}
```

---

## 14.4 ExportJob

```ts
interface ExportJob {
  exportJobId: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  fileName?: string | null;
  expiresAt?: DateTime | null;
  createdAt: DateTime;
}
```

---

## 15. Fiscal Settings DTOs

## 15.1 FiscalConfig

```ts
interface FiscalConfig {
  status: FiscalConfigStatus;
  rfc?: string | null;
  legalName?: string | null;
  taxRegime?: string | null;
  postalCode?: string | null;
  fiscalEmail?: string | null;
  provider: "facturapi" | string;
  checklist: FiscalConfigChecklistItem[];
}
```

---

## 15.2 FiscalConfigChecklistItem

```ts
interface FiscalConfigChecklistItem {
  key: string;
  label: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string | null;
}
```

---

## 15.3 UpdateFiscalConfigRequest

```ts
interface UpdateFiscalConfigRequest {
  rfc?: string;
  legalName?: string;
  taxRegime?: string;
  postalCode?: string;
  fiscalEmail?: string;
}
```

No exponer ni aceptar desde este DTO:

```txt
private key
password de CSD sin flujo seguro
API keys provider
secretos
```

---

## 15.4 FiscalConfigValidationResponse

```ts
interface FiscalConfigValidationResponse {
  data: {
    status: FiscalConfigStatus;
    checklist: FiscalConfigChecklistItem[];
  };
}
```

---

## 16. DTOs paginados

## 16.1 Patrón

```ts
interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
```

Aplicar a:

```txt
SaleSearchItem
InvoiceListItem
ManualReviewCase
ReconciliationImport
ReconciliationMovement
ReconciliationIncident
ExportJob
```

---

## 17. DTOs con acciones disponibles

Algunos recursos deben incluir:

```ts
availableActions: string[];
```

Aplicar a:

```txt
InvoiceDetail
ManualReviewCase cuando aplique
GlobalBatch cuando aplique
ReconciliationIncident cuando aplique
ExportJob cuando aplique
```

Motivo:

```txt
frontend no debe inferir permisos ni reglas de estado
```

---

## 18. DTOs no permitidos en V1

No crear DTOs para:

```txt
cliente con login fiscal
contador
roles personalizados
multi-RFC operativo
open banking token
subida de constancia fiscal
soporte/chat fiscal
pólizas contables
```

---

## 19. Relación con OpenAPI

El contrato OpenAPI debe reflejar estos DTOs en:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

La implementación puede generar tipos en:

```txt
packages/api-contracts/generated/
```

---

## 20. Checklist de consistencia

```txt
[ ] Todos los IDs son string.
[ ] Todos los montos son Money string.
[ ] Todas las fechas con hora son ISO 8601.
[ ] Los enums están en snake_case.
[ ] JSON usa camelCase.
[ ] No hay roles extra.
[ ] No hay DTOs de multi-RFC operativo.
[ ] No se exponen secretos fiscales.
[ ] Los estados son explícitos.
[ ] Los recursos críticos incluyen availableActions cuando aplique.
```

---

## 21. Siguiente documento

Después de este documento, generar:

```txt
billing-error-catalog-v0.1.md
```
