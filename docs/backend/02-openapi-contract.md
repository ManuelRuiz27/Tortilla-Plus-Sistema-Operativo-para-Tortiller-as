# OpenAPI Contract V0.1

## Estado del contrato

Este documento es un contrato resumido V0.1. Lista la superficie API esperada por modulo, pero no sustituye una especificacion OpenAPI YAML formal.

Durante los sprints, cada endpoint implementado debe completarse con request body, response body, permiso requerido, feature requerida, errores esperados y auditoria generada. Sprint 8 convierte este contrato incremental en OpenAPI YAML formal.

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

## Plantilla obligatoria por endpoint

Cada endpoint promovido de lista a contrato implementable debe documentarse asi:

```txt
Metodo:
Ruta:
Descripcion:
Auth:
Permiso requerido:
Feature requerida:
Request body:
Response body:
Errores esperados:
Auditoria generada:
Notas transaccionales:
```

## Sprint 0

| Método | Endpoint | Uso | Auth | Errores |
|---|---|---|---|---|
| GET | `/health` | Healthcheck de API y proceso. | No requerida | `SERVICE_UNAVAILABLE` si una dependencia critica no responde. |

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

## Detalle implementado Sprint 1

### Auth

| Metodo | Endpoint | Uso |
|---|---|---|
| POST | `/auth/login` | Autenticar usuario con email y password. |
| POST | `/auth/refresh` | Renovar access token con refresh token activo. |
| POST | `/auth/logout` | Revocar refresh token. |
| POST | `/auth/validate-pin` | Validar PIN operativo del usuario autenticado. |
| GET | `/auth/me` | Consultar usuario actual, roles, permisos y sucursales asignadas. |

`POST /auth/login` recibe:

```json
{
  "email": "owner.demo@tortillaplus.mx",
  "password": "Demo1234!"
}
```

Respuesta exitosa:

```json
{
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "<uuid>",
      "organizationId": "<uuid>",
      "email": "owner.demo@tortillaplus.mx",
      "fullName": "Owner Demo",
      "roles": ["organization_owner"],
      "permissions": ["..."],
      "branches": [
        {
          "branchId": "<uuid>",
          "role": "admin"
        }
      ]
    }
  }
}
```

`POST /auth/refresh` recibe:

```json
{
  "refreshToken": "<token>"
}
```

`POST /auth/logout` recibe:

```json
{
  "refreshToken": "<token>"
}
```

`POST /auth/validate-pin` requiere `Authorization: Bearer <accessToken>` y recibe:

```json
{
  "pin": "1234"
}
```

### Suscripciones

| Metodo | Endpoint | Uso |
|---|---|---|
| GET | `/subscriptions/current` | Consultar plan y suscripcion activa de la organizacion. |
| GET | `/subscriptions/features` | Consultar features habilitadas por el plan activo. |

Ambos endpoints requieren `Authorization: Bearer <accessToken>`.

### Errores Sprint 1

- `INVALID_REQUEST`: payload invalido o JSON mal formado.
- `INVALID_CREDENTIALS`: email, password o PIN invalido.
- `INVALID_TOKEN`: token ausente, mal formado o revocado.
- `TOKEN_EXPIRED`: access token expirado.
- `SUBSCRIPTION_NOT_FOUND`: organizacion sin suscripcion activa.
- `INTERNAL_SERVER_ERROR`: error no controlado.

## Detalle implementado Sprint 2

Todos los endpoints de caja requieren `Authorization: Bearer <accessToken>`, feature `cash_control`,
acceso a la sucursal y el permiso operativo indicado.

| Metodo | Endpoint | Permiso | Uso |
|---|---|---|---|
| POST | `/cash-sessions/open` | `cash.open` | Abrir caja en una sucursal. |
| GET | `/cash-sessions/open?branchId=` | `cash.movements.view` | Consultar caja abierta por sucursal. |
| GET | `/cash-sessions/{id}/summary` | `cash.movements.view` | Consultar resumen, movimientos y efectivo esperado. |
| POST | `/cash-sessions/{id}/close` | `cash.close` | Cerrar caja y crear snapshot de cierre. |
| POST | `/cash-movements/withdrawals` | `cash.withdraw.request` | Solicitar retiro pendiente de autorizacion. |
| POST | `/cash-movements/income` | `cash.withdraw.request` | Registrar ingreso manual de efectivo. |
| POST | `/cash-movements/{id}/authorize` | `cash.withdraw.authorize` | Autorizar retiro con PIN. |
| POST | `/cash-movements/{id}/reject` | `cash.withdraw.authorize` | Rechazar retiro. |
| POST | `/cash-movements/{id}/cancel` | `cash.withdraw.request` | Cancelar movimiento registrado o pendiente. |

`POST /cash-sessions/open` recibe:

```json
{
  "branchId": "<uuid>",
  "openingAmountCounted": "500.00",
  "openingNote": "Fondo inicial"
}
```

`POST /cash-movements/withdrawals` y `POST /cash-movements/income` reciben:

```json
{
  "branchId": "<uuid>",
  "amount": "100.00",
  "reasonId": "<uuid opcional>",
  "description": "Compra menor"
}
```

`POST /cash-movements/{id}/authorize` recibe:

```json
{
  "pin": "1234"
}
```

`POST /cash-sessions/{id}/close` recibe:

```json
{
  "countedCashAmount": "500.00",
  "comment": "Cierre sin diferencia"
}
```

### Errores Sprint 2

- `CASH_SESSION_ALREADY_OPEN`: ya existe caja abierta en la sucursal.
- `NO_OPEN_CASH_SESSION`: no hay caja abierta para registrar movimientos.
- `CASH_SESSION_NOT_FOUND`: la caja no existe en el tenant.
- `CASH_SESSION_NOT_OPEN`: la caja no esta abierta.
- `PENDING_CASH_MOVEMENTS`: la caja tiene retiros pendientes y no puede cerrar.
- `CASH_MOVEMENT_NOT_FOUND`: movimiento no encontrado en el tenant.
- `INVALID_CASH_MOVEMENT_STATUS`: el movimiento no permite esa transicion.
- `INVALID_CASH_REASON`: motivo inexistente o de direccion incorrecta.

## Detalle implementado Sprint 3

Todos los endpoints requieren `Authorization: Bearer <accessToken>`.

| Metodo | Endpoint | Feature | Permiso | Uso |
|---|---|---|---|---|
| GET | `/products` | - | `products.view` | Listar productos del tenant. |
| POST | `/products` | - | `products.manage` | Crear producto y configuracion de paquete opcional. |
| PATCH | `/products/{id}` | - | `products.manage` | Editar producto del tenant. |
| GET | `/prices/branch/{branchId}` | `inventory_basic` | `products.view` | Listar precios activos por sucursal. |
| POST | `/prices/branch` | `inventory_basic` | `prices.manage` | Crear precio activo por sucursal, producto y modo de venta. |
| GET | `/inventory/branch/{branchId}` | `inventory_basic` | `inventory.view` | Consultar stock por sucursal. |
| POST | `/inventory/adjustments` | `inventory_basic` | `inventory.manage` | Crear ajuste manual con ledger. |
| POST | `/production/batches` | `production_control` | `production.manage` | Crear produccion abierta con items. |
| PATCH | `/production/batches/{id}/close` | `production_control` | `production.manage` | Cerrar produccion y crear `production_in`. |
| POST | `/waste-records` | `inventory_basic` | `production.manage` o `inventory.manage` | Registrar merma y crear `waste_out`. |

`POST /products` recibe:

```json
{
  "name": "Paquete tortilla 800g",
  "sku": "PAQUETE-800G",
  "productType": "package",
  "unit": "package",
  "categoryName": "Tortilleria",
  "packageConfig": {
    "baseProductId": "<uuid>",
    "packageWeightGrams": "800.000"
  }
}
```

`POST /prices/branch` recibe:

```json
{
  "branchId": "<uuid>",
  "productId": "<uuid>",
  "saleMode": "by_kg",
  "price": "25.00"
}
```

`POST /inventory/adjustments` recibe:

```json
{
  "branchId": "<uuid>",
  "productId": "<uuid>",
  "direction": "in",
  "quantity": "1.000",
  "reason": "Ajuste de conteo"
}
```

`POST /production/batches` recibe:

```json
{
  "branchId": "<uuid>",
  "productionDate": "2026-05-22",
  "items": [
    {
      "productId": "<uuid>",
      "quantity": "2.500",
      "unit": "kg"
    }
  ]
}
```

`POST /waste-records` recibe:

```json
{
  "branchId": "<uuid>",
  "productId": "<uuid>",
  "quantity": "0.250",
  "wasteReason": "tortilla_rota"
}
```

### Errores Sprint 3

- `PRODUCT_NOT_FOUND`: producto inexistente en el tenant.
- `PRODUCT_NOT_STOCK_TRACKED`: producto sin control de inventario.
- `PRODUCTION_BATCH_NOT_FOUND`: produccion inexistente en el tenant.
- `INVALID_PRODUCTION_PRODUCT`: produccion solo acepta tortilla o masa.
- `CANNOT_EDIT_CLOSED_BATCH`: produccion cerrada no se puede volver a cerrar o editar.
- `REASON_REQUIRED`: ajuste manual sin motivo.
- `INSUFFICIENT_STOCK`: movimiento dejaria stock negativo.

## Detalle implementado Sprint 4

Todos los endpoints requieren `Authorization: Bearer <accessToken>`, feature `pos_basic`,
acceso a sucursal y caja abierta cuando se crea una venta.

| Metodo | Endpoint | Permiso | Uso |
|---|---|---|---|
| POST | `/sales` | `sales.create` | Crear venta draft ligada a caja abierta. |
| POST | `/sales/{id}/items` | `sales.create` | Agregar item por kilo, monto, paquete o unidad. |
| POST | `/sales/{id}/complete` | `payments.create` | Completar venta con pagos exactos. |
| POST | `/sales/{id}/cancel-draft` | `sales.cancel_before_payment` | Cancelar venta draft. |
| POST | `/sales/{id}/cancel-paid` | `sales.cancel_after_payment` | Cancelar venta cobrada con permiso superior. |
| GET | `/sales/{id}` | `sales.view` | Consultar venta. |
| GET | `/sales?branchId=` | `sales.view` | Listar ventas, opcionalmente por sucursal. |

`POST /sales` recibe:

```json
{
  "branchId": "<uuid>"
}
```

`POST /sales/{id}/items` recibe:

```json
{
  "productId": "<uuid>",
  "saleMode": "by_kg",
  "quantity": "1.000"
}
```

Para venta por monto:

```json
{
  "productId": "<uuid>",
  "saleMode": "by_amount",
  "amount": "12.00"
}
```

`POST /sales/{id}/complete` recibe:

```json
{
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": "40.00"
    },
    {
      "paymentMethod": "card",
      "amount": "51.00",
      "reference": "TERM-123",
      "provider": "terminal-demo"
    }
  ]
}
```

### Reglas Sprint 4

- No se crea venta sin caja abierta: `NO_OPEN_CASH_SESSION`.
- Pago con tarjeta requiere `reference`: `CARD_REFERENCE_REQUIRED`.
- Suma de pagos debe ser exacta: `PAYMENT_TOTAL_MISMATCH`.
- Venta por paquete descuenta el producto base usando `product_package_configs`.
- Retail sin stock suficiente devuelve `NEGATIVE_STOCK_NOT_ALLOWED`.
- Tortilla y masa pueden quedar negativas y generan auditoria `negative_stock_sale_allowed`.
- Venta cobrada solo se cancela con `sales.cancel_after_payment`.

### Errores Sprint 4

- `SALE_NOT_FOUND`: venta inexistente en el tenant.
- `SALE_NOT_DRAFT`: la venta ya no acepta items ni cierre.
- `SALE_NOT_COMPLETED`: cancelacion pagada sobre venta no completada.
- `PRICE_NOT_FOUND`: producto sin precio activo para sucursal/modo.
- `CARD_REFERENCE_REQUIRED`: pago tarjeta sin referencia.
- `PAYMENT_TOTAL_MISMATCH`: pagos no cuadran con total.
- `NEGATIVE_STOCK_NOT_ALLOWED`: retail quedaria con stock negativo.

## Detalle implementado Sprint 5

### Clientes

Todos los endpoints requieren `Authorization: Bearer <accessToken>`.

| Metodo | Endpoint | Feature | Permiso | Uso |
|---|---|---|---|---|
| GET | `/customers` | - | `customers.view` | Listar clientes del tenant. |
| POST | `/customers` | - | `customers.manage` | Crear cliente. |
| PATCH | `/customers/{id}` | - | `customers.manage` | Editar cliente. |
| POST | `/customers/{id}/credit` | `customer_credit` | `customers.manage` | Configurar credito. |
| POST | `/customers/{id}/prices` | - | `customers.manage` | Crear precio especial por cliente. |
| GET | `/customers/{id}/balance` | - | `customers.view` | Consultar saldo y movimientos. |

`POST /customers` recibe:

```json
{
  "name": "Cliente Demo",
  "customerType": "cliente_frecuente",
  "phone": "5551112222"
}
```

`POST /customers/{id}/credit` recibe:

```json
{
  "creditEnabled": true,
  "creditLimit": "100.00"
}
```

`POST /customers/{id}/prices` recibe:

```json
{
  "branchId": "<uuid opcional>",
  "productId": "<uuid>",
  "saleMode": "by_kg",
  "price": "20.00"
}
```

### Credito en venta

Para cobrar con credito, `POST /sales/{id}/complete` recibe un pago `credit`:

```json
{
  "payments": [
    {
      "paymentMethod": "credit",
      "amount": "40.00"
    }
  ]
}
```

Si el credito excede el limite, el usuario debe tener `customers.manage` y enviar:

```json
{
  "payments": [
    {
      "paymentMethod": "credit",
      "amount": "140.00"
    }
  ],
  "authorizationPin": "1234"
}
```

### Devoluciones

`POST /sales/{id}/returns` requiere `sales.cancel_after_payment` y recibe:

```json
{
  "reason": "Devolucion parcial",
  "pin": "1234",
  "items": [
    {
      "saleItemId": "<uuid>",
      "quantity": "0.500",
      "returnToInventory": true,
      "inventoryCondition": "sellable"
    }
  ]
}
```

### Reglas Sprint 5

- Precio especial por cliente tiene prioridad sobre precio de sucursal.
- Pago `credit` requiere `customerId` en la venta.
- Cliente debe tener credito habilitado.
- Credito incrementa `customers.current_balance` y crea `customer_balance_movements`.
- Credito sobre limite requiere `authorizationPin` y permiso `customers.manage`.
- Devolucion parcial valida cantidad maxima pendiente por item.
- Devolucion con `returnToInventory=true` y `sellable` crea `return_in`.

### Errores Sprint 5

- `CUSTOMER_NOT_FOUND`: cliente inexistente en tenant.
- `CUSTOMER_REQUIRED_FOR_CREDIT`: pago a credito sin cliente.
- `CUSTOMER_CREDIT_DISABLED`: cliente sin credito habilitado.
- `CUSTOMER_CREDIT_LIMIT_EXCEEDED`: credito excede limite sin autorizacion.
- `INVALID_RETURN_QUANTITY`: devolucion excede cantidad vendida o pendiente.

## Detalle implementado Sprint 6

### Rutas de reparto

Todos los endpoints requieren `Authorization: Bearer <accessToken>`, feature `delivery_routes` y permiso `routes.manage`.

| Metodo | Endpoint | Uso |
|---|---|---|
| GET | `/delivery-drivers` | Listar repartidores. |
| POST | `/delivery-drivers` | Crear o reactivar repartidor. |
| GET | `/delivery-routes?branchId=` | Listar rutas, opcionalmente por sucursal. |
| POST | `/delivery-routes` | Crear ruta y asignar repartidor. |
| POST | `/delivery-routes/{id}/customers` | Asignar cliente a ruta. |
| POST | `/delivery-orders` | Crear pedido de reparto. |
| POST | `/delivery-orders/{id}/prepare` | Preparar pedido. |
| POST | `/delivery-orders/{id}/load` | Cargar pedido y descontar inventario. |
| POST | `/delivery-orders/{id}/in-route` | Marcar pedido en ruta. |
| POST | `/delivery-orders/{id}/deliver` | Registrar entrega y devoluciones pendientes. |
| POST | `/delivery-orders/{id}/payments` | Registrar cobro de ruta. |
| POST | `/delivery-orders/{id}/returns` | Crear devolucion manual pendiente de revision. |
| POST | `/delivery-returns/{id}/review` | Revisar devolucion como vendible o merma. |
| POST | `/delivery-settlements` | Crear liquidacion de ruta. |
| POST | `/delivery-settlements/{id}/close` | Cerrar liquidacion con efectivo entregado. |
| POST | `/delivery-settlements/{id}/deposit-to-cash` | Depositar efectivo liquidado en caja abierta. |

`POST /delivery-orders` recibe:

```json
{
  "branchId": "<uuid>",
  "routeId": "<uuid>",
  "driverId": "<uuid>",
  "customerId": "<uuid>",
  "items": [
    {
      "productId": "<uuid>",
      "quantity": "2.000"
    }
  ]
}
```

`POST /delivery-orders/{id}/deliver` recibe:

```json
{
  "items": [
    {
      "deliveryOrderItemId": "<uuid>",
      "quantity": "1.000"
    }
  ]
}
```

`POST /delivery-orders/{id}/payments` recibe:

```json
{
  "paymentMethod": "cash",
  "amount": "20.00"
}
```

`POST /delivery-returns/{id}/review` recibe:

```json
{
  "action": "return_to_inventory"
}
```

Para merma:

```json
{
  "action": "mark_as_waste"
}
```

`POST /delivery-settlements/{id}/close` recibe:

```json
{
  "deliveredCashAmount": "20.00"
}
```

### Reglas Sprint 6

- Cargar pedido requiere estado `prepared` y crea movimientos `route_load_out`.
- El paquete descuenta inventario del producto base configurado en `product_package_configs`.
- Cobro de ruta crea `delivery_payments`, pero no crea movimiento de caja automatico.
- Entrega con cantidad menor a la cargada crea devolucion `pending_review`.
- Revision vendible crea `route_return_in` y suma inventario.
- Revision como merma crea `return_waste` y `waste_records`.
- Liquidacion calcula diferencia como efectivo entregado menos efectivo esperado.
- Efectivo esperado considera cobros cash posteriores a la ultima liquidacion cerrada del mismo alcance.
- Deposito a caja requiere liquidacion cerrada y caja abierta; crea movimiento `route_cash_in`.

### Errores Sprint 6

- `DELIVERY_DRIVER_NOT_FOUND`: repartidor inexistente o inactivo.
- `DELIVERY_ROUTE_NOT_FOUND`: ruta inexistente o inactiva.
- `DELIVERY_ORDER_NOT_FOUND`: pedido de reparto inexistente.
- `DELIVERY_RETURN_NOT_FOUND`: devolucion de ruta inexistente.
- `DELIVERY_SETTLEMENT_NOT_FOUND`: liquidacion inexistente.
- `INVALID_DELIVERY_STATUS`: estado invalido para la accion solicitada.
- `RETURN_ALREADY_REVIEWED`: devolucion ya revisada.
