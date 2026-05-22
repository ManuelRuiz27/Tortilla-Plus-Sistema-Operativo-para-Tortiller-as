# Checklists Sprints 3 a 5 — Backend Tortilla Plus

## Sprint 3 — Productos, Inventario y Producción

### Tareas

- [ ] Implementar `ProductService`.
- [ ] Implementar `PriceService`.
- [ ] Implementar `InventoryLedgerService`.
- [ ] Implementar `ProductionService`.
- [ ] Implementar registro de merma.
- [ ] Crear/listar productos.
- [ ] Configurar paquete 800g.
- [ ] Configurar precios por sucursal.
- [ ] Consultar inventario por sucursal.
- [ ] Crear ajuste manual con motivo.
- [ ] Bloquear ajuste de cajero.
- [ ] Registrar producción.
- [ ] Cerrar producción.
- [ ] Bloquear edición de producción cerrada.
- [ ] Registrar merma.

### Done Sprint 3

- [ ] Producción incrementa stock.
- [ ] Stock se modifica solo mediante ledger.
- [ ] Ajuste manual exige motivo.
- [ ] Cajero no ajusta inventario.
- [ ] Paquete tiene producto base y peso configurado.
- [ ] Tests QA-INV pasan.

## Sprint 4 — POS Sales Core

### Tareas

- [ ] Implementar `SaleService`.
- [ ] Crear venta draft.
- [ ] Agregar item por kilo.
- [ ] Agregar item por monto.
- [ ] Agregar item por paquete.
- [ ] Agregar item retail.
- [ ] Completar venta con efectivo.
- [ ] Completar venta con tarjeta y referencia.
- [ ] Bloquear tarjeta sin referencia.
- [ ] Completar pago mixto efectivo/tarjeta.
- [ ] Validar suma exacta de pagos.
- [ ] Descontar inventario en transacción.
- [ ] Permitir stock negativo tortilla/masa con auditoría.
- [ ] Bloquear stock negativo retail.
- [ ] Cancelar venta draft.
- [ ] Cancelar venta cobrada con permiso superior.

### Done Sprint 4

- [ ] No se vende sin caja abierta.
- [ ] Tarjeta sin referencia se bloquea.
- [ ] Pagos cuadran contra total.
- [ ] Paquete 800g descuenta 0.800 kg del producto base.
- [ ] Tortilla/masa pueden quedar en stock negativo con auditoría.
- [ ] Retail sin stock se bloquea.
- [ ] Tests QA-SALE pasan.

## Sprint 5 — Clientes, Crédito y Devoluciones

### Tareas

- [ ] Implementar `CustomerService`.
- [ ] Crear cliente.
- [ ] Editar cliente.
- [ ] Configurar crédito.
- [ ] Crear precio especial.
- [ ] Resolver precio especial antes que precio de sucursal.
- [ ] Completar venta con crédito.
- [ ] Bloquear crédito sin cliente.
- [ ] Bloquear crédito en cliente no habilitado.
- [ ] Autorizar crédito sobre límite con PIN.
- [ ] Crear movimiento de saldo.
- [ ] Consultar balance.
- [ ] Registrar devolución parcial.
- [ ] Validar cantidad máxima de devolución.

### Done Sprint 5

- [ ] Crédito exige cliente.
- [ ] Cliente debe tener crédito habilitado.
- [ ] Crédito sobre límite requiere autorización.
- [ ] Precio especial tiene prioridad.
- [ ] Devolución parcial valida cantidad máxima.
- [ ] Tests QA-CRED pasan.
- [ ] Tests QA-CUST pasan.
