# Tortilla Plus — Billing ERD Addendum V0.1

## 1. Propósito

Este documento define el agregado de modelo de datos fiscal para **Tortilla Plus — V1 Operativa Comercial**.

Extiende el modelo de datos base con las entidades necesarias para:

```txt
autofactura por QR
CFDI individual
CFDI global diaria
CFDI global de rezagados
cancelación CFDI
Facturapi como provider fiscal inicial
XML persistente
PDF bajo demanda
reintentos de timbrado
auditoría fiscal
conciliación bancaria operativa
```

Este documento debe usarse como base para:

```txt
migraciones Prisma
DDL SQL
OpenAPI billing
jobs/queues/scheduler
servicios backend
QA fiscal
```

---

## 2. Principios de modelado

### 2.1 No acoplar modelo interno a Facturapi

El modelo de Tortilla Plus debe guardar IDs externos de Facturapi, pero no depender de sus estructuras internas.

Correcto:

```txt
billing_invoices.provider_invoice_id
billing_invoices.provider = facturapi
```

Incorrecto:

```txt
usar el objeto completo de Facturapi como modelo de dominio
```

### 2.2 Una venta solo puede tener un destino fiscal final

Una venta puede terminar en:

```txt
CFDI individual
```

o:

```txt
CFDI global
```

Nunca ambas.

### 2.3 XML persistente, PDF bajo demanda

Guardar:

```txt
XML
metadata fiscal
UUID
hash
estado
```

No guardar permanentemente PDF en V1.

### 2.4 Auditoría obligatoria

Toda acción fiscal relevante debe auditarse.

### 2.5 Multi-RFC preparado, no activo en V1

V1 opera como:

```txt
1 organization = 1 billing_entity
```

pero el modelo debe permitir futuro:

```txt
1 organization = N billing_entities
branch -> billing_entity
```

---

## 3. Diagrama ERD textual

```txt
organizations
  └── billing_entities
        ├── billing_certificates
        ├── billing_provider_accounts
        ├── billing_invoices
        │     ├── billing_invoice_items
        │     ├── billing_invoice_documents
        │     └── billing_invoice_cancellations
        │
        ├── billing_global_batches
        │     └── billing_global_batch_sales
        │
        └── billing_provider_logs

sales
  ├── billing_receipts
  ├── billing_invoice_requests
  ├── billing_global_batch_sales
  └── billing_invoices

billing_receipts
  └── billing_invoice_requests
        └── billing_invoices

billing_jobs
billing_audit_logs

reconciliation_imports
  ├── reconciliation_bank_movements
  └── reconciliation_matches
```

---

## 4. Tablas nuevas

```txt
billing_entities
billing_certificates
billing_provider_accounts
billing_receipts
billing_invoice_requests
billing_invoices
billing_invoice_items
billing_invoice_documents
billing_invoice_cancellations
billing_global_batches
billing_global_batch_sales
billing_provider_logs
billing_jobs
billing_audit_logs
reconciliation_imports
reconciliation_bank_movements
reconciliation_matches
```

---

## 5. Cambios a tablas existentes

### 5.1 organizations

Agregar referencia fiscal principal.

```txt
primary_billing_entity_id nullable
billing_enabled boolean
```

### 5.2 branches

Preparar multi-RFC futuro.

```txt
billing_entity_id nullable
```

En V1:

```txt
branch.billing_entity_id = organization.primary_billing_entity_id
```

o se resuelve por organización.

### 5.3 sales

Agregar lifecycle fiscal.

```txt
fiscal_status
fiscal_intent
billing_receipt_id nullable
billing_invoice_id nullable
billing_global_batch_id nullable
fiscal_locked_at nullable
invoice_deadline_at nullable
```

---

## 6. Enums oficiales

### 6.1 FiscalIntent

```txt
no_invoice
customer_invoice
auto_customer_invoice
```

Uso:

| Valor | Significado |
|---|---|
| `no_invoice` | Venta no solicitó factura; puede ir a global diaria. |
| `customer_invoice` | Cliente pidió ticket para facturar. |
| `auto_customer_invoice` | Sistema reservó venta para factura por regla automática, por ejemplo tarjeta. |

---

### 6.2 SaleFiscalStatus

```txt
sale_completed
eligible_for_daily_global
pending_customer_invoice
invoice_processing
customer_invoiced
invoice_failed
requires_manual_review
expired_to_pending_global
included_in_global
cfdi_cancelled
cancelled
```

---

### 6.3 BillingReceiptStatus

```txt
active
used
expired
blocked
cancelled
```

---

### 6.4 InvoiceRequestStatus

```txt
draft
submitted
processing
stamped
failed_retryable
failed_final
requires_manual_review
cancelled
```

---

### 6.5 BillingInvoiceType

```txt
individual
global_daily
global_pending_period
```

---

### 6.6 BillingInvoiceStatus

```txt
draft
stamping
stamped
stamp_failed
cancel_requested
cancelled
cancel_failed
```

---

### 6.7 BillingGlobalBatchType

```txt
daily
pending_period
```

---

### 6.8 BillingGlobalBatchStatus

```txt
prepared
confirmed
stamping
stamped
failed
cancelled
```

---

### 6.9 BillingProvider

```txt
facturapi
manual
future_provider
```

---

### 6.10 BillingJobStatus

```txt
pending
processing
completed
failed
retrying
requires_manual_review
cancelled
```

---

### 6.11 BillingJobType

```txt
invoice_generate
invoice_retry
receipt_expire
global_daily_prepare
global_pending_prepare
global_stamp
invoice_cancel
pdf_generate
provider_status_sync
```

---

### 6.12 ReconciliationProvider

```txt
bbva
mercadopago
clip
manual
unknown
```

---

### 6.13 ReconciliationMatchStatus

```txt
suggested
confirmed
rejected
manual
```

---

## 7. billing_entities

### 7.1 Propósito

Representa la entidad fiscal emisora.

En V1:

```txt
1 organization = 1 billing_entity
```

Futuro:

```txt
1 organization = N billing_entities
```

### 7.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
legal_name varchar
trade_name varchar nullable
rfc varchar
tax_regime varchar
postal_code varchar
country varchar default 'MX'
state varchar nullable
municipality varchar nullable
address_line varchar nullable
email varchar nullable
phone varchar nullable
status varchar
is_primary boolean
created_at timestamp
updated_at timestamp
deleted_at timestamp nullable
```

### 7.3 Reglas

```txt
organization_id + rfc debe ser único si deleted_at is null
solo una billing_entity primaria por organización en V1
status debe permitir active/inactive/pending_setup
```

### 7.4 Índices

```txt
idx_billing_entities_organization_id
idx_billing_entities_rfc
uniq_billing_entity_org_rfc_active
```

---

## 8. billing_certificates

### 8.1 Propósito

Registra certificados fiscales/CSD del emisor.

Puede almacenar metadata local y/o referencia al provider.

### 8.2 Campos

```txt
id uuid pk
billing_entity_id uuid fk billing_entities.id
provider varchar
provider_certificate_id varchar nullable
certificate_number varchar nullable
valid_from timestamp nullable
valid_to timestamp nullable
status varchar
encrypted_cer_path varchar nullable
encrypted_key_path varchar nullable
key_password_encrypted text nullable
uploaded_by_user_id uuid nullable
uploaded_at timestamp nullable
last_validated_at timestamp nullable
created_at timestamp
updated_at timestamp
```

### 8.3 Reglas

```txt
Nunca guardar .key sin cifrado.
Si Facturapi custodia CSD, guardar solo provider_certificate_id y metadata.
Debe poder marcarse certificado vencido.
```

### 8.4 Status

```txt
pending
active
expired
revoked
invalid
```

---

## 9. billing_provider_accounts

### 9.1 Propósito

Relaciona billing_entity con su organización en Facturapi u otro provider.

### 9.2 Campos

```txt
id uuid pk
billing_entity_id uuid fk billing_entities.id
provider varchar
provider_organization_id varchar
provider_account_status varchar
provider_environment varchar
metadata jsonb
created_at timestamp
updated_at timestamp
```

### 9.3 Reglas

```txt
billing_entity_id + provider debe ser único
provider_environment = sandbox | production
```

---

## 10. billing_receipts

### 10.1 Propósito

Representa el ticket fiscal QR para autofactura.

### 10.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id
sale_id uuid fk sales.id unique
billing_entity_id uuid fk billing_entities.id
receipt_token varchar unique
receipt_url varchar
status varchar
fiscal_status varchar
expires_at timestamp
used_at timestamp nullable
expired_at timestamp nullable
blocked_at timestamp nullable
cancelled_at timestamp nullable
created_by_user_id uuid nullable
created_at timestamp
updated_at timestamp
```

### 10.3 Reglas

```txt
receipt_token debe ser no secuencial y no adivinable
sale_id único: una venta no puede tener múltiples receipts activos
expires_at = último día del mes natural 23:59:59
```

### 10.4 Índices

```txt
uniq_billing_receipts_sale_id
uniq_billing_receipts_token
idx_billing_receipts_status
idx_billing_receipts_expires_at
idx_billing_receipts_branch_status
```

---

## 11. billing_invoice_requests

### 11.1 Propósito

Registra intento del cliente de generar factura desde portal QR.

### 11.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id
sale_id uuid fk sales.id
billing_receipt_id uuid fk billing_receipts.id
billing_entity_id uuid fk billing_entities.id
status varchar
rfc varchar
legal_name varchar
tax_regime varchar
postal_code varchar
cfdi_use varchar
email varchar
attempt_count integer default 0
last_attempt_at timestamp nullable
submitted_at timestamp nullable
processed_at timestamp nullable
validation_errors jsonb nullable
last_error_code varchar nullable
last_error_message text nullable
client_ip inet nullable
client_user_agent text nullable
created_at timestamp
updated_at timestamp
```

### 11.3 Reglas

```txt
solo receipts active pueden recibir solicitud
si receipt expired, bloquear submit
máximo intentos por rate limit
no permitir nueva solicitud si venta ya customer_invoiced o included_in_global
```

### 11.4 Índices

```txt
idx_invoice_requests_receipt_id
idx_invoice_requests_sale_id
idx_invoice_requests_status
idx_invoice_requests_rfc
```

---

## 12. billing_invoices

### 12.1 Propósito

Representa CFDI timbrado o en proceso.

### 12.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
billing_entity_id uuid fk billing_entities.id
sale_id uuid fk sales.id nullable
invoice_request_id uuid fk billing_invoice_requests.id nullable
global_batch_id uuid fk billing_global_batches.id nullable
type varchar
status varchar
provider varchar
provider_invoice_id varchar nullable
uuid_sat varchar nullable
serie varchar nullable
folio varchar nullable
currency varchar default 'MXN'
subtotal numeric(14,2)
tax_total numeric(14,2)
discount_total numeric(14,2) default 0
total numeric(14,2)
rfc_emisor varchar
rfc_receptor varchar
legal_name_receptor varchar nullable
cfdi_use varchar nullable
tax_regime_receptor varchar nullable
postal_code_receptor varchar nullable
xml_storage_path varchar nullable
xml_hash varchar nullable
pdf_generated_at timestamp nullable
stamped_at timestamp nullable
cancelled_at timestamp nullable
sat_status varchar nullable
provider_status varchar nullable
last_error_code varchar nullable
last_error_message text nullable
created_at timestamp
updated_at timestamp
```

### 12.3 Reglas

```txt
sale_id nullable porque global agrupa múltiples ventas
global_batch_id nullable porque individual va por sale_id/request
uuid_sat único si no null
invoice_request_id único si no null
```

### 12.4 Índices

```txt
uniq_billing_invoices_uuid_sat
idx_billing_invoices_org_type_status
idx_billing_invoices_sale_id
idx_billing_invoices_global_batch_id
idx_billing_invoices_provider_invoice_id
```

---

## 13. billing_invoice_items

### 13.1 Propósito

Snapshot fiscal de conceptos incluidos en CFDI.

### 13.2 Campos

```txt
id uuid pk
billing_invoice_id uuid fk billing_invoices.id
sale_item_id uuid nullable
product_id uuid nullable
description varchar
sat_product_code varchar nullable
sat_unit_code varchar nullable
quantity numeric(14,3)
unit_price numeric(14,6)
subtotal numeric(14,2)
tax_rate numeric(8,6)
tax_amount numeric(14,2)
discount_amount numeric(14,2) default 0
total numeric(14,2)
metadata jsonb
created_at timestamp
```

### 13.3 Reglas

```txt
Debe ser snapshot, no depender de precio actual.
Para global puede agrupar conceptos según criterio fiscal configurado.
```

---

## 14. billing_invoice_documents

### 14.1 Propósito

Control de documentos asociados a CFDI.

### 14.2 Campos

```txt
id uuid pk
billing_invoice_id uuid fk billing_invoices.id
document_type varchar
storage_policy varchar
storage_path varchar nullable
provider_url varchar nullable
hash varchar nullable
generated_at timestamp nullable
expires_at timestamp nullable
created_at timestamp
```

### 14.3 Tipos

```txt
xml
pdf
cancel_ack
```

### 14.4 Reglas

```txt
XML persistente
PDF on_demand
acuse cancelación puede ser metadata/provider_url o XML si aplica
```

---

## 15. billing_invoice_cancellations

### 15.1 Propósito

Registra solicitudes y resultados de cancelación CFDI.

### 15.2 Campos

```txt
id uuid pk
billing_invoice_id uuid fk billing_invoices.id
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
billing_entity_id uuid fk billing_entities.id
requested_by_user_id uuid fk users.id
sat_cancel_reason varchar
internal_reason text
evidence_url varchar nullable
status varchar
provider varchar
provider_cancellation_id varchar nullable
provider_response jsonb nullable
requested_at timestamp
processed_at timestamp nullable
cancelled_at timestamp nullable
last_error_code varchar nullable
last_error_message text nullable
created_at timestamp
updated_at timestamp
```

### 15.3 Status

```txt
requested
processing
cancelled
failed
requires_manual_review
```

### 15.4 Reglas

```txt
solo gerente puede crear cancelación
sat_cancel_reason obligatorio
internal_reason obligatorio
evidence_url opcional
```

---

## 16. billing_global_batches

### 16.1 Propósito

Agrupa ventas para factura global.

### 16.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id
billing_entity_id uuid fk billing_entities.id
type varchar
status varchar
period_start timestamp
period_end timestamp
operational_date date nullable
prepared_by_system boolean default true
confirmed_by_user_id uuid nullable
confirmed_at timestamp nullable
stamped_invoice_id uuid nullable fk billing_invoices.id
sales_count integer default 0
subtotal numeric(14,2)
tax_total numeric(14,2)
total numeric(14,2)
last_error_code varchar nullable
last_error_message text nullable
created_at timestamp
updated_at timestamp
```

### 16.3 Reglas

```txt
daily: por branch + operational_date
pending_period: por branch + period_start/period_end
no timbrar si status != confirmed
```

### 16.4 Índices

```txt
idx_global_batches_org_branch_type_status
idx_global_batches_period
uniq_daily_global_batch_per_branch_date_when_active
```

---

## 17. billing_global_batch_sales

### 17.1 Propósito

Relación entre lotes globales y ventas incluidas.

### 17.2 Campos

```txt
id uuid pk
global_batch_id uuid fk billing_global_batches.id
sale_id uuid fk sales.id
organization_id uuid fk organizations.id
branch_id uuid fk branches.id
sale_total numeric(14,2)
sale_fiscal_status_snapshot varchar
created_at timestamp
```

### 17.3 Reglas

```txt
sale_id no puede estar en más de un batch stamped/confirmed activo
al insertar debe validar que sale no tenga billing_invoice_id individual
```

### 17.4 Índices

```txt
uniq_global_batch_sale
idx_global_batch_sales_sale_id
idx_global_batch_sales_batch_id
```

---

## 18. billing_provider_logs

### 18.1 Propósito

Auditar todas las llamadas a provider fiscal.

### 18.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id nullable
billing_entity_id uuid fk billing_entities.id nullable
provider varchar
operation varchar
related_entity_type varchar nullable
related_entity_id uuid nullable
request_payload_sanitized jsonb nullable
response_payload_sanitized jsonb nullable
status_code integer nullable
duration_ms integer nullable
success boolean
error_code varchar nullable
error_message text nullable
idempotency_key varchar nullable
created_at timestamp
```

### 18.3 Reglas

```txt
No guardar secretos
No guardar CSD raw
No guardar contraseñas
Sanitizar RFC sensible si se decide
```

---

## 19. billing_jobs

### 19.1 Propósito

Persistencia de jobs fiscales relevantes.

Aunque BullMQ maneje cola, esta tabla permite auditoría y recuperación.

### 19.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id nullable
branch_id uuid fk branches.id nullable
job_type varchar
status varchar
queue_name varchar
bullmq_job_id varchar nullable
related_entity_type varchar nullable
related_entity_id uuid nullable
attempt integer default 0
max_attempts integer default 5
next_run_at timestamp nullable
last_run_at timestamp nullable
completed_at timestamp nullable
error_code varchar nullable
error_message text nullable
payload jsonb
created_at timestamp
updated_at timestamp
```

### 19.3 Índices

```txt
idx_billing_jobs_status_next_run
idx_billing_jobs_related_entity
idx_billing_jobs_type_status
```

---

## 20. billing_audit_logs

### 20.1 Propósito

Auditoría fiscal de acciones humanas y automáticas.

### 20.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
actor_type varchar
actor_id uuid nullable
action varchar
entity_type varchar
entity_id uuid
before_snapshot jsonb nullable
after_snapshot jsonb nullable
ip_address inet nullable
user_agent text nullable
created_at timestamp
```

### 20.3 Acciones mínimas

```txt
receipt.created
receipt.viewed
receipt.reprinted
receipt.resent
invoice.requested
invoice.stamped
invoice.failed
invoice.manual_review_required
global_batch.prepared
global_batch.confirmed
global_batch.stamped
invoice.cancel_requested
invoice.cancelled
invoice.cancel_failed
document.xml_downloaded
document.pdf_generated
billing_config.updated
```

---

## 21. reconciliation_imports

### 21.1 Propósito

Carga de archivos para conciliación bancaria operativa.

### 21.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
provider varchar
source_filename varchar
file_storage_path varchar nullable
file_hash varchar nullable
status varchar
uploaded_by_user_id uuid fk users.id
uploaded_at timestamp
processed_at timestamp nullable
total_rows integer default 0
valid_rows integer default 0
invalid_rows integer default 0
last_error_code varchar nullable
last_error_message text nullable
created_at timestamp
updated_at timestamp
```

### 21.3 Status

```txt
uploaded
processing
processed
failed
cancelled
```

---

## 22. reconciliation_bank_movements

### 22.1 Propósito

Movimientos bancarios/terminal extraídos de archivo.

### 22.2 Campos

```txt
id uuid pk
reconciliation_import_id uuid fk reconciliation_imports.id
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
provider varchar
movement_date timestamp
amount numeric(14,2)
currency varchar default 'MXN'
reference varchar nullable
authorization_code varchar nullable
terminal_id varchar nullable
card_last4 varchar nullable
description text nullable
raw_row jsonb
normalized_hash varchar
created_at timestamp
```

### 22.3 Índices

```txt
idx_bank_movements_provider_date
idx_bank_movements_amount
idx_bank_movements_reference
idx_bank_movements_terminal
```

---

## 23. reconciliation_matches

### 23.1 Propósito

Sugerencias/confirmaciones de conciliación entre venta POS y movimiento bancario.

### 23.2 Campos

```txt
id uuid pk
organization_id uuid fk organizations.id
branch_id uuid fk branches.id nullable
sale_id uuid fk sales.id nullable
payment_id uuid nullable
bank_movement_id uuid fk reconciliation_bank_movements.id nullable
status varchar
confidence_score numeric(5,2)
match_reason jsonb
confirmed_by_user_id uuid nullable fk users.id
confirmed_at timestamp nullable
rejected_by_user_id uuid nullable fk users.id
rejected_at timestamp nullable
created_at timestamp
updated_at timestamp
```

### 23.3 Reglas

```txt
score 100 = referencia exacta + monto exacto
score 90 = monto exacto + hora cercana
score 75 = monto exacto + terminal/hora aproximada
score < 60 no sugerir automáticamente
```

---

## 24. Cambios recomendados a sales

### 24.1 Campos nuevos

```txt
fiscal_intent varchar default 'no_invoice'
fiscal_status varchar default 'sale_completed'
billing_receipt_id uuid nullable
billing_invoice_id uuid nullable
billing_global_batch_id uuid nullable
invoice_deadline_at timestamp nullable
fiscal_locked_at timestamp nullable
```

### 24.2 Reglas

```txt
Si billing_invoice_id no null, bloquear devolución.
Si billing_global_batch_id no null, bloquear autofactura.
Si fiscal_locked_at no null, bloquear edición crítica.
```

---

## 25. Cambios recomendados a sale_payments

Para conciliación.

```txt
terminal_provider varchar nullable
terminal_id varchar nullable
card_reference varchar nullable
authorization_code varchar nullable
card_last4 varchar nullable
reconciliation_status varchar nullable
reconciled_at timestamp nullable
```

### Estados reconciliation_status

```txt
not_required
pending
suggested
reconciled
unmatched
```

---

## 26. Reglas de integridad críticas

### 26.1 No doble destino fiscal

Debe impedirse que una venta tenga simultáneamente:

```txt
billing_invoice_id individual
billing_global_batch_id confirmado/timbrado
```

### 26.2 No autofactura después de global

Si venta está:

```txt
included_in_global
```

bloquear:

```txt
billing_invoice_requests
```

### 26.3 No global si solicitud en proceso

Si venta está:

```txt
invoice_processing
pending_customer_invoice
requires_manual_review
```

bloquear inclusión en global diaria.

### 26.4 No devolución si timbrada

Si venta está:

```txt
customer_invoiced
included_in_global
```

bloquear devolución V1.

---

## 27. Constraints recomendadas

### 27.1 billing_receipts

```sql
UNIQUE (sale_id)
UNIQUE (receipt_token)
```

### 27.2 billing_invoices

```sql
UNIQUE (uuid_sat)
UNIQUE (invoice_request_id) WHERE invoice_request_id IS NOT NULL
```

### 27.3 billing_global_batch_sales

```sql
UNIQUE (global_batch_id, sale_id)
```

### 27.4 billing_provider_accounts

```sql
UNIQUE (billing_entity_id, provider)
```

---

## 28. Índices recomendados generales

```sql
CREATE INDEX idx_sales_fiscal_status ON sales(fiscal_status);
CREATE INDEX idx_sales_invoice_deadline_at ON sales(invoice_deadline_at);
CREATE INDEX idx_billing_receipts_token ON billing_receipts(receipt_token);
CREATE INDEX idx_billing_receipts_expires_at ON billing_receipts(expires_at);
CREATE INDEX idx_billing_invoice_requests_status ON billing_invoice_requests(status);
CREATE INDEX idx_billing_invoices_status_type ON billing_invoices(status, type);
CREATE INDEX idx_global_batches_status_type ON billing_global_batches(status, type);
CREATE INDEX idx_provider_logs_related ON billing_provider_logs(related_entity_type, related_entity_id);
CREATE INDEX idx_billing_jobs_next_run ON billing_jobs(status, next_run_at);
```

---

## 29. Prisma model notes

### 29.1 Decimal

Usar `Decimal` para:

```txt
amounts
totals
taxes
quantities
```

No usar float.

### 29.2 JSON

Usar `Json` para:

```txt
metadata
provider_response
match_reason
sanitized payloads
```

### 29.3 Soft delete

Solo en entidades configurables:

```txt
billing_entities
```

No aplicar soft delete a:

```txt
billing_invoices
billing_provider_logs
billing_audit_logs
```

---

## 30. Migración recomendada por fases

### Fase 1 — Core fiscal

```txt
billing_entities
billing_provider_accounts
billing_certificates
billing_receipts
billing_invoice_requests
billing_invoices
billing_invoice_items
billing_invoice_documents
```

### Fase 2 — Globales

```txt
billing_global_batches
billing_global_batch_sales
```

### Fase 3 — Provider/audit/jobs

```txt
billing_provider_logs
billing_jobs
billing_audit_logs
```

### Fase 4 — Conciliación

```txt
reconciliation_imports
reconciliation_bank_movements
reconciliation_matches
```

---

## 31. QA de modelo

```txt
ERD-QA-001 Una venta no puede tener dos receipts.
ERD-QA-002 Un receipt no puede generar más de una factura stamped.
ERD-QA-003 Una venta globalizada bloquea invoice_request.
ERD-QA-004 Una venta individual facturada bloquea global batch.
ERD-QA-005 Un UUID SAT no se duplica.
ERD-QA-006 Cajero no puede generar cancellation record.
ERD-QA-007 Provider logs no guardan secretos.
ERD-QA-008 XML se guarda con hash.
ERD-QA-009 PDF puede existir como document on_demand.
ERD-QA-010 Reconciliation match permite suggested/confirmed/rejected.
```

---

## 32. Siguiente documento

Después de este documento, generar:

```txt
billing-openapi-addendum-v0.1.md
```
