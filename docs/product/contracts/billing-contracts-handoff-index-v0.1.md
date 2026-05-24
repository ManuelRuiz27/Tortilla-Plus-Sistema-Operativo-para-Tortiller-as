# Tortilla Plus — Billing Contracts Handoff Index V0.1

## 1. Propósito

Este documento es el índice de entrega para los contratos técnicos del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Su función es ordenar los contratos que deben usar backend, frontend y QA para implementar e integrar:

```txt
ventas fiscales
tickets QR
portal público de autofactura
facturas
global diaria
global rezagados
manual review
cancelaciones CFDI
conciliación bancaria
exportaciones
roles/permisos
```

Ubicación recomendada:

```txt
docs/contracts/billing-contracts-handoff-index-v0.1.md
```

---

## 2. Alcance del bloque contracts

Este bloque define contratos de comunicación y estructuras compartidas.

No define:

```txt
pantallas
diseño UI
reglas de negocio narrativas
implementación interna de jobs
DDL final de base de datos
```

Esos temas viven en:

```txt
docs/frontend/billing/
docs/backend/billing/
docs/product/billing/
```

---

## 3. Estructura recomendada

```txt
docs/contracts/
├─ billing-contracts-handoff-index-v0.1.md
├─ billing-openapi-v0.1.yaml
├─ billing-api-conventions-v0.1.md
├─ billing-dto-catalog-v0.1.md
├─ billing-error-catalog-v0.1.md
└─ billing-events-contract-v0.1.md
```

---

## 4. Orden obligatorio de lectura

### 1. billing-contracts-handoff-index-v0.1.md

Índice de contratos.

Define:

```txt
qué contratos existen
qué documento es dueño de cada tema
cómo debe consumirlos frontend/backend
```

---

### 2. billing-openapi-v0.1.yaml

Contrato principal HTTP.

Debe incluir endpoints para:

```txt
POS sales
public billing portal
manager billing
global invoices
manual review
cancellations
reconciliation
exports
```

Este archivo será la fuente para generar clientes tipados en:

```txt
packages/api-contracts/
```

---

### 3. billing-api-conventions-v0.1.md

Convenciones generales de API.

Debe definir:

```txt
nombres de rutas
paginación
filtros
ordenamiento
errores
fechas
moneda
permisos
idempotencia
```

---

### 4. billing-dto-catalog-v0.1.md

Catálogo de DTOs compartidos.

Debe definir estructuras de:

```txt
Sale
Payment
FiscalReceipt
Invoice
GlobalBatch
ManualReviewCase
ReconciliationImport
ReconciliationIncident
ExportJob
Permission
```

---

### 5. billing-error-catalog-v0.1.md

Catálogo de errores.

Debe definir errores esperados para:

```txt
validación
permisos
QR vencido
factura ya emitida
provider fiscal caído
manual review
conciliación
exportaciones
```

---

### 6. billing-events-contract-v0.1.md

Contrato de eventos internos.

Debe definir eventos para:

```txt
sale.completed
receipt.created
invoice.requested
invoice.stamped
invoice.failed
invoice.manual_review_required
global.prepared
global.stamped
reconciliation.import_processed
reconciliation.match_confirmed
export.ready
```

---

## 5. Relación con monorepo

Contratos deben alimentar:

```txt
packages/api-contracts/
```

Estructura recomendada:

```txt
packages/api-contracts/
├─ openapi/
│  └─ billing-openapi-v0.1.yaml
├─ generated/
├─ schemas/
└─ README.md
```

El OpenAPI fuente debe vivir en:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

Y copiarse o referenciarse desde:

```txt
packages/api-contracts/openapi/
```

---

## 6. Aplicaciones consumidoras

### 6.1 POS PWA

Aplicación:

```txt
apps/pos-pwa/
```

Consume contratos de:

```txt
ventas
cobro
ticket print payload
búsqueda rápida
reimpresión
```

---

### 6.2 Manager PWA

Aplicación:

```txt
apps/manager-pwa/
```

Consume contratos de:

```txt
dashboard fiscal
facturas
global diaria
global rezagados
manual review
cancelaciones
conciliación
exportaciones
configuración fiscal
```

---

### 6.3 Public Billing PWA

Aplicación:

```txt
apps/public-billing-pwa/
```

Consume contratos de:

```txt
consulta receipt por token
submit autofactura
polling invoice status
descarga PDF/XML
```

---

## 7. Principios de contrato

### 7.1 Backend como fuente de verdad

El backend decide:

```txt
estado fiscal
permisos efectivos
acciones disponibles
elegibilidad de global
vigencia de QR
si una factura puede cancelarse
si un match puede confirmarse
```

Frontend no debe duplicar esas reglas.

---

### 7.2 Estados explícitos

Toda respuesta importante debe incluir estados explícitos.

Ejemplos:

```txt
fiscalStatus
receiptStatus
invoiceStatus
globalBatchStatus
reconciliationStatus
exportStatus
```

Evitar que frontend infiera estados por ausencia de campos.

---

### 7.3 Acciones disponibles

Cuando aplique, backend debe devolver:

```txt
availableActions
```

Ejemplo:

```json
{
  "id": "invoice_123",
  "status": "stamped",
  "availableActions": ["download_pdf", "download_xml", "cancel"]
}
```

Esto evita que frontend invente permisos o reglas.

---

### 7.4 Errores operativos

Los errores deben regresar mensajes operativos.

No exponer:

```txt
stack traces
payloads provider
API keys
certificados
detalles internos del PAC
```

---

### 7.5 Fechas

Todas las fechas deben viajar en ISO 8601.

Ejemplo:

```txt
2026-05-24T10:35:00-06:00
```

El backend debe incluir zona horaria cuando sea relevante.

Zona operativa esperada:

```txt
America/Monterrey
```

---

### 7.6 Moneda

Montos en MXN.

Recomendación:

```txt
usar strings decimales en API para dinero
```

Ejemplo:

```json
{
  "total": "86.00",
  "currency": "MXN"
}
```

No usar float para dinero.

---

### 7.7 Idempotencia

Operaciones sensibles deben ser idempotentes.

Aplica a:

```txt
completar venta
generar receipt QR
solicitar factura
confirmar global
cancelar CFDI
confirmar match
generar exportación
```

El contrato debe soportar:

```txt
Idempotency-Key
```

---

## 8. Módulos cubiertos por OpenAPI

OpenAPI debe cubrir los siguientes bloques:

```txt
Sales / POS
Public Billing
Manager Billing
Global Invoices
Manual Review
Cancellations
Reconciliation
Exports
Fiscal Settings
Permissions
```

---

## 9. Endpoints conceptuales esperados

### 9.1 POS / Sales

```txt
POST /pos/sales
POST /pos/sales/{saleId}/complete
GET /pos/sales/search
POST /pos/sales/{saleId}/print
POST /pos/sales/{saleId}/reprint
```

---

### 9.2 Public Billing

```txt
GET /public/billing/receipts/{token}
POST /public/billing/receipts/{token}/invoice
GET /public/billing/receipts/{token}/invoice-status
GET /public/billing/invoices/{invoiceId}/pdf
GET /public/billing/invoices/{invoiceId}/xml
```

---

### 9.3 Manager Billing

```txt
GET /manager/billing/dashboard
GET /manager/billing/invoices
GET /manager/billing/invoices/{invoiceId}
GET /manager/billing/invoices/{invoiceId}/pdf
GET /manager/billing/invoices/{invoiceId}/xml
POST /manager/billing/invoices/{invoiceId}/cancel
```

---

### 9.4 Global Invoices

```txt
GET /manager/billing/global/daily/preview
POST /manager/billing/global/daily/prepare
POST /manager/billing/global/daily/{batchId}/confirm
GET /manager/billing/global/pending-period/preview
POST /manager/billing/global/pending-period/prepare
POST /manager/billing/global/pending-period/{batchId}/confirm
```

---

### 9.5 Manual Review

```txt
GET /manager/billing/manual-review
GET /manager/billing/manual-review/{caseId}
PATCH /manager/billing/manual-review/{caseId}
POST /manager/billing/manual-review/{caseId}/retry
POST /manager/billing/manual-review/{caseId}/close
```

---

### 9.6 Reconciliation

```txt
POST /manager/reconciliation/imports
GET /manager/reconciliation/imports
GET /manager/reconciliation/imports/{importId}
GET /manager/reconciliation/imports/{importId}/movements
GET /manager/reconciliation/movements/{movementId}/candidates
POST /manager/reconciliation/matches/{matchId}/confirm
POST /manager/reconciliation/matches/{matchId}/reject
GET /manager/reconciliation/incidents
GET /manager/reconciliation/incidents/{incidentId}
POST /manager/reconciliation/incidents/{incidentId}/resolve
POST /manager/reconciliation/incidents/{incidentId}/ignore
POST /manager/reconciliation/manual-search
```

---

### 9.7 Exports

```txt
GET /manager/billing/exports/types
POST /manager/billing/exports
GET /manager/billing/exports
GET /manager/billing/exports/{exportJobId}
GET /manager/billing/exports/{exportJobId}/download
```

---

### 9.8 Fiscal Settings

```txt
GET /manager/billing/config
PATCH /manager/billing/config
POST /manager/billing/config/validate
POST /manager/billing/config/activate
```

---

### 9.9 Permissions

```txt
GET /me/permissions
GET /manager/billing/permissions
```

---

## 10. Estados compartidos mínimos

### 10.1 Fiscal status

```txt
no_invoice
eligible_for_daily_global
pending_customer_invoice
processing_invoice
customer_invoiced
requires_manual_review
expired
included_in_global
cancel_requested
cancelled
```

---

### 10.2 Receipt status

```txt
active
used
expired
cancelled
manual_review
```

---

### 10.3 Invoice status

```txt
draft
processing
stamped
failed
requires_manual_review
cancel_requested
cancel_processing
cancelled
cancel_failed
```

---

### 10.4 Global batch status

```txt
not_prepared
prepared
confirmed
stamping
stamped
failed
requires_review
```

---

### 10.5 Reconciliation status

```txt
unmatched
matched
high_confidence
needs_review
duplicate_candidate
pending_reference
ignored
resolved
```

---

### 10.6 Export status

```txt
queued
processing
ready
failed
expired
```

---

## 11. Permisos compartidos mínimos

Roles oficiales V1:

```txt
cashier
supervisor
manager
```

Permisos base:

```txt
pos.sale.create
pos.sale.complete
pos.ticket.search_recent
pos.ticket.reprint_recent
billing.dashboard.view
billing.invoice.view
billing.invoice.download_pdf
billing.invoice.download_xml
billing.invoice.cancel
billing.global_daily.confirm
billing.global_pending.confirm
billing.manual_review.view
billing.manual_review.resolve
billing.settings.view
billing.settings.update
billing.settings.validate
billing.reconciliation.view
billing.reconciliation.upload
billing.reconciliation.match.confirm
billing.reconciliation.match.reject
billing.reconciliation.pending_reference.resolve
billing.reconciliation.incident.ignore
billing.exports.run
```

---

## 12. Convención de respuesta paginada

Formato recomendado:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

---

## 13. Convención de error

Formato recomendado:

```json
{
  "statusCode": 422,
  "error": "VALIDATION_ERROR",
  "message": "Revisa los campos enviados.",
  "details": [
    {
      "field": "rfc",
      "message": "RFC inválido."
    }
  ]
}
```

---

## 14. Contratos no incluidos en este bloque

No incluir aquí:

```txt
DDL SQL final
Prisma schema completo
implementación Facturapi adapter
diseño visual Figma
componentes React
jobs internos detallados
```

Esos viven en otros documentos.

---

## 15. Definition of Ready para generar OpenAPI

Antes de crear `billing-openapi-v0.1.yaml`:

```txt
[ ] reglas product/billing listas
[ ] frontend/billing listo
[ ] backend/billing listo
[ ] estados compartidos confirmados
[ ] roles V1 confirmados
[ ] endpoints conceptuales confirmados
[ ] formato de error confirmado
[ ] formato de paginación confirmado
```

---

## 16. Definition of Done del bloque contracts

```txt
[ ] índice de contracts creado
[ ] OpenAPI billing creado
[ ] convenciones API documentadas
[ ] catálogo DTO documentado
[ ] catálogo errores documentado
[ ] eventos internos documentados
[ ] contratos enlazados con packages/api-contracts
```

---

## 17. Siguiente documento

Después de este documento, generar:

```txt
billing-openapi-v0.1.yaml
```

Nota:

```txt
El siguiente archivo será YAML, no Markdown.
```
