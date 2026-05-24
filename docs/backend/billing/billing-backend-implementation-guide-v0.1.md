# Tortilla Plus — Billing Backend Implementation Guide V0.1

## 1. Propósito

Este documento define la guía práctica de implementación backend para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Debe usarse para construir:

```txt
módulo billing
módulo autofactura
módulo globales CFDI
módulo cancelación CFDI
adapter Facturapi
workers BullMQ
scheduler fiscal
almacenamiento XML
PDF bajo demanda
conciliación bancaria operativa
```

Este documento depende de:

```txt
billing-domain-technical-spec-v0.1.md
billing-erd-addendum-v0.1.md
billing-openapi-addendum-v0.1.md
billing-jobs-queues-scheduler-v0.1.md
```

---

## 2. Stack backend recomendado

```txt
Node.js 20+
TypeScript
NestJS o Fastify modular
Prisma
PostgreSQL
Redis
BullMQ
Facturapi SDK/API
Zod o class-validator
OpenAPI 3.0
Object storage para XML si aplica
```

### Nota

Si el backend actual usa Fastify puro, no migrar a Nest solo por billing.  
La prioridad es:

```txt
módulos claros
servicios aislados
provider adapter
jobs confiables
transacciones limpias
```

---

## 3. Objetivo técnico V1

Construir un módulo fiscal que:

```txt
clasifique ventas fiscalmente
genere QR autofactura
permita autofactura pública
timbre CFDI individual vía Facturapi
genere global diaria con confirmación gerente
genere global rezagados con confirmación gerente
cancele CFDI solo por gerente
guarde XML + metadata
genere PDF bajo demanda
registre auditoría
maneje retries
procese conciliación BBVA/MercadoPago/Clip
```

---

## 4. Principios obligatorios

### 4.1 POS desacoplado del PAC

El POS no debe llamar Facturapi.

```txt
POS → Sale completed → clasificación fiscal → respuesta inmediata
```

### 4.2 Adapter obligatorio

Todo provider fiscal debe pasar por:

```txt
BillingProvider
```

No usar SDK Facturapi directamente fuera del adapter.

### 4.3 Transacciones en cambios fiscales

Cambios críticos deben ser transaccionales:

```txt
sale fiscal_status
billing_receipt
billing_invoice
global_batch
audit_log
```

### 4.4 Idempotencia

Cada operación fiscal crítica debe ser idempotente.

### 4.5 XML persistente

El XML debe conservarse aunque el provider cambie.

### 4.6 PDF bajo demanda

El PDF no se almacena permanentemente en V1.

---

## 5. Estructura de carpetas recomendada

### Opción monolito modular

```txt
src/
  modules/
    billing/
      billing.module.ts
      billing.routes.ts
      billing.controller.ts
      billing.service.ts

      domain/
        billing.enums.ts
        billing.errors.ts
        billing.events.ts
        billing.types.ts
        fiscal-state-machine.ts
        fiscal-classifier.ts

      receipts/
        receipts.controller.ts
        receipts.service.ts
        receipts.repository.ts
        receipt-token.service.ts

      public/
        public-billing.controller.ts
        public-billing.service.ts
        tax-data.validator.ts

      invoices/
        invoices.controller.ts
        invoices.service.ts
        invoice-builder.service.ts
        invoice-documents.service.ts
        invoice-cancellation.service.ts

      global-batches/
        global-batches.controller.ts
        global-batches.service.ts
        global-batch-builder.service.ts

      providers/
        billing-provider.interface.ts
        provider-error.mapper.ts
        facturapi/
          facturapi.provider.ts
          facturapi.client.ts
          facturapi.mapper.ts
          facturapi.types.ts

      jobs/
        billing-queues.ts
        billing-job.types.ts
        processors/
          generate-individual-invoice.processor.ts
          retry-individual-invoice.processor.ts
          expire-receipts.processor.ts
          prepare-daily-global.processor.ts
          prepare-pending-global.processor.ts
          stamp-global-batch.processor.ts
          cancel-invoice.processor.ts
          generate-pdf.processor.ts
          provider-status-sync.processor.ts

      scheduler/
        billing-scheduler.service.ts
        scheduler-lock.service.ts

      audit/
        billing-audit.service.ts

      storage/
        xml-storage.service.ts
        pdf-on-demand.service.ts

      repositories/
        billing-entity.repository.ts
        billing-receipt.repository.ts
        billing-invoice.repository.ts
        billing-global-batch.repository.ts
        billing-provider-log.repository.ts

    reconciliation/
      reconciliation.module.ts
      reconciliation.controller.ts
      reconciliation.service.ts
      parsers/
        bbva.parser.ts
        mercadopago.parser.ts
        clip.parser.ts
      matching/
        reconciliation-matcher.service.ts
        scoring.service.ts
      jobs/
        process-reconciliation-import.processor.ts
```

---

## 6. Prisma implementation notes

### 6.1 Migraciones

Crear migraciones por fases:

```txt
001_billing_core
002_billing_global_batches
003_billing_jobs_audit_provider_logs
004_reconciliation
005_sales_billing_fields
006_sale_payments_reconciliation_fields
```

### 6.2 Decimal

Usar `Decimal` para:

```txt
amount
subtotal
tax_total
discount_total
total
quantity
unit_price
confidence_score
```

### 6.3 JSON

Usar `Json` para:

```txt
metadata
provider_response
request_payload_sanitized
response_payload_sanitized
match_reason
validation_errors
payload
```

### 6.4 Restricciones críticas

Implementar desde DB cuando sea posible:

```txt
billing_receipts.sale_id unique
billing_receipts.receipt_token unique
billing_invoices.uuid_sat unique
billing_provider_accounts.billing_entity_id + provider unique
billing_global_batch_sales.global_batch_id + sale_id unique
```

### 6.5 Restricciones que requieren lógica de servicio

Algunas reglas no conviene expresarlas solo en DB:

```txt
venta no puede ser individual y global al mismo tiempo
venta globalizada no puede autofacturarse
venta timbrada no puede devolverse
global batch debe revalidar ventas antes de timbrar
```

Implementarlas en servicios + transacciones.

---

## 7. Enums TypeScript oficiales

Crear archivo:

```txt
src/modules/billing/domain/billing.enums.ts
```

Contenido base:

```ts
export enum FiscalIntent {
  NO_INVOICE = 'no_invoice',
  CUSTOMER_INVOICE = 'customer_invoice',
  AUTO_CUSTOMER_INVOICE = 'auto_customer_invoice',
}

export enum SaleFiscalStatus {
  SALE_COMPLETED = 'sale_completed',
  ELIGIBLE_FOR_DAILY_GLOBAL = 'eligible_for_daily_global',
  PENDING_CUSTOMER_INVOICE = 'pending_customer_invoice',
  INVOICE_PROCESSING = 'invoice_processing',
  CUSTOMER_INVOICED = 'customer_invoiced',
  INVOICE_FAILED = 'invoice_failed',
  REQUIRES_MANUAL_REVIEW = 'requires_manual_review',
  EXPIRED_TO_PENDING_GLOBAL = 'expired_to_pending_global',
  INCLUDED_IN_GLOBAL = 'included_in_global',
  CFDI_CANCELLED = 'cfdi_cancelled',
  CANCELLED = 'cancelled',
}

export enum BillingReceiptStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum InvoiceRequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  STAMPED = 'stamped',
  FAILED_RETRYABLE = 'failed_retryable',
  FAILED_FINAL = 'failed_final',
  REQUIRES_MANUAL_REVIEW = 'requires_manual_review',
  CANCELLED = 'cancelled',
}

export enum BillingInvoiceType {
  INDIVIDUAL = 'individual',
  GLOBAL_DAILY = 'global_daily',
  GLOBAL_PENDING_PERIOD = 'global_pending_period',
}

export enum BillingInvoiceStatus {
  DRAFT = 'draft',
  STAMPING = 'stamping',
  STAMPED = 'stamped',
  STAMP_FAILED = 'stamp_failed',
  CANCEL_REQUESTED = 'cancel_requested',
  CANCELLED = 'cancelled',
  CANCEL_FAILED = 'cancel_failed',
}

export enum GlobalBatchType {
  DAILY = 'daily',
  PENDING_PERIOD = 'pending_period',
}

export enum GlobalBatchStatus {
  PREPARED = 'prepared',
  CONFIRMED = 'confirmed',
  STAMPING = 'stamping',
  STAMPED = 'stamped',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

---

## 8. Fiscal classifier

Crear:

```txt
src/modules/billing/domain/fiscal-classifier.ts
```

Responsabilidad:

```txt
recibir venta completada
detectar métodos de pago
detectar intención fiscal
asignar fiscal_intent
asignar fiscal_status
crear receipt si aplica
```

### Reglas

```txt
cash + no invoice → eligible_for_daily_global
cash + wants invoice → pending_customer_invoice + QR
card → pending_customer_invoice + QR automático
mixed with card → pending_customer_invoice + QR automático
mixed without card → depende de intención fiscal
credit/fiado → pending_customer_invoice por seguridad inicial
```

### Pseudocódigo

```ts
export function classifyFiscalSale(input: ClassifyFiscalSaleInput): FiscalClassification {
  if (input.hasCardPayment) {
    return {
      fiscalIntent: FiscalIntent.AUTO_CUSTOMER_INVOICE,
      fiscalStatus: SaleFiscalStatus.PENDING_CUSTOMER_INVOICE,
      requiresReceipt: true,
    };
  }

  if (input.customerWantsInvoice) {
    return {
      fiscalIntent: FiscalIntent.CUSTOMER_INVOICE,
      fiscalStatus: SaleFiscalStatus.PENDING_CUSTOMER_INVOICE,
      requiresReceipt: true,
    };
  }

  return {
    fiscalIntent: FiscalIntent.NO_INVOICE,
    fiscalStatus: SaleFiscalStatus.ELIGIBLE_FOR_DAILY_GLOBAL,
    requiresReceipt: false,
  };
}
```

---

## 9. Receipt token service

Crear:

```txt
src/modules/billing/receipts/receipt-token.service.ts
```

### Requisitos

```txt
token largo
no secuencial
no adivinable
único
seguro para URL
```

### Recomendación

```txt
crypto.randomBytes(32).toString('base64url')
```

### URL pública

```txt
https://factura.tortillaplus.mx/r/{receipt_token}
```

Internamente puede mapear a:

```txt
/public/billing/receipts/{token}
```

---

## 10. BillingProvider interface

Crear:

```txt
src/modules/billing/providers/billing-provider.interface.ts
```

```ts
export interface BillingProvider {
  createOrganization(input: CreateFiscalOrganizationInput): Promise<FiscalOrganizationResult>;
  uploadCertificate(input: UploadCertificateInput): Promise<CertificateResult>;

  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  createGlobalInvoice(input: CreateGlobalInvoiceInput): Promise<CreateInvoiceResult>;

  cancelInvoice(input: CancelInvoiceInput): Promise<CancelInvoiceResult>;

  getInvoiceXml(input: GetInvoiceDocumentInput): Promise<InvoiceXmlResult>;
  getInvoicePdf(input: GetInvoiceDocumentInput): Promise<InvoicePdfResult>;

  getInvoiceStatus(input: GetInvoiceStatusInput): Promise<InvoiceStatusResult>;
}
```

---

## 11. FacturapiProvider

Crear:

```txt
src/modules/billing/providers/facturapi/facturapi.provider.ts
```

### Responsabilidad

```txt
traducir modelos internos a Facturapi
llamar API/SDK
mapear errores
devolver resultados normalizados
registrar logs sanitizados
```

### No debe hacer

```txt
actualizar sales directamente
cambiar fiscal_status
decidir lifecycle
crear global batches
```

Eso pertenece a servicios de dominio.

### Métodos mínimos

```ts
createInvoice()
createGlobalInvoice()
cancelInvoice()
getInvoiceXml()
getInvoicePdf()
getInvoiceStatus()
```

---

## 12. Provider error mapper

Crear:

```txt
src/modules/billing/providers/provider-error.mapper.ts
```

### Error categories

```txt
provider_timeout
provider_unavailable
invalid_tax_data
certificate_error
rate_limited
duplicate_invoice
already_invoiced
already_globalized
receipt_expired
permission_denied
manual_review_required
unknown_provider_error
```

### Resultado normalizado

```ts
export type NormalizedProviderError = {
  category: BillingProviderErrorCategory;
  retryable: boolean;
  field?: string;
  providerCode?: string;
  message: string;
};
```

---

## 13. Public Billing Service

Crear:

```txt
src/modules/billing/public/public-billing.service.ts
```

### Métodos

```ts
getReceiptByToken(token: string)
submitInvoiceRequest(token: string, input: TaxDataRequest, context: PublicRequestContext)
getInvoiceStatus(token: string)
downloadXml(invoiceId: string, context: PublicDocumentContext)
downloadPdf(invoiceId: string, context: PublicDocumentContext)
```

### Flujo submitInvoiceRequest

```txt
1. Validar rate limit.
2. Buscar receipt por token.
3. Validar receipt active.
4. Validar sale pending_customer_invoice o invoice_failed.
5. Validar datos fiscales.
6. Crear billing_invoice_request.
7. Intentar timbrado inmediato.
8. Si OK, responder stamped.
9. Si timeout/retryable, encolar retry y responder 202.
10. Si invalid_tax_data, responder 422.
```

---

## 14. Invoice Service

Crear:

```txt
src/modules/billing/invoices/invoices.service.ts
```

### Responsabilidades

```txt
crear invoice individual
crear invoice global
guardar XML
guardar metadata
consultar facturas
cancelar facturas
descargar XML
generar PDF bajo demanda
```

### Métodos

```ts
generateIndividualInvoice(invoiceRequestId: string): Promise<InvoiceResult>
retryIndividualInvoice(invoiceRequestId: string, attempt: number): Promise<void>
generateGlobalInvoice(globalBatchId: string): Promise<InvoiceResult>
cancelInvoice(invoiceId: string, input: CancelInvoiceInput, user: AuthUser): Promise<void>
getXml(invoiceId: string): Promise<XmlDocument>
getPdf(invoiceId: string): Promise<PdfDocument>
```

---

## 15. Invoice Builder Service

Crear:

```txt
src/modules/billing/invoices/invoice-builder.service.ts
```

### Responsabilidad

Construir payload fiscal interno antes de enviarlo a provider.

Debe crear snapshots de:

```txt
productos
cantidades
precios
impuestos
receptor
emisor
uso CFDI
forma de pago
método de pago
```

### Reglas

```txt
No depender de precio actual del producto.
No modificar venta original.
No generar payload provider directamente.
```

---

## 16. Global Batch Service

Crear:

```txt
src/modules/billing/global-batches/global-batches.service.ts
```

### Métodos

```ts
previewDailyGlobal(branchId: string, operationalDate: string)
prepareDailyGlobal(branchId: string, operationalDate: string)
confirmDailyGlobal(batchId: string, user: AuthUser)

previewPendingGlobal(branchId: string, periodStart: string, periodEnd: string)
preparePendingGlobal(branchId: string, periodStart: string, periodEnd: string)
confirmPendingGlobal(batchId: string, user: AuthUser)

getGlobalBatch(batchId: string)
```

### Regla

`prepare` no timbra.

`confirm` encola:

```txt
billing.global.stamp
```

---

## 17. Global Batch Builder

Crear:

```txt
src/modules/billing/global-batches/global-batch-builder.service.ts
```

### Responsabilidad

Seleccionar ventas elegibles y generar snapshot.

### Daily

Incluir:

```txt
fiscal_status = eligible_for_daily_global
```

### Pending period

Incluir:

```txt
fiscal_status = expired_to_pending_global
```

### Revalidación

Antes de timbrar, volver a validar todas las ventas.

---

## 18. Cancellation Service

Crear:

```txt
src/modules/billing/invoices/invoice-cancellation.service.ts
```

### Reglas

```txt
solo gerente
satCancelReason obligatorio
internalReason obligatorio
evidenceUrl opcional
invoice.status debe ser stamped
```

### Flujo

```txt
1. Validar permisos.
2. Crear billing_invoice_cancellation.
3. Cambiar invoice.status=cancel_requested.
4. Encolar billing.invoice.cancel.
5. Registrar auditoría.
```

---

## 19. XML Storage Service

Crear:

```txt
src/modules/billing/storage/xml-storage.service.ts
```

### Opciones V1

```txt
local filesystem dev
S3/R2/MinIO producción
```

### Path recomendado

```txt
billing/{organizationId}/{billingEntityId}/{year}/{month}/{uuid}.xml
```

### Requisitos

```txt
hash SHA-256
content-type application/xml
no acceso público directo
descarga por endpoint autenticado/tokenizado
```

---

## 20. PDF On Demand Service

Crear:

```txt
src/modules/billing/storage/pdf-on-demand.service.ts
```

### Flujo

```txt
1. Validar invoice stamped.
2. Intentar obtener PDF provider.
3. Si se implementa generador local, generar desde XML.
4. Responder stream.
5. No persistir permanentemente.
```

### Cache opcional

```txt
cache memory/redis 15 min futuro
```

No requerido V1.

---

## 21. Provider Logs Repository

Cada llamada al provider debe registrar:

```txt
provider
operation
duration_ms
success
error_code
request_payload_sanitized
response_payload_sanitized
related_entity_type
related_entity_id
```

### Sanitización

Remover:

```txt
tokens
api keys
passwords
CSD raw
private key
```

---

## 22. Audit Service

Crear:

```txt
src/modules/billing/audit/billing-audit.service.ts
```

### Debe registrar

```txt
receipt.created
receipt.viewed
receipt.reprinted
receipt.resent
invoice.requested
invoice.stamped
invoice.failed
global_batch.prepared
global_batch.confirmed
global_batch.stamped
invoice.cancel_requested
invoice.cancelled
document.xml_downloaded
document.pdf_generated
```

### Regla

Para acciones críticas, escribir audit log dentro de la misma transacción.

---

## 23. Workers

### 23.1 Crear worker bootstrap

```txt
src/workers/billing.worker.ts
```

Debe registrar processors:

```txt
generate-individual-invoice
retry-individual-invoice
expire-receipts
prepare-daily-global-batch
prepare-pending-global-batch
stamp-global-batch
cancel-invoice
generate-pdf
provider-status-sync
process-reconciliation-import
```

### 23.2 Separación

V1 puede correr workers en mismo deploy.

Recomendado producción:

```txt
api process
worker process
scheduler process
```

---

## 24. Scheduler Service

Crear:

```txt
src/modules/billing/scheduler/billing-scheduler.service.ts
```

### Jobs programados

```txt
cada 5 min:
  retry jobs

diario 23:30:
  prepare daily global

diario 00:15:
  expire receipts

último día del mes 23:30:
  prepare pending global

diario 02:00:
  provider status sync
```

### Timezone

Usar:

```txt
organization.timezone || America/Mexico_City
```

### Lock

Evitar duplicados con:

```txt
lock:billing_scheduler:{organizationId}:{jobType}:{date}
```

---

## 25. Rate limiting

### 25.1 Portal público

Implementar por:

```txt
receipt_token
ip
```

Valores iniciales:

```txt
GET receipt: 20 por token por hora
POST invoice: 5 por token por hora
```

### 25.2 Manager

```txt
cancel invoice: 5 por usuario por hora
confirm global: 10 por branch por día
```

---

## 26. Reconciliation module

### 26.1 Estructura

```txt
src/modules/reconciliation/
  reconciliation.module.ts
  reconciliation.controller.ts
  reconciliation.service.ts
  parsers/
    bbva.parser.ts
    mercadopago.parser.ts
    clip.parser.ts
  matching/
    reconciliation-matcher.service.ts
    scoring.service.ts
```

### 26.2 Parser interface

```ts
export interface BankStatementParser {
  provider: ReconciliationProvider;
  parse(input: ParseStatementInput): Promise<ParsedBankMovement[]>;
}
```

### 26.3 Scoring

```txt
100 = monto exacto + referencia exacta
95 = monto exacto + autorización exacta
90 = monto exacto + hora dentro de 5 min
80 = monto exacto + terminal igual + fecha igual
75 = monto exacto + hora dentro de 30 min
<60 = no sugerir
```

### 26.4 Providers V1

```txt
BBVA
MercadoPago
Clip
```

No PDF.

---

## 27. Integration con Sales

### 27.1 Punto de integración

Al completar venta:

```txt
SalesService.completeSale()
→ BillingSaleHook.onSaleCompleted()
```

### 27.2 BillingSaleHook

Crear:

```txt
src/modules/billing/billing-sale-hook.service.ts
```

Responsabilidad:

```txt
clasificar fiscalmente
crear receipt si aplica
actualizar sale fiscal fields
registrar auditoría
emitir billing.receipt.created
```

### 27.3 Input esperado desde sales

```ts
type SaleCompletedForBilling = {
  saleId: string;
  organizationId: string;
  branchId: string;
  cashSessionId: string;
  userId: string;
  operationalDate: string;
  total: Decimal;
  payments: Array<{
    method: 'cash' | 'card' | 'transfer' | 'credit';
    amount: Decimal;
    terminalProvider?: string;
    terminalId?: string;
    cardReference?: string;
    authorizationCode?: string;
    cardLast4?: string;
  }>;
  customerWantsInvoice: boolean;
};
```

---

## 28. Integridad con Sales y Returns

### 28.1 Bloquear devolución si fiscalmente cerrada

En módulo de devoluciones/cancelaciones operativas:

```txt
if sale.fiscal_status in customer_invoiced, included_in_global:
  block
```

### 28.2 Bloquear edición crítica

Si:

```txt
sale.fiscal_locked_at != null
```

bloquear edición crítica.

---

## 29. Manager permissions

### 29.1 Cajero

```txt
receipt reprint limited
```

### 29.2 Gerente

```txt
confirm global
cancel invoice
full receipt recovery
manual review retry
reconciliation confirm/reject
```

### 29.3 Supervisor

No se permite cancelación CFDI en V1 si el usuario decidió solo gerente.

Puede tener lectura según configuración, pero no cancelación.

---

## 30. Environment variables

```env
BILLING_PROVIDER=facturapi
FACTURAPI_API_KEY=
FACTURAPI_ENV=sandbox

BILLING_PUBLIC_BASE_URL=https://factura.tortillaplus.mx

REDIS_URL=redis://localhost:6379

XML_STORAGE_DRIVER=local
XML_STORAGE_BUCKET=
XML_STORAGE_BASE_PATH=billing

BILLING_DEFAULT_TIMEZONE=America/Mexico_City
BILLING_DAILY_GLOBAL_PREPARE_TIME=23:30
BILLING_PENDING_GLOBAL_PREPARE_TIME=23:30
BILLING_RECEIPT_EXPIRATION_POLICY=end_of_month

BILLING_PUBLIC_RATE_LIMIT_LOOKUP_PER_HOUR=20
BILLING_PUBLIC_RATE_LIMIT_SUBMIT_PER_HOUR=5
```

---

## 31. Development order

### Fase 1 — Database + enums

```txt
[ ] Agregar enums
[ ] Agregar migraciones billing core
[ ] Agregar campos fiscal_status/fiscal_intent a sales
[ ] Agregar campos conciliación a sale_payments
```

### Fase 2 — Billing core domain

```txt
[ ] Fiscal classifier
[ ] Receipt token service
[ ] Receipt repository
[ ] Billing sale hook
[ ] Crear QR al completar venta
```

### Fase 3 — Public autofactura

```txt
[ ] GET receipt public
[ ] POST invoice request
[ ] Validaciones fiscales básicas
[ ] Rate limits
[ ] Estado invoice
```

### Fase 4 — Provider adapter

```txt
[ ] BillingProvider interface
[ ] Facturapi client
[ ] Facturapi mapper
[ ] Provider error mapper
[ ] Provider logs
```

### Fase 5 — Timbrado individual

```txt
[ ] generate individual invoice
[ ] XML storage
[ ] PDF on demand
[ ] retries
[ ] manual review
```

### Fase 6 — Global diaria

```txt
[ ] Preview
[ ] Prepare
[ ] Confirm
[ ] Stamp job
[ ] Revalidación ventas
```

### Fase 7 — Global rezagados

```txt
[ ] Receipt expiration
[ ] Prepare pending
[ ] Confirm pending
[ ] Stamp pending
```

### Fase 8 — Cancelación CFDI

```txt
[ ] Manager cancel endpoint
[ ] Required reasons
[ ] Evidence URL optional
[ ] Cancel job
[ ] Audit
```

### Fase 9 — Conciliación

```txt
[ ] Upload import
[ ] BBVA parser
[ ] MercadoPago parser
[ ] Clip parser
[ ] Matching score
[ ] Confirm/reject
```

### Fase 10 — QA + hardening

```txt
[ ] Unit tests
[ ] Integration tests
[ ] E2E billing
[ ] Provider sandbox tests
[ ] Rate limit tests
[ ] Idempotency tests
```

---

## 32. Testing strategy

### 32.1 Unit tests

```txt
Fiscal classifier
State machine transitions
Provider error mapper
Receipt expiration date calculation
Global batch sales selector
Reconciliation scoring
```

### 32.2 Integration tests

```txt
Sale completed creates receipt for card
Cash no invoice goes eligible_for_daily_global
POST invoice creates invoice_request
Provider timeout enqueues retry
Global daily prepare excludes QR pending
Cancel CFDI requires manager
```

### 32.3 E2E tests

```txt
Venta tarjeta → QR → autofactura → XML
Venta efectivo sin factura → global diaria
QR vencido → global rezagados
Cancelación CFDI con motivos
Conciliación CSV BBVA
```

### 32.4 Sandbox tests

```txt
Facturapi sandbox organization
Facturapi sandbox invoice
Facturapi sandbox cancellation
PDF request
XML request
```

---

## 33. QA checklist backend

```txt
[ ] POS no llama Facturapi
[ ] Card sale always creates QR
[ ] Cash no invoice goes daily global
[ ] Cash invoice creates QR
[ ] Receipt token non sequential
[ ] QR expires end of month
[ ] Expired QR blocks public invoice
[ ] Expired QR shows contact message
[ ] Individual invoice immediate success works
[ ] Provider timeout fallback queue works
[ ] Retry policy 1m/5m/15m/1h/6h works
[ ] After 5 retries manual review
[ ] XML stored persistently
[ ] PDF not stored permanently
[ ] Daily global requires manager confirmation
[ ] Pending global requires manager confirmation
[ ] Included global blocks autofactura
[ ] Stamped individual blocks global
[ ] Stamped sale blocks returns
[ ] Cancel CFDI only manager
[ ] Cancel requires SAT reason and internal reason
[ ] Evidence URL optional
[ ] Provider logs sanitized
[ ] Audit logs created
[ ] BBVA reconciliation import works
[ ] MercadoPago reconciliation import works
[ ] Clip reconciliation import works
```

---

## 34. Known risks

### 34.1 Facturapi coupling

Riesgo:

```txt
usar SDK directo en dominio
```

Mitigación:

```txt
BillingProvider adapter obligatorio
```

### 34.2 Doble timbrado

Riesgo:

```txt
cliente submit + global confirm concurrentes
```

Mitigación:

```txt
locks por sale
transacciones
revalidación antes de timbrar
```

### 34.3 Provider timeout con factura creada

Riesgo:

```txt
provider timeout, pero CFDI sí se creó
```

Mitigación:

```txt
idempotency key
provider-status-sync
manual review
```

### 34.4 Datos fiscales inválidos

Riesgo:

```txt
demasiados errores en portal
```

Mitigación:

```txt
validación previa
rate limit
corrección limitada
```

### 34.5 Global diaria olvidada

Riesgo:

```txt
gerente no confirma
```

Mitigación:

```txt
dashboard alert
notificación futura
manual review/report
```

---

## 35. Definition of Done técnico

```txt
[ ] Migraciones aplicadas
[ ] Enums sincronizados
[ ] BillingProvider interface implementada
[ ] FacturapiProvider implementado
[ ] BillingSaleHook integrado con Sales
[ ] Public autofactura implementada
[ ] Timbrado individual implementado
[ ] Retries implementados
[ ] XML storage implementado
[ ] PDF on demand implementado
[ ] Global diaria implementada
[ ] Global rezagados implementada
[ ] Cancelación implementada
[ ] Provider logs implementados
[ ] Audit logs implementados
[ ] Scheduler configurado
[ ] Workers configurados
[ ] Conciliación V1 implementada
[ ] QA mínimo aprobado
[ ] OpenAPI actualizado
```

---

## 36. Archivos esperados al terminar implementación

```txt
src/modules/billing/**
src/modules/reconciliation/**
src/workers/billing.worker.ts
src/scheduler/billing-scheduler.ts
prisma/migrations/*billing*
docs/backend/billing/*
openapi.yaml actualizado
```

---

## 37. Siguiente paso

Después de este documento, el equipo puede iniciar implementación por fases.

Orden recomendado de primer sprint:

```txt
1. Migraciones billing core
2. Enums
3. Fiscal classifier
4. Receipt token service
5. BillingSaleHook integrado al cierre de venta
6. Endpoint público GET receipt
```
