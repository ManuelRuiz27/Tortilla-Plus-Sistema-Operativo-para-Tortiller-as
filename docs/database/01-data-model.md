# Modelo de Datos V0.1

## Principios

- SaaS multi-tenant.
- `organizations` es el tenant principal.
- `business_units` permite varias marcas o negocios por organización.
- `branches` representa sucursales físicas.
- Toda operación física debe tener `branch_id`.
- Toda entidad operativa debe respetar `organization_id`.
- Datos financieros no se borran; se cancelan o ajustan.
- Inventario se modifica por ledger, no por edición directa.

## Dominios

- SaaS y tenancy.
- Usuarios y seguridad.
- POS y dispositivos.
- Productos y precios.
- Inventario y producción.
- Caja y cortes.
- Ventas y pagos.
- Clientes y crédito.
- Rutas y reparto.
- Conciliación.
- Facturación CFDI.
- Auditoría y reportes.

## Tablas principales

### SaaS

- organizations
- business_units
- branches
- plans
- features
- plan_features
- subscriptions
- subscription_items
- saas_payments
- mercadopago_webhook_events

### Seguridad

- users
- roles
- permissions
- role_permissions
- user_roles
- user_branch_assignments
- user_sessions

### POS

- pos_devices

### Productos e inventario

- product_categories
- products
- product_package_configs
- branch_product_prices
- customer_product_prices
- inventory_stocks
- inventory_movements
- production_batches
- production_batch_items
- waste_records

### Caja y ventas

- cash_sessions
- cash_movement_reasons
- cash_movements
- cash_closings
- sales
- sale_items
- sale_payments
- sale_returns
- sale_return_items

### Clientes y rutas

- customers
- customer_balance_movements
- delivery_drivers
- delivery_routes
- delivery_route_customers
- delivery_orders
- delivery_order_items
- delivery_payments
- delivery_settlements
- delivery_returns
- delivery_return_items

### Conciliación y facturación

- payment_providers
- payment_terminal_references
- reconciliation_batches
- reconciliation_items
- billing_profiles
- invoices
- invoice_sales
- invoice_items
- invoice_documents
- pac_webhook_events

### Auditoría y BI

- audit_logs
- analytics_snapshots

## Invariantes críticas

- Una sucursal solo puede tener una caja abierta.
- No se puede vender sin caja abierta.
- No se cierra caja con retiros pendientes.
- Pago con tarjeta requiere referencia.
- Crédito requiere cliente con crédito habilitado.
- Crédito sobre límite requiere autorización.
- Tortilla y masa pueden quedar en stock negativo con auditoría.
- Producto retail sin stock se bloquea.
- Reparto descuenta inventario al cargar.
- Cobro en ruta no entra a caja hasta liquidación.
- Factura global es diaria por sucursal.
- Webhooks son idempotentes.
