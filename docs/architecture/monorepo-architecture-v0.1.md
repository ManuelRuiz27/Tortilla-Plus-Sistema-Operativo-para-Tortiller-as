# Tortilla Plus — Monorepo Architecture V0.1

## 1. Propósito

Este documento define la arquitectura base del monorepo de **Tortilla Plus — V1 Operativa Comercial**.

Su función es establecer:

```txt
estructura de carpetas
responsabilidad de cada app
responsabilidad de cada package
reglas de dependencia
ubicación de documentación
ubicación de contratos
ubicación de infraestructura
criterios para desarrollo incremental
```

Ubicación recomendada:

```txt
docs/architecture/monorepo-architecture-v0.1.md
```

---

## 2. Principio general

El monorepo debe permitir construir y mantener el sistema completo sin mezclar responsabilidades.

Regla central:

```txt
apps ejecutan
packages comparten
docs deciden
contracts integran
infra despliega
tools automatiza
```

---

## 3. Objetivo del monorepo

El monorepo debe soportar:

```txt
POS cajero
Manager / panel gerente
Portal público de autofactura
API principal
workers fiscales
jobs de conciliación
scheduler
contratos OpenAPI
componentes UI compartidos
tipos compartidos
infraestructura local y productiva
```

---

## 4. Estructura raíz recomendada

```txt
tortilla-plus/
├─ apps/
│  ├─ api/
│  ├─ pos-pwa/
│  ├─ manager-pwa/
│  └─ public-billing-pwa/
│
├─ packages/
│  ├─ shared/
│  ├─ ui/
│  ├─ api-contracts/
│  └─ config/
│
├─ docs/
│  ├─ backend/
│  ├─ frontend/
│  ├─ product/
│  ├─ contracts/
│  └─ architecture/
│
├─ infra/
│  ├─ docker/
│  ├─ nginx/
│  └─ deploy/
│
├─ tools/
│  └─ scripts/
│
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ README.md
└─ .env.example
```

---

## 5. Carpeta `apps/`

`apps/` contiene aplicaciones ejecutables.

Cada app debe poder correr, compilarse y desplegarse de forma independiente.

```txt
apps/
├─ api/
├─ pos-pwa/
├─ manager-pwa/
└─ public-billing-pwa/
```

---

# 6. `apps/api/`

## 6.1 Propósito

Backend principal del sistema.

Responsabilidades:

```txt
autenticación
usuarios
roles
sucursales
ventas
pagos
clientes
rutas
productos
inventario
fiscal billing
conciliación
exportaciones
workers
scheduler
auditoría
```

---

## 6.2 Módulos internos esperados

```txt
apps/api/src/
├─ modules/
│  ├─ auth/
│  ├─ users/
│  ├─ branches/
│  ├─ products/
│  ├─ inventory/
│  ├─ customers/
│  ├─ routes/
│  ├─ sales/
│  ├─ cash-sessions/
│  ├─ billing/
│  ├─ reconciliation/
│  ├─ exports/
│  └─ audit/
│
├─ workers/
├─ scheduler/
├─ providers/
├─ common/
└─ main.ts
```

---

## 6.3 Regla importante

`apps/api/` no debe contener componentes visuales.

No debe importar desde:

```txt
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

Sí puede importar desde:

```txt
packages/shared
packages/api-contracts
packages/config
```

---

# 7. `apps/pos-pwa/`

## 7.1 Propósito

Aplicación de punto de venta para caja.

Prioridad:

```txt
velocidad
teclado
mínimos clics
operación continua
```

Responsabilidades:

```txt
captura de venta
cobro
ticket simple
ticket QR
búsqueda rápida
reimpresión limitada
cash session
venta cliente / ruta si aplica
```

---

## 7.2 Módulos POS esperados

```txt
apps/pos-pwa/src/
├─ app/
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
└─ main.tsx
```

---

## 7.3 Reglas POS

El POS no debe implementar:

```txt
cancelación CFDI
confirmación de globales
manual review fiscal
configuración fiscal
exportaciones fiscales
conciliación avanzada
```

Estas acciones pertenecen a Manager.

---

# 8. `apps/manager-pwa/`

## 8.1 Propósito

Aplicación administrativa para Supervisor y Gerente.

Responsabilidades:

```txt
dashboard operativo
clientes
rutas
precios por cliente
inventario
productos
caja
reportes
billing manager
conciliación
exportaciones
configuración fiscal
```

---

## 8.2 Módulos Manager esperados

```txt
apps/manager-pwa/src/
├─ app/
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
│  └─ settings/
│
├─ components/
├─ services/
└─ main.tsx
```

---

## 8.3 Regla Manager

Manager debe concentrar control, revisión y administración.

No debe intentar replicar la velocidad del POS.

---

# 9. `apps/public-billing-pwa/`

## 9.1 Propósito

Portal público de autofactura.

Responsabilidades:

```txt
abrir QR
consultar ticket
mostrar resumen
capturar datos fiscales
solicitar factura
consultar estado
descargar PDF
descargar XML
mostrar QR vencido
mostrar manual review
```

---

## 9.2 Módulos esperados

```txt
apps/public-billing-pwa/src/
├─ app/
├─ features/
│  ├─ receipt/
│  ├─ tax-form/
│  ├─ invoice-status/
│  └─ downloads/
│
├─ components/
├─ services/
└─ main.tsx
```

---

## 9.3 Regla pública

Esta app no requiere login.

Debe usar token público seguro.

No debe exponer:

```txt
datos internos
IDs sensibles
logs
secretos
información de otros tickets
```

---

# 10. Carpeta `packages/`

`packages/` contiene código reutilizable.

No debe contener lógica específica de pantalla completa ni lógica acoplada a una app.

```txt
packages/
├─ shared/
├─ ui/
├─ api-contracts/
└─ config/
```

---

# 11. `packages/shared/`

## 11.1 Propósito

Tipos, constantes, helpers y lógica compartida segura.

Contenido esperado:

```txt
packages/shared/src/
├─ enums/
├─ types/
├─ constants/
├─ formatters/
├─ validators/
├─ catalogs/
└─ index.ts
```

---

## 11.2 Ejemplos

```txt
Money formatter
Date formatter
FiscalStatus enum
InvoiceStatus enum
PaymentMethod enum
Tax regime catalog
CFDI use catalog
Role constants
```

---

## 11.3 Regla

`packages/shared/` no debe importar React.

Tampoco debe importar código de apps.

Debe ser compatible con backend y frontend.

---

# 12. `packages/ui/`

## 12.1 Propósito

Componentes visuales compartidos por frontends.

Contenido esperado:

```txt
packages/ui/src/
├─ components/
├─ forms/
├─ layout/
├─ feedback/
├─ tables/
├─ badges/
├─ tokens/
└─ index.ts
```

---

## 12.2 Componentes esperados

```txt
Button
Input
Select
Modal
Drawer
Table
Badge
Toast
Card
Tabs
Sidebar
DateRangePicker
CurrencyField
StatusBadge
```

---

## 12.3 Regla

`packages/ui/` puede depender de React.

No debe depender de lógica concreta de negocio.

Correcto:

```txt
FiscalStatusBadge recibe status y label
```

Incorrecto:

```txt
FiscalStatusBadge decide si una factura puede cancelarse
```

---

# 13. `packages/api-contracts/`

## 13.1 Propósito

Centralizar contratos OpenAPI y cliente generado.

Estructura:

```txt
packages/api-contracts/
├─ openapi/
│  └─ billing-openapi-v0.1.yaml
├─ generated/
├─ schemas/
├─ src/
└─ README.md
```

---

## 13.2 Fuente oficial

La fuente oficial vive en:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

Puede copiarse o sincronizarse hacia:

```txt
packages/api-contracts/openapi/billing-openapi-v0.1.yaml
```

---

## 13.3 Uso

Consumidores:

```txt
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
apps/api
```

---

## 13.4 Regla

No definir tipos duplicados manualmente si ya existen en OpenAPI.

---

# 14. `packages/config/`

## 14.1 Propósito

Configuraciones compartidas.

Contenido esperado:

```txt
packages/config/
├─ eslint/
├─ prettier/
├─ tsconfig/
├─ vite/
└─ testing/
```

---

## 14.2 Regla

Las apps deben heredar configuración base.

Evitar configuraciones inconsistentes entre apps.

---

# 15. Carpeta `docs/`

`docs/` contiene la fuente de verdad del diseño funcional, técnico y contractual.

```txt
docs/
├─ backend/
├─ frontend/
├─ product/
├─ contracts/
└─ architecture/
```

---

## 15.1 `docs/backend/`

Contiene especificaciones de implementación backend.

Ejemplo:

```txt
docs/backend/billing/
```

Incluye:

```txt
domain technical spec
ERD
jobs
queues
scheduler
implementation guide
QA backend
```

---

## 15.2 `docs/frontend/`

Contiene especificaciones de pantallas, UX y estados.

Ejemplo:

```txt
docs/frontend/billing/
```

Incluye:

```txt
POS fiscal flow
portal autofactura
manager billing UI
reconciliation UI
roles
ticket templates
exports
frontend QA
```

---

## 15.3 `docs/product/`

Contiene reglas de negocio y decisiones.

Ejemplo:

```txt
docs/product/billing/
```

Incluye:

```txt
business rules
user flows
decision log
```

---

## 15.4 `docs/contracts/`

Contiene contratos de integración.

Incluye:

```txt
OpenAPI
API conventions
DTO catalog
error catalog
events contract
```

---

## 15.5 `docs/architecture/`

Contiene arquitectura general.

Incluye:

```txt
monorepo architecture
context graph
apps/packages map
deployment architecture
local docker
ADR index
```

---

# 16. Carpeta `infra/`

## 16.1 Propósito

Infraestructura y despliegue.

Estructura:

```txt
infra/
├─ docker/
├─ nginx/
└─ deploy/
```

---

## 16.2 `infra/docker/`

Debe contener:

```txt
docker-compose.local.yml
docker-compose.staging.yml si aplica
Dockerfile.api
Dockerfile.worker
Dockerfile.frontend si aplica
```

---

## 16.3 `infra/nginx/`

Debe contener configuración de reverse proxy.

Dominios esperados:

```txt
api.tortillaplus.mx
pos.tortillaplus.mx
manager.tortillaplus.mx
factura.tortillaplus.mx
```

---

## 16.4 `infra/deploy/`

Debe contener scripts o manifests de despliegue.

Puede incluir:

```txt
render
vercel
vps
systemd
nginx
backup
```

---

# 17. Carpeta `tools/`

## 17.1 Propósito

Scripts internos del monorepo.

Estructura:

```txt
tools/
└─ scripts/
```

Scripts esperados:

```txt
generate-api-client
validate-openapi
seed-dev
reset-db
backup-db
lint-docs
```

---

# 18. Dependencias permitidas

## 18.1 Apps pueden importar packages

Correcto:

```txt
apps/pos-pwa → packages/ui
apps/pos-pwa → packages/shared
apps/pos-pwa → packages/api-contracts

apps/manager-pwa → packages/ui
apps/manager-pwa → packages/shared
apps/manager-pwa → packages/api-contracts

apps/api → packages/shared
apps/api → packages/api-contracts
```

---

## 18.2 Apps no deben importarse entre sí

Incorrecto:

```txt
apps/manager-pwa → apps/pos-pwa
apps/pos-pwa → apps/manager-pwa
apps/api → apps/manager-pwa
```

---

## 18.3 UI no debe importar API concreta

`packages/ui/` no debe llamar endpoints.

Correcto:

```txt
componente recibe props
```

Incorrecto:

```txt
componente hace fetch directo a /manager/billing
```

---

## 18.4 Shared no debe importar UI

Incorrecto:

```txt
packages/shared → packages/ui
```

---

# 19. Stack recomendado

## 19.1 Frontend

```txt
React
Vite
TypeScript
PWA
TanStack Query
React Hook Form
Zod
```

UI:

```txt
Tailwind
shadcn/ui o componentes propios
```

---

## 19.2 Backend

```txt
Node.js
TypeScript
Fastify o NestJS
Prisma
PostgreSQL
Redis
BullMQ
```

---

## 19.3 Contratos

```txt
OpenAPI 3.1
TypeScript generated client
DTOs compartidos
```

---

## 19.4 Infra

```txt
Docker
Nginx
PostgreSQL
Redis
Object Storage para XML/exportaciones
```

---

# 20. Servicios backend esperados

Aunque `apps/api/` puede iniciar como monolito modular, debe separar internamente:

```txt
HTTP API
workers
scheduler
provider adapters
audit logger
```

Estructura conceptual:

```txt
apps/api/
├─ src/main.ts
├─ src/workers/main.ts
├─ src/scheduler/main.ts
└─ src/providers/
```

---

# 21. Workers esperados

Workers V1:

```txt
billing-worker
reconciliation-worker
export-worker
notification-worker futuro
```

---

## 21.1 billing-worker

Responsable de:

```txt
timbrado de facturas
reintentos
manual review
global diaria
global rezagados
cancelaciones
validación fiscal
```

---

## 21.2 reconciliation-worker

Responsable de:

```txt
procesar CSV/XLSX
normalizar movimientos
generar candidatos
crear incidencias
```

---

## 21.3 export-worker

Responsable de:

```txt
generar CSV
generar XLSX
generar ZIP XML
marcar export ready
manejar expiración
```

---

# 22. Scheduler esperado

Scheduler debe manejar:

```txt
preparar global diaria
detectar QR vencidos
preparar global rezagados
limpiar exports expirados
reintentos pendientes si aplica
```

---

# 23. Storage

Se requiere almacenamiento para:

```txt
XML fiscales
exports generados
archivos importados de conciliación
```

Reglas:

```txt
XML persistente
PDF bajo demanda
exports expiran
evidencia de cancelación solo URL externa
```

---

# 24. Base de datos

La base de datos debe soportar:

```txt
multi-sucursal
roles
ventas
pagos
tickets QR
facturas
globales
manual review
conciliación
exports
audit logs
```

Recomendación:

```txt
PostgreSQL
Prisma
```

---

# 25. Redis / Queue

Redis se usa para:

```txt
colas
retries
jobs asincrónicos
locks
rate limit
```

Colas esperadas:

```txt
billing
reconciliation
exports
scheduler
```

---

# 26. Documentación como fuente de verdad

Regla:

```txt
docs/product define negocio
docs/contracts define integración
docs/backend define implementación servidor
docs/frontend define pantallas
docs/architecture define estructura
```

Cuando haya conflicto:

```txt
1. product
2. contracts
3. backend/frontend
4. architecture
```

Si el contrato contradice una regla de producto, se debe corregir el contrato.

---

# 27. Flujo de desarrollo recomendado

## 27.1 Antes de programar

```txt
leer docs/product
leer docs/contracts
leer docs/architecture
leer docs/backend o docs/frontend según tarea
```

---

## 27.2 Para backend

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/backend/billing/
docs/architecture/
```

---

## 27.3 Para frontend

Leer:

```txt
docs/product/billing/
docs/contracts/
docs/frontend/billing/
docs/architecture/
```

---

## 27.4 Para QA

Leer:

```txt
docs/product/billing/
docs/contracts/billing-error-catalog-v0.1.md
docs/frontend/billing/billing-frontend-qa-checklist-v0.1.md
docs/backend/billing/
```

---

# 28. Reglas para Codex

Cuando Codex trabaje en el repo:

```txt
no debe inventar roles
no debe inventar estados fiscales
no debe mover reglas de Manager a POS
no debe duplicar DTOs si existen en OpenAPI
no debe crear pantallas fuera de docs/frontend
no debe crear endpoints fuera de docs/contracts sin actualizar contrato
no debe cambiar reglas de negocio sin actualizar docs/product
```

---

# 29. Orden de implementación recomendado

## Fase 1 — Base monorepo

```txt
pnpm workspace
turbo
apps vacías
packages base
config compartida
docker local básico
```

---

## Fase 2 — Contratos

```txt
OpenAPI validado
api-contracts generado
DTOs compartidos
cliente TypeScript
```

---

## Fase 3 — Backend core

```txt
auth
roles
branches
products
sales
payments
billing core
```

---

## Fase 4 — POS

```txt
venta rápida
modal cobro
ticket simple
ticket QR
búsqueda rápida
reimpresión
```

---

## Fase 5 — Portal público

```txt
receipt por token
formulario fiscal
polling
descarga PDF/XML
QR vencido
manual review
```

---

## Fase 6 — Manager Billing

```txt
dashboard fiscal
facturas
global diaria
global rezagados
manual review
cancelaciones
config fiscal
```

---

## Fase 7 — Conciliación

```txt
CSV/XLSX
matching score
incidencias
pending_reference
```

---

## Fase 8 — Exportaciones

```txt
CSV
XLSX
ZIP XML
jobs
descargas
```

---

# 30. Riesgos arquitectónicos

## 30.1 Exceso de apps muy pronto

Riesgo:

```txt
demasiados frontends aumentan coordinación
```

Mitigación:

```txt
usar packages compartidos
api-contracts
tokens UI
rutas claras
```

---

## 30.2 OpenAPI desactualizado

Riesgo:

```txt
frontend/backend se separan
```

Mitigación:

```txt
OpenAPI como contrato fuente
validación CI
cliente generado
```

---

## 30.3 POS contaminado con lógica fiscal compleja

Riesgo:

```txt
flujo de caja lento
```

Mitigación:

```txt
Manager concentra operaciones fiscales críticas
POS solo imprime y cobra
```

---

## 30.4 Workers ignorados en MVP

Riesgo:

```txt
timbrado, exports y conciliación bloquean requests
```

Mitigación:

```txt
BullMQ desde fase temprana
jobs asíncronos
status polling
```

---

# 31. No implementar en arquitectura V1

No incluir por ahora:

```txt
microservicios separados
Kubernetes
multi-RFC operativo
open banking automático
contabilidad electrónica
roles personalizados
frontend SSR complejo
event sourcing completo
```

El monorepo puede prepararse para crecer sin sobrediseñar V1.

---

# 32. Definition of Done

Este documento queda completo si define:

```txt
[ ] estructura raíz
[ ] apps
[ ] packages
[ ] docs
[ ] infra
[ ] tools
[ ] dependencias permitidas
[ ] stack recomendado
[ ] workers
[ ] scheduler
[ ] storage
[ ] reglas para Codex
[ ] orden de implementación
[ ] riesgos
[ ] fuera de alcance V1
```

---

## 33. Siguiente documento

Después de este documento, generar:

```txt
docs/architecture/implementation-context-graph-v0.1.md
```
