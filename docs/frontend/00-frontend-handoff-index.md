# Tortilla Plus — Frontend Handoff Index V0.1

## 1. Objetivo

Este documento funciona como índice maestro para el equipo de frontend, UI/UX y QA.

Ordena todos los entregables necesarios para construir la PWA de **Tortilla Plus — V1 Operativa Comercial** sin perder la lógica ya definida:

```txt
POS Cajero
PWA Gerente
Caja
Ventas
Inventario
Producción
Clientes
Rutas
Facturación
Reportes
Permisos
Planes SaaS
```

---

## 2. Alcance frontend

La PWA frontend debe cubrir dos módulos principales:

```txt
Tortilla Plus PWA
├─ POS Cajero
└─ PWA Gerente
```

### POS Cajero

Enfocado en:

```txt
abrir caja
vender rápido
capturar tortilla/masa por kg
capturar tortilla/masa por monto
vender paquete 800g
vender productos retail
cobrar efectivo
cobrar tarjeta
cobrar mixto
manejar errores operativos
```

### PWA Gerente

Enfocada en:

```txt
dashboard operativo
caja
retiros pendientes
inventario
producción
productos
precios
clientes
crédito
rutas
facturación
reportes
configuración
```

---

## 3. Principio rector

El frontend no debe inventar reglas de negocio.

El frontend debe:

```txt
mostrar información clara
validar para mejorar UX
bloquear acciones evidentes
respetar permisos
respetar features del plan
enviar datos correctos al backend
mostrar errores operativos entendibles
```

El backend decide:

```txt
si se puede vender
si hay caja abierta
si el usuario tiene permiso
si el plan permite un módulo
si hay stock suficiente
si el pago es válido
si el crédito procede
si una factura se puede generar
```

---

## 4. Documentos frontend requeridos

### 4.1 Frontend Foundation V0.1

Define la base técnica de la PWA.

Ruta sugerida:

```txt
/docs/frontend/01-frontend-foundation.md
```

Debe incluir:

```txt
stack frontend
estructura de carpetas
rutas base
stores globales
API client
guards
layouts
variables de entorno
QA foundation
Definition of Done
```

Lectores principales:

```txt
frontend lead
frontend developer
QA frontend
```

---

### 4.2 Frontend POS Flow V0.1

Define el flujo funcional del POS.

Ruta sugerida:

```txt
/docs/frontend/02-pos-flow.md
```

Debe incluir:

```txt
login
selección de sucursal
validación de caja
apertura de caja
venta
captura por kilo
captura por monto
paquete 800g
retail
cobro
venta exitosa
errores POS
atajos de teclado
QA POS
```

Lectores principales:

```txt
frontend POS developer
QA frontend
diseñador UX
backend developer
```

---

### 4.3 Frontend POS Components Contract V0.1

Define componentes, props, hooks y stores del POS.

Ruta sugerida:

```txt
/docs/frontend/03-pos-components-contract.md
```

Debe incluir:

```txt
PosRouterPage
PosHeader
OpenCashForm
SalePage
WeightSaleInput
AmountSaleInput
PackageQuickButton
ProductQuickGrid
RetailProductCard
CartPanel
PaymentModal
CashPaymentForm
CardPaymentForm
MixedPaymentForm
SaleSuccessModal
PosErrorAlert
KeyboardShortcutsProvider
```

Lectores principales:

```txt
frontend developer
frontend lead
QA component
```

---

### 4.4 Frontend Manager PWA Flow V0.1

Define flujo funcional de la PWA del gerente.

Ruta sugerida:

```txt
/docs/frontend/04-manager-pwa-flow.md
```

Debe incluir:

```txt
dashboard
caja
detalle caja
retiros pendientes
inventario
producción
productos
precios
clientes
detalle cliente
rutas
detalle ruta
facturación
reportes
configuración
guards
errores
QA gerente
```

Lectores principales:

```txt
frontend manager module developer
diseñador UX
QA frontend
product owner
```

---

### 4.5 Frontend Sprint Plan V0.1

Convierte los documentos funcionales en sprints ejecutables.

Ruta sugerida:

```txt
/docs/frontend/05-frontend-sprint-plan.md
```

Sprints definidos:

```txt
FE-0 Frontend Foundation
FE-1 POS Caja
FE-2 POS Venta Core
FE-3 POS Cobro y Errores
FE-4 Manager Core
FE-5 Inventario y Productos
FE-6 Clientes y Rutas
FE-7 Facturación y Reportes
FE-8 Hardening
```

Lectores principales:

```txt
project manager
frontend lead
frontend developers
QA
```

---

### 4.6 UI/UX Design Handoff V0.1

Define criterios visuales y experiencia general.

Ruta sugerida:

```txt
/docs/frontend/ui-ux/01-uiux-design-handoff.md
```

Debe incluir:

```txt
principios UX
identidad visual
paleta
tipografía
layout POS
layout gerente
componentes visuales
estados visuales
responsive
microinteracciones
accesibilidad
QA UX
```

Lectores principales:

```txt
UI designer
UX designer
frontend lead
product owner
```

---

### 4.7 UI/UX Screen Specification V0.1

Define pantalla por pantalla con objetivo, componentes, estados, acciones y transiciones.

Ruta sugerida:

```txt
/docs/frontend/ui-ux/02-uiux-screen-specification.md
```

Pantallas cubiertas:

```txt
Login
Selección sucursal
POS Router
Apertura caja
Venta POS
Modal captura kg
Modal captura monto
Modal cobro
Venta exitosa
Sin conexión

Dashboard gerente
Caja
Detalle caja
Retiros pendientes
Inventario
Producción
Productos
Precios
Clientes
Detalle cliente
Rutas
Detalle ruta
Facturación
Reportes
Configuración
Blocked by plan
Blocked by permission
```

Lectores principales:

```txt
UI/UX designer
frontend developer
QA
```

---

### 4.8 UI/UX Wireframe Checklist V0.1

Checklist para revisar wireframes antes de implementación.

Ruta sugerida:

```txt
/docs/frontend/ui-ux/03-uiux-wireframe-checklist.md
```

Debe validar:

```txt
pantallas críticas
componentes base
tokens
estados
errores
bloqueos por plan
bloqueos por permiso
responsive
prototipos
handoff a dev
```

Lectores principales:

```txt
UI/UX designer
product owner
frontend lead
QA
```

---

## 5. Orden recomendado de lectura

El equipo debe leer en este orden:

```txt
1. Frontend Foundation V0.1
2. Frontend POS Flow V0.1
3. Frontend POS Components Contract V0.1
4. Frontend Manager PWA Flow V0.1
5. Frontend Sprint Plan V0.1
6. UI/UX Design Handoff V0.1
7. UI/UX Screen Specification V0.1
8. UI/UX Wireframe Checklist V0.1
```

### Para frontend developers

```txt
1. Frontend Foundation
2. POS Flow
3. POS Components Contract
4. Manager Flow
5. Frontend Sprint Plan
```

### Para diseñador UI/UX

```txt
1. UI/UX Design Handoff
2. UI/UX Screen Specification
3. UI/UX Wireframe Checklist
4. POS Flow
5. Manager Flow
```

### Para QA

```txt
1. Frontend Sprint Plan
2. POS Flow
3. POS Components Contract
4. Manager Flow
5. UI/UX Screen Specification
6. Wireframe Checklist
```

### Para backend

```txt
1. POS Flow
2. Manager Flow
3. Frontend Foundation
4. Backend OpenAPI Contract
```

---

## 6. Carpeta recomendada para repo frontend

```txt
/docs
├─ frontend/
│  ├─ 00-frontend-handoff-index.md
│  ├─ 01-frontend-foundation.md
│  ├─ 02-pos-flow.md
│  ├─ 03-pos-components-contract.md
│  ├─ 04-manager-pwa-flow.md
│  └─ 05-frontend-sprint-plan.md
│
└─ frontend/ui-ux/
   ├─ 01-uiux-design-handoff.md
   ├─ 02-uiux-screen-specification.md
   └─ 03-uiux-wireframe-checklist.md
```

No meter estos documentos en el repo backend, salvo como referencia externa.

---

## 7. Relación con backend

El frontend debe consumir contratos definidos en backend:

```txt
docs/backend/02-openapi-contract.md
docs/backend/03-critical-flows.md
docs/backend/04-backend-qa-core.md
docs/backend/05-backend-qa-modules.md
```

Dependencias críticas:

```txt
Auth
Branch
Subscription/features
Cash sessions
Products/prices
Sales
Inventory
Customers
Delivery
Billing
Reports
```

Regla:

Si falta endpoint backend, frontend puede usar mock temporal, pero el mock debe respetar el contrato definido.

---

## 8. Mocks frontend obligatorios

Para avanzar sin backend completo, crear mocks para:

```txt
POST /auth/login
GET /auth/me
GET /subscriptions/current
GET /subscriptions/features
GET /cash-sessions/open?branchId=
POST /cash-sessions/open
GET /products
GET /prices/branch/{branchId}
POST /sales
POST /sales/{id}/items
POST /sales/{id}/complete
POST /sales/{id}/cancel-draft
POST /cash-movements/{id}/authorize
POST /cash-movements/{id}/reject
GET /inventory/branch/{branchId}
GET /reports/sales-by-day
```

Los mocks deben cubrir:

```txt
happy path
error path
sin permisos
feature bloqueada
sin caja abierta
tarjeta sin referencia
pago no cuadra
stock insuficiente
```

---

## 9. Gates frontend

### Gate FE-A — Foundation

Antes de construir POS:

```txt
[ ] App corre
[ ] Router funciona
[ ] API client funciona
[ ] AuthStore funciona
[ ] BranchStore funciona
[ ] CashStore funciona
[ ] Guards funcionan
[ ] Layouts base existen
```

### Gate FE-B — POS caja

Antes de venta:

```txt
[ ] Login funcional
[ ] Branch activa persistente
[ ] Validación caja abierta
[ ] Apertura caja funcional
[ ] Error caja ya abierta manejado
```

### Gate FE-C — POS venta

Antes de gerente:

```txt
[ ] Venta por kg
[ ] Venta por monto
[ ] Paquete 800g
[ ] Retail
[ ] Carrito
[ ] Cobro efectivo
[ ] Cobro tarjeta
[ ] Cobro mixto
[ ] Venta exitosa
[ ] Errores POS manejados
```

### Gate FE-D — Manager core

Antes de módulos avanzados:

```txt
[ ] Dashboard operativo
[ ] Caja actual
[ ] Detalle caja
[ ] Retiros pendientes
[ ] Autorización con PIN
[ ] Bloqueos por permiso
```

### Gate FE-E — Release frontend

Antes de entregar:

```txt
[ ] QA POS pasa
[ ] QA Manager pasa
[ ] QA UI/UX pasa
[ ] Build production pasa
[ ] PWA instala
[ ] Errores backend mapeados
[ ] Estados loading/empty/error completos
```

---

## 10. Prioridad de implementación

### P0 — Arranque obligatorio

```txt
Frontend Foundation
Login
Select branch
POS Router
Open cash
POS Sale
Payment Modal
Sale Success
```

### P1 — Operación gerente básica

```txt
Manager Layout
Dashboard
Caja
Detalle caja
Retiros pendientes
Inventario
Producción
Productos
Precios
```

### P2 — Operación comercial avanzada

```txt
Clientes
Crédito
Rutas
Detalle ruta
Facturación
Reportes
Configuración
```

---

## 11. Riesgos frontend

### Riesgo 1: empezar por gerente

Mala prioridad. El gerente necesita datos generados por POS.

### Riesgo 2: diseñar POS como dashboard

El POS debe ser caja rápida, no panel analítico.

### Riesgo 3: duplicar reglas backend

Frontend valida para UX, backend decide.

### Riesgo 4: ignorar permisos/features

Rompe el modelo SaaS.

### Riesgo 5: hacer mobile-first el POS

POS debe ser desktop/tablet-first.

### Riesgo 6: no manejar errores

Si el cajero no entiende qué falló, la operación se detiene.

---

## 12. Definition of Ready para empezar frontend

Antes de escribir código frontend, debe existir:

```txt
[ ] Repo frontend creado
[ ] Stack aprobado
[ ] Frontend Foundation disponible
[ ] POS Flow disponible
[ ] POS Components Contract disponible
[ ] Manager Flow disponible
[ ] Sprint Plan disponible
[ ] UI/UX Design Handoff disponible
[ ] Screen Specification disponible
[ ] Wireframe Checklist disponible
[ ] Backend contract accesible
```

---

## 13. Definition of Done del paquete frontend handoff

```txt
[ ] Documentos frontend ordenados
[ ] Documentos UI/UX ordenados
[ ] Ruta de implementación definida
[ ] Gates de avance definidos
[ ] Prioridades P0/P1/P2 definidas
[ ] Riesgos documentados
[ ] Relación backend/frontend clara
[ ] Mocks mínimos definidos
[ ] QA inicial definido
```

---

## 14. Siguiente paso real

Crear los documentos en el repo frontend:

```txt
/docs/frontend/00-frontend-handoff-index.md
/docs/frontend/01-frontend-foundation.md
/docs/frontend/02-pos-flow.md
/docs/frontend/03-pos-components-contract.md
/docs/frontend/04-manager-pwa-flow.md
/docs/frontend/05-frontend-sprint-plan.md

/docs/frontend/ui-ux/01-uiux-design-handoff.md
/docs/frontend/ui-ux/02-uiux-screen-specification.md
/docs/frontend/ui-ux/03-uiux-wireframe-checklist.md
```

Después de eso, el primer sprint ejecutable es:

```txt
FE-0 — Frontend Foundation
```

No conviene empezar en Figma ni en pantallas finales antes de dejar el repo frontend preparado.
