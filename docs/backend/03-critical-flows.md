# Critical Backend Flows V0.1

## 1. Login

1. Recibir email/password.
2. Validar usuario y password hash.
3. Validar estado de usuario y organización.
4. Obtener roles/permisos.
5. Crear sesión y tokens.
6. Auditar `login_success` o `login_failed`.

## 2. Validación de suscripción

1. Obtener suscripción activa.
2. Validar estado.
3. Validar feature requerida.
4. Validar límites de usuarios, sucursales o POS.
5. Si está `suspended_limited`, permitir POS básico y bloquear premium.

## 3. Apertura de caja

1. Validar permiso `cash.open`.
2. Validar acceso a sucursal.
3. Validar que no exista caja abierta en la sucursal.
4. Obtener último cierre.
5. Calcular saldo esperado.
6. Crear `cash_session`.
7. Si hay discrepancia, auditar.

## 4. Registro/autorización de retiro

1. Cajero registra retiro con motivo y monto.
2. Movimiento queda `pending_authorization`.
3. Supervisor/gerente valida PIN.
4. Movimiento pasa a `authorized` o `rejected`.
5. Auditoría obligatoria.

## 5. Cierre de caja

1. Lock de `cash_session`.
2. Validar estado abierto.
3. Bloquear si existen retiros pendientes.
4. Calcular ventas por método.
5. Calcular ingresos/salidas autorizados.
6. Calcular efectivo esperado.
7. Comparar contra efectivo contado.
8. Crear `cash_closing` snapshot.
9. Cambiar caja a `closed`.
10. Auditar faltante/sobrante si existe.

## 6. Producción diaria

1. Validar permiso `production.manage`.
2. Validar productos tortilla/masa.
3. Crear batch e items.
4. Crear movimientos `production_in`.
5. Incrementar stock por sucursal.
6. Auditar.

## 7. Venta por kilo

1. Validar caja abierta.
2. Validar producto activo.
3. Resolver precio efectivo.
4. Calcular total = kg * precio.
5. Crear venta draft y sale item.

## 8. Venta por monto

1. Validar monto positivo.
2. Resolver precio por kilo.
3. Calcular kg = monto / precio_kg.
4. Crear sale item con `sale_mode = by_amount`.

## 9. Venta por paquete configurable

1. Validar producto tipo `package`.
2. Validar `product_package_config`.
3. Calcular precio por paquete.
4. Al completar venta, descontar producto base.
5. Ejemplo: 10 paquetes de 800g descuentan 8kg de tortilla.

## 10. Completar venta

1. Begin transaction.
2. Lock cash session.
3. Validar caja abierta.
4. Lock sale.
5. Validar venta draft.
6. Validar suma de pagos = total.
7. Validar referencias de tarjeta.
8. Validar crédito si existe.
9. Crear pagos.
10. Crear movimientos de crédito si aplica.
11. Descontar inventario.
12. Actualizar stock.
13. Cambiar venta a completed.
14. Auditar.
15. Commit.

## 11. Crédito en venta mixta

1. Requiere customer.
2. Requiere `credit_enabled = true`.
3. Si no excede límite, se permite.
4. Si excede límite, requiere gerente/supervisor y PIN.
5. Crea `customer_balance_movement = charge`.
6. Actualiza `current_balance`.

## 12. Stock negativo tortilla/masa

1. Si venta deja stock negativo y producto es tortilla/masa, permitir.
2. Crear movimiento de inventario.
3. Actualizar stock negativo.
4. Auditar `negative_stock_sale_allowed`.
5. Retail sin stock se bloquea.

## 13. Cancelación y devolución

- Draft: cajero puede cancelar.
- Completed: gerente/supervisor con PIN.
- Facturada: no se cancela directo desde POS.
- Devolución parcial: requiere autorización y valida cantidades.

## 14. Reparto

### Crear pedido

1. Validar feature `delivery_routes`.
2. Validar cliente, ruta y productos.
3. Crear pedido e items en estado `pending`.

### Cargar pedido

1. Validar estado `prepared`.
2. Convertir paquetes a producto base si aplica.
3. Crear `route_load_out`.
4. Descontar inventario.
5. Cambiar estado a `loaded`.

### Entregar pedido

1. Validar cantidades entregadas/devueltas.
2. Actualizar pedido.
3. Si hay devolución, crear return `pending_review`.

### Cobrar en ruta

1. Registrar `delivery_payment`.
2. No entra a caja todavía.
3. Si hay saldo pendiente, crear movimiento de balance.

### Liquidar ruta

1. Calcular efectivo esperado.
2. Capturar efectivo entregado.
3. Crear/cerrar settlement.
4. Si se deposita a caja, crear `cash_movement = route_cash_in`.

## 15. Conciliación

1. Recibir total reportado por proveedor.
2. Calcular total POS tarjeta.
3. Crear batch.
4. Marcar `matched` o `difference`.
5. Auditar diferencias.

## 16. Facturación

### Individual

1. Validar feature `billing_cfdi`.
2. Validar venta completed no facturada.
3. Crear invoice, invoice_sales e invoice_items.
4. Timbrar con PAC de forma idempotente.
5. Guardar UUID, XML/PDF, raw request/response.

### Global diaria por sucursal

1. Validar sucursal y fecha.
2. Buscar ventas completadas no facturadas individualmente.
3. Validar que no exista global del mismo día/sucursal.
4. Crear invoice global.
5. Timbrar.

## 17. Webhooks

### Mercado Pago

1. Validar idempotencia por `event_id`.
2. Guardar raw payload.
3. Actualizar pago SaaS y suscripción.
4. Auditar.

### PAC

1. Validar idempotencia.
2. Guardar raw payload.
3. Actualizar factura.
4. Auditar.

## 18. Transacciones obligatorias

Deben ejecutarse con transacción DB:

- Completar venta.
- Cerrar caja.
- Autorizar retiro.
- Crear producción.
- Registrar merma.
- Cargar ruta.
- Liquidar ruta.
- Timbrar factura localmente.
- Procesar webhook.
