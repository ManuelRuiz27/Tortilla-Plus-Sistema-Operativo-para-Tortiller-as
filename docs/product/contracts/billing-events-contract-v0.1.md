# Tortilla Plus — Billing Events Contract V0.1

## 1. Propósito

Este documento define el contrato de eventos internos del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Debe servir como referencia para:

```txt
backend
workers
queues
scheduler
auditoría
observabilidad
QA
```

Ubicación recomendada:

```txt
docs/contracts/billing-events-contract-v0.1.md
```

---

## 2. Alcance

Este contrato cubre eventos internos relacionados con:

```txt
ventas POS
tickets QR
autofactura
facturas CFDI
global diaria
global rezagados
manual review
cancelaciones CFDI
conciliación bancaria
exportaciones
configuración fiscal
auditoría
```

No define:

```txt
endpoints HTTP
pantallas frontend
DDL de base de datos
implementación exacta de workers
```

---

## 3. Principio general

Los eventos deben ser:

```txt
explícitos
idempotentes
auditables
versionados
seguros
compatibles con colas
```

Los eventos no deben incluir secretos.

No incluir:

```txt
API keys
CSD private key
passwords
XML completo si no es necesario
payload crudo del provider
datos bancarios sensibles completos
```

---

## 4. Convención de nombres

Formato:

```txt
domain.entity.action
```

Ejemplos:

```txt
sales.sale.completed
billing.receipt.created
billing.invoice.requested
billing.invoice.stamped
billing.global.prepared
billing.reconciliation.match_confirmed
billing.export.ready
```

Usar snake_case en la acción cuando tenga más de una palabra.

---

## 5. Versionado de eventos

Cada evento debe incluir:

```txt
eventVersion
```

Formato:

```txt
1
```

Si cambia estructura incompatible:

```txt
eventVersion = 2
```

No romper consumidores existentes sin migración.

---

## 6. Envelope estándar

Todos los eventos deben usar este envelope.

```ts
interface DomainEvent<TPayload> {
  eventId: string;
  eventName: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  tenantId: string;
  branchId?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  payload: TPayload;
}
```

---

## 7. Campos del envelope

## 7.1 eventId

Identificador único del evento.

Uso:

```txt
idempotencia
trazabilidad
deduplicación
```

---

## 7.2 eventName

Nombre del evento.

Ejemplo:

```txt
billing.invoice.stamped
```

---

## 7.3 eventVersion

Versión del contrato del evento.

---

## 7.4 occurredAt

Fecha/hora en ISO 8601.

Ejemplo:

```txt
2026-05-24T10:35:00-06:00
```

---

## 7.5 producer

Servicio que produjo el evento.

Ejemplos:

```txt
api
billing-worker
reconciliation-worker
export-worker
scheduler
```

---

## 7.6 tenantId

Organización/negocio dueño del evento.

---

## 7.7 branchId

Sucursal asociada si aplica.

Puede ser null para eventos corporativos o SaaS.

---

## 7.8 correlationId

ID para agrupar una operación completa.

Ejemplo:

```txt
venta → receipt → invoice request → invoice stamped
```

---

## 7.9 causationId

ID del evento/comando que causó este evento.

---

## 7.10 idempotencyKey

Clave de idempotencia si la operación vino de una acción idempotente.

---

# 8. Eventos POS / Sales

## 8.1 sales.sale.created

Se emite cuando se crea una venta en borrador.

Payload:

```ts
interface SaleCreatedPayload {
  saleId: string;
  folio: string;
  branchId: string;
  registerId: string;
  cashierId: string;
  total: string;
  currency: "MXN";
  createdAt: string;
}
```

Consumidores posibles:

```txt
audit
analytics
pos-sync
```

---

## 8.2 sales.sale.completed

Se emite cuando la venta queda completada.

Payload:

```ts
interface SaleCompletedPayload {
  saleId: string;
  folio: string;
  branchId: string;
  registerId: string;
  cashierId: string;
  total: string;
  currency: "MXN";
  paymentMethods: string[];
  fiscalIntent: string;
  fiscalStatus: string;
  completedAt: string;
}
```

Consumidores:

```txt
billing
inventory
cash-session
audit
analytics
reconciliation
```

---

## 8.3 sales.sale.completed_with_pending_reference

Se emite cuando una venta con tarjeta fue completada sin referencia.

Payload:

```ts
interface SaleCompletedWithPendingReferencePayload {
  saleId: string;
  folio: string;
  branchId: string;
  registerId: string;
  cashierId: string;
  total: string;
  provider?: string | null;
  paymentId: string;
  occurredAt: string;
}
```

Consumidores:

```txt
reconciliation
audit
manager-dashboard
```

---

## 8.4 sales.ticket.reprinted

Se emite cuando se reimprime un ticket.

Payload:

```ts
interface TicketReprintedPayload {
  saleId: string;
  receiptId?: string | null;
  folio: string;
  branchId: string;
  registerId: string;
  userId: string;
  role: string;
  reprintCount: number;
  reason?: string | null;
  reprintedAt: string;
}
```

Consumidores:

```txt
audit
pos
manager-dashboard
```

---

# 9. Eventos Receipt / QR

## 9.1 billing.receipt.created

Se emite cuando se crea un receipt QR de autofactura.

Payload:

```ts
interface ReceiptCreatedPayload {
  receiptId: string;
  saleId: string;
  folio: string;
  branchId: string;
  tokenHash: string;
  status: "active";
  deadlineAt: string;
  createdAt: string;
}
```

Nota:

```txt
No emitir token crudo si no es necesario.
Preferir tokenHash para auditoría.
```

Consumidores:

```txt
audit
manager-dashboard
public-billing
```

---

## 9.2 billing.receipt.expired

Se emite cuando vence un receipt QR.

Payload:

```ts
interface ReceiptExpiredPayload {
  receiptId: string;
  saleId: string;
  folio: string;
  branchId: string;
  deadlineAt: string;
  expiredAt: string;
}
```

Consumidores:

```txt
global-pending-scheduler
manager-dashboard
audit
```

---

## 9.3 billing.receipt.used

Se emite cuando un receipt se usa exitosamente para facturar.

Payload:

```ts
interface ReceiptUsedPayload {
  receiptId: string;
  saleId: string;
  invoiceId: string;
  folio: string;
  branchId: string;
  usedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
global-exclusion
```

---

# 10. Eventos Autofactura / Invoice

## 10.1 billing.invoice.requested

Se emite cuando un cliente solicita factura desde el portal público.

Payload:

```ts
interface InvoiceRequestedPayload {
  invoiceRequestId: string;
  receiptId: string;
  saleId: string;
  folio: string;
  branchId: string;
  customerRfc: string;
  customerName: string;
  cfdiUse: string;
  taxRegime: string;
  postalCode: string;
  email: string;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
manager-dashboard
```

---

## 10.2 billing.invoice.processing_started

Se emite cuando inicia el intento de timbrado.

Payload:

```ts
interface InvoiceProcessingStartedPayload {
  invoiceRequestId: string;
  saleId: string;
  receiptId?: string | null;
  branchId: string;
  attempt: number;
  provider: "facturapi" | string;
  startedAt: string;
}
```

Consumidores:

```txt
audit
observability
public-status
```

---

## 10.3 billing.invoice.stamped

Se emite cuando se timbra una factura individual.

Payload:

```ts
interface InvoiceStampedPayload {
  invoiceId: string;
  invoiceRequestId?: string | null;
  saleId?: string | null;
  receiptId?: string | null;
  branchId: string;
  uuid: string;
  type: "individual" | "global_daily" | "global_pending_period";
  subtotal: string;
  tax: string;
  total: string;
  currency: "MXN";
  stampedAt: string;
}
```

Consumidores:

```txt
audit
public-status
manager-dashboard
exports
global-exclusion
storage
```

---

## 10.4 billing.invoice.failed

Se emite cuando falla un intento de timbrado.

Payload:

```ts
interface InvoiceFailedPayload {
  invoiceRequestId: string;
  saleId?: string | null;
  receiptId?: string | null;
  branchId: string;
  attempt: number;
  maxAttempts: number;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  failedAt: string;
}
```

Consumidores:

```txt
retry-worker
audit
observability
manual-review
public-status
```

---

## 10.5 billing.invoice.retry_scheduled

Se emite cuando se agenda un retry.

Payload:

```ts
interface InvoiceRetryScheduledPayload {
  invoiceRequestId: string;
  branchId: string;
  nextAttempt: number;
  maxAttempts: number;
  scheduledAt: string;
  runAt: string;
  reason: string;
}
```

Consumidores:

```txt
billing-worker
observability
audit
```

---

## 10.6 billing.invoice.manual_review_required

Se emite cuando se agotan reintentos o se requiere revisión.

Payload:

```ts
interface InvoiceManualReviewRequiredPayload {
  manualReviewCaseId: string;
  invoiceRequestId?: string | null;
  saleId?: string | null;
  receiptId?: string | null;
  branchId: string;
  folio?: string | null;
  attempts: number;
  lastErrorCode: string;
  lastErrorSummary: string;
  requiredAt: string;
}
```

Consumidores:

```txt
manual-review
manager-dashboard
audit
public-status
```

---

# 11. Eventos Manual Review

## 11.1 billing.manual_review.updated

Se emite cuando el gerente corrige un campo permitido.

Payload:

```ts
interface ManualReviewUpdatedPayload {
  manualReviewCaseId: string;
  branchId: string;
  updatedBy: string;
  updatedFields: string[];
  reason?: string | null;
  updatedAt: string;
}
```

Consumidores:

```txt
audit
manual-review
```

No incluir valores sensibles si no es necesario.

---

## 11.2 billing.manual_review.retry_requested

Se emite cuando el gerente solicita reintento.

Payload:

```ts
interface ManualReviewRetryRequestedPayload {
  manualReviewCaseId: string;
  invoiceRequestId: string;
  branchId: string;
  requestedBy: string;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
manager-dashboard
```

---

## 11.3 billing.manual_review.resolved

Se emite cuando el caso queda resuelto.

Payload:

```ts
interface ManualReviewResolvedPayload {
  manualReviewCaseId: string;
  invoiceId?: string | null;
  branchId: string;
  resolvedBy?: string | null;
  resolvedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
public-status
```

---

## 11.4 billing.manual_review.closed

Se emite cuando un caso se cierra sin timbrado.

Payload:

```ts
interface ManualReviewClosedPayload {
  manualReviewCaseId: string;
  branchId: string;
  closedBy: string;
  reason?: string | null;
  closedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
```

---

# 12. Eventos Globales

## 12.1 billing.global.daily.prepared

Se emite cuando se prepara la global diaria.

Payload:

```ts
interface DailyGlobalPreparedPayload {
  batchId: string;
  branchId: string;
  businessDate: string;
  includedSalesCount: number;
  excludedSalesCount: number;
  subtotal: string;
  tax: string;
  total: string;
  warningsCount: number;
  preparedAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
```

---

## 12.2 billing.global.daily.confirmed

Se emite cuando el gerente confirma timbrado de global diaria.

Payload:

```ts
interface DailyGlobalConfirmedPayload {
  batchId: string;
  branchId: string;
  businessDate: string;
  confirmedBy: string;
  confirmedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
manager-dashboard
```

---

## 12.3 billing.global.pending_period.prepared

Se emite cuando se prepara global de rezagados.

Payload:

```ts
interface PendingPeriodGlobalPreparedPayload {
  batchId: string;
  branchId: string;
  period: string;
  includedSalesCount: number;
  subtotal: string;
  tax: string;
  total: string;
  warningsCount: number;
  preparedAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
```

---

## 12.4 billing.global.pending_period.confirmed

Se emite cuando el gerente confirma global de rezagados.

Payload:

```ts
interface PendingPeriodGlobalConfirmedPayload {
  batchId: string;
  branchId: string;
  period: string;
  confirmedBy: string;
  confirmedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
manager-dashboard
```

---

## 12.5 billing.global.stamped

Se emite cuando una global queda timbrada.

Payload:

```ts
interface GlobalStampedPayload {
  batchId: string;
  invoiceId: string;
  branchId: string;
  type: "global_daily" | "global_pending_period";
  uuid: string;
  subtotal: string;
  tax: string;
  total: string;
  stampedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
exports
storage
```

---

## 12.6 billing.global.failed

Se emite cuando falla el timbrado de una global.

Payload:

```ts
interface GlobalFailedPayload {
  batchId: string;
  branchId: string;
  type: "global_daily" | "global_pending_period";
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  failedAt: string;
}
```

Consumidores:

```txt
manual-review
manager-dashboard
audit
observability
```

---

# 13. Eventos Cancelación CFDI

## 13.1 billing.invoice.cancel_requested

Se emite cuando el gerente solicita cancelación.

Payload:

```ts
interface InvoiceCancelRequestedPayload {
  invoiceId: string;
  branchId: string;
  uuid: string;
  requestedBy: string;
  satReason: "01" | "02" | "03" | "04";
  internalReason: string;
  evidenceUrl?: string | null;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
manager-dashboard
```

---

## 13.2 billing.invoice.cancelled

Se emite cuando el CFDI queda cancelado.

Payload:

```ts
interface InvoiceCancelledPayload {
  invoiceId: string;
  branchId: string;
  uuid: string;
  cancelledAt: string;
  provider: "facturapi" | string;
}
```

Consumidores:

```txt
audit
manager-dashboard
exports
```

---

## 13.3 billing.invoice.cancel_failed

Se emite cuando falla cancelación.

Payload:

```ts
interface InvoiceCancelFailedPayload {
  invoiceId: string;
  branchId: string;
  uuid: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
  failedAt: string;
}
```

Consumidores:

```txt
manual-review
manager-dashboard
audit
observability
```

---

# 14. Eventos Conciliación

## 14.1 billing.reconciliation.import_uploaded

Se emite cuando se sube archivo de conciliación.

Payload:

```ts
interface ReconciliationImportUploadedPayload {
  importId: string;
  branchId: string;
  provider: "bbva" | "mercadopago" | "clip" | "other";
  period?: string | null;
  uploadedBy: string;
  uploadedAt: string;
}
```

Consumidores:

```txt
reconciliation-worker
audit
```

---

## 14.2 billing.reconciliation.import_processed

Se emite cuando termina procesamiento de archivo.

Payload:

```ts
interface ReconciliationImportProcessedPayload {
  importId: string;
  branchId: string;
  provider: string;
  movementsCount: number;
  matchesCount: number;
  incidentsCount: number;
  status: "processed" | "processed_with_warnings" | "failed";
  processedAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
observability
```

---

## 14.3 billing.reconciliation.match_suggested

Se emite cuando el sistema genera candidato de match.

Payload:

```ts
interface ReconciliationMatchSuggestedPayload {
  matchId: string;
  movementId: string;
  saleId: string;
  branchId: string;
  score: number;
  reasonCodes: string[];
  suggestedAt: string;
}
```

Consumidores:

```txt
audit
reconciliation-ui
```

---

## 14.4 billing.reconciliation.match_confirmed

Se emite cuando usuario confirma match.

Payload:

```ts
interface ReconciliationMatchConfirmedPayload {
  matchId: string;
  movementId: string;
  saleId: string;
  branchId: string;
  score: number;
  confirmedBy: string;
  confirmedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
cash-session
```

---

## 14.5 billing.reconciliation.match_rejected

Se emite cuando usuario rechaza match.

Payload:

```ts
interface ReconciliationMatchRejectedPayload {
  matchId: string;
  movementId: string;
  saleId?: string | null;
  branchId: string;
  rejectedBy: string;
  reason?: string | null;
  rejectedAt: string;
}
```

Consumidores:

```txt
audit
reconciliation
```

---

## 14.6 billing.reconciliation.incident_created

Se emite cuando se crea una incidencia.

Payload:

```ts
interface ReconciliationIncidentCreatedPayload {
  incidentId: string;
  branchId: string;
  type:
    | "unmatched"
    | "duplicate_candidate"
    | "pending_reference"
    | "possible_cash_error"
    | "manual_review_required";
  amount?: string | null;
  reference?: string | null;
  createdAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
```

---

## 14.7 billing.reconciliation.incident_resolved

Se emite cuando se resuelve una incidencia.

Payload:

```ts
interface ReconciliationIncidentResolvedPayload {
  incidentId: string;
  branchId: string;
  type: string;
  resolvedBy: string;
  resolvedAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
```

---

## 14.8 billing.reconciliation.incident_ignored

Se emite cuando gerente ignora incidencia.

Payload:

```ts
interface ReconciliationIncidentIgnoredPayload {
  incidentId: string;
  branchId: string;
  type: string;
  ignoredBy: string;
  reason: string;
  ignoredAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
```

---

# 15. Eventos Exportaciones

## 15.1 billing.export.requested

Se emite cuando gerente solicita exportación.

Payload:

```ts
interface ExportRequestedPayload {
  exportJobId: string;
  branchId?: string | null;
  type: string;
  format: string;
  requestedBy: string;
  filters: Record<string, unknown>;
  requestedAt: string;
}
```

Consumidores:

```txt
export-worker
audit
```

---

## 15.2 billing.export.processing_started

Se emite cuando worker inicia generación.

Payload:

```ts
interface ExportProcessingStartedPayload {
  exportJobId: string;
  type: string;
  format: string;
  startedAt: string;
}
```

Consumidores:

```txt
observability
audit
```

---

## 15.3 billing.export.ready

Se emite cuando exportación queda lista.

Payload:

```ts
interface ExportReadyPayload {
  exportJobId: string;
  type: string;
  format: string;
  fileName: string;
  expiresAt: string;
  readyAt: string;
}
```

Consumidores:

```txt
manager-ui
audit
```

---

## 15.4 billing.export.failed

Se emite cuando falla exportación.

Payload:

```ts
interface ExportFailedPayload {
  exportJobId: string;
  type: string;
  format: string;
  errorCode: string;
  errorMessage: string;
  failedAt: string;
}
```

Consumidores:

```txt
manager-ui
audit
observability
```

---

## 15.5 billing.export.downloaded

Se emite cuando usuario descarga archivo.

Payload:

```ts
interface ExportDownloadedPayload {
  exportJobId: string;
  downloadedBy: string;
  downloadedAt: string;
}
```

Consumidores:

```txt
audit
```

---

# 16. Eventos Configuración Fiscal

## 16.1 billing.config.updated

Se emite cuando gerente actualiza configuración fiscal.

Payload:

```ts
interface BillingConfigUpdatedPayload {
  tenantId: string;
  branchId?: string | null;
  updatedBy: string;
  updatedFields: string[];
  updatedAt: string;
}
```

Consumidores:

```txt
audit
manager-dashboard
```

No incluir secretos.

---

## 16.2 billing.config.validation_started

Se emite cuando inicia validación fiscal.

Payload:

```ts
interface BillingConfigValidationStartedPayload {
  tenantId: string;
  branchId?: string | null;
  requestedBy: string;
  provider: "facturapi" | string;
  startedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
observability
```

---

## 16.3 billing.config.validation_completed

Se emite cuando termina validación fiscal.

Payload:

```ts
interface BillingConfigValidationCompletedPayload {
  tenantId: string;
  branchId?: string | null;
  status:
    | "ready"
    | "error"
    | "expired_certificates"
    | "provider_connection_error"
    | "test_stamp_failed";
  checklist: Array<{
    key: string;
    status: "passed" | "failed";
  }>;
  completedAt: string;
}
```

Consumidores:

```txt
manager-ui
audit
observability
```

---

## 16.4 billing.config.activated

Se emite cuando la facturación queda activa.

Payload:

```ts
interface BillingConfigActivatedPayload {
  tenantId: string;
  branchId?: string | null;
  activatedBy: string;
  activatedAt: string;
}
```

Consumidores:

```txt
manager-dashboard
audit
```

---

# 17. Eventos Auditoría

## 17.1 billing.audit.recorded

Evento opcional si se centraliza auditoría por bus.

Payload:

```ts
interface BillingAuditRecordedPayload {
  auditLogId: string;
  userId: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  registerId?: string | null;
  recordedAt: string;
}
```

Consumidores:

```txt
audit-service
compliance
observability
```

---

# 18. Eventos Scheduler

## 18.1 billing.scheduler.daily_global_prepare_requested

Se emite cuando el scheduler solicita preparar global diaria.

Payload:

```ts
interface DailyGlobalPrepareRequestedPayload {
  tenantId: string;
  branchId: string;
  businessDate: string;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
```

---

## 18.2 billing.scheduler.receipts_expiration_requested

Se emite cuando el scheduler solicita expirar receipts vencidos.

Payload:

```ts
interface ReceiptsExpirationRequestedPayload {
  tenantId: string;
  branchId?: string | null;
  cutoffAt: string;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
```

---

## 18.3 billing.scheduler.pending_global_prepare_requested

Se emite cuando el scheduler solicita preparar global de rezagados.

Payload:

```ts
interface PendingGlobalPrepareRequestedPayload {
  tenantId: string;
  branchId: string;
  period: string;
  requestedAt: string;
}
```

Consumidores:

```txt
billing-worker
audit
```

---

# 19. Idempotencia y deduplicación

Los consumidores deben usar:

```txt
eventId
idempotencyKey
correlationId
```

Regla:

```txt
un mismo eventId no debe procesarse dos veces
```

Si el handler no puede garantizar exactamente una vez, debe ser idempotente.

---

## 20. Reintentos

Eventos que disparan trabajo asíncrono deben tolerar retry.

Aplica a:

```txt
billing.invoice.requested
billing.invoice.retry_scheduled
billing.global.daily.confirmed
billing.global.pending_period.confirmed
billing.invoice.cancel_requested
billing.reconciliation.import_uploaded
billing.export.requested
billing.config.validation_started
```

---

## 21. Dead Letter Queue

Eventos fallidos después de máximo de intentos deben ir a DLQ.

Debe registrarse:

```txt
eventId
eventName
payload resumido
errorCode
errorMessage
attempts
failedAt
```

No guardar secretos en DLQ.

---

## 22. Correlation IDs recomendados

Ejemplos:

```txt
sale.completed → receipt.created
receipt.created → invoice.requested
invoice.requested → invoice.stamped
global.confirmed → global.stamped
reconciliation.import_uploaded → reconciliation.import_processed
export.requested → export.ready
```

Mantener el mismo `correlationId` en el flujo completo.

---

## 23. Seguridad de payload

No emitir:

```txt
CSD key
CSD password
Facturapi API key
token crudo de autofactura
XML completo salvo evento específico interno
datos completos de tarjeta
logs crudos
```

Si se necesita referenciar archivo:

```txt
usar storageKey
usar documentId
usar invoiceId
```

---

## 24. Observabilidad

Cada evento procesado debe permitir medir:

```txt
latencia
estado
reintentos
fallos
DLQ
tiempo entre solicitud y timbrado
tiempo entre export.requested y export.ready
```

---

## 25. Eventos mínimos obligatorios V1

Para V1, no todos los eventos listados son igualmente prioritarios.

Mínimos obligatorios:

```txt
sales.sale.completed
sales.sale.completed_with_pending_reference
billing.receipt.created
billing.receipt.expired
billing.invoice.requested
billing.invoice.stamped
billing.invoice.failed
billing.invoice.manual_review_required
billing.global.daily.prepared
billing.global.daily.confirmed
billing.global.stamped
billing.invoice.cancel_requested
billing.invoice.cancelled
billing.reconciliation.import_uploaded
billing.reconciliation.import_processed
billing.reconciliation.match_confirmed
billing.reconciliation.incident_created
billing.export.requested
billing.export.ready
billing.config.validation_completed
```

---

## 26. Eventos fuera de alcance V1

No definir todavía eventos para:

```txt
multi-RFC operativo
open banking conectado
contador externo
portal cliente con login
pólizas contables
declaraciones fiscales
```

---

## 27. QA de eventos

```txt
[ ] Cada evento tiene eventId único.
[ ] Cada evento tiene eventName.
[ ] Cada evento tiene eventVersion.
[ ] Cada evento tiene occurredAt.
[ ] Cada evento tiene tenantId.
[ ] Eventos por sucursal incluyen branchId.
[ ] No se emiten secretos.
[ ] Handlers son idempotentes.
[ ] Eventos críticos tienen correlationId.
[ ] Fallos llegan a DLQ.
[ ] invoice.requested dispara worker.
[ ] invoice.failed agenda retry.
[ ] retry agotado genera manual_review_required.
[ ] global.confirmed dispara timbrado.
[ ] export.requested dispara worker.
[ ] reconciliation.import_uploaded dispara procesamiento.
```

---

## 28. Relación con otros documentos

OpenAPI:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

Convenciones API:

```txt
docs/contracts/billing-api-conventions-v0.1.md
```

DTO catalog:

```txt
docs/contracts/billing-dto-catalog-v0.1.md
```

Error catalog:

```txt
docs/contracts/billing-error-catalog-v0.1.md
```

Backend jobs/queues:

```txt
docs/backend/billing/
```

---

## 29. Cierre del bloque contracts

Con este documento, el bloque:

```txt
docs/contracts/
```

queda completo para V0.1 con:

```txt
billing-contracts-handoff-index-v0.1.md
billing-openapi-v0.1.yaml
billing-api-conventions-v0.1.md
billing-dto-catalog-v0.1.md
billing-error-catalog-v0.1.md
billing-events-contract-v0.1.md
```
