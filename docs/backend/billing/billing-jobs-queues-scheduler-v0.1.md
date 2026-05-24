# Tortilla Plus — Billing Jobs / Queues / Scheduler V0.1

## 1. Propósito

Este documento define la arquitectura asíncrona del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
colas
jobs
workers
schedulers
retries
idempotencia
locks
eventos de dominio
manejo de errores
observabilidad
QA funcional de jobs
```

Este documento depende de:

```txt
billing-domain-technical-spec-v0.1.md
billing-erd-addendum-v0.1.md
billing-openapi-addendum-v0.1.md
```

---

## 2. Principio central

El POS nunca debe depender del timbrado.

El timbrado, cancelación, globales, retries y conciliación deben ejecutarse como procesos asíncronos controlados.

```txt
POS
→ venta completed
→ clasificación fiscal
→ continúa operación
```

El trabajo fiscal ocurre por:

```txt
portal autofactura
manager confirmación
jobs
queues
scheduler
```

---

## 3. Stack recomendado

```txt
Node.js
TypeScript
NestJS o Fastify
PostgreSQL
Prisma
Redis
BullMQ
FacturapiProvider
```

---

## 4. Colas oficiales

```txt
billing.invoice.generate
billing.invoice.retry
billing.receipt.expire
billing.global.daily.prepare
billing.global.pending.prepare
billing.global.stamp
billing.invoice.cancel
billing.pdf.generate
billing.provider.status.sync
billing.reconciliation.process
billing.audit.write
```

---

## 5. Convenciones de nombres

### 5.1 Queue names

```txt
billing.invoice.generate
billing.invoice.retry
billing.global.stamp
```

### 5.2 Job names

```txt
generate-individual-invoice
retry-individual-invoice
prepare-daily-global-batch
prepare-pending-global-batch
stamp-global-batch
cancel-invoice
generate-pdf
process-reconciliation-import
expire-receipts
```

### 5.3 Job IDs idempotentes

Los jobs críticos deben usar IDs deterministas.

Ejemplos:

```txt
invoice-generate:{invoiceRequestId}
invoice-retry:{invoiceRequestId}:{attempt}
global-stamp:{globalBatchId}
invoice-cancel:{cancellationId}
receipt-expire:{receiptId}
reconciliation-import:{importId}
```

---

## 6. Reglas de idempotencia

### 6.1 Factura individual

No se puede timbrar dos veces una misma solicitud.

Idempotency key:

```txt
invoice_request:{invoiceRequestId}
```

Antes de timbrar, validar:

```txt
invoice_request.status not in stamped, cancelled
sale.fiscal_status not in customer_invoiced, included_in_global
billing_invoice no stamped para invoice_request_id
```

### 6.2 Global

No se puede timbrar dos veces un mismo lote.

Idempotency key:

```txt
global_batch:{globalBatchId}
```

Antes de timbrar, validar:

```txt
global_batch.status = confirmed
global_batch.stamped_invoice_id is null
ventas siguen elegibles
```

### 6.3 Cancelación CFDI

No se puede crear doble cancelación activa para la misma factura.

Idempotency key:

```txt
invoice_cancel:{invoiceId}:{cancellationId}
```

---

## 7. Locks

### 7.1 Lock por venta

Usar lock transaccional o advisory lock para evitar doble destino fiscal.

```txt
lock:sale:{saleId}
```

Aplica en:

```txt
generate individual invoice
include sale in global batch
cancel sale
expire receipt
```

### 7.2 Lock por global batch

```txt
lock:global_batch:{batchId}
```

### 7.3 Lock por receipt

```txt
lock:receipt:{receiptId}
```

### 7.4 Lock por organization scheduler

```txt
lock:billing_scheduler:{organizationId}:{jobType}:{date}
```

Evita preparación duplicada.

---

## 8. Política de retry

### 8.1 Timbrado individual

Política congelada:

```txt
intento inicial: inmediato
retry 1: +1 min
retry 2: +5 min
retry 3: +15 min
retry 4: +1 h
retry 5: +6 h
```

Después:

```txt
requires_manual_review
```

### 8.2 Globales

Globales deben usar retry más conservador.

```txt
retry 1: +5 min
retry 2: +30 min
retry 3: +2 h
```

Después:

```txt
global_batch.status = failed
requires manual review
```

### 8.3 Cancelación CFDI

```txt
retry 1: +5 min
retry 2: +30 min
retry 3: +2 h
```

Después:

```txt
cancellation.status = requires_manual_review
```

### 8.4 Conciliación

Si falla parsing:

```txt
no retry automático
status = failed
mostrar error al gerente
```

---

## 9. Clasificación de errores

### 9.1 Retryable

```txt
provider_timeout
provider_unavailable
rate_limited
network_error
temporary_sat_error
```

### 9.2 Non-retryable

```txt
invalid_tax_data
receipt_expired
sale_already_invoiced
sale_already_globalized
certificate_error
permission_denied
```

### 9.3 Manual review

```txt
unknown_provider_error
max_retries_exceeded
provider_response_inconsistent
certificate_expiring_or_invalid
global_batch_integrity_failed
```

---

## 10. Scheduler oficial

### 10.1 Cada 5 minutos

```txt
retry_failed_invoices
retry_failed_global_batches
retry_failed_cancellations
```

### 10.2 Diario 23:30 por organización/sucursal

```txt
prepare_daily_global_batches
```

Importante:

```txt
NO timbra automáticamente.
Solo prepara lote.
Gerente confirma.
```

### 10.3 Diario 00:15

```txt
expire_receipts_if_needed
```

Marca receipts vencidos si ya pasó su `expires_at`.

### 10.4 Último día del mes 23:30

```txt
prepare_pending_global_batches
```

Prepara lote de rezagados.

Importante:

```txt
NO timbra automáticamente.
Gerente confirma.
```

### 10.5 Diario 02:00

```txt
provider_status_sync
```

Sincroniza estado de facturas/cancelaciones en caso de respuestas incompletas.

### 10.6 Configuración horaria

Las horas deben ser configurables por organización:

```txt
daily_global_prepare_time
pending_global_prepare_time
timezone
```

Default:

```txt
America/Mexico_City
```

---

## 11. Job: generate-individual-invoice

### 11.1 Queue

```txt
billing.invoice.generate
```

### 11.2 Trigger

```txt
POST /public/billing/receipts/{token}/invoice
```

Puede ejecutarse:

```txt
inmediato dentro del request
o como fallback en cola
```

### 11.3 Payload

```json
{
  "invoiceRequestId": "irq_123",
  "receiptId": "rcp_123",
  "saleId": "sale_123",
  "organizationId": "org_123",
  "branchId": "br_123",
  "billingEntityId": "be_123",
  "attempt": 0,
  "idempotencyKey": "invoice_request:irq_123"
}
```

### 11.4 Flujo

```txt
1. Obtener invoice_request.
2. Obtener sale + receipt.
3. Validar receipt active.
4. Validar sale pending_customer_invoice o invoice_failed.
5. Lock sale.
6. Crear/actualizar billing_invoice status=stamping.
7. Construir payload provider.
8. Llamar BillingProvider.createInvoice().
9. Guardar provider log.
10. Si OK:
    - guardar XML
    - guardar metadata
    - status invoice=stamped
    - sale.fiscal_status=customer_invoiced
    - receipt.status=used
    - invoice_request.status=stamped
    - emitir billing.invoice.stamped
11. Si falla retryable:
    - invoice_request.status=failed_retryable
    - sale.fiscal_status=invoice_failed
    - encolar retry
12. Si falla final:
    - invoice_request.status=failed_final
    - sale.fiscal_status=invoice_failed
    - permitir corrección cliente si receipt activo
```

### 11.5 Estados finales

```txt
stamped
failed_retryable
failed_final
requires_manual_review
```

---

## 12. Job: retry-individual-invoice

### 12.1 Queue

```txt
billing.invoice.retry
```

### 12.2 Trigger

```txt
fallback timbrado
scheduler cada 5 min
manual retry desde manager
```

### 12.3 Payload

```json
{
  "invoiceRequestId": "irq_123",
  "attempt": 3,
  "maxAttempts": 5
}
```

### 12.4 Regla

Si `attempt >= 5`:

```txt
invoice_request.status = requires_manual_review
sale.fiscal_status = requires_manual_review
emit billing.invoice.requires_manual_review
```

---

## 13. Job: expire-receipts

### 13.1 Queue

```txt
billing.receipt.expire
```

### 13.2 Trigger

```txt
scheduler diario 00:15
scheduler último día mes 23:30
manual admin future
```

### 13.3 Selección

Buscar receipts:

```txt
status = active
expires_at < now()
sale.fiscal_status = pending_customer_invoice
```

### 13.4 Flujo

```txt
1. Por cada receipt elegible:
   - lock receipt
   - lock sale
   - validar no invoice_request processing
   - receipt.status = expired
   - sale.fiscal_status = expired_to_pending_global
   - receipt.expired_at = now
   - emitir billing.receipt.expired
```

### 13.5 Regla crítica

No expirar si existe:

```txt
invoice_processing
customer_invoiced
requires_manual_review
```

Los casos `requires_manual_review` no deben globalizarse automáticamente.

---

## 14. Job: prepare-daily-global-batch

### 14.1 Queue

```txt
billing.global.daily.prepare
```

### 14.2 Trigger

```txt
scheduler diario 23:30
manager prepare manual
```

### 14.3 Payload

```json
{
  "organizationId": "org_123",
  "branchId": "br_123",
  "operationalDate": "2026-05-23"
}
```

### 14.4 Selección de ventas

Incluir solo:

```txt
sales.fiscal_status = eligible_for_daily_global
sales.status = completed
sales.branch_id = branchId
sales.operational_date = operationalDate
billing_invoice_id is null
billing_global_batch_id is null
```

Excluir:

```txt
pending_customer_invoice
invoice_processing
customer_invoiced
invoice_failed
requires_manual_review
expired_to_pending_global
included_in_global
cancelled
```

### 14.5 Flujo

```txt
1. Calcular ventas elegibles.
2. Si no hay ventas, no crear batch o crear empty draft según configuración.
3. Crear billing_global_batch status=prepared.
4. Crear billing_global_batch_sales.
5. Snapshot totals.
6. Emitir billing.global_batch.prepared.
```

### 14.6 No timbrar

Este job no llama al provider.

---

## 15. Job: prepare-pending-global-batch

### 15.1 Queue

```txt
billing.global.pending.prepare
```

### 15.2 Trigger

```txt
último día del mes 23:30
manual manager prepare
```

### 15.3 Selección

Incluir:

```txt
sales.fiscal_status = expired_to_pending_global
sales.status = completed
invoice_deadline_at <= period_end
billing_invoice_id is null
billing_global_batch_id is null
```

Excluir:

```txt
customer_invoiced
invoice_processing
requires_manual_review
eligible_for_daily_global
included_in_global
cancelled
```

### 15.4 Flujo

Igual a global diaria, pero:

```txt
type = pending_period
period_start = primer día del mes
period_end = último día del mes
```

---

## 16. Job: stamp-global-batch

### 16.1 Queue

```txt
billing.global.stamp
```

### 16.2 Trigger

```txt
POST /manager/billing/global/daily/{batchId}/confirm
POST /manager/billing/global/pending-period/{batchId}/confirm
```

### 16.3 Payload

```json
{
  "globalBatchId": "gb_123",
  "confirmedByUserId": "usr_123",
  "idempotencyKey": "global_batch:gb_123"
}
```

### 16.4 Flujo

```txt
1. Obtener batch.
2. Validar batch.status = confirmed.
3. Lock batch.
4. Validar ventas siguen elegibles.
5. Crear billing_invoice type global_daily/global_pending_period status=stamping.
6. Construir CFDI global.
7. Llamar BillingProvider.createGlobalInvoice().
8. Guardar provider log.
9. Si OK:
   - guardar XML + metadata
   - invoice.status=stamped
   - batch.status=stamped
   - batch.stamped_invoice_id=invoice.id
   - cada sale.fiscal_status=included_in_global
   - sale.billing_global_batch_id=batch.id
   - sale.fiscal_locked_at=now
   - emitir billing.global_batch.stamped
10. Si falla retryable:
   - batch.status=failed
   - crear retry job
11. Si falla integridad:
   - batch.status=failed
   - requires_manual_review
```

### 16.5 Revalidación crítica antes de timbrar

Antes de timbrar, por cada venta:

```txt
no customer_invoiced
no billing_invoice_id individual
no included_in_global
no cancelled
```

---

## 17. Job: cancel-invoice

### 17.1 Queue

```txt
billing.invoice.cancel
```

### 17.2 Trigger

```txt
POST /manager/billing/invoices/{invoiceId}/cancel
```

### 17.3 Payload

```json
{
  "cancellationId": "can_123",
  "invoiceId": "inv_123",
  "requestedByUserId": "usr_123"
}
```

### 17.4 Flujo

```txt
1. Validar usuario gerente.
2. Obtener cancellation.
3. Validar invoice.status=stamped.
4. Llamar BillingProvider.cancelInvoice().
5. Guardar provider log.
6. Si OK:
   - cancellation.status=cancelled
   - invoice.status=cancelled
   - invoice.cancelled_at=now
   - sale/global queda con estado cfdi_cancelled según aplique
   - emitir billing.invoice.cancelled
7. Si falla retryable:
   - cancellation.status=processing
   - retry según política
8. Si falla final:
   - cancellation.status=failed/requires_manual_review
```

### 17.5 Evidencia

Solo se guarda:

```txt
evidence_url opcional
```

No se almacenan archivos.

---

## 18. Job: generate-pdf

### 18.1 Queue

```txt
billing.pdf.generate
```

### 18.2 Trigger

```txt
GET invoice pdf
manager or public
```

### 18.3 Política

```txt
PDF bajo demanda
no persistente en V1
```

### 18.4 Flujo

```txt
1. Validar invoice stamped.
2. Si provider permite PDF, solicitar.
3. Si se genera localmente, usar XML + template.
4. Responder application/pdf.
5. Registrar audit log.
```

### 18.5 Cache opcional futuro

```txt
cache temporal 15 min
```

No requerido V1.

---

## 19. Job: process-reconciliation-import

### 19.1 Queue

```txt
billing.reconciliation.process
```

### 19.2 Trigger

```txt
POST /manager/reconciliation/imports
```

### 19.3 Payload

```json
{
  "importId": "rec_imp_123",
  "provider": "bbva",
  "organizationId": "org_123",
  "branchId": "br_123"
}
```

### 19.4 Flujo

```txt
1. Leer archivo CSV/XLSX.
2. Seleccionar parser según provider.
3. Normalizar movimientos.
4. Guardar reconciliation_bank_movements.
5. Buscar ventas tarjeta candidatas.
6. Generar matches con confidence_score.
7. Marcar import processed.
```

### 19.5 Providers V1

```txt
bbva
mercadopago
clip
```

### 19.6 No PDF

No procesar PDFs bancarios en V1.

---

## 20. Matching de conciliación

### 20.1 Score sugerido

```txt
100 = monto exacto + referencia exacta
95 = monto exacto + autorización exacta
90 = monto exacto + hora dentro de 5 min
80 = monto exacto + terminal igual + fecha igual
75 = monto exacto + hora dentro de 30 min
<60 = no sugerir
```

### 20.2 Estados

```txt
suggested
confirmed
rejected
manual
```

### 20.3 Confirmación

Solo gerente confirma.

---

## 21. Job: provider-status-sync

### 21.1 Queue

```txt
billing.provider.status.sync
```

### 21.2 Trigger

```txt
scheduler diario 02:00
manual admin
```

### 21.3 Uso

Para reconciliar inconsistencias:

```txt
provider timeout pero factura sí fue creada
cancelación pendiente
respuesta incompleta
```

### 21.4 Flujo

```txt
1. Buscar invoices/cancellations en estado incierto.
2. Consultar provider status.
3. Actualizar estado si hay evidencia.
4. Registrar provider log.
5. Emitir eventos si cambió estado.
```

---

## 22. Audit write

### 22.1 Queue opcional

```txt
billing.audit.write
```

### 22.2 Recomendación

Para acciones críticas, escribir auditoría dentro de la misma transacción cuando sea posible.

Usar queue solo para eventos secundarios.

---

## 23. Eventos de dominio

### 23.1 Eventos emitidos

```txt
sale.completed
billing.receipt.created
billing.receipt.expired
billing.receipt.reprinted
billing.invoice.requested
billing.invoice.stamped
billing.invoice.failed
billing.invoice.requires_manual_review
billing.global_batch.prepared
billing.global_batch.confirmed
billing.global_batch.stamped
billing.global_batch.failed
billing.invoice.cancel_requested
billing.invoice.cancelled
billing.invoice.cancel_failed
billing.reconciliation.imported
billing.reconciliation.processed
billing.reconciliation.match_confirmed
```

### 23.2 Bus de eventos

V1 puede usar:

```txt
in-process events
BullMQ jobs
Redis pub/sub futuro
```

No sobrediseñar event sourcing todavía.

---

## 24. Persistencia de jobs

Aunque BullMQ tenga metadata, registrar en `billing_jobs`:

```txt
job_type
status
related_entity_type
related_entity_id
attempt
max_attempts
next_run_at
last_run_at
error_code
error_message
```

Esto permite:

```txt
dashboard de errores
reintentos manuales
auditoría
soporte
```

---

## 25. Observabilidad

### 25.1 Métricas mínimas

```txt
invoice_stamp_success_count
invoice_stamp_failure_count
invoice_stamp_avg_duration_ms
invoice_retry_count
invoice_manual_review_count
global_batch_prepared_count
global_batch_stamped_count
provider_timeout_count
provider_error_count
reconciliation_import_count
reconciliation_match_rate
```

### 25.2 Logs obligatorios

```txt
job started
job completed
job failed
provider request
provider response
state transition
manual review created
```

### 25.3 Alertas recomendadas

```txt
Facturapi timeout > threshold
manual review count > 10
global daily not confirmed by next day
pending global not confirmed after period close
invoice retries exhausted
certificate expired/near expiry
```

---

## 26. Seguridad

### 26.1 Payloads

No meter secretos en jobs.

No guardar:

```txt
CSD raw
password key
tokens privados
```

### 26.2 Sanitización

Provider logs deben guardar payload sanitizado.

### 26.3 Acceso

Jobs internos no exponen endpoint público directo.

### 26.4 Idempotency keys

Usar idempotency key en provider si Facturapi lo permite.

---

## 27. Concurrencia

### 27.1 Riesgo

El usuario puede intentar facturar mientras el gerente prepara global.

### 27.2 Solución

Usar locks y transacciones.

Orden recomendado:

```txt
1. lock sale
2. validar estado
3. cambiar estado
4. crear invoice/global relation
5. commit
```

### 27.3 Global batch

Al confirmar global, revalidar todas las ventas antes de timbrar.

---

## 28. Dead Letter Queue

### 28.1 DLQ requerida

Para jobs que fallan después de max retries.

```txt
billing.dlq
```

### 28.2 Payload DLQ

```json
{
  "originalQueue": "billing.invoice.retry",
  "jobType": "retry-individual-invoice",
  "relatedEntityType": "invoice_request",
  "relatedEntityId": "irq_123",
  "errorCode": "PROVIDER_TIMEOUT",
  "errorMessage": "Max retries exceeded",
  "failedAt": "2026-05-23T12:00:00-06:00"
}
```

### 28.3 Manager view

Los casos DLQ deben aparecer en:

```txt
manual review
```

---

## 29. Configuración por organización

```txt
timezone
daily_global_prepare_time
pending_global_prepare_time
auto_invoice_expires_policy
max_invoice_submit_attempts_per_hour
max_receipt_lookup_attempts_per_hour
retry_policy
provider_environment
```

Default:

```txt
timezone = America/Mexico_City
daily_global_prepare_time = 23:30
pending_global_prepare_time = last_day_month 23:30
auto_invoice_expires_policy = end_of_month
retry_policy = default_v1
```

---

## 30. QA funcional jobs

### 30.1 Timbrado individual

```txt
JOB-QA-001 Timbrado inmediato exitoso no encola retry.
JOB-QA-002 Provider timeout encola retry.
JOB-QA-003 Retry 1 corre a +1 min.
JOB-QA-004 Retry 5 falla y cambia a requires_manual_review.
JOB-QA-005 Dos jobs del mismo invoice_request no duplican factura.
```

### 30.2 Receipts

```txt
JOB-QA-010 Receipt vencido pasa a expired.
JOB-QA-011 Sale asociada pasa a expired_to_pending_global.
JOB-QA-012 Receipt con invoice_processing no se expira.
```

### 30.3 Global diaria

```txt
JOB-QA-020 Prepare daily incluye solo eligible_for_daily_global.
JOB-QA-021 Prepare daily excluye pending_customer_invoice.
JOB-QA-022 Confirm daily crea global_stamp job.
JOB-QA-023 Global stamp revalida ventas antes de timbrar.
JOB-QA-024 Global stamp exitoso marca sales included_in_global.
```

### 30.4 Global rezagados

```txt
JOB-QA-030 Pending global incluye expired_to_pending_global.
JOB-QA-031 Pending global excluye requires_manual_review.
JOB-QA-032 Pending global requiere confirmación gerente.
```

### 30.5 Cancelación

```txt
JOB-QA-040 Cancel invoice llama provider.
JOB-QA-041 Cancel OK marca invoice cancelled.
JOB-QA-042 Cancel timeout reintenta.
JOB-QA-043 Cancel falla final queda requires_manual_review.
```

### 30.6 Conciliación

```txt
JOB-QA-050 Import BBVA procesa CSV.
JOB-QA-051 Import MercadoPago procesa CSV.
JOB-QA-052 Import Clip procesa CSV.
JOB-QA-053 Matching genera score.
JOB-QA-054 Score menor a 60 no se sugiere.
```

---

## 31. Definition of Done

```txt
[ ] Colas BullMQ configuradas
[ ] billing_jobs persistente
[ ] retry individual con 5 intentos exponenciales
[ ] DLQ configurada
[ ] locks por sale/global/receipt
[ ] prepare daily global implementado
[ ] prepare pending global implementado
[ ] stamp global implementado
[ ] cancel invoice job implementado
[ ] provider logs sanitizados
[ ] manual review alimentado por failures
[ ] scheduler por timezone organization
[ ] reconciliation process job implementado
[ ] QA jobs mínimo aprobado
```

---

## 32. Siguiente documento

Después de este documento, generar:

```txt
billing-backend-implementation-guide-v0.1.md
```
