# Tortilla Plus — Implementation Context Graph V0.1

## 1. Propósito

Este documento define el grafo de contexto de implementación para **Tortilla Plus — V1 Operativa Comercial**.

Su objetivo es que Codex, el equipo de desarrollo y QA puedan entender:

```txt
qué documentos leer primero
qué módulos dependen de otros
qué carpetas tocar según la tarea
qué contratos respetar
qué reglas no deben cambiar
qué partes del sistema no deben mezclarse
```

Ubicación recomendada:

```txt
docs/architecture/implementation-context-graph-v0.1.md
```

---

## 2. Principio central

El sistema debe construirse a partir de documentos fuente.

Regla:

```txt
No implementar por intuición.
No inventar flujos.
No agregar roles.
No agregar estados fiscales.
No crear endpoints fuera del contrato sin actualizar docs/contracts.
```

---

## 3. Fuentes de verdad

El orden de autoridad documental es:

```txt
1. docs/product/
2. docs/contracts/
3. docs/backend/
4. docs/frontend/
5. docs/architecture/
```

Si hay conflicto:

```txt
product manda sobre contracts
contracts manda sobre backend/frontend
backend/frontend mandan sobre architecture
```

---

## 4. Grafo documental principal

```txt
docs/product/billing/
        ↓
docs/contracts/
        ↓
docs/backend/billing/       docs/frontend/billing/
        ↓                           ↓
apps/api/                  apps/pos-pwa/
apps/api/workers/          apps/manager-pwa/
apps/api/scheduler/        apps/public-billing-pwa/
        ↓                           ↓
packages/shared/           packages/ui/
packages/api-contracts/    packages/api-contracts/
        ↓
infra/
```

---

## 5. Lectura obligatoria por tipo de tarea

## 5.1 Tarea de negocio

Leer:

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/product/billing/billing-user-flows-v0.1.md
docs/product/billing/billing-decision-log-v0.1.md
```

No tocar código antes de identificar la regla congelada.

---

## 5.2 Tarea de backend billing

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/backend/billing/
docs/architecture/monorepo-architecture-v0.1.md
```

Carpetas candidatas:

```txt
apps/api/src/modules/billing/
apps/api/src/modules/sales/
apps/api/src/modules/reconciliation/
apps/api/src/modules/exports/
apps/api/src/workers/
apps/api/src/scheduler/
packages/shared/
packages/api-contracts/
```

---

## 5.3 Tarea de frontend POS

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
docs/frontend/billing/billing-ticket-templates-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
docs/architecture/monorepo-architecture-v0.1.md
```

Carpetas candidatas:

```txt
apps/pos-pwa/src/features/sales/
apps/pos-pwa/src/features/checkout/
apps/pos-pwa/src/features/tickets/
packages/ui/
packages/shared/
packages/api-contracts/
```

No tocar:

```txt
apps/manager-pwa/
apps/public-billing-pwa/
apps/api/src/modules/billing/ sin requerimiento backend
```

---

## 5.4 Tarea de frontend Manager Billing

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
docs/frontend/billing/billing-reconciliation-ui-spec-v0.1.md
docs/frontend/billing/billing-reporting-exports-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
```

Carpetas candidatas:

```txt
apps/manager-pwa/src/features/billing/
apps/manager-pwa/src/features/reconciliation/
apps/manager-pwa/src/features/exports/
apps/manager-pwa/src/features/settings/
packages/ui/
packages/shared/
packages/api-contracts/
```

No tocar:

```txt
apps/pos-pwa/ salvo integración documentada
apps/public-billing-pwa/
```

---

## 5.5 Tarea de portal público de autofactura

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/frontend/billing/billing-public-autofactura-portal-v0.1.md
docs/frontend/billing/billing-frontend-qa-checklist-v0.1.md
```

Carpetas candidatas:

```txt
apps/public-billing-pwa/src/features/receipt/
apps/public-billing-pwa/src/features/tax-form/
apps/public-billing-pwa/src/features/invoice-status/
apps/public-billing-pwa/src/features/downloads/
packages/ui/
packages/shared/
packages/api-contracts/
```

No tocar:

```txt
apps/pos-pwa/
apps/manager-pwa/
```

---

## 5.6 Tarea de contratos

Leer:

```txt
docs/product/billing/
docs/contracts/billing-contracts-handoff-index-v0.1.md
docs/contracts/billing-api-conventions-v0.1.md
docs/contracts/billing-dto-catalog-v0.1.md
docs/contracts/billing-error-catalog-v0.1.md
docs/contracts/billing-events-contract-v0.1.md
```

Carpetas candidatas:

```txt
docs/contracts/
packages/api-contracts/
tools/scripts/generate-api-client
```

Regla:

```txt
Si cambia OpenAPI, regenerar cliente tipado.
```

---

## 5.7 Tarea de arquitectura/infra

Leer:

```txt
docs/architecture/
docs/contracts/
docs/backend/billing/
```

Carpetas candidatas:

```txt
infra/docker/
infra/nginx/
infra/deploy/
tools/scripts/
.env.example
docker-compose.yml
```

---

## 6. Grafo de apps

```txt
apps/api
  ├─ expone HTTP API
  ├─ ejecuta workers
  ├─ ejecuta scheduler
  ├─ usa packages/shared
  └─ usa packages/api-contracts

apps/pos-pwa
  ├─ consume POS Sales API
  ├─ renderiza ticket simple/QR
  ├─ usa packages/ui
  ├─ usa packages/shared
  └─ usa packages/api-contracts

apps/manager-pwa
  ├─ consume Manager Billing API
  ├─ consume Reconciliation API
  ├─ consume Exports API
  ├─ usa packages/ui
  ├─ usa packages/shared
  └─ usa packages/api-contracts

apps/public-billing-pwa
  ├─ consume Public Billing API
  ├─ no requiere login
  ├─ usa packages/ui
  ├─ usa packages/shared
  └─ usa packages/api-contracts
```

---

## 7. Grafo de packages

```txt
packages/shared
  ├─ enums
  ├─ types
  ├─ constants
  ├─ validators
  ├─ formatters
  └─ catalogs

packages/ui
  ├─ componentes visuales
  ├─ formularios
  ├─ tablas
  ├─ badges
  └─ feedback

packages/api-contracts
  ├─ OpenAPI fuente/sincronizada
  ├─ cliente generado
  ├─ schemas
  └─ tipos generados

packages/config
  ├─ eslint
  ├─ prettier
  ├─ tsconfig
  └─ testing
```

Reglas:

```txt
shared no importa UI
ui no importa apps
api-contracts no implementa negocio
apps pueden importar packages
apps no deben importarse entre sí
```

---

## 8. Grafo del dominio billing

```txt
Sale
  ↓
Payment
  ↓
FiscalIntent
  ↓
FiscalReceipt
  ↓
PublicInvoiceRequest
  ↓
InvoiceAttempt
  ↓
Invoice
  ↓
XML Storage
```

Flujo alterno:

```txt
Sale
  ↓
eligible_for_daily_global
  ↓
DailyGlobalBatch
  ↓
GlobalInvoice
```

Flujo QR vencido:

```txt
FiscalReceipt
  ↓
expired
  ↓
PendingPeriodGlobalBatch
  ↓
GlobalInvoice
```

Flujo error:

```txt
InvoiceAttempt
  ↓
failed
  ↓
retry_scheduled
  ↓
failed
  ↓
requires_manual_review
  ↓
ManualReviewCase
```

---

## 9. Grafo POS fiscal

```txt
POS Checkout
  ↓
Payment Method
  ↓
Fiscal Decision
  ↓
Complete Sale API
  ↓
Backend returns PrintPayload
  ↓
Print Ticket
  ↓
Return to New Sale
```

Reglas:

```txt
efectivo sin factura → ticket simple
efectivo con factura → ticket QR
tarjeta → ticket QR automático
mixto con tarjeta → ticket QR automático
mixto sin tarjeta → pregunta factura
```

No permitido en POS:

```txt
cancelar CFDI
confirmar global
manual review
configuración fiscal
exportaciones
conciliación avanzada
```

---

## 10. Grafo portal público

```txt
QR Token
  ↓
GET Public Receipt
  ↓
Receipt Status
  ├─ active → Tax Form
  ├─ expired → Expired View
  ├─ used → Download View
  └─ manual_review → Review View

Tax Form
  ↓
POST Invoice Request
  ↓
processing
  ↓
polling
  ├─ stamped → PDF/XML
  ├─ requires_manual_review → Review View
  └─ failed_retryable → Continue Polling / Later
```

Reglas:

```txt
sin login
mobile-first
validación moderada
PDF principal
XML secundario
```

---

## 11. Grafo Manager Billing

```txt
Manager Billing
  ├─ Dashboard Fiscal
  ├─ Facturas
  ├─ Global Diaria
  ├─ Global Rezagados
  ├─ Manual Review
  ├─ Cancelaciones
  ├─ Conciliación
  ├─ Exportaciones
  └─ Configuración Fiscal
```

Permisos:

```txt
Gerente = completo
Supervisor = conciliación limitada
Cajero = sin acceso
```

---

## 12. Grafo conciliación

```txt
CSV/XLSX Upload
  ↓
Reconciliation Import
  ↓
Normalize Movements
  ↓
Generate Match Candidates
  ↓
Score
  ├─ high_confidence → match suggested/auto if backend allows
  ├─ needs_review → manual review
  └─ unmatched → incident

Incidents
  ├─ unmatched
  ├─ duplicate_candidate
  ├─ pending_reference
  ├─ possible_cash_error
  └─ manual_review_required
```

Roles:

```txt
Supervisor puede resolver pending_reference y matches
Gerente puede ignorar incidencias
Cajero no entra
```

---

## 13. Grafo de jobs/queues

```txt
billing queue
  ├─ invoice stamping
  ├─ invoice retries
  ├─ global stamping
  ├─ CFDI cancellation
  └─ fiscal config validation

reconciliation queue
  ├─ parse CSV/XLSX
  ├─ normalize movements
  ├─ score matches
  └─ create incidents

exports queue
  ├─ generate CSV
  ├─ generate XLSX
  ├─ generate ZIP XML
  └─ expire files

scheduler
  ├─ prepare daily global
  ├─ expire receipts
  ├─ prepare pending-period global
  └─ cleanup expired exports
```

---

## 14. Grafo de eventos

Eventos mínimos V1:

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

Documento fuente:

```txt
docs/contracts/billing-events-contract-v0.1.md
```

---

## 15. Grafo de estados fiscales

```txt
no_invoice
  ↓
eligible_for_daily_global
  ↓
included_in_global

pending_customer_invoice
  ↓
processing_invoice
  ├─ customer_invoiced
  ├─ requires_manual_review
  └─ expired

customer_invoiced
  ↓
cancel_requested
  ↓
cancelled
```

Regla:

```txt
frontend no infiere transiciones
backend devuelve estados
```

---

## 16. Grafo de permisos

```txt
cashier
  ├─ POS sales
  ├─ ticket simple
  ├─ ticket QR
  ├─ ticket search recent
  └─ reprint recent

supervisor
  ├─ cashier permissions
  ├─ reconciliation view
  ├─ match confirm/reject
  └─ pending_reference resolve

manager
  ├─ supervisor permissions
  ├─ billing dashboard
  ├─ invoices
  ├─ global confirm
  ├─ manual review
  ├─ CFDI cancellation
  ├─ fiscal settings
  └─ exports
```

No agregar:

```txt
contador
director
dueño
soporte SaaS
roles personalizados
```

---

## 17. Qué tocar según cambio solicitado

## 17.1 “Cambiar flujo de cobro”

Leer/tocar:

```txt
docs/product/billing/
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
apps/pos-pwa/src/features/checkout/
apps/api/src/modules/sales/
```

No tocar:

```txt
portal público
conciliación
exports
```

---

## 17.2 “Cambiar portal de autofactura”

Leer/tocar:

```txt
docs/frontend/billing/billing-public-autofactura-portal-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
apps/public-billing-pwa/
apps/api/src/modules/billing/
```

No tocar:

```txt
POS checkout salvo que cambie receipt
Manager salvo que cambien estados
```

---

## 17.3 “Cambiar global diaria”

Leer/tocar:

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
docs/backend/billing/
docs/contracts/billing-openapi-v0.1.yaml
apps/manager-pwa/src/features/billing/
apps/api/src/modules/billing/
apps/api/src/workers/
apps/api/src/scheduler/
```

---

## 17.4 “Cambiar conciliación”

Leer/tocar:

```txt
docs/frontend/billing/billing-reconciliation-ui-spec-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-events-contract-v0.1.md
apps/manager-pwa/src/features/reconciliation/
apps/api/src/modules/reconciliation/
apps/api/src/workers/
```

---

## 17.5 “Cambiar exportaciones”

Leer/tocar:

```txt
docs/frontend/billing/billing-reporting-exports-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
apps/manager-pwa/src/features/exports/
apps/api/src/modules/exports/
apps/api/src/workers/
```

---

## 17.6 “Cambiar permisos”

Leer/tocar:

```txt
docs/product/billing/billing-decision-log-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
docs/contracts/billing-dto-catalog-v0.1.md
apps/api/src/modules/auth/
apps/api/src/modules/users/
apps/pos-pwa/
apps/manager-pwa/
```

Regla:

```txt
si se agrega rol, actualizar product, frontend, contracts y QA
```

Pero V1 no agrega roles.

---

## 18. Qué NO debe hacer Codex

```txt
No agregar roles.
No crear endpoints sin actualizar OpenAPI.
No agregar estados fiscales nuevos sin actualizar DTO catalog.
No mover cancelación CFDI al POS.
No mover globales al POS.
No meter lógica de negocio en packages/ui.
No duplicar tipos si existen en api-contracts.
No hacer fetch dentro de packages/ui.
No usar number para dinero.
No usar fechas sin zona horaria cuando haya hora.
No exponer errores crudos del provider.
No guardar evidencia de cancelación como archivo.
No implementar multi-RFC operativo.
No implementar open banking automático.
```

---

## 19. Contexto mínimo para iniciar desarrollo

Antes de desarrollar, el agente debe identificar:

```txt
módulo
documento fuente
contrato afectado
app afectada
package afectado
pruebas necesarias
```

Formato recomendado de respuesta antes de implementar:

```txt
Módulo: billing POS
Documento fuente: billing-pos-fiscal-flow-v0.1.md
Contrato: billing-openapi-v0.1.yaml
App: apps/pos-pwa
Packages: ui, shared, api-contracts
QA: billing-frontend-qa-checklist
```

---

## 20. Orden recomendado para construir repo

```txt
1. Crear estructura monorepo.
2. Configurar pnpm/turbo.
3. Crear packages/config.
4. Crear packages/shared.
5. Agregar contracts OpenAPI.
6. Generar api-contracts.
7. Crear apps/api base.
8. Crear apps/pos-pwa base.
9. Crear apps/manager-pwa base.
10. Crear apps/public-billing-pwa base.
11. Agregar Docker local.
12. Implementar sales/POS.
13. Implementar billing core.
14. Implementar portal público.
15. Implementar Manager Billing.
16. Implementar conciliación.
17. Implementar exportaciones.
```

---

## 21. Context packs recomendados para Codex

## 21.1 POS context pack

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
docs/frontend/billing/billing-ticket-templates-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-dto-catalog-v0.1.md
```

---

## 21.2 Public Billing context pack

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/frontend/billing/billing-public-autofactura-portal-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-error-catalog-v0.1.md
```

---

## 21.3 Manager Billing context pack

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
```

---

## 21.4 Reconciliation context pack

```txt
docs/frontend/billing/billing-reconciliation-ui-spec-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-events-contract-v0.1.md
docs/contracts/billing-error-catalog-v0.1.md
```

---

## 21.5 Backend Billing context pack

```txt
docs/product/billing/
docs/backend/billing/
docs/contracts/
docs/architecture/monorepo-architecture-v0.1.md
```

---

## 22. Validaciones de consistencia

Antes de mergear cambios relevantes:

```txt
[ ] No se agregaron roles fuera de cashier/supervisor/manager.
[ ] No se agregaron estados fiscales fuera de contracts.
[ ] OpenAPI sigue válido.
[ ] api-contracts fue regenerado si cambió OpenAPI.
[ ] Errores respetan catálogo.
[ ] Dinero sigue como string.
[ ] Fechas siguen ISO 8601.
[ ] POS no contiene acciones fiscales críticas.
[ ] Manager concentra fiscal crítico.
[ ] Portal público no requiere login.
[ ] Workers procesan tareas largas.
```

---

## 23. Definition of Done

Este documento queda completo si define:

```txt
[ ] grafo documental
[ ] grafo de apps
[ ] grafo de packages
[ ] grafo billing
[ ] grafo POS
[ ] grafo portal público
[ ] grafo manager
[ ] grafo conciliación
[ ] grafo jobs/events
[ ] grafo permisos
[ ] reglas para Codex
[ ] context packs
[ ] validaciones de consistencia
```

---

## 24. Siguiente documento

Después de este documento, generar:

```txt
docs/architecture/apps-and-packages-map-v0.1.md
```
