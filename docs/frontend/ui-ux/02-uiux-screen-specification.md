# Tortilla Plus — UI/UX Screen Specification V0.1

## 1. Objetivo

Definir cada pantalla crítica de **Tortilla Plus PWA** para que diseño y frontend trabajen con el mismo criterio.

Cubre:

```txt
POS Cajero
PWA Gerente
Estados de pantalla
Componentes
Acciones
Transiciones
Errores
Validaciones UX
```

---

## 2. Mapa general de pantallas

```txt
Auth
├─ Login
└─ Selección de sucursal

POS
├─ POS Router
├─ Apertura de caja
├─ Venta
├─ Modal captura por kg
├─ Modal captura por monto
├─ Modal cobro
├─ Modal venta exitosa
└─ Error/estado sin conexión

Gerente
├─ Dashboard
├─ Caja
├─ Detalle caja
├─ Retiros pendientes
├─ Inventario
├─ Producción
├─ Productos
├─ Precios
├─ Clientes
├─ Detalle cliente
├─ Rutas
├─ Detalle ruta
├─ Facturación
├─ Reportes
└─ Configuración
```

---

## 3. AUTH-001 — Login

### Objetivo

Permitir que el usuario entre al sistema.

### Usuario

```txt
Cajero
Gerente
Supervisor
Dueño
```

### Ruta

```txt
/login
```

### Componentes

```txt
AuthLayout
Logo
LoginForm
Input email
Input password
SubmitButton
ErrorAlert
```

### Contenido

```txt
Tortilla Plus
Correo
Contraseña
Entrar
```

### Acción principal

```txt
Entrar
```

### Endpoint

```txt
POST /auth/login
```

### Estado loading

```txt
Botón deshabilitado
Texto: Entrando...
```

### Estado error

```txt
Credenciales incorrectas.
Usuario inactivo.
No se pudo conectar con el servidor.
```

### Validaciones

```txt
Email requerido
Email válido
Contraseña requerida
```

### Transición

```txt
Login correcto
→ GET /auth/me
→ si una sucursal: guardar branch activa
→ si varias sucursales: /app/select-branch
→ si cajero: /app/pos
→ si gerente/supervisor/dueño: /app/manager
```

---

## 4. AUTH-002 — Selección de sucursal

### Objetivo

Seleccionar la sucursal activa para operar.

### Ruta

```txt
/app/select-branch
```

### Componentes

```txt
BranchSelectorPage
BranchCard
StatusBadge
```

### Contenido por card

```txt
Nombre sucursal
Dirección breve
Estado
Botón Entrar
```

### Acción principal

```txt
Entrar a sucursal
```

### Estado vacío

```txt
No tienes sucursales asignadas.
Contacta al administrador.
```

### Estado error

```txt
No se pudieron cargar tus sucursales.
```

### Validaciones

```txt
Sucursal debe estar activa
Usuario debe tener acceso a branch
```

### Transición

```txt
Seleccionar sucursal
→ guardar activeBranchId
→ si rol cajero: /app/pos
→ si rol gerente/supervisor/dueño: /app/manager
```

---

## 5. POS-001 — POS Router

### Objetivo

Validar si el cajero puede vender.

### Ruta

```txt
/app/pos
```

### Componentes

```txt
PosRouterPage
LoadingState
ErrorState
```

### Lógica

```txt
1. Validar sesión
2. Validar sucursal activa
3. Consultar caja abierta
4. Redirigir según estado
```

### Endpoint

```txt
GET /cash-sessions/open?branchId=
```

### Estado loading

```txt
Validando caja...
```

### Transiciones

```txt
Sin branch activa → /app/select-branch
Sin caja abierta → /app/pos/cash/open
Caja abierta → /app/pos/sale
Error auth → /login
```

---

## 6. POS-002 — Apertura de caja

### Objetivo

Abrir caja antes de vender.

### Ruta

```txt
/app/pos/cash/open
```

### Componentes

```txt
PosHeader
OpenCashForm
AmountInput
DifferenceAlert
SubmitButton
PosErrorAlert
```

### Contenido

```txt
Sucursal
Cajero
Saldo sugerido
Saldo contado
Diferencia
Nota opcional
Abrir caja
```

### Endpoint

```txt
POST /cash-sessions/open
```

### Acción principal

```txt
Abrir caja
```

### Estado loading

```txt
Abriendo caja...
```

### Estado error

| Error | Mensaje UI |
|---|---|
| `CASH_SESSION_ALREADY_OPEN` | Ya hay una caja abierta en esta sucursal. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |
| `PERMISSION_REQUIRED` | No tienes permiso para abrir caja. |

### Validaciones UX

```txt
Saldo contado requerido
Saldo contado >= 0
Nota máximo 250 caracteres
```

### Comportamiento de discrepancia

Si saldo contado ≠ saldo sugerido:

```txt
Mostrar alerta amarilla.
No bloquear.
La diferencia quedará registrada.
```

### Transición

```txt
Apertura exitosa → /app/pos/sale
```

---

## 7. POS-003 — Venta

### Objetivo

Capturar productos rápidamente y preparar el cobro.

### Ruta

```txt
/app/pos/sale
```

### Componentes

```txt
PosHeader
QuickSalePanel
WeightSaleInput
AmountSaleInput
PackageQuickButton
ProductQuickGrid
ProductSearchInput
CartPanel
CartItemRow
PaymentModal
SaleSuccessModal
PosErrorAlert
KeyboardShortcutsProvider
```

### Layout

```txt
Header compacto
Panel izquierdo: captura rápida + productos
Panel derecho: carrito + total + cobrar
```

### Contenido principal

```txt
Tortilla kg
Tortilla $
Masa kg
Masa $
Paquete 800g
Productos retail
Carrito
Total
Cobrar
Cancelar ticket
```

### Endpoints

```txt
GET /products
GET /prices/branch/{branchId}
POST /sales
POST /sales/{id}/items
POST /sales/{id}/complete
POST /sales/{id}/cancel-draft
```

### Acción principal

```txt
Cobrar
```

### Estados

#### Loading inicial

```txt
Cargando productos...
```

#### Empty productos

```txt
No hay productos activos configurados.
```

#### Empty carrito

```txt
Agrega productos para iniciar una venta.
```

#### Error productos

```txt
No se pudieron cargar los productos.
```

### Validaciones

```txt
No cobrar carrito vacío
No cobrar total 0
Producto debe tener precio
Producto debe estar activo
```

### Atajos

```txt
F1 Tortilla kg
F2 Tortilla $
F3 Masa kg
F4 Masa $
F5 Paquete 800g
F8 Cobrar
F9 Cancelar ticket
Ctrl + F Buscar producto
Esc Cerrar modal
Enter Confirmar acción principal
```

---

## 8. POS-004 — Modal captura por kilo

### Objetivo

Agregar tortilla o masa por kilogramo.

### Tipo

```txt
Modal / Popover enfocado
```

### Componentes

```txt
ProductTitle
QuantityInput
PriceInfo
CalculatedTotal
SubmitButton
```

### Contenido

```txt
Producto
Cantidad en kg
Precio por kg
Total
Agregar
```

### Validaciones

```txt
Cantidad requerida
Cantidad > 0
Precio existente
```

### Estado error

```txt
Captura una cantidad válida.
Este producto no tiene precio configurado.
```

### Transición

```txt
Agregar → cerrar modal → agregar item al carrito → enfocar venta
```

---

## 9. POS-005 — Modal captura por monto

### Objetivo

Agregar tortilla o masa por pesos.

### Componentes

```txt
ProductTitle
AmountInput
EquivalentKgDisplay
PriceInfo
SubmitButton
```

### Contenido

```txt
Producto
Monto en pesos
Equivalente aproximado en kg
Precio por kg
Agregar
```

### Validaciones

```txt
Monto requerido
Monto > 0
Precio existente
```

### Regla UX

Mostrar kg aproximados con máximo 3 decimales.

```txt
$20.00 = 0.714 kg aprox.
```

### Transición

```txt
Agregar → cerrar modal → agregar item al carrito
```

---

## 10. POS-006 — Modal cobro

### Objetivo

Completar pago de la venta.

### Tipo

```txt
Modal bloqueante
```

### Componentes

```txt
PaymentModal
Tabs: Efectivo / Tarjeta / Mixto
CashPaymentForm
CardPaymentForm
MixedPaymentForm
ErrorAlert
SubmitButton
```

### Acción principal

```txt
Completar venta
```

### Tab efectivo

#### Campos

```txt
Total
Recibido
Cambio
```

#### Validación

```txt
Recibido >= total
```

#### Error

```txt
El efectivo recibido no cubre el total.
```

### Tab tarjeta

#### Campos

```txt
Total
Referencia
Proveedor/terminal
```

#### Validación

```txt
Referencia obligatoria
```

#### Error

```txt
Captura la referencia de la terminal.
```

### Tab mixto

#### Campos

```txt
Efectivo
Tarjeta
Referencia tarjeta
Proveedor/terminal
Estado de suma
```

#### Validación

```txt
Efectivo + tarjeta = total
Si tarjeta > 0, referencia requerida
```

#### Estados de suma

```txt
Faltan $X
Sobran $X
Pago completo
```

### Estado loading

```txt
Procesando venta...
```

### Errores backend

| Error | Comportamiento |
|---|---|
| `CARD_REFERENCE_REQUIRED` | Enfocar referencia. |
| `PAYMENT_TOTAL_MISMATCH` | Mantener modal abierto. |
| `NO_OPEN_CASH_SESSION` | Cerrar y redirigir a apertura. |
| `INSUFFICIENT_STOCK` | Mantener carrito y mostrar producto afectado. |
| `NEGATIVE_STOCK_NOT_ALLOWED` | Mantener carrito y bloquear producto. |

### Transición

```txt
Venta completada → cerrar modal → abrir SaleSuccessModal
```

---

## 11. POS-007 — Venta exitosa

### Objetivo

Confirmar venta completada y preparar nueva venta.

### Tipo

```txt
Modal
```

### Componentes

```txt
SuccessIcon
SaleNumber
Total
PaymentSummary
ChangeAmount
NewSaleButton
PrintTicketButton futuro
```

### Contenido

```txt
Venta completada
Folio
Total
Método de pago
Cambio
Nueva venta
```

### Acción principal

```txt
Nueva venta
```

### Atajos

```txt
Enter → nueva venta
Esc → cerrar
```

### Transición

```txt
Nueva venta → limpiar carrito → enfocar captura rápida
```

---

## 12. POS-008 — Estado sin conexión

### Objetivo

Evitar ventas falsas cuando no hay conexión.

### Componentes

```txt
OfflineBanner
DisabledCheckoutState
```

### Mensaje

```txt
Sin conexión. No se puede completar la venta hasta reconectar.
```

### Reglas

```txt
Mantener carrito local
Bloquear completar venta
Permitir seguir viendo carrito
No prometer sincronización
```

---

## 13. MGR-001 — Dashboard gerente

### Objetivo

Mostrar estado operativo del día.

### Ruta

```txt
/app/manager/dashboard
```

### Componentes

```txt
ManagerLayout
ManagerTopbar
ManagerSidebar
AlertStrip
MetricCard
CashSessionSummaryCard
PendingWithdrawalsCard
StockAlertCard
RouteAlertCard
BillingPendingCard
```

### Contenido

```txt
Ventas del día
Caja actual
Efectivo esperado
Retiros pendientes
Stock negativo
Rutas pendientes
Facturación pendiente
```

### Endpoints

```txt
GET /reports/sales-by-day
GET /cash-sessions/open?branchId=
GET /cash-sessions/{id}/summary
GET /inventory/branch/{branchId}
GET /delivery-orders?branchId=&status=        pendiente de contrato backend
GET /billing/invoices?branchId=&date=         pendiente de contrato backend
```

### Acción principal

Depende de alerta:

```txt
Autorizar retiro
Ver caja
Ver inventario
Ver rutas
Generar global
```

### Loading

```txt
Cargando operación del día...
```

### Empty state

```txt
Sin actividad registrada hoy.
```

### Error state

```txt
No se pudo cargar el dashboard.
```

### Transiciones

```txt
Click Caja actual → /app/manager/cash/:cashSessionId
Click Retiros pendientes → /app/manager/withdrawals
Click Stock negativo → /app/manager/inventory
```

---

## 14. MGR-002 — Caja

### Objetivo

Supervisar caja actual e historial.

### Ruta

```txt
/app/manager/cash
```

### Componentes

```txt
CashCurrentCard
CashHistoryTable
PendingWithdrawalsTable
CashDifferencesTable
```

### Contenido

```txt
Caja actual
Hora apertura
Cajero
Efectivo esperado
Ventas por método
Retiros pendientes
Historial de cajas
Faltantes/sobrantes
```

### Endpoints

```txt
GET /cash-sessions/open?branchId=
GET /cash-sessions/{id}/summary
GET /reports/cash-differences
GET /cash-movements?branchId=&status=         pendiente de contrato backend
```

### Acciones

```txt
Ver detalle
Autorizar retiro
Rechazar retiro
Cerrar caja
```

### Empty state

```txt
No hay caja abierta en esta sucursal.
```

### Regla UX

Si hay retiros pendientes:

```txt
Mostrar alerta.
Deshabilitar cierre.
```

---

## 15. MGR-003 — Detalle caja

### Objetivo

Ver composición financiera de una caja.

### Ruta

```txt
/app/manager/cash/:cashSessionId
```

### Componentes

```txt
CashSummaryPanel
CashMovementTable
SalePaymentsBreakdown
CashClosingPanel
PendingWithdrawalsTable
```

### Contenido

```txt
Fondo inicial
Ventas efectivo
Ventas tarjeta
Ventas transferencia
Ventas crédito
Ingresos
Retiros autorizados
Retiros pendientes
Efectivo esperado
Efectivo contado
Diferencia
```

### Acción principal

```txt
Cerrar caja
```

### Bloqueo

Si retiros pendientes:

```txt
No puedes cerrar caja mientras existan retiros pendientes.
```

### Estado cerrado

```txt
Mostrar solo lectura.
Mostrar fecha/hora de cierre.
Mostrar faltante/sobrante.
```

---

## 16. MGR-004 — Retiros pendientes

### Objetivo

Autorizar o rechazar retiros solicitados por cajeros.

### Ruta

```txt
/app/manager/withdrawals
```

### Componentes

```txt
PendingWithdrawalsTable
WithdrawalDetailDrawer
PinAuthorizationModal
RejectReasonModal
```

### Tabla

```txt
Fecha/hora
Sucursal
Cajero
Monto
Motivo
Descripción
Estado
Acciones
```

### Endpoints

```txt
GET /cash-movements?status=pending_authorization&branchId=  pendiente de contrato backend
POST /cash-movements/{id}/authorize
POST /cash-movements/{id}/reject
```

### Acciones

```txt
Autorizar
Rechazar
Ver detalle
```

### Validación

```txt
PIN requerido para autorizar
Motivo requerido para rechazar
```

### Errores

```txt
INVALID_PIN
CASH_MOVEMENT_ALREADY_RESOLVED
PERMISSION_REQUIRED
```

---

## 17. MGR-005 — Inventario

### Objetivo

Consultar y ajustar existencias.

### Ruta

```txt
/app/manager/inventory
```

### Componentes

```txt
InventoryTable
InventoryStatusBadge
InventoryAdjustmentModal
InventoryMovementsDrawer
```

### Tabla

```txt
Producto
Tipo
Stock actual
Mínimo
Unidad
Estado
Última actualización
Acciones
```

### Estados visuales

```txt
OK
Stock bajo
Stock negativo
Sin stock
```

### Endpoints

```txt
GET /inventory/branch/{branchId}
POST /inventory/adjustments
```

### Acción principal

```txt
Ajustar inventario
```

### Validaciones

```txt
Tipo de ajuste requerido
Cantidad > 0
Motivo requerido
```

### Error state

```txt
No se pudo cargar inventario.
```

### Empty state

```txt
No hay productos configurados.
```

---

## 18. MGR-006 — Producción

### Objetivo

Registrar producción diaria de tortilla y masa.

### Ruta

```txt
/app/manager/production
```

### Componentes

```txt
ProductionStatusCard
ProductionForm
ProductionBatchTable
CloseProductionButton
```

### Campos

```txt
Fecha
Tortilla producida kg
Masa producida kg
Notas
```

### Endpoints

```txt
GET /production/batches?branchId=&date=
POST /production/batches
PATCH /production/batches/{id}/close
```

### Acciones

```txt
Registrar producción
Cerrar producción
```

### Validaciones

```txt
Cantidad tortilla >= 0
Cantidad masa >= 0
Al menos un producto con cantidad > 0
Solo tortilla y masa
```

### Estados

```txt
Sin producción del día
Producción abierta
Producción cerrada
```

### Regla UX

Producción cerrada se muestra en modo solo lectura.

---

## 19. MGR-007 — Productos

### Objetivo

Administrar catálogo de productos.

### Ruta

```txt
/app/manager/products
```

### Componentes

```txt
ProductsTable
ProductFormDrawer
PackageConfigSection
StatusBadge
```

### Tabla

```txt
Nombre
SKU
Tipo
Unidad
Inventario
Producción
Estado
Acciones
```

### Endpoints

```txt
GET /products
POST /products
PATCH /products/{id}
```

### Acción principal

```txt
Crear producto
```

### Validaciones

```txt
Nombre requerido
Tipo requerido
Unidad requerida
Si package: producto base requerido
Si package: peso requerido
```

### Regla UX

No usar “eliminar” como acción principal.  
Usar “desactivar”.

---

## 20. MGR-008 — Precios

### Objetivo

Administrar precios por sucursal.

### Ruta

```txt
/app/manager/prices
```

### Componentes

```txt
PricesTable
PriceFormModal
PriceHistoryDrawer
```

### Tabla

```txt
Producto
Modo de venta
Precio actual
Vigencia
Estado
Acción
```

### Endpoint

```txt
GET /prices/branch/{branchId}
POST /prices/branch
```

### Acción principal

```txt
Actualizar precio
```

### Validaciones

```txt
Producto requerido
Modo requerido
Precio >= 0
Fecha de vigencia requerida
```

### Mensaje obligatorio

```txt
Las ventas anteriores conservarán su precio histórico.
```

---

## 21. MGR-009 — Clientes

### Objetivo

Administrar clientes recurrentes.

### Ruta

```txt
/app/manager/customers
```

### Componentes

```txt
CustomersTable
CustomerFormDrawer
CreditStatusBadge
```

### Tabla

```txt
Nombre
Tipo
Teléfono
Crédito
Límite
Saldo
Estado
Acciones
```

### Endpoints

```txt
GET /customers
POST /customers
PATCH /customers/{id}
```

### Acción principal

```txt
Crear cliente
```

### Validaciones

```txt
Nombre requerido
Tipo requerido
Límite >= 0
```

### Empty state

```txt
No hay clientes registrados.
```

---

## 22. MGR-010 — Detalle cliente

### Objetivo

Ver saldo, crédito, precios especiales y ventas del cliente.

### Ruta

```txt
/app/manager/customers/:customerId
```

### Componentes

```txt
CustomerProfileCard
CreditSummaryCard
CustomerBalanceMovementsTable
CustomerSpecialPricesTable
CustomerRecentSalesTable
CreditConfigModal
SpecialPriceModal
```

### Contenido

```txt
Datos generales
Tipo de cliente
Crédito habilitado
Límite
Saldo actual
Precios especiales
Ventas recientes
Movimientos de saldo
```

### Endpoints

```txt
GET /customers/{id}                           pendiente de contrato backend
GET /customers/{id}/balance
POST /customers/{id}/credit
POST /customers/{id}/prices
```

### Acciones

```txt
Editar crédito
Agregar precio especial
Ver venta
```

### Estado alerta

Si saldo > límite:

```txt
Cliente excedió su límite de crédito.
```

---

## 23. MGR-011 — Rutas

### Objetivo

Gestionar rutas de reparto.

### Ruta

```txt
/app/manager/routes
```

### Feature requerida

```txt
delivery_routes
```

### Componentes

```txt
FeatureBlockedState
RoutesTable
DriversTable
RouteOrdersSummary
CreateRouteModal
CreateDriverModal
```

### Contenido

```txt
Rutas activas
Repartidores
Pedidos pendientes
Pedidos cargados
Liquidaciones pendientes
```

### Endpoints

```txt
GET /delivery-routes
POST /delivery-routes
GET /delivery-drivers
POST /delivery-drivers
GET /delivery-orders                          pendiente de contrato backend
```

### Acción principal

```txt
Crear ruta
```

### Blocked by plan

```txt
Rutas de reparto no está disponible en tu plan.
```

---

## 24. MGR-012 — Detalle ruta

### Objetivo

Controlar pedidos, carga, entrega, cobro y liquidación de una ruta.

### Ruta

```txt
/app/manager/routes/:routeId
```

### Componentes

```txt
RouteHeader
RouteCustomersTable
DeliveryOrdersTable
RouteLoadPanel
DeliveryPaymentPanel
DeliveryReturnReviewModal
SettlementPanel
```

### Contenido

```txt
Clientes asignados
Pedidos del día
Producto cargado
Producto entregado
Producto devuelto
Cobrado
Pendiente de liquidar
```

### Endpoints

```txt
POST /delivery-orders
POST /delivery-orders/{id}/prepare
POST /delivery-orders/{id}/load
POST /delivery-orders/{id}/deliver
POST /delivery-orders/{id}/payments
POST /delivery-returns/{id}/review
POST /delivery-settlements/{id}/close
POST /delivery-settlements/{id}/deposit-to-cash
```

### Acciones

```txt
Crear pedido
Preparar
Cargar
Registrar entrega
Registrar cobro
Revisar devolución
Cerrar liquidación
Depositar a caja
```

### Regla UX crítica

Diferenciar visualmente:

```txt
Cobrado en ruta
Liquidado a caja
```

No son lo mismo.

---

## 25. MGR-013 — Facturación

### Objetivo

Gestionar facturas individuales y global diaria.

### Ruta

```txt
/app/manager/billing
```

### Feature requerida

```txt
billing_cfdi
```

### Componentes

```txt
FeatureBlockedState
BillableSalesTable
DailyGlobalInvoiceCard
InvoicesTable
InvoiceDocumentsActions
StampingErrorAlert
```

### Contenido

```txt
Ventas facturables
Factura global del día
Facturas emitidas
Errores de timbrado
XML/PDF
```

### Endpoints

```txt
POST /billing/invoices/individual
POST /billing/invoices/global-daily
POST /billing/invoices/{id}/stamp
POST /billing/invoices/{id}/cancel
GET /billing/invoices/{id}/documents
```

### Acciones

```txt
Crear factura individual
Generar global diaria
Ver XML
Ver PDF
Cancelar CFDI
```

### Estados

#### Global no generada

```txt
Factura global pendiente del día.
```

#### Global generada

```txt
Factura global ya generada.
```

#### Error timbrado

```txt
No se pudo timbrar la factura.
```

---

## 26. MGR-014 — Reportes

### Objetivo

Consultar reportes operativos.

### Ruta

```txt
/app/manager/reports
```

### Componentes

```txt
DateRangeFilter
BranchFilter
ReportTabs
ReportTable
ExportButton futuro
```

### Reportes V0.1

```txt
Ventas por día
Ventas por sucursal
Ventas por producto
Ventas por cliente
Retiros por motivo
Faltantes/sobrantes
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

### Validaciones

```txt
Fecha inicio requerida
Fecha fin requerida
Fecha inicio <= fecha fin
```

### Empty state

```txt
No hay datos para este periodo.
```

---

## 27. MGR-015 — Configuración

### Objetivo

Configurar datos operativos básicos.

### Ruta

```txt
/app/manager/settings
```

### Componentes

```txt
SettingsTabs
BranchSettingsForm
UsersSection
PosDevicesSection
CashReasonsSection
PackageConfigSection
SubscriptionStatusCard
```

### Secciones

```txt
Sucursal
Usuarios
Dispositivos POS
Motivos de retiro
Paquete 800g
Plan y suscripción
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

```txt
Activar POS valida límite del plan
Crear sucursal valida plan
Free máximo 3 usuarios
Paid cobra base + POS activo
```

---

## 28. Pantalla blocked by plan

### Objetivo

Mostrar bloqueo comercial sin parecer error técnico.

### Uso

```txt
Rutas
Facturación
Reportes avanzados
Multi-sucursal
Conciliación
```

### Componentes

```txt
FeatureBlockedState
FeatureDescription
UpgradeCTA futuro
```

### Contenido ejemplo

```txt
Rutas de reparto no está disponible en tu plan.

Este módulo permite controlar pedidos, carga, cobros, devoluciones y liquidación de repartidores.
```

### Acción

```txt
Ver planes
Contactar soporte
```

En V1 pueden quedar deshabilitadas.

---

## 29. Pantalla blocked by permission

### Objetivo

Bloquear una acción que el usuario no puede ejecutar.

### Mensaje

```txt
No tienes permiso para realizar esta acción.
```

### Regla

No mostrar botones de acción si el usuario no tiene permiso.  
Si accede por URL directa, mostrar pantalla bloqueada.

---

## 30. Transiciones globales

### Auth

```txt
/login → /app/select-branch → /app/pos o /app/manager
```

### POS

```txt
/app/pos → apertura o venta
apertura → venta
venta → modal cobro
modal cobro → venta exitosa
venta exitosa → nueva venta
```

### Manager

```txt
dashboard → caja
dashboard → retiros
dashboard → inventario
dashboard → rutas
dashboard → facturación
```

### Feature bloqueada

```txt
módulo premium → FeatureBlockedState
```

---

## 31. QA UX por pantalla

```txt
AUTH-001 Login correcto redirige.
AUTH-002 Login incorrecto muestra error.
AUTH-003 Selección de sucursal guarda branch activa.

POS-001 Sin caja abierta redirige a apertura.
POS-002 Apertura con discrepancia advierte.
POS-003 Venta muestra total visible.
POS-004 Cobro efectivo calcula cambio.
POS-005 Tarjeta sin referencia enfoca campo.
POS-006 Venta exitosa limpia carrito.
POS-007 Sin conexión bloquea completar venta.

MGR-001 Dashboard muestra alertas críticas.
MGR-002 Caja muestra retiros pendientes.
MGR-003 Detalle caja bloquea cierre si hay retiro pendiente.
MGR-004 Retiros requiere PIN para autorizar.
MGR-005 Inventario destaca stock negativo.
MGR-006 Producción solo permite tortilla/masa.
MGR-007 Producto package exige base y peso.
MGR-008 Cambio precio advierte histórico.
MGR-009 Cliente muestra saldo/límite.
MGR-010 Ruta diferencia cobrado vs liquidado.
MGR-011 Facturación bloquea feature en free.
MGR-012 Global diaria no se duplica.
MGR-013 Reportes filtran por fecha.
```

---

## 32. Definition of Done UI/UX Screen Spec

```txt
[ ] Todas las pantallas críticas tienen objetivo
[ ] Todas las pantallas tienen usuario definido
[ ] Todas las pantallas tienen componentes
[ ] Todas las pantallas tienen acción principal
[ ] Todas las pantallas tienen estados loading/empty/error
[ ] Todas las pantallas tienen transiciones
[ ] POS considera teclado
[ ] Manager considera bloqueos por plan
[ ] Manager considera bloqueos por permiso
[ ] Rutas diferencia cobrado vs liquidado
[ ] Caja bloquea cierre con retiro pendiente
[ ] Facturación contempla global diaria
```

---

## 33. Siguiente documento

Después de este documento sigue:

```txt
UI/UX Wireframe Checklist V0.1
```

Ese checklist sirve para revisar los mockups en Figma antes de que frontend los implemente.
