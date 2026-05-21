# OpenAPI Contract V0.1

## Base

```txt
/api/v1
Authorization: Bearer <access_token>
```

## Error estándar

```json
{
  "statusCode": 400,
  "error": "PAYMENT_TOTAL_MISMATCH",
  "message": "La suma de pagos no coincide con el total de la venta.",
  "details": {}
}
```

## Auth

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/auth/login` | Login. |
| POST | `/auth/refresh` | Renovar token. |
| POST | `/auth/logout` | Cerrar sesión. |
| POST | `/auth/validate-pin` | Validar PIN operativo. |
| GET | `/auth/me` | Usuario actual. |

## Subscriptions

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/subscriptions/current` | Suscripción actual. |
| GET | `/subscriptions/features` | Features/límites disponibles. |
| POST | `/webhooks/mercadopago` | Webhook de pago SaaS. |

## Branches / POS

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/branches` | Listar sucursales. |
| POST | `/branches` | Crear sucursal. Requiere `multi_branch`. |
| PATCH | `/branches/{id}` | Editar sucursal. |
| GET | `/pos-devices` | Listar POS. |
| POST | `/pos-devices` | Crear POS. |
| PATCH | `/pos-devices/{id}/activate` | Activar POS validando plan. |
| PATCH | `/pos-devices/{id}/block` | Bloquear POS. |

## Products / Prices / Inventory

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/products` | Listar productos. |
| POST | `/products` | Crear producto o paquete configurable. |
| PATCH | `/products/{id}` | Editar producto. |
| GET | `/prices/branch/{branchId}` | Precios por sucursal. |
| POST | `/prices/branch` | Crear precio por sucursal. |
| GET | `/inventory/branch/{branchId}` | Consultar inventario. |
| POST | `/inventory/adjustments` | Ajuste manual auditado. |
| POST | `/production/batches` | Registrar producción. |
| PATCH | `/production/batches/{id}/close` | Cerrar producción. |
| POST | `/waste-records` | Registrar merma. |

## Cash

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/cash-sessions/open` | Abrir caja. |
| GET | `/cash-sessions/open?branchId=` | Obtener caja abierta. |
| GET | `/cash-sessions/{id}/summary` | Resumen de caja. |
| POST | `/cash-sessions/{id}/start-closing` | Iniciar cierre. |
| POST | `/cash-sessions/{id}/close` | Cerrar caja. |
| POST | `/cash-movements/withdrawals` | Solicitar retiro. |
| POST | `/cash-movements/income` | Registrar ingreso. |
| POST | `/cash-movements/{id}/authorize` | Autorizar retiro. |
| POST | `/cash-movements/{id}/reject` | Rechazar retiro. |
| POST | `/cash-movements/{id}/cancel` | Cancelar movimiento. |

## Sales

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/sales` | Crear venta draft con items. |
| POST | `/sales/{id}/items` | Agregar item. |
| POST | `/sales/{id}/complete` | Completar/cobrar venta. |
| POST | `/sales/{id}/cancel-draft` | Cancelar ticket sin cobrar. |
| POST | `/sales/{id}/cancel-paid` | Cancelar venta cobrada. |
| POST | `/sales/{id}/returns` | Devolución parcial. |
| GET | `/sales/{id}` | Consultar venta. |
| GET | `/sales` | Listar ventas. |

## Customers

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/customers` | Listar clientes. |
| POST | `/customers` | Crear cliente. |
| PATCH | `/customers/{id}` | Editar cliente. |
| POST | `/customers/{id}/credit` | Configurar crédito. |
| POST | `/customers/{id}/prices` | Precio especial. |
| GET | `/customers/{id}/balance` | Saldo del cliente. |

## Delivery

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/delivery-drivers` | Listar repartidores. |
| POST | `/delivery-drivers` | Crear repartidor. |
| GET | `/delivery-routes` | Listar rutas. |
| POST | `/delivery-routes` | Crear ruta. |
| POST | `/delivery-routes/{id}/customers` | Asignar cliente a ruta. |
| POST | `/delivery-orders` | Crear pedido. |
| POST | `/delivery-orders/{id}/prepare` | Preparar pedido. |
| POST | `/delivery-orders/{id}/load` | Cargar pedido y descontar inventario. |
| POST | `/delivery-orders/{id}/in-route` | Marcar en ruta. |
| POST | `/delivery-orders/{id}/deliver` | Registrar entrega. |
| POST | `/delivery-orders/{id}/payments` | Cobro en ruta. |
| POST | `/delivery-orders/{id}/returns` | Devolución de ruta. |
| POST | `/delivery-returns/{id}/review` | Revisar devolución. |
| POST | `/delivery-settlements` | Crear liquidación. |
| POST | `/delivery-settlements/{id}/close` | Cerrar liquidación. |
| POST | `/delivery-settlements/{id}/deposit-to-cash` | Depositar efectivo a caja. |

## Reconciliation / Billing / Reports

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/reconciliation/batches` | Crear conciliación. |
| POST | `/reconciliation/batches/{id}/items` | Agregar item. |
| POST | `/reconciliation/batches/{id}/review` | Revisar conciliación. |
| POST | `/billing/invoices/individual` | Factura individual. |
| POST | `/billing/invoices/global-daily` | Factura global diaria por sucursal. |
| POST | `/billing/invoices/{id}/stamp` | Timbrar. |
| POST | `/billing/invoices/{id}/cancel` | Cancelar CFDI. |
| GET | `/billing/invoices/{id}/documents` | PDF/XML. |
| POST | `/webhooks/pac` | Webhook PAC. |
| GET | `/reports/sales-by-day` | Ventas por día. |
| GET | `/reports/sales-by-branch` | Ventas por sucursal. |
| GET | `/reports/sales-by-product` | Ventas por producto. |
| GET | `/reports/sales-by-customer` | Ventas por cliente. |
| GET | `/reports/cash-withdrawals-by-reason` | Retiros por motivo. |
| GET | `/reports/cash-differences` | Faltantes/sobrantes. |

## Reglas contractuales críticas

- Tarjeta sin referencia: `CARD_REFERENCE_REQUIRED`.
- Venta sin caja abierta: `NO_OPEN_CASH_SESSION`.
- Cierre con retiro pendiente: `PENDING_CASH_MOVEMENTS`.
- Crédito sin cliente: `CUSTOMER_REQUIRED_FOR_CREDIT`.
- Plan sin feature: `FEATURE_NOT_AVAILABLE`.
- Acceso a sucursal inválido: `BRANCH_ACCESS_DENIED`.
- Venta facturada no cancela directo: `INVOICED_SALE_CANNOT_BE_CANCELLED_DIRECTLY`.
