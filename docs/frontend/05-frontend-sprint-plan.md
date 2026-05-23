# Tortilla Plus — Frontend Sprint Plan V0.1

## 1. Objetivo

Definir el plan de desarrollo frontend por sprints para construir:

```txt
PWA única
├─ POS
└─ Gerente
```

La prioridad es validar operación real antes de estética avanzada.

---

## 2. Principio de ejecución

No empezar por dashboards ni reportes.

Orden correcto:

```txt
1. Foundation
2. POS caja
3. POS venta
4. POS cobro y errores
5. Manager core
6. Inventario/productos
7. Clientes/rutas
8. Facturación/reportes
9. Hardening
```

Motivo: el gerente depende de datos generados por POS, caja, venta e inventario.

---

## 3. Roadmap frontend

| Sprint | Nombre | Resultado |
|---|---|---|
| FE-0 | Frontend Foundation | App base, router, stores, guards, API client y layouts. |
| FE-1 | POS Caja | Login, sucursal, caja abierta y apertura de caja. |
| FE-2 | POS Venta Core | Venta por kg, monto, paquete 800g, retail y carrito. |
| FE-3 | POS Cobro y Errores | Cobro efectivo, tarjeta, mixto, éxito, errores y atajos. |
| FE-4 | Manager Core | Layout gerente, dashboard operativo, caja y retiros. |
| FE-5 | Inventario y Productos | Inventario, producción, merma, productos y precios. |
| FE-6 | Clientes y Rutas | Clientes, crédito, rutas, pedidos, cobros y liquidación. |
| FE-7 | Facturación y Reportes | CFDI, global diaria, conciliación y reportes básicos. |
| FE-8 | Hardening | QA, accesibilidad, performance, PWA y release candidate. |

---

## 4. FE-0 — Frontend Foundation

### Objetivo

Crear la base técnica de la PWA.

### Alcance

```txt
React + Vite + TypeScript
React Router
TanStack Query
Zustand
Zod
Tailwind
shadcn/ui
vite-plugin-pwa
API client
AuthGuard
BranchGuard
PermissionGuard
FeatureGuard
Layouts base
```

### Rutas mínimas

```txt
/login
/app/select-branch
/app/pos
/app/manager
/404
```

### Entregables

```txt
/src/app/router.tsx
/src/app/providers.tsx
/src/api/http-client.ts
/src/api/api-error.ts
/src/shared/stores/auth.store.ts
/src/shared/stores/branch.store.ts
/src/shared/stores/cash.store.ts
/src/shared/layouts/auth-layout.tsx
/src/shared/layouts/pos-layout.tsx
/src/shared/layouts/manager-layout.tsx
```

### Checklist

```txt
[ ] Crear proyecto Vite React TS
[ ] Instalar dependencias base
[ ] Configurar Tailwind
[ ] Configurar shadcn/ui
[ ] Configurar PWA manifest
[ ] Crear router
[ ] Crear providers
[ ] Crear API client
[ ] Crear parser de ApiError
[ ] Crear AuthStore
[ ] Crear BranchStore
[ ] Crear CashStore
[ ] Crear guards
[ ] Crear layouts
[ ] Crear .env.example
[ ] Crear páginas placeholder
```

### Definition of Done

```txt
[ ] npm run dev funciona
[ ] npm run build funciona
[ ] rutas base funcionan
[ ] guards redirigen correctamente
[ ] API client agrega token
[ ] errores backend se parsean
[ ] PWA manifest existe
```

---

## 5. FE-1 — POS Caja

### Objetivo

Permitir que el cajero entre al POS y abra caja.

### Alcance

```txt
Login
Selección de sucursal
Validación de caja abierta
Apertura de caja
Estado de caja
```

### Rutas

```txt
/login
/app/select-branch
/app/pos
/app/pos/cash/open
```

### Componentes

```txt
LoginForm
BranchSelector
PosRouterPage
PosHeader
OpenCashForm
PosErrorAlert
```

### Endpoints

```txt
POST /auth/login
GET /auth/me
GET /cash-sessions/open?branchId=
POST /cash-sessions/open
```

### Checklist

```txt
[ ] Login funcional
[ ] Guardar sesión
[ ] Restaurar sesión al recargar
[ ] Seleccionar sucursal activa
[ ] Validar caja abierta
[ ] Redirigir a apertura si no hay caja
[ ] Abrir caja
[ ] Mostrar advertencia por discrepancia
[ ] Guardar cashSessionId
[ ] Redirigir a venta placeholder
```

### QA

```txt
[ ] Login correcto redirige
[ ] Login incorrecto muestra error
[ ] Usuario sin sucursal va a select-branch
[ ] POS sin caja va a apertura
[ ] Apertura con saldo negativo bloquea
[ ] Apertura con discrepancia advierte
[ ] Apertura exitosa redirige
```

---

## 6. FE-2 — POS Venta Core

### Objetivo

Construir la pantalla de venta y carrito.

### Alcance

```txt
Carrito local
Productos activos
Precios por sucursal
Venta por kilo
Venta por monto
Paquete 800g
Retail
Cancelar ticket local
```

### Ruta

```txt
/app/pos/sale
```

### Componentes

```txt
SalePage
ProductQuickGrid
WeightSaleInput
AmountSaleInput
PackageQuickButton
RetailProductCard
CartPanel
CartItemRow
```

### Hooks

```txt
usePosProducts
usePosCartStore
```

### Endpoints

```txt
GET /products
GET /prices/branch/{branchId}
```

### Checklist

```txt
[ ] Cargar productos activos
[ ] Cargar precios por sucursal
[ ] Separar tortilla
[ ] Separar masa
[ ] Detectar paquete 800g
[ ] Separar retail
[ ] Agregar tortilla por kg
[ ] Agregar tortilla por monto
[ ] Agregar masa por kg
[ ] Agregar masa por monto
[ ] Agregar paquete
[ ] Agregar retail
[ ] Calcular total local
[ ] Eliminar item
[ ] Vaciar carrito
[ ] Cancelar ticket local
```

### QA

```txt
[ ] Tortilla por kg calcula total
[ ] Tortilla por monto calcula kg
[ ] Masa por kg calcula total
[ ] Masa por monto calcula kg
[ ] Paquete agrega saleMode by_package
[ ] Retail agrega 1 unidad
[ ] Eliminar item recalcula total
[ ] Carrito vacío deshabilita cobrar
```

---

## 7. FE-3 — POS Cobro y Errores

### Objetivo

Completar venta real contra backend.

### Alcance

```txt
Crear venta draft
Completar venta
Cobro efectivo
Cobro tarjeta
Cobro mixto
Modal éxito
Errores operativos
Atajos teclado
```

### Componentes

```txt
PaymentModal
CashPaymentForm
CardPaymentForm
MixedPaymentForm
SaleSuccessModal
KeyboardShortcutsProvider
PosErrorAlert
```

### Hooks

```txt
useCreateSale
useCompleteSale
useCancelDraftSale
usePosKeyboardShortcuts
```

### Endpoints

```txt
POST /sales
POST /sales/{id}/items
POST /sales/{id}/complete
POST /sales/{id}/cancel-draft
```

### Checklist

```txt
[ ] Crear venta draft con branchId
[ ] Agregar items del carrito con POST /sales/{id}/items
[ ] Completar venta efectivo
[ ] Completar venta tarjeta
[ ] Completar venta mixta
[ ] Validar efectivo recibido >= total
[ ] Validar tarjeta con referencia
[ ] Validar suma mixta exacta
[ ] Mostrar venta exitosa
[ ] Limpiar carrito solo si completed
[ ] Mantener carrito si falla backend
[ ] Cancelar draft si fue creado
[ ] Implementar F1-F5
[ ] Implementar F8 cobrar
[ ] Implementar F9 cancelar
[ ] Implementar Esc/Enter contextual
```

### Errores obligatorios

```txt
NO_OPEN_CASH_SESSION
CARD_REFERENCE_REQUIRED
PAYMENT_TOTAL_MISMATCH
PRODUCT_INACTIVE
PRICE_NOT_FOUND
INSUFFICIENT_STOCK
NEGATIVE_STOCK_NOT_ALLOWED
BRANCH_ACCESS_DENIED
```

### QA

```txt
[ ] Efectivo exacto completa venta
[ ] Efectivo mayor calcula cambio
[ ] Efectivo menor bloquea
[ ] Tarjeta sin referencia bloquea
[ ] Tarjeta con referencia completa
[ ] Mixto incorrecto bloquea
[ ] Mixto correcto completa
[ ] Backend error mantiene carrito
[ ] Venta exitosa limpia carrito
[ ] F8 abre cobro
[ ] F9 pide cancelar
```

---

## 8. FE-4 — Manager Core

### Objetivo

Construir la PWA Gerente base con operación diaria.

### Alcance

```txt
ManagerLayout
Dashboard operativo
Caja actual
Detalle de caja
Retiros pendientes
Autorizar retiro
Rechazar retiro
```

### Rutas

```txt
/app/manager
/app/manager/dashboard
/app/manager/cash
/app/manager/cash/:cashSessionId
/app/manager/withdrawals
```

### Componentes

```txt
ManagerLayout
ManagerTopbar
ManagerSidebar
DashboardCards
CashSessionSummaryCard
PendingWithdrawalsTable
AuthorizeWithdrawalModal
CashDetailPanel
```

### Endpoints

```txt
GET /reports/sales-by-day
GET /cash-sessions/open?branchId=
GET /cash-sessions/{id}/summary
GET /cash-movements?branchId=&status=         pendiente de contrato backend
POST /cash-movements/{id}/authorize
POST /cash-movements/{id}/reject
```

### Checklist

```txt
[ ] Crear ManagerLayout
[ ] Crear sidebar
[ ] Crear topbar
[ ] Mostrar sucursal activa
[ ] Mostrar estado de suscripción
[ ] Dashboard ventas del día
[ ] Dashboard caja actual
[ ] Dashboard retiros pendientes
[ ] Lista retiros pendientes
[ ] Autorizar retiro con PIN
[ ] Rechazar retiro
[ ] Mostrar detalle caja
[ ] Bloquear cierre si hay retiros pendientes
```

### QA

```txt
[ ] Gerente ve dashboard
[ ] Cajero no ve acciones gerente
[ ] Retiros pendientes aparecen
[ ] PIN incorrecto no autoriza
[ ] PIN correcto autoriza
[ ] Caja con retiro pendiente advierte bloqueo
```

---

## 9. FE-5 — Inventario, Producción, Productos y Precios

### Objetivo

Dar al gerente control de mercancía y catálogo.

### Rutas

```txt
/app/manager/inventory
/app/manager/production
/app/manager/products
/app/manager/prices
```

### Alcance

```txt
Inventario por sucursal
Ajuste manual
Producción diaria
Merma
Productos CRUD base
Configuración paquete
Precios por sucursal
```

### Endpoints

```txt
GET /inventory/branch/{branchId}
POST /inventory/adjustments
POST /production/batches
PATCH /production/batches/{id}/close
GET /production/batches?branchId=&date=
POST /waste-records
GET /products
POST /products
PATCH /products/{id}
GET /prices/branch/{branchId}
POST /prices/branch
```

### Checklist

```txt
[ ] Inventario tabla
[ ] Estado stock bajo
[ ] Estado stock negativo
[ ] Ajuste entrada/salida
[ ] Motivo requerido
[ ] Producción tortilla
[ ] Producción masa
[ ] Cierre producción
[ ] Merma
[ ] CRUD productos
[ ] Activar/desactivar producto
[ ] Configurar paquete
[ ] Ver precios
[ ] Cambiar precio con vigencia
```

### QA

```txt
[ ] Stock negativo se destaca
[ ] Ajuste sin motivo bloquea
[ ] Producción solo tortilla/masa
[ ] Paquete exige producto base y peso
[ ] Precio nuevo actualiza vista
[ ] Producto usado no se borra físicamente
```

---

## 10. FE-6 — Clientes y Rutas

### Objetivo

Implementar administración comercial recurrente y reparto.

### Rutas

```txt
/app/manager/customers
/app/manager/customers/:customerId
/app/manager/routes
/app/manager/routes/:routeId
```

### Alcance Clientes

```txt
Listado clientes
Crear/editar cliente
Habilitar crédito
Ver saldo
Precios especiales
```

### Alcance Rutas

```txt
Repartidores
Rutas
Clientes por ruta
Pedidos
Carga
Entrega
Cobro en ruta
Devolución
Liquidación
Depósito a caja
```

### Endpoints

```txt
GET /customers
POST /customers
PATCH /customers/{id}
GET /customers/{id}                           pendiente de contrato backend
GET /customers/{id}/balance
POST /customers/{id}/credit
POST /customers/{id}/prices

GET /delivery-drivers
POST /delivery-drivers
GET /delivery-routes
POST /delivery-routes
GET /delivery-orders                          pendiente de contrato backend
POST /delivery-orders
POST /delivery-orders/{id}/prepare
POST /delivery-orders/{id}/load
POST /delivery-orders/{id}/deliver
POST /delivery-orders/{id}/payments
POST /delivery-returns/{id}/review
POST /delivery-settlements/{id}/close
POST /delivery-settlements/{id}/deposit-to-cash
```

### Checklist

```txt
[ ] Clientes tabla
[ ] Crear cliente
[ ] Editar cliente
[ ] Habilitar crédito
[ ] Mostrar límite
[ ] Mostrar saldo
[ ] Crear precio especial
[ ] Crear repartidor
[ ] Crear ruta
[ ] Asignar cliente a ruta
[ ] Crear pedido
[ ] Preparar pedido
[ ] Cargar pedido
[ ] Registrar entrega
[ ] Registrar cobro
[ ] Revisar devolución
[ ] Liquidar ruta
[ ] Depositar efectivo a caja
```

### QA

```txt
[ ] Cliente con crédito muestra saldo
[ ] Precio especial visible
[ ] Rutas bloqueadas en plan free
[ ] Carga descuenta inventario
[ ] Cobro de ruta no modifica caja
[ ] Depósito a caja exige caja abierta
```

---

## 11. FE-7 — Facturación, Conciliación y Reportes

### Objetivo

Completar operación comercial y administrativa.

### Rutas

```txt
/app/manager/billing
/app/manager/reports
/app/manager/reconciliation
```

### Alcance

```txt
Factura individual
Factura global diaria
Documentos XML/PDF
Cancelación CFDI
Conciliación manual
Reportes básicos
```

### Endpoints

```txt
POST /billing/invoices/individual
POST /billing/invoices/global-daily
POST /billing/invoices/{id}/stamp
POST /billing/invoices/{id}/cancel
GET /billing/invoices/{id}/documents

POST /reconciliation/batches
POST /reconciliation/batches/{id}/items
POST /reconciliation/batches/{id}/review

GET /reports/sales-by-day
GET /reports/sales-by-branch
GET /reports/sales-by-product
GET /reports/sales-by-customer
GET /reports/cash-withdrawals-by-reason
GET /reports/cash-differences
```

### Checklist

```txt
[ ] Bloqueo feature billing_cfdi
[ ] Ver ventas facturables
[ ] Crear factura individual
[ ] Crear global diaria
[ ] Bloquear doble global
[ ] Ver facturas
[ ] Ver XML/PDF
[ ] Cancelar CFDI
[ ] Crear conciliación
[ ] Revisar conciliación
[ ] Reporte ventas día
[ ] Reporte ventas sucursal
[ ] Reporte ventas producto
[ ] Reporte ventas cliente
[ ] Reporte retiros motivo
[ ] Reporte faltantes/sobrantes
```

### QA

```txt
[ ] Facturación bloqueada en free
[ ] Venta draft no se factura
[ ] Doble factura individual bloqueada
[ ] Global diaria no se duplica
[ ] Reportes filtran por sucursal
[ ] Reportes filtran por fechas
```

---

## 12. FE-8 — Hardening y Release Candidate

### Objetivo

Preparar frontend para integración seria con backend y pruebas reales.

### Alcance

```txt
QA funcional
QA permisos
QA responsive
QA PWA
Performance
Accesibilidad básica
Manejo de sesión
Manejo de errores
Build final
```

### Checklist

```txt
[ ] Smoke test frontend completo
[ ] Login/logout estable
[ ] Refresh token estable
[ ] Branch activa persistente
[ ] Caja activa persistente
[ ] POS usable con teclado
[ ] Manager bloquea acciones sin permiso
[ ] FeatureGuard funciona
[ ] Errores backend mapeados
[ ] Loading states consistentes
[ ] Empty states consistentes
[ ] PWA instala
[ ] Build pasa
[ ] Lighthouse básico revisado
[ ] Bundle revisado
[ ] Rutas 404 controladas
[ ] Sesión expirada redirige
```

### QA final

```txt
[ ] FE-QA Foundation pasa
[ ] POS-QA pasa
[ ] CMP-QA pasa
[ ] MGR-QA pasa
[ ] Build production pasa
```

---

## 13. Gates de avance frontend

### Gate FE-A — Antes de FE-1

```txt
[ ] App base corre
[ ] Router listo
[ ] API client listo
[ ] Stores listos
[ ] Guards listos
```

### Gate FE-B — Antes de FE-3

```txt
[ ] Caja abre
[ ] Carrito funciona
[ ] Productos y precios cargan
```

### Gate FE-C — Antes de FE-4

```txt
[ ] Venta real completa
[ ] Cobro efectivo funciona
[ ] Cobro tarjeta funciona
[ ] Errores POS manejados
```

### Gate FE-D — Antes de FE-6

```txt
[ ] Manager core funciona
[ ] Caja gerente funciona
[ ] Inventario funciona
[ ] Productos/precios funcionan
```

### Gate FE-E — Antes de Release

```txt
[ ] FeatureGuard funciona
[ ] PermissionGuard funciona
[ ] QA funcional pasa
[ ] PWA instala
[ ] Build pasa
```

---

## 14. Reglas de implementación frontend

### No duplicar reglas backend

El frontend puede validar para UX, pero backend decide.

Ejemplo:

```txt
Frontend valida referencia de tarjeta.
Backend también valida CARD_REFERENCE_REQUIRED.
```

### No esconder errores críticos

No convertir errores en mensajes genéricos tipo:

```txt
Algo salió mal.
```

Debe mostrar mensaje operativo.

### No mezclar módulos

No meter lógica de gerente en POS ni POS en gerente.

### No usar dashboards decorativos

En V1, dashboard operativo. No BI avanzado.

### No construir offline falso

Si no hay conexión:

```txt
mantener carrito
bloquear completar venta
mostrar error claro
```

No prometer sincronización.

---

## 15. Orden de ejecución recomendado para el equipo

### Equipo pequeño

Si solo hay 1 frontend:

```txt
FE-0 → FE-1 → FE-2 → FE-3 → FE-4...
```

### Equipo de 2 frontend

```txt
Dev A:
FE-0, POS caja, POS venta, POS cobro

Dev B:
Manager layout, dashboard, caja gerente, inventario
```

Dev B no debe conectar Manager completo hasta que existan contratos backend o mocks claros.

### Equipo de 3 frontend

```txt
Dev A: Foundation + POS
Dev B: Manager Core + Inventario
Dev C: Componentes compartidos + QA + mocks
```

---

## 16. Dependencias backend

Frontend no debe bloquearse si backend aún no está listo. Usar mocks controlados.

### Mock obligatorio

```txt
/auth/login
/auth/me
/cash-sessions/open
/cash-sessions/open POST
/products
/prices/branch
/sales
/sales/{id}/items
/sales/{id}/complete
/sales/{id}/cancel-draft
```

### Pero no inventar contratos

Los mocks deben seguir:

```txt
docs/backend/02-openapi-contract.md
```

---

## 17. Entregables finales frontend V0.1

```txt
PWA instalable
Login
Branch select
POS caja
POS venta
POS cobro
Manager dashboard
Manager caja
Manager inventario
Manager productos/precios
Manager clientes base
Rutas base
Facturación base
Reportes base
Guards
API client
QA funcional
```

---

## 18. Siguiente documento

Después de este plan técnico, siguen los documentos UI/UX:

```txt
/docs/frontend/ui-ux/01-uiux-design-handoff.md
/docs/frontend/ui-ux/02-uiux-screen-specification.md
/docs/frontend/ui-ux/03-uiux-wireframe-checklist.md
```
