# Tortilla Plus — Frontend Manager PWA Flow V0.1

## 1. Objetivo

Definir el flujo funcional de la **PWA del Gerente** para administrar la operación diaria de una o varias sucursales.

La PWA Gerente no debe ser una pantalla decorativa. Su función es controlar:

```txt
caja
retiros
ventas
inventario
producción
productos
precios
clientes
crédito
rutas
facturación
reportes
```

---

## 2. Principio rector

El gerente necesita ver y corregir operación. No necesita capturar ventas como cajero, salvo en casos puntuales.

La PWA Gerente debe responder tres preguntas:

```txt
1. ¿Cuánto se vendió?
2. ¿Cuánto dinero debería haber?
3. ¿Qué mercancía salió, entró, faltó o se perdió?
```

Si una pantalla no ayuda a responder eso, no entra en V1.

---

## 3. Rutas base Manager

```txt
/app/manager
/app/manager/dashboard
/app/manager/cash
/app/manager/cash/:cashSessionId
/app/manager/withdrawals
/app/manager/inventory
/app/manager/production
/app/manager/products
/app/manager/prices
/app/manager/customers
/app/manager/customers/:customerId
/app/manager/routes
/app/manager/routes/:routeId
/app/manager/billing
/app/manager/reports
/app/manager/settings
```

---

## 4. Flujo general

```txt
/login
  ↓
/app/select-branch
  ↓
/app/manager
  ↓
dashboard operativo
  ↓
gestión por módulo
```

Si el usuario tiene varias sucursales:

```txt
mostrar selector de sucursal activa
```

Si el plan no tiene una feature:

```txt
mostrar pantalla de bloqueo comercial
```

No mandar a error técnico.

---

## 5. Layout Manager

### 5.1 ManagerLayout

```txt
┌───────────────────────────────────────────────┐
│ Topbar: sucursal | usuario | plan | alertas   │
├───────────────┬───────────────────────────────┤
│ Sidebar       │ Content Area                   │
│ Dashboard     │                               │
│ Caja          │                               │
│ Inventario    │                               │
│ Producción    │                               │
│ Productos     │                               │
│ Clientes      │                               │
│ Rutas         │                               │
│ Facturación   │                               │
│ Reportes      │                               │
└───────────────┴───────────────────────────────┘
```

### 5.2 Topbar

Debe mostrar:

```txt
Sucursal activa
Usuario
Rol
Estado de suscripción
Alertas críticas
Cambio de sucursal
```

Alertas críticas:

```txt
caja abierta
retiros pendientes
stock negativo
stock bajo
ruta pendiente de liquidar
suscripción en grace_period o suspended_limited
```

---

## 6. Pantalla: Dashboard Gerente

### Ruta

```txt
/app/manager/dashboard
```

### Objetivo

Mostrar estado operativo del día.

No es BI avanzado.

### Cards principales

```txt
Ventas del día
Caja abierta/cerrada
Efectivo esperado
Retiros pendientes
Producción registrada
Stock negativo
Rutas activas
Facturación pendiente
```

### Endpoints

```txt
GET /reports/sales-by-day?from=&to=&branchId=
GET /cash-sessions/open?branchId=
GET /cash-sessions/{id}/summary
GET /inventory/branch/{branchId}
GET /delivery-orders?branchId=&status=        pendiente de contrato backend
GET /billing/invoices?branchId=&date=         pendiente de contrato backend
```

### Estados

```txt
loading
sin caja abierta
caja abierta
alertas
error
```

### Reglas

- Si hay caja abierta, mostrar resumen.
- Si no hay caja abierta, mostrar “Sin caja abierta”.
- Si hay retiros pendientes, mostrar alerta visible.
- Si hay stock negativo, mostrar alerta visible.
- No mostrar gráficas complejas en V0.1.

---

## 7. Pantalla: Caja

### Ruta

```txt
/app/manager/cash
```

### Objetivo

Supervisar cajas por sucursal.

### Vista principal

```txt
caja actual
historial de cajas
retiros pendientes
faltantes/sobrantes recientes
```

### Endpoints

```txt
GET /cash-sessions/open?branchId=
GET /cash-sessions/{id}/summary
GET /reports/cash-differences?from=&to=&branchId=
GET /cash-movements?branchId=&status=         pendiente de contrato backend
```

### Acciones

```txt
ver detalle de caja
autorizar retiro
rechazar retiro
cerrar caja si tiene permiso
```

---

## 8. Pantalla: Detalle de Caja

### Ruta

```txt
/app/manager/cash/:cashSessionId
```

### Objetivo

Ver composición financiera de una caja.

### Debe mostrar

```txt
fondo inicial
ventas efectivo
ventas tarjeta
ventas transferencia
ventas crédito
ingresos de caja
retiros autorizados
retiros pendientes
efectivo esperado
ventas realizadas
usuario que abrió
hora apertura
```

### Acciones

```txt
autorizar retiro pendiente
rechazar retiro
cerrar caja
ver ventas de esta caja
```

### Endpoint principal

```txt
GET /cash-sessions/{id}/summary
```

### Reglas

- Si hay retiro pendiente, bloquear cierre.
- Si el gerente intenta cerrar caja con retiro pendiente, mostrar error claro.
- Si caja ya está cerrada, mostrar modo solo lectura.

---

## 9. Pantalla: Retiros Pendientes

### Ruta

```txt
/app/manager/withdrawals
```

### Objetivo

Permitir autorización remota de retiros.

### Lista

```txt
fecha/hora
cajero
sucursal
monto
motivo
descripción
estado
```

### Acciones

```txt
autorizar
rechazar
ver detalle
```

### Endpoints

```txt
GET  /cash-movements?status=pending_authorization&branchId=  pendiente de contrato backend
POST /cash-movements/{id}/authorize
POST /cash-movements/{id}/reject
```

### Validación

Para autorizar:

```txt
PIN requerido
```

### Errores

| Error | UI |
|---|---|
| `INVALID_PIN` | PIN incorrecto. |
| `CASH_MOVEMENT_ALREADY_RESOLVED` | Este retiro ya fue resuelto. |
| `PERMISSION_REQUIRED` | No tienes permiso para autorizar retiros. |

---

## 10. Pantalla: Inventario

### Ruta

```txt
/app/manager/inventory
```

### Objetivo

Consultar existencias y ajustar inventario.

### Tabla

```txt
producto
tipo
stock actual
mínimo
unidad
estado
última actualización
```

Estados visuales:

```txt
ok
stock bajo
stock negativo
sin stock
```

### Endpoints

```txt
GET /inventory/branch/{branchId}
POST /inventory/adjustments
```

### Acciones

```txt
ajustar entrada
ajustar salida
ver movimientos
```

### Reglas

- Ajuste manual requiere motivo.
- Cajero no debe poder ajustar.
- Supervisor y gerente sí.
- Stock negativo de tortilla/masa debe destacarse, no ocultarse.

---

## 11. Pantalla: Producción

### Ruta

```txt
/app/manager/production
```

### Objetivo

Registrar producción diaria de tortilla y masa.

### Formulario

```txt
fecha
producto tortilla kg
producto masa kg
notas opcionales
```

### Endpoints

```txt
POST /production/batches
PATCH /production/batches/{id}/close
GET /production/batches?branchId=&date=
```

### Reglas

- Solo tortilla y masa.
- Cantidades positivas.
- Producción cerrada no se edita.
- Correcciones posteriores van por ajuste de inventario.

### Estados

```txt
sin producción del día
producción abierta
producción cerrada
```

---

## 12. Pantalla: Productos

### Ruta

```txt
/app/manager/products
```

### Objetivo

Administrar productos vendibles.

### Lista

```txt
nombre
sku
tipo
unidad
estado
rastrea inventario
requiere producción
```

### Tipos

```txt
tortilla
masa
package
retail
service
```

### Endpoints

```txt
GET /products
POST /products
PATCH /products/{id}
```

### Acciones

```txt
crear producto
editar producto
activar/desactivar
configurar paquete
```

### Reglas

- Tortilla y masa deben existir como productos base.
- Paquete debe tener producto base y peso.
- Producto usado en ventas no debe eliminarse físicamente.
- Usar status inactive/deleted lógico.

---

## 13. Pantalla: Precios

### Ruta

```txt
/app/manager/prices
```

### Objetivo

Administrar precios por sucursal.

### Tabla

```txt
producto
modo de venta
precio actual
fecha de vigencia
estado
```

### Endpoints

```txt
GET /prices/branch/{branchId}
POST /prices/branch
```

### Modos

```txt
by_kg
by_amount
by_package
by_unit
```

### Reglas

- Cambiar precio no debe modificar ventas históricas.
- El backend debe guardar snapshot de precio en sale_items.
- Precio nuevo debe tener vigencia.
- Cambio de precio genera auditoría.

---

## 14. Pantalla: Clientes

### Ruta

```txt
/app/manager/customers
```

### Objetivo

Administrar clientes recurrentes.

### Lista

```txt
nombre
tipo
teléfono
crédito habilitado
límite
saldo actual
estado
```

### Tipos

```txt
tienda
puesto
comedor
repartidor
cliente_frecuente
empresa
otro
```

### Endpoints

```txt
GET /customers
POST /customers
PATCH /customers/{id}
```

### Acciones

```txt
crear cliente
editar cliente
habilitar/deshabilitar crédito
ver saldo
configurar precio especial
```

---

## 15. Pantalla: Detalle Cliente

### Ruta

```txt
/app/manager/customers/:customerId
```

### Objetivo

Ver información comercial y saldo.

### Debe mostrar

```txt
datos generales
tipo de cliente
crédito habilitado
límite de crédito
saldo actual
precios especiales
ventas recientes
movimientos de saldo
```

### Endpoints

```txt
GET /customers/{id}                           pendiente de contrato backend
GET /customers/{id}/balance
POST /customers/{id}/credit
POST /customers/{id}/prices
```

### Reglas

- Si crédito está deshabilitado, no debe aparecer como opción en POS.
- Si saldo supera límite, debe destacarse.
- Precio especial debe ser por producto, modo de venta y opcionalmente sucursal.

---

## 16. Pantalla: Rutas

### Ruta

```txt
/app/manager/routes
```

### Objetivo

Gestionar rutas de reparto.

### Feature requerida

```txt
delivery_routes
```

### Si feature no disponible

Mostrar:

```txt
Rutas de reparto no está disponible en tu plan.
```

No mostrar error técnico.

### Vista

```txt
rutas activas
repartidores
pedidos pendientes
pedidos cargados
pedidos entregados
liquidaciones pendientes
```

### Endpoints

```txt
GET /delivery-routes
POST /delivery-routes
GET /delivery-drivers
POST /delivery-drivers
GET /delivery-orders                          pendiente de contrato backend
POST /delivery-orders
```

---

## 17. Pantalla: Detalle Ruta

### Ruta

```txt
/app/manager/routes/:routeId
```

### Objetivo

Controlar pedidos de una ruta.

### Secciones

```txt
clientes asignados
pedidos del día
producto cargado
producto entregado
producto devuelto
cobros
liquidación
```

### Acciones

```txt
crear pedido
preparar pedido
cargar pedido
registrar entrega
registrar cobro
revisar devolución
cerrar liquidación
depositar efectivo a caja
```

### Endpoints

```txt
POST /delivery-orders/{id}/prepare
POST /delivery-orders/{id}/load
POST /delivery-orders/{id}/deliver
POST /delivery-orders/{id}/payments
POST /delivery-returns/{id}/review
POST /delivery-settlements/{id}/close
POST /delivery-settlements/{id}/deposit-to-cash
```

### Reglas críticas

- Cargar pedido descuenta inventario.
- Cobro de ruta no entra a caja hasta liquidación.
- Devolución queda pendiente de revisión.
- Depósito a caja requiere caja abierta.

---

## 18. Pantalla: Facturación

### Ruta

```txt
/app/manager/billing
```

### Feature requerida

```txt
billing_cfdi
```

### Objetivo

Gestionar CFDI individual y global diaria.

### Vista

```txt
ventas facturables
facturas emitidas
factura global del día
errores de timbrado
documentos XML/PDF
```

### Endpoints

```txt
POST /billing/invoices/individual
POST /billing/invoices/global-daily
POST /billing/invoices/{id}/stamp
POST /billing/invoices/{id}/cancel
GET /billing/invoices/{id}/documents
```

### Reglas

- Solo ventas completed.
- Venta ya facturada no se factura de nuevo.
- Factura global diaria es única por sucursal y fecha.
- Factura timbrada no se edita.
- Cancelación CFDI es flujo separado.

---

## 19. Pantalla: Reportes

### Ruta

```txt
/app/manager/reports
```

### Objetivo

Mostrar reportes operativos necesarios para control del negocio.

### Reportes V0.1

```txt
ventas por día
ventas por sucursal
ventas por producto
ventas por cliente
retiros por motivo
faltantes/sobrantes
```

### Endpoints

```txt
GET /reports/sales-by-day
GET /reports/sales-by-branch
GET /reports/sales-by-product
GET /reports/sales-by-customer
GET /reports/cash-withdrawals-by-reason
GET /reports/cash-differences
```

### Feature requerida para reportes avanzados

```txt
advanced_reports
```

### Regla

No meter BI avanzado todavía.

No incluir:

```txt
predicciones
comparativas complejas
data warehouse
gráficas excesivas
```

---

## 20. Pantalla: Configuración

### Ruta

```txt
/app/manager/settings
```

### Objetivo

Configurar datos operativos básicos.

### Secciones V0.1

```txt
datos de sucursal
usuarios
POS devices
motivos de retiro
configuración de paquete
estado de plan
```

### Endpoints

```txt
GET /branches
PATCH /branches/{id}
GET /pos-devices
POST /pos-devices
PATCH /pos-devices/{id}/activate
GET /subscriptions/current
GET /subscriptions/features
```

### Reglas

- Activar POS valida límite contratado.
- Crear sucursal valida plan.
- Usuario free máximo 3.
- Plan paid cobra base + POS activo.

---

## 21. Guards Manager

### AuthGuard

Sin sesión:

```txt
/login
```

### BranchGuard

Sin sucursal activa:

```txt
/app/select-branch
```

### PermissionGuard

Acciones protegidas:

```txt
cash.withdraw.authorize
sales.cancel_after_payment
inventory.manage
production.manage
products.manage
prices.manage
customers.manage
routes.manage
billing.manage
reports.advanced.view
```

### FeatureGuard

Módulos bloqueables:

```txt
billing_cfdi
multi_branch
delivery_routes
advanced_reports
reconciliation
```

---

## 22. Estados globales Manager

### ManagerFiltersStore

```ts
type ManagerFiltersState = {
  activeBranchId: string | null;
  dateFrom: string;
  dateTo: string;
  selectedCashSessionId: string | null;
  setDateRange: (from: string, to: string) => void;
  setSelectedCashSession: (id: string | null) => void;
};
```

### ManagerAlertState

```ts
type ManagerAlertState = {
  pendingWithdrawals: number;
  negativeStockItems: number;
  lowStockItems: number;
  pendingRouteSettlements: number;
  billingErrors: number;
};
```

---

## 23. Loading y empty states

Cada pantalla debe tener:

```txt
loading
empty
error
success
```

Ejemplos:

### Caja sin caja abierta

```txt
No hay caja abierta en esta sucursal.
```

### Inventario vacío

```txt
No hay productos configurados.
```

### Rutas sin feature

```txt
Rutas de reparto no está disponible en tu plan.
```

### Facturación sin feature

```txt
Facturación CFDI no está disponible en tu plan.
```

---

## 24. Errores UI Manager

| Error backend | Mensaje UI |
|---|---|
| `FEATURE_NOT_AVAILABLE` | Este módulo no está disponible en tu plan. |
| `PLAN_LIMIT_REACHED` | Alcanzaste el límite permitido por tu plan. |
| `SUBSCRIPTION_SUSPENDED_LIMITED` | Tu cuenta está limitada por falta de pago. |
| `PERMISSION_REQUIRED` | No tienes permiso para realizar esta acción. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |
| `PENDING_CASH_MOVEMENTS` | Hay retiros pendientes antes de cerrar caja. |
| `INVALID_PIN` | PIN incorrecto. |
| `RETURN_ALREADY_REVIEWED` | Esta devolución ya fue revisada. |
| `GLOBAL_INVOICE_ALREADY_EXISTS` | Ya existe factura global para esta fecha. |
| `PAC_STAMPING_FAILED` | No se pudo timbrar la factura. |

---

## 25. QA Manager PWA

### MGR-QA-001

Gerente entra al dashboard después de login y selección de sucursal.

### MGR-QA-002

Usuario sin permiso no ve acciones administrativas.

### MGR-QA-003

Plan free bloquea rutas, facturación y reportes avanzados.

### MGR-QA-004

Dashboard muestra caja abierta si existe.

### MGR-QA-005

Dashboard muestra alerta de retiros pendientes.

### MGR-QA-006

Gerente puede autorizar retiro con PIN válido.

### MGR-QA-007

PIN inválido muestra error y no autoriza retiro.

### MGR-QA-008

Cierre de caja bloquea si hay retiro pendiente.

### MGR-QA-009

Inventario muestra stock negativo destacado.

### MGR-QA-010

Ajuste de inventario exige motivo.

### MGR-QA-011

Producción solo permite tortilla y masa.

### MGR-QA-012

Producto paquete requiere producto base y peso.

### MGR-QA-013

Cambio de precio genera actualización visible.

### MGR-QA-014

Cliente con crédito muestra saldo y límite.

### MGR-QA-015

Rutas bloqueadas en plan free.

### MGR-QA-016

Carga de ruta descuenta inventario.

### MGR-QA-017

Cobro de ruta no modifica caja hasta liquidación.

### MGR-QA-018

Facturación bloqueada si feature no está activa.

### MGR-QA-019

Factura global diaria no se duplica.

### MGR-QA-020

Reportes filtran correctamente por sucursal y fecha.

---

## 26. Definition of Done Manager Flow V0.1

```txt
[ ] ManagerLayout creado
[ ] Dashboard operativo creado
[ ] Caja actual visible
[ ] Retiros pendientes visibles
[ ] Autorización de retiros con PIN
[ ] Inventario visible
[ ] Producción diaria funcional
[ ] Productos CRUD base
[ ] Precios por sucursal
[ ] Clientes recurrentes
[ ] Crédito visible
[ ] Rutas bloqueadas por feature si aplica
[ ] Rutas funcionales en paid
[ ] Facturación bloqueada por feature si aplica
[ ] Facturación base visible
[ ] Reportes básicos visibles
[ ] Guards funcionando
[ ] Empty states implementados
[ ] Error states implementados
[ ] QA Manager mínimo pasa
```

---

## 27. Orden recomendado de implementación

No construir todas las pantallas a la vez.

### Bloque 1 — Manager Core

```txt
ManagerLayout
Dashboard
Caja actual
Retiros pendientes
Autorizar/rechazar retiro
```

### Bloque 2 — Inventario operativo

```txt
Inventario
Producción
Merma
Productos
Precios
```

### Bloque 3 — Clientes

```txt
Clientes
Detalle cliente
Crédito
Precios especiales
```

### Bloque 4 — Rutas

```txt
Rutas
Detalle ruta
Carga
Entrega
Cobro
Liquidación
```

### Bloque 5 — Facturación y reportes

```txt
Facturación individual
Factura global diaria
Reportes base
Conciliación
```

---

## 28. Riesgos

### Riesgo 1: convertir dashboard en BI

Mala idea en V1. El gerente necesita operación, no gráficas decorativas.

### Riesgo 2: duplicar funciones del POS

La PWA gerente no debe ser otro POS. Puede consultar y autorizar, no reemplazar flujo cajero.

### Riesgo 3: no bloquear features por plan

Esto rompe el modelo SaaS.

### Riesgo 4: permitir acciones sin branch activa

Esto puede generar datos mal asociados.

### Riesgo 5: no diferenciar caja y ruta

El cobro de ruta no entra a caja hasta liquidación. La UI debe dejarlo claro.

---

## 29. Siguiente documento recomendado

Después de este documento sigue:

```txt
Frontend Sprint Plan V0.1
```

Ese documento convierte los flujos frontend en sprints ejecutables para el equipo.
