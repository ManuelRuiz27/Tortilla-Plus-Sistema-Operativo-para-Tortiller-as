# Matriz de Permisos V0.1

Fecha: 2026-05-25

## Regla

El backend es la fuente de verdad. La UI puede ocultar o deshabilitar acciones, pero toda accion critica debe validar permiso en API.

## Roles

```txt
organization_owner: todos los permisos
manager: todos los permisos operativos
supervisor: operacion, reportes y conciliacion; sin facturacion
cashier: POS/caja basica; sin billing, conciliacion, reportes ni exportaciones
```

## Pantallas y Acciones

| Pantalla/Modulo | Accion | Permiso |
| --- | --- | --- |
| POS | Crear venta | `sales.create` |
| POS | Cobrar venta | `payments.create` |
| POS | Cancelar borrador | `sales.cancel_before_payment` |
| POS | Cancelar venta cobrada | `sales.cancel_after_payment` |
| Caja | Abrir caja | `cash.open` |
| Caja | Cerrar caja | `cash.close` |
| Caja | Registrar retiro/ingreso | `cash.withdraw.request` |
| Caja | Autorizar/rechazar retiro | `cash.withdraw.authorize` |
| Inventario | Ver stock | `inventory.view` |
| Inventario | Ajustes/merma | `inventory.manage` |
| Productos | Ver productos | `products.view` |
| Productos | Crear/editar productos | `products.manage` |
| Precios | Cambiar precios | `prices.manage` |
| Produccion | Lotes/cierre | `production.manage` |
| Clientes | Ver clientes | `customers.view` |
| Clientes | Crear/editar/credito/precios | `customers.manage` |
| Reparto | Rutas, pedidos, liquidacion | `routes.manage` |
| Billing | Resumen/facturar/timbrar/cancelar/recibos | `billing.manage` |
| Conciliacion | Crear lote, partidas y revisar | `reports.basic.view` |
| Dashboard/reportes | Consultar metricas | `reports.basic.view` |
| Exportaciones fiscales | Descargar facturas | `billing.manage` |
| Exportaciones operativas | Descargar reportes | `reports.basic.view` |
| Terminales | Crear pago en terminal | `payments.create` |
| Bascula | Leer peso | `sales.view` |
| Codigo de barras | Resolver producto | `products.view` |
| Auditoria critica | Ver ultimos eventos | `reports.basic.view` |

## Pruebas de Regresion

```txt
cashier no puede billing
cashier no puede conciliacion
cashier no puede reportes/exportaciones
supervisor puede reportes/conciliacion
supervisor no puede billing
supervisor puede autorizar retiros con PIN
manager puede billing/reportes/conciliacion/exportaciones
organization_owner puede billing/reportes/conciliacion
usuario sin permiso recibe 403 PERMISSION_REQUIRED
```

Validacion automatizada:

```txt
apps/api/tests/integration/permission-hardening-flow.test.ts
```
