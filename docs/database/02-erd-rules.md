# ERD + Reglas de Negocio V0.1

## Relaciones raíz

```txt
organizations 1 ── N business_units
business_units 1 ── N branches
organizations 1 ── N users
organizations 1 ── N subscriptions
organizations 1 ── N products
organizations 1 ── N customers
```

## Operación por sucursal

```txt
branches 1 ── N cash_sessions
branches 1 ── N sales
branches 1 ── N inventory_stocks
branches 1 ── N production_batches
branches 1 ── N delivery_routes
branches 1 ── N invoices
```

## Caja

```txt
cash_sessions 1 ── N sales
cash_sessions 1 ── N cash_movements
cash_sessions 1 ── 1 cash_closings
```

Reglas:

- Una sola `cash_session` abierta por sucursal.
- Caja cerrada no se reabre.
- `cash_closings` es snapshot financiero.
- No se cierra caja con retiros pendientes.

## Ventas

```txt
sales 1 ── N sale_items
sales 1 ── N sale_payments
sales 1 ── N sale_returns
```

Reglas:

- Venta completed requiere pago completo.
- Pago mixto se modela con múltiples `sale_payments`.
- Tarjeta requiere referencia.
- Crédito requiere customer.
- Cancelación post-pago requiere gerente/supervisor.
- Venta facturada no se cancela directo desde POS.

## Inventario

```txt
products 1 ── N inventory_stocks
products 1 ── N inventory_movements
production_batches 1 ── N production_batch_items
```

Reglas:

- Stock se modifica por ledger.
- Producción genera `production_in`.
- Venta genera `sale_out`.
- Merma genera `waste_out`.
- Paquete descuenta producto base según gramos configurados.
- Stock negativo solo se permite para tortilla/masa por venta y debe auditarse.

## Clientes y crédito

```txt
customers 1 ── N sales
customers 1 ── N customer_product_prices
customers 1 ── N customer_balance_movements
```

Reglas:

- `current_balance` es cache operativo.
- Fuente auditable: `customer_balance_movements`.
- Crédito sobre límite requiere autorización.
- Precio especial tiene prioridad sobre precio de sucursal.

## Rutas

```txt
delivery_routes 1 ── N delivery_orders
delivery_orders 1 ── N delivery_order_items
delivery_orders 1 ── N delivery_payments
delivery_orders 1 ── N delivery_returns
```

Reglas:

- Producto cargado no equivale a producto vendido.
- Inventario se descuenta al cargar ruta.
- Cobro en ruta no entra a caja hasta liquidación.
- Devolución queda pendiente de revisión.

## Facturación

```txt
invoices 1 ── N invoice_items
invoices 1 ── N invoice_sales
sales N ── N invoices vía invoice_sales
```

Reglas:

- Factura individual: una venta completed.
- Factura global: ventas del día por sucursal.
- Timbrada no se edita.
- Cancelación CFDI es flujo separado.

## Reglas transversales

- No mezclar `organization_id` entre entidades relacionadas.
- Toda operación física requiere `branch_id`.
- Operaciones críticas requieren transacción.
- Webhooks deben ser idempotentes.
- Acciones financieras, inventario, crédito, rutas y facturación generan auditoría.
