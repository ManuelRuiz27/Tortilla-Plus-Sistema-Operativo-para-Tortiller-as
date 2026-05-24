# Tortilla Plus — Billing QA Test Plan V0.1

## 1. Propósito

Este documento define el plan de pruebas QA para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
autofactura QR
timbrado individual
global diaria
global rezagados
cancelación CFDI
Facturapi provider adapter
jobs/queues/scheduler
XML persistente
PDF bajo demanda
reimpresión QR
rate limits
concurrencia
conciliación bancaria operativa
```

Este documento complementa:

```txt
billing-domain-technical-spec-v0.1.md
billing-erd-addendum-v0.1.md
billing-openapi-addendum-v0.1.md
billing-jobs-queues-scheduler-v0.1.md
billing-backend-implementation-guide-v0.1.md
```

---

## 2. Alcance QA

### Incluido

```txt
pruebas unitarias
pruebas de integración
pruebas E2E backend
pruebas de jobs
pruebas de scheduler
pruebas de provider adapter
pruebas de idempotencia
pruebas de permisos
pruebas de rate limit
pruebas de conciliación
```

### No incluido V1

```txt
pruebas de contabilidad electrónica
notas de crédito SAT
Open Banking automático
PDF bancario
multi-RFC operativo real
firma digital de documentos
```

---

## 3. Ambientes de prueba

### 3.1 Local

```txt
PostgreSQL local
Redis local
Facturapi sandbox
storage local para XML
workers locales
scheduler manual/deshabilitado por default
```

### 3.2 CI

```txt
PostgreSQL test container
Redis test container
provider mock
workers en modo test
scheduler deshabilitado
```

### 3.3 Staging

```txt
Facturapi sandbox real
storage staging
workers activos
scheduler activo controlado
datos de prueba
```

---

## 4. Datos base QA

### 4.1 Organización

```txt
organization_id = org_test_001
billing_enabled = true
timezone = America/Mexico_City
```

### 4.2 Billing entity

```txt
billing_entity_id = be_test_001
rfc = RFC_TEST_VALIDO
provider = facturapi
provider_environment = sandbox
```

### 4.3 Sucursal

```txt
branch_id = br_test_001
name = Sucursal Principal
```

### 4.4 Usuarios

```txt
cashier_user_id = usr_cashier_001
manager_user_id = usr_manager_001
supervisor_user_id = usr_supervisor_001
```

### 4.5 Productos

```txt
Tortilla por kilo
Masa por kilo
Paquete 800g
Salsa roja
```

---

## 5. Convenciones de resultados esperados

Cada caso debe indicar:

```txt
estado inicial
acción
estado final esperado
tablas afectadas
eventos emitidos
jobs creados
errores esperados
auditoría esperada
```

---

# 6. Unit Tests

## 6.1 Fiscal Classifier

### BILL-UNIT-001 — Efectivo sin factura

**Dado:**

```txt
payment_method = cash
customerWantsInvoice = false
```

**Cuando:**

```txt
classifyFiscalSale()
```

**Entonces:**

```txt
fiscal_intent = no_invoice
fiscal_status = eligible_for_daily_global
requiresReceipt = false
```

---

### BILL-UNIT-002 — Efectivo con factura

**Dado:**

```txt
payment_method = cash
customerWantsInvoice = true
```

**Entonces:**

```txt
fiscal_intent = customer_invoice
fiscal_status = pending_customer_invoice
requiresReceipt = true
```

---

### BILL-UNIT-003 — Tarjeta siempre genera QR

**Dado:**

```txt
payment_method = card
customerWantsInvoice = false
```

**Entonces:**

```txt
fiscal_intent = auto_customer_invoice
fiscal_status = pending_customer_invoice
requiresReceipt = true
```

---

### BILL-UNIT-004 — Mixto con tarjeta genera QR

**Dado:**

```txt
payments = cash + card
```

**Entonces:**

```txt
fiscal_status = pending_customer_invoice
requiresReceipt = true
```

---

### BILL-UNIT-005 — Crédito/fiado queda reservado

**Dado:**

```txt
payment_method = credit
```

**Entonces:**

```txt
fiscal_status = pending_customer_invoice
```

---

## 6.2 Receipt expiration

### BILL-UNIT-010 — Fecha límite fin de mes

**Dado:**

```txt
sale_date = 2026-05-03T10:00:00-06:00
```

**Entonces:**

```txt
expires_at = 2026-05-31T23:59:59-06:00
```

---

### BILL-UNIT-011 — Venta en último día del mes

**Dado:**

```txt
sale_date = 2026-05-31T22:30:00-06:00
```

**Entonces:**

```txt
expires_at = 2026-05-31T23:59:59-06:00
```

---

## 6.3 Provider error mapper

### BILL-UNIT-020 — Timeout es retryable

**Dado:**

```txt
Facturapi timeout
```

**Entonces:**

```txt
category = provider_timeout
retryable = true
```

---

### BILL-UNIT-021 — Datos fiscales inválidos no retryable

**Dado:**

```txt
provider error: invalid tax data
```

**Entonces:**

```txt
category = invalid_tax_data
retryable = false
```

---

### BILL-UNIT-022 — Certificado inválido requiere revisión

**Dado:**

```txt
provider error: certificate invalid
```

**Entonces:**

```txt
category = certificate_error
retryable = false
requiresManualReview = true
```

---

## 6.4 Reconciliation scoring

### BILL-UNIT-030 — Referencia exacta y monto exacto

**Dado:**

```txt
sale.amount = 420.00
bank.amount = 420.00
sale.reference = ABC123
bank.reference = ABC123
```

**Entonces:**

```txt
confidence_score = 100
```

---

### BILL-UNIT-031 — Monto exacto y hora cercana

**Dado:**

```txt
amount exact
movement time within 5 minutes
reference missing
```

**Entonces:**

```txt
confidence_score >= 90
```

---

### BILL-UNIT-032 — Score bajo no se sugiere

**Dado:**

```txt
score < 60
```

**Entonces:**

```txt
no reconciliation_match suggested
```

---

# 7. Integration Tests

## 7.1 Sale completed integration

### BILL-INT-001 — Venta efectivo sin factura

**Acción:**

```txt
POST /sales/{id}/complete
payment = cash
customerWantsInvoice = false
```

**Esperado:**

```txt
sales.fiscal_status = eligible_for_daily_global
sales.fiscal_intent = no_invoice
billing_receipts no creado
billing_audit_logs incluye sale fiscal classification
```

---

### BILL-INT-002 — Venta efectivo con factura

**Acción:**

```txt
POST /sales/{id}/complete
payment = cash
customerWantsInvoice = true
```

**Esperado:**

```txt
sales.fiscal_status = pending_customer_invoice
billing_receipts creado status=active
receipt.expires_at = fin de mes
receipt_token no secuencial
```

---

### BILL-INT-003 — Venta tarjeta

**Acción:**

```txt
POST /sales/{id}/complete
payment = card
customerWantsInvoice = false
```

**Esperado:**

```txt
sales.fiscal_intent = auto_customer_invoice
sales.fiscal_status = pending_customer_invoice
billing_receipts creado
```

---

## 7.2 Public receipt

### BILL-INT-010 — Consultar QR vigente

**Acción:**

```txt
GET /public/billing/receipts/{token}
```

**Esperado:**

```txt
200
receipt.status = active
canInvoice = true
sale.items visibles
```

---

### BILL-INT-011 — QR vencido

**Estado inicial:**

```txt
billing_receipts.status = expired
```

**Acción:**

```txt
GET /public/billing/receipts/{token}
```

**Esperado:**

```txt
409 RECEIPT_EXPIRED
message = Este ticket ya venció para autofactura. Contacta al negocio para revisión.
```

---

## 7.3 Invoice request

### BILL-INT-020 — Solicitud válida crea invoice_request

**Acción:**

```txt
POST /public/billing/receipts/{token}/invoice
```

**Esperado:**

```txt
billing_invoice_requests creado
status = submitted|processing|stamped según provider
attempt_count incrementa
```

---

### BILL-INT-021 — Venta globalizada bloquea autofactura

**Estado inicial:**

```txt
sale.fiscal_status = included_in_global
```

**Acción:**

```txt
POST /public/billing/receipts/{token}/invoice
```

**Esperado:**

```txt
409 SALE_ALREADY_GLOBALIZED
no invoice_request nuevo
```

---

### BILL-INT-022 — Venta ya facturada bloquea segundo CFDI

**Estado inicial:**

```txt
sale.fiscal_status = customer_invoiced
```

**Esperado:**

```txt
409 SALE_ALREADY_INVOICED
```

---

## 7.4 XML/PDF

### BILL-INT-030 — XML persistente

**Estado inicial:**

```txt
invoice.status = stamped
xml_storage_path existe
```

**Acción:**

```txt
GET /manager/billing/invoices/{invoiceId}/xml
```

**Esperado:**

```txt
200 application/xml
billing_audit_logs document.xml_downloaded
```

---

### BILL-INT-031 — PDF bajo demanda

**Acción:**

```txt
GET /manager/billing/invoices/{invoiceId}/pdf
```

**Esperado:**

```txt
200 application/pdf
PDF no queda almacenado permanentemente
billing_audit_logs document.pdf_generated
```

---

# 8. E2E Backend Tests

## 8.1 E2E — Tarjeta → QR → autofactura exitosa

**Flujo:**

```txt
1. Crear venta tarjeta.
2. Completar venta.
3. Confirmar receipt QR creado.
4. Consultar portal público.
5. Enviar datos fiscales.
6. Provider sandbox responde OK.
7. Descargar XML.
8. Solicitar PDF.
```

**Esperado final:**

```txt
sale.fiscal_status = customer_invoiced
receipt.status = used
invoice.status = stamped
invoice.uuid_sat no null
xml_storage_path no null
```

---

## 8.2 E2E — Efectivo sin factura → global diaria

**Flujo:**

```txt
1. Crear venta efectivo sin factura.
2. Completar venta.
3. Preparar global diaria.
4. Gerente confirma global.
5. Worker timbra global.
```

**Esperado final:**

```txt
sale.fiscal_status = included_in_global
global_batch.status = stamped
invoice.type = global_daily
```

---

## 8.3 E2E — QR no usado → global rezagados

**Flujo:**

```txt
1. Crear venta tarjeta.
2. Completar venta.
3. Simular fin de mes.
4. Expirar receipt.
5. Preparar global rezagados.
6. Gerente confirma.
7. Worker timbra global.
```

**Esperado final:**

```txt
receipt.status = expired
sale.fiscal_status = included_in_global
global_batch.type = pending_period
invoice.type = global_pending_period
```

---

## 8.4 E2E — Cancelación CFDI

**Flujo:**

```txt
1. Crear venta facturada.
2. Gerente solicita cancelación.
3. Adjunta satCancelReason.
4. Captura internalReason.
5. Agrega evidenceUrl opcional.
6. Worker procesa cancelación.
```

**Esperado:**

```txt
invoice.status = cancelled
billing_invoice_cancellations.status = cancelled
audit log cancel_requested
audit log cancelled
```

---

## 8.5 E2E — Conciliación BBVA

**Flujo:**

```txt
1. Crear venta tarjeta con referencia.
2. Cargar CSV BBVA.
3. Worker procesa archivo.
4. Se genera match suggested.
5. Gerente confirma match.
```

**Esperado:**

```txt
reconciliation_import.status = processed
reconciliation_match.status = confirmed
sale_payment.reconciliation_status = reconciled
```

---

# 9. Jobs QA

## 9.1 Individual invoice jobs

### BILL-JOB-001 — Provider timeout genera retry

**Mock provider:**

```txt
throws provider_timeout
```

**Esperado:**

```txt
invoice_request.status = failed_retryable
billing_jobs nuevo type=invoice_retry
next_run_at = +1 min
```

---

### BILL-JOB-002 — Retry 5 agota intentos

**Estado inicial:**

```txt
attempt = 5
provider sigue timeout
```

**Esperado:**

```txt
invoice_request.status = requires_manual_review
sale.fiscal_status = requires_manual_review
DLQ/manual review visible
```

---

### BILL-JOB-003 — Idempotencia invoice request

**Acción:**

```txt
ejecutar dos jobs con invoiceRequestId mismo
```

**Esperado:**

```txt
solo un billing_invoice stamped
solo un uuid_sat
```

---

## 9.2 Receipt expiration jobs

### BILL-JOB-010 — Expira receipt activo

**Estado inicial:**

```txt
receipt.status = active
expires_at < now
sale.fiscal_status = pending_customer_invoice
```

**Esperado:**

```txt
receipt.status = expired
sale.fiscal_status = expired_to_pending_global
```

---

### BILL-JOB-011 — No expira si está en proceso

**Estado inicial:**

```txt
sale.fiscal_status = invoice_processing
```

**Esperado:**

```txt
receipt no cambia
sale no cambia
```

---

## 9.3 Global jobs

### BILL-JOB-020 — Prepare daily selecciona solo elegibles

**Dataset:**

```txt
3 eligible_for_daily_global
2 pending_customer_invoice
1 customer_invoiced
1 cancelled
```

**Esperado:**

```txt
batch.sales_count = 3
```

---

### BILL-JOB-021 — Stamp global revalida ventas

**Estado:**

```txt
batch prepared
una venta cambia a customer_invoiced antes de stamp
```

**Esperado:**

```txt
stamp bloqueado
batch.status = failed o requires_manual_review
no CFDI global timbrado
```

---

## 9.4 Cancellation jobs

### BILL-JOB-030 — Cancelación exitosa

**Provider mock:**

```txt
cancel OK
```

**Esperado:**

```txt
invoice.status = cancelled
cancellation.status = cancelled
```

---

### BILL-JOB-031 — Cancelación timeout retry

**Provider mock:**

```txt
timeout
```

**Esperado:**

```txt
cancellation.status = processing
retry job creado
```

---

# 10. Security QA

## 10.1 Rate limits

### BILL-SEC-001 — Lookup abuse

**Acción:**

```txt
GET receipt 21 veces en una hora con mismo token
```

**Esperado:**

```txt
429 RATE_LIMITED
```

---

### BILL-SEC-002 — Submit abuse

**Acción:**

```txt
POST invoice 6 veces en una hora con mismo token
```

**Esperado:**

```txt
429 RATE_LIMITED
```

---

## 10.2 Token

### BILL-SEC-010 — Token no secuencial

**Acción:**

```txt
generar 1000 receipt_tokens
```

**Esperado:**

```txt
sin duplicados
sin secuencia obvia
longitud >= 32 bytes base64url equivalente
```

---

## 10.3 Permission

### BILL-SEC-020 — Cajero no cancela CFDI

**Acción:**

```txt
POST /manager/billing/invoices/{id}/cancel con rol cajero
```

**Esperado:**

```txt
403 PERMISSION_REQUIRED
```

---

### BILL-SEC-021 — Supervisor no cancela CFDI V1

**Acción:**

```txt
POST cancel con supervisor
```

**Esperado:**

```txt
403 PERMISSION_REQUIRED
```

---

### BILL-SEC-022 — Gerente cancela con motivos

**Acción:**

```txt
POST cancel con gerente
```

**Esperado:**

```txt
202
```

---

## 10.4 Provider logs

### BILL-SEC-030 — Logs sanitizados

**Acción:**

```txt
ejecutar timbrado/cancelación
```

**Esperado:**

```txt
billing_provider_logs no contiene API key
no contiene private key
no contiene password CSD
```

---

# 11. Concurrency QA

## 11.1 Cliente factura mientras gerente prepara global

**Escenario:**

```txt
sale pending_customer_invoice
cliente POST invoice
gerente intenta incluir global
```

**Esperado:**

```txt
solo un destino fiscal gana
si invoice_processing, global excluye venta
no doble CFDI
```

---

## 11.2 Doble submit público

**Acción:**

```txt
dos POST invoice simultáneos mismo token
```

**Esperado:**

```txt
solo una invoice_request activa/stamped
segundo request recibe conflict o estado actual
```

---

## 11.3 Dos confirmaciones global

**Acción:**

```txt
dos POST confirm simultáneos mismo batch
```

**Esperado:**

```txt
solo un global_stamp job
solo un CFDI global
```

---

# 12. Regression QA

Debe ejecutarse en cada cambio del módulo billing:

```txt
BILL-UNIT-001 a BILL-UNIT-005
BILL-INT-001 a BILL-INT-003
BILL-INT-020 a BILL-INT-022
BILL-JOB-001 a BILL-JOB-003
BILL-SEC-020 a BILL-SEC-022
BILL-CONCURRENCY-001 a BILL-CONCURRENCY-003
```

---

# 13. Smoke test staging

Checklist antes de demo:

```txt
[ ] Facturapi sandbox configurado
[ ] organización fiscal sandbox activa
[ ] CSD sandbox o configuración equivalente
[ ] venta tarjeta genera QR
[ ] portal público abre
[ ] autofactura genera XML
[ ] PDF bajo demanda responde
[ ] efectivo sin factura entra global diaria
[ ] gerente confirma global diaria
[ ] cancelación bloqueada a cajero
[ ] cancelación permitida a gerente
[ ] provider logs visibles
[ ] audit logs visibles
```

---

# 14. QA exit criteria

El módulo fiscal puede pasar a desarrollo integrado cuando:

```txt
[ ] Unit tests core pasan
[ ] Integration tests billing pasan
[ ] E2E tarjeta → autofactura pasa
[ ] E2E efectivo → global diaria pasa
[ ] E2E QR vencido → global rezagados pasa
[ ] Cancelación CFDI pasa
[ ] Rate limits pasan
[ ] Idempotencia pasa
[ ] Provider logs sanitizados pasan
[ ] No hay doble destino fiscal
```

---

## 15. Siguiente paso

Después de este documento, se recomienda generar:

```txt
billing-handoff-index-v0.1.md
```

Ese índice agrupa todos los documentos fiscales y especifica el orden de lectura para desarrollo.
