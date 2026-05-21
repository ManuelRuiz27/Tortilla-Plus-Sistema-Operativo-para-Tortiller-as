# Backend Services V0.1

## Objetivo

Definir servicios transaccionales backend. El backend no debe operar como CRUD plano; debe proteger reglas de caja, ventas, inventario, rutas, facturación, suscripción y auditoría.

## Servicios

| Servicio | Responsabilidad |
|---|---|
| AuthService | Login, refresh, logout y PIN operativo. |
| SubscriptionGuardService | Plan, estado SaaS, features y límites. |
| PermissionService | Roles, permisos y acceso por sucursal. |
| BranchService | Sucursales y límites por plan. |
| PosDeviceService | Dispositivos POS y licenciamiento. |
| ProductService | Productos, paquetes y configuración. |
| PriceService | Precios por sucursal y cliente. |
| InventoryLedgerService | Movimientos de inventario y stock. |
| ProductionService | Producción diaria de tortilla y masa. |
| CashSessionService | Apertura y cierre de caja. |
| CashMovementService | Retiros, ingresos y autorizaciones. |
| SaleService | Ventas, pagos, cancelaciones y devoluciones. |
| CustomerService | Clientes, crédito y saldos. |
| DeliveryOrderService | Pedidos, carga, entrega, cobro y devolución. |
| DeliverySettlementService | Liquidación de efectivo de ruta. |
| ReconciliationService | Conciliación manual de terminal. |
| BillingService | CFDI individual/global y PAC adapter. |
| AuditLogService | Bitácora crítica. |
| ReportService | Reportes operativos backend. |

## Prioridad

1. AuthService
2. SubscriptionGuardService
3. PermissionService
4. CashSessionService
5. SaleService
6. InventoryLedgerService
7. ProductionService
8. CashMovementService
9. CustomerService
10. DeliveryOrderService
11. BillingService

## Reglas por servicio

### AuthService

- Usuario debe estar activo.
- Organización no debe estar cancelada.
- El PIN se usa para autorización operativa, no para login.
- Login exitoso genera auditoría.

### SubscriptionGuardService

- Plan `free`: máximo 3 usuarios, 1 sucursal, 1 POS.
- Plan `paid`: tarifa base mensual + costo por POS activo.
- `suspended_limited` permite POS básico, caja y ventas.
- `suspended_limited` bloquea facturación, rutas nuevas, multi-sucursal, reportes avanzados y activación de POS.

### PermissionService

- Cajero no autoriza retiros.
- Gerente, supervisor y owner autorizan retiros.
- Gerente y supervisor ajustan inventario.
- Venta cobrada solo puede cancelarse con permiso superior.
- Todo acceso a sucursal debe validarse.

### CashSessionService

- Una sola caja abierta por sucursal.
- Cajero y gerente pueden abrir caja.
- El sistema sugiere saldo final anterior.
- Si hay discrepancia de apertura, se permite abrir y se audita.
- No se puede cerrar caja con retiros pendientes.
- Caja cerrada no se reabre.

### CashMovementService

- Cajero puede registrar retiro.
- Retiro de cajero queda `pending_authorization`.
- Supervisor, gerente y owner pueden autorizar.
- Movimiento financiero no se edita.
- Corrección = cancelar movimiento y crear ajuste auditado.

### SaleService

- No hay venta sin caja abierta.
- Venta completada requiere pagos.
- La suma de pagos debe igualar el total.
- Pago con tarjeta requiere referencia.
- Crédito requiere cliente con crédito habilitado.
- Crédito sobre límite requiere autorización y auditoría.
- Paquete configurable descuenta producto base.
- Tortilla/masa pueden quedar en stock negativo con auditoría.
- Retail sin stock se bloquea.

### InventoryLedgerService

- Todo movimiento requiere sucursal y producto.
- Stock se modifica solo mediante ledger.
- Ajuste manual requiere motivo.
- Stock negativo solo se permite para tortilla/masa por venta.

### ProductionService

- Producción diaria permite tortilla y masa.
- Crear producción genera entrada de inventario.
- Producción cerrada no se edita.
- Correcciones se hacen por ajuste auditado.

### DeliveryOrderService

- Feature `delivery_routes` requerida.
- Inventario se descuenta al cargar producto.
- Cobro de ruta no entra a caja hasta liquidación.
- Devolución queda `pending_review`.

### BillingService

- Feature `billing_cfdi` requerida.
- Factura individual requiere venta completada.
- Factura global es diaria por sucursal.
- Factura timbrada no se edita.
- Venta facturada no se cancela directo desde POS.
- Webhooks PAC son idempotentes.

### AuditLogService

Debe registrar acciones críticas de ventas, caja, inventario, producción, crédito, rutas, facturación, suscripción y cambios de precio.
