# Tortilla Plus — Apps and Packages Map V0.1

## 1. Propósito

Este documento define el mapa operativo de apps y packages del monorepo de **Tortilla Plus — V1 Operativa Comercial**.

Su función es dejar claro:

```txt
qué app hace qué
qué package se comparte
qué app consume qué package
qué documentos alimentan cada app
qué contratos debe respetar cada módulo
qué carpetas deben tocarse según tarea
```

Ubicación recomendada:

```txt
docs/architecture/apps-and-packages-map-v0.1.md
```

---

## 2. Mapa general

```txt
apps/
├─ api/
├─ pos-pwa/
├─ manager-pwa/
└─ public-billing-pwa/

packages/
├─ shared/
├─ ui/
├─ api-contracts/
└─ config/
```

Regla:

```txt
apps ejecutan producto
packages comparten código
docs definen decisiones
contracts definen integración
```

---

# 3. App: `apps/api/`

## 3.1 Responsabilidad

`apps/api/` es el backend principal.

Debe implementar:

```txt
API HTTP
módulos de negocio
workers
scheduler
adaptadores externos
auditoría
persistencia
colas
```

---

## 3.2 Dominios esperados

```txt
auth
users
branches
products
inventory
customers
routes
sales
payments
cash-sessions
billing
reconciliation
exports
audit
settings
```

---

## 3.3 Mapa interno sugerido

```txt
apps/api/src/
├─ main.ts
├─ modules/
│  ├─ auth/
│  ├─ users/
│  ├─ branches/
│  ├─ products/
│  ├─ inventory/
│  ├─ customers/
│  ├─ routes/
│  ├─ sales/
│  ├─ payments/
│  ├─ cash-sessions/
│  ├─ billing/
│  ├─ reconciliation/
│  ├─ exports/
│  └─ audit/
│
├─ workers/
│  ├─ billing.worker.ts
│  ├─ reconciliation.worker.ts
│  └─ exports.worker.ts
│
├─ scheduler/
│  └─ scheduler.ts
│
├─ providers/
│  ├─ facturapi/
│  ├─ storage/
│  └─ printers/
│
├─ common/
└─ config/
```

---

## 3.4 Packages que puede consumir

```txt
packages/shared
packages/api-contracts
packages/config
```

No debe consumir:

```txt
packages/ui
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

---

## 3.5 Documentos fuente

Para backend billing:

```txt
docs/product/billing/
docs/contracts/
docs/backend/billing/
docs/architecture/
```

Para sales/POS:

```txt
docs/product/billing/
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
```

---

## 3.6 Contratos que debe respetar

```txt
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-api-conventions-v0.1.md
docs/contracts/billing-dto-catalog-v0.1.md
docs/contracts/billing-error-catalog-v0.1.md
docs/contracts/billing-events-contract-v0.1.md
```

---

## 3.7 No permitido

```txt
No devolver dinero como number.
No devolver fechas ambiguas.
No exponer errores crudos de provider.
No aceptar roles fuera de V1.
No implementar endpoints no documentados sin actualizar OpenAPI.
No importar componentes visuales.
```

---

# 4. App: `apps/pos-pwa/`

## 4.1 Responsabilidad

`apps/pos-pwa/` es la aplicación de caja.

Debe optimizar:

```txt
rapidez
teclado
mínimos clics
impresión rápida
flujo continuo
```

---

## 4.2 Funciones principales

```txt
venta rápida
captura de productos
cobro
ticket simple
ticket QR
búsqueda rápida de tickets
reimpresión limitada
cash session
venta a cliente si aplica
venta por ruta si aplica
```

---

## 4.3 Mapa interno sugerido

```txt
apps/pos-pwa/src/
├─ main.tsx
├─ app/
│  ├─ router.tsx
│  └─ providers.tsx
│
├─ features/
│  ├─ sales/
│  ├─ checkout/
│  ├─ tickets/
│  ├─ cash-session/
│  ├─ customers/
│  └─ routes/
│
├─ components/
├─ services/
├─ hooks/
└─ styles/
```

---

## 4.4 Packages que consume

```txt
packages/ui
packages/shared
packages/api-contracts
packages/config
```

---

## 4.5 Documentos fuente

```txt
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
docs/frontend/billing/billing-ticket-templates-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
docs/frontend/billing/billing-frontend-qa-checklist-v0.1.md
docs/contracts/billing-openapi-v0.1.yaml
```

---

## 4.6 APIs principales que consume

```txt
POST /pos/sales
POST /pos/sales/{saleId}/complete
GET /pos/sales/search
POST /pos/sales/{saleId}/print
POST /pos/sales/{saleId}/reprint
GET /me/permissions
```

---

## 4.7 No permitido

El POS no debe incluir:

```txt
cancelación CFDI
confirmación de global diaria
confirmación de global rezagados
manual review fiscal
configuración fiscal
exportaciones
conciliación avanzada
histórico completo fiscal
```

Estas funciones pertenecen a Manager.

---

## 4.8 Riesgo principal

Riesgo:

```txt
meter demasiada lógica fiscal en caja
```

Mitigación:

```txt
POS solo consume fiscalStatus, printPayload y warnings
Manager resuelve lo fiscal crítico
```

---

# 5. App: `apps/manager-pwa/`

## 5.1 Responsabilidad

`apps/manager-pwa/` es la aplicación administrativa.

Debe priorizar:

```txt
control
histórico
auditoría
configuración
resolución de incidencias
reportes
```

---

## 5.2 Funciones principales

```txt
dashboard operativo
clientes
rutas
precios por cliente
productos
inventario
ventas históricas
caja
billing manager
conciliación
exportaciones
configuración fiscal
usuarios/roles
```

---

## 5.3 Mapa interno sugerido

```txt
apps/manager-pwa/src/
├─ main.tsx
├─ app/
│  ├─ router.tsx
│  └─ providers.tsx
│
├─ features/
│  ├─ dashboard/
│  ├─ customers/
│  ├─ routes/
│  ├─ price-lists/
│  ├─ products/
│  ├─ inventory/
│  ├─ sales-history/
│  ├─ billing/
│  ├─ reconciliation/
│  ├─ exports/
│  ├─ users/
│  └─ settings/
│
├─ components/
├─ services/
├─ hooks/
└─ styles/
```

---

## 5.4 Packages que consume

```txt
packages/ui
packages/shared
packages/api-contracts
packages/config
```

---

## 5.5 Documentos fuente

Para billing manager:

```txt
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
docs/frontend/billing/billing-reconciliation-ui-spec-v0.1.md
docs/frontend/billing/billing-reporting-exports-v0.1.md
docs/frontend/billing/billing-roles-permissions-v0.1.md
docs/contracts/
docs/product/billing/
```

---

## 5.6 APIs principales que consume

```txt
GET /manager/billing/dashboard
GET /manager/billing/invoices
GET /manager/billing/invoices/{invoiceId}
POST /manager/billing/invoices/{invoiceId}/cancel
GET /manager/billing/global/daily/preview
POST /manager/billing/global/daily/prepare
POST /manager/billing/global/daily/{batchId}/confirm
GET /manager/billing/manual-review
POST /manager/billing/manual-review/{caseId}/retry
POST /manager/reconciliation/imports
GET /manager/reconciliation/incidents
POST /manager/billing/exports
GET /manager/billing/config
PATCH /manager/billing/config
POST /manager/billing/config/validate
```

---

## 5.7 Roles

```txt
Gerente:
  acceso completo

Supervisor:
  conciliación e incidencias operativas limitadas

Cajero:
  sin acceso a Manager Billing
```

---

## 5.8 No permitido

Manager no debe replicar flujo rápido del POS.

No debe usarse para venta de mostrador como flujo principal.

---

# 6. App: `apps/public-billing-pwa/`

## 6.1 Responsabilidad

`apps/public-billing-pwa/` es el portal público de autofactura.

Debe priorizar:

```txt
mobile-first
sin login
claridad
captura fiscal simple
descarga PDF/XML
estado claro
```

---

## 6.2 Funciones principales

```txt
leer QR/token
consultar ticket
mostrar resumen
mostrar productos colapsables
capturar datos fiscales
recordar datos localmente
solicitar factura
hacer polling
descargar PDF
descargar XML
mostrar QR vencido
mostrar ticket facturado
mostrar manual review
```

---

## 6.3 Mapa interno sugerido

```txt
apps/public-billing-pwa/src/
├─ main.tsx
├─ app/
│  ├─ router.tsx
│  └─ providers.tsx
│
├─ features/
│  ├─ receipt/
│  ├─ tax-form/
│  ├─ invoice-status/
│  └─ downloads/
│
├─ components/
├─ services/
├─ hooks/
└─ styles/
```

---

## 6.4 Packages que consume

```txt
packages/ui
packages/shared
packages/api-contracts
packages/config
```

---

## 6.5 Documentos fuente

```txt
docs/frontend/billing/billing-public-autofactura-portal-v0.1.md
docs/frontend/billing/billing-frontend-qa-checklist-v0.1.md
docs/contracts/
docs/product/billing/
```

---

## 6.6 APIs principales que consume

```txt
GET /public/billing/receipts/{token}
POST /public/billing/receipts/{token}/invoice
GET /public/billing/receipts/{token}/invoice-status
GET /public/billing/invoices/{invoiceId}/pdf
GET /public/billing/invoices/{invoiceId}/xml
```

---

## 6.7 No permitido

```txt
login cliente
historial fiscal de cliente
subida de constancia fiscal
chat soporte
cancelación por cliente
modificación de factura ya timbrada
mostrar datos internos
```

---

# 7. Package: `packages/shared/`

## 7.1 Responsabilidad

Código compartido no visual.

Debe ser utilizable por backend y frontend.

Contenido:

```txt
enums
types
constants
formatters
validators
catalogs
utils
```

---

## 7.2 Mapa interno sugerido

```txt
packages/shared/src/
├─ enums/
│  ├─ billing.enums.ts
│  ├─ roles.enums.ts
│  └─ payments.enums.ts
│
├─ types/
│  ├─ money.types.ts
│  ├─ date.types.ts
│  └─ common.types.ts
│
├─ constants/
├─ formatters/
│  ├─ money.formatter.ts
│  └─ date.formatter.ts
│
├─ validators/
│  ├─ rfc.validator.ts
│  ├─ email.validator.ts
│  └─ postal-code.validator.ts
│
├─ catalogs/
│  ├─ tax-regimes.ts
│  └─ cfdi-uses.ts
│
└─ index.ts
```

---

## 7.3 Puede ser usado por

```txt
apps/api
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
packages/ui
packages/api-contracts si aplica
```

---

## 7.4 No permitido

```txt
React
componentes
fetch HTTP
dependencias de apps
lógica fiscal crítica que pertenezca al backend
```

---

# 8. Package: `packages/ui/`

## 8.1 Responsabilidad

Componentes visuales compartidos.

Debe contener UI reusable, no reglas de negocio.

---

## 8.2 Mapa interno sugerido

```txt
packages/ui/src/
├─ components/
│  ├─ button.tsx
│  ├─ input.tsx
│  ├─ select.tsx
│  ├─ modal.tsx
│  ├─ drawer.tsx
│  ├─ table.tsx
│  ├─ card.tsx
│  └─ toast.tsx
│
├─ forms/
├─ layout/
├─ feedback/
├─ tables/
├─ badges/
│  └─ status-badge.tsx
│
├─ tokens/
└─ index.ts
```

---

## 8.3 Puede ser usado por

```txt
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

---

## 8.4 No permitido

```txt
llamar APIs directamente
importar apps
resolver permisos
decidir si una factura puede cancelarse
decidir si un QR está vencido
```

Correcto:

```txt
recibe props y renderiza
```

Incorrecto:

```txt
consulta backend dentro del componente compartido
```

---

# 9. Package: `packages/api-contracts/`

## 9.1 Responsabilidad

Centralizar OpenAPI, schemas y cliente generado.

---

## 9.2 Mapa interno sugerido

```txt
packages/api-contracts/
├─ openapi/
│  └─ billing-openapi-v0.1.yaml
├─ generated/
│  ├─ client/
│  └─ types/
├─ schemas/
├─ src/
│  └─ index.ts
└─ README.md
```

---

## 9.3 Puede ser usado por

```txt
apps/api
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

---

## 9.4 Documento fuente

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

Regla:

```txt
si OpenAPI cambia, regenerar cliente
```

---

# 10. Package: `packages/config/`

## 10.1 Responsabilidad

Configuración compartida del monorepo.

Contenido:

```txt
eslint
prettier
tsconfig
testing
vite config base si aplica
```

---

## 10.2 Mapa interno sugerido

```txt
packages/config/
├─ eslint/
├─ prettier/
├─ tsconfig/
├─ testing/
└─ README.md
```

---

## 10.3 Puede ser usado por

```txt
todas las apps
todos los packages
```

---

# 11. Tabla de consumo de packages

| App/Package | shared | ui | api-contracts | config |
|---|---:|---:|---:|---:|
| apps/api | Sí | No | Sí | Sí |
| apps/pos-pwa | Sí | Sí | Sí | Sí |
| apps/manager-pwa | Sí | Sí | Sí | Sí |
| apps/public-billing-pwa | Sí | Sí | Sí | Sí |
| packages/ui | Sí | — | No | Sí |
| packages/shared | — | No | No | Sí |
| packages/api-contracts | Sí opcional | No | — | Sí |

---

# 12. Reglas de dependencia

## 12.1 Permitido

```txt
apps/* → packages/*
packages/ui → packages/shared
packages/api-contracts → packages/shared opcional
apps/api → packages/api-contracts
```

---

## 12.2 Prohibido

```txt
packages/shared → packages/ui
packages/shared → apps/*
packages/ui → apps/*
packages/ui → apps/api
apps/api → packages/ui
apps/* → apps/*
```

---

# 13. Mapa por funcionalidad

## 13.1 Venta POS fiscal

Documentos:

```txt
billing-pos-fiscal-flow-v0.1.md
billing-ticket-templates-v0.1.md
billing-openapi-v0.1.yaml
```

Código:

```txt
apps/pos-pwa/src/features/sales/
apps/pos-pwa/src/features/checkout/
apps/pos-pwa/src/features/tickets/
apps/api/src/modules/sales/
apps/api/src/modules/billing/
packages/api-contracts/
packages/shared/
packages/ui/
```

---

## 13.2 Portal autofactura

Documentos:

```txt
billing-public-autofactura-portal-v0.1.md
billing-openapi-v0.1.yaml
billing-error-catalog-v0.1.md
```

Código:

```txt
apps/public-billing-pwa/src/features/receipt/
apps/public-billing-pwa/src/features/tax-form/
apps/public-billing-pwa/src/features/invoice-status/
apps/api/src/modules/billing/
apps/api/src/workers/billing.worker.ts
packages/api-contracts/
packages/shared/
packages/ui/
```

---

## 13.3 Manager Billing

Documentos:

```txt
billing-manager-ui-spec-v0.1.md
billing-roles-permissions-v0.1.md
billing-openapi-v0.1.yaml
```

Código:

```txt
apps/manager-pwa/src/features/billing/
apps/api/src/modules/billing/
apps/api/src/workers/billing.worker.ts
packages/api-contracts/
packages/shared/
packages/ui/
```

---

## 13.4 Conciliación

Documentos:

```txt
billing-reconciliation-ui-spec-v0.1.md
billing-events-contract-v0.1.md
billing-error-catalog-v0.1.md
```

Código:

```txt
apps/manager-pwa/src/features/reconciliation/
apps/api/src/modules/reconciliation/
apps/api/src/workers/reconciliation.worker.ts
packages/api-contracts/
packages/shared/
packages/ui/
```

---

## 13.5 Exportaciones

Documentos:

```txt
billing-reporting-exports-v0.1.md
billing-openapi-v0.1.yaml
billing-events-contract-v0.1.md
```

Código:

```txt
apps/manager-pwa/src/features/exports/
apps/api/src/modules/exports/
apps/api/src/workers/exports.worker.ts
packages/api-contracts/
packages/shared/
packages/ui/
```

---

## 13.6 Configuración fiscal

Documentos:

```txt
billing-manager-ui-spec-v0.1.md
billing-business-rules-v0.1.md
billing-openapi-v0.1.yaml
```

Código:

```txt
apps/manager-pwa/src/features/settings/
apps/api/src/modules/billing/
apps/api/src/providers/facturapi/
packages/api-contracts/
packages/shared/
packages/ui/
```

---

# 14. Contratos por app

## 14.1 POS

Contratos principales:

```txt
CreateSaleRequest
CompleteSaleRequest
CompleteSaleResponse
PrintPayload
SaleSearchResponse
ReprintRequest
```

---

## 14.2 Manager

Contratos principales:

```txt
BillingDashboardResponse
InvoiceListResponse
InvoiceDetailResponse
GlobalBatchPreviewResponse
GlobalBatchResponse
ManualReviewCaseResponse
ReconciliationImportResponse
ReconciliationIncidentResponse
ExportJobResponse
FiscalConfigResponse
```

---

## 14.3 Public Billing

Contratos principales:

```txt
PublicReceiptResponse
PublicInvoiceRequest
PublicInvoiceStatusResponse
InvoiceDownloadLinks
```

---

## 14.4 API

Contratos principales:

```txt
todos los DTOs
event contracts
error catalog
OpenAPI
```

---

# 15. Reglas para nuevos módulos

Cuando se agregue un nuevo módulo:

```txt
1. definir docs/product si cambia negocio
2. definir docs/contracts si hay API
3. definir docs/frontend si hay UI
4. definir docs/backend si hay lógica servidor
5. ubicar app/package correcto
6. agregar QA
```

No crear código aislado sin documentación.

---

# 16. Reglas para mover código a packages

Mover a `packages/shared` si:

```txt
lo usa backend y frontend
no depende de React
no llama APIs
no contiene lógica de app
```

Mover a `packages/ui` si:

```txt
es visual
lo usan dos o más frontends
no llama APIs directamente
no decide reglas de negocio
```

Mover a `packages/api-contracts` si:

```txt
proviene de OpenAPI
es cliente generado
es schema de contrato
```

---

# 17. Antipatrones

No hacer:

```txt
duplicar DTOs en cada app
crear componentes con fetch interno en packages/ui
poner lógica fiscal crítica en frontend
poner pantallas dentro de apps/api
poner scripts de deploy dentro de apps
crear endpoints no documentados
crear roles improvisados
usar number para dinero
```

---

# 18. Definition of Done

Este documento queda completo si define:

```txt
[ ] mapa de apps
[ ] mapa de packages
[ ] responsabilidades por app
[ ] responsabilidades por package
[ ] dependencias permitidas
[ ] dependencias prohibidas
[ ] mapa por funcionalidad
[ ] contratos por app
[ ] reglas para nuevos módulos
[ ] antipatrones
```

---

## 19. Siguiente documento

Después de este documento, generar:

```txt
docs/architecture/deployment-architecture-v0.1.md
```
