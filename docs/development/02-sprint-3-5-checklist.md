# Checklists Sprints 3 a 5 - Backend Tortilla Plus

## Sprint 3 - Productos, Inventario y Produccion

### Estado

- [ ] No iniciado.
- [ ] En progreso.
- [x] Implementado.
- [x] Verificado.

### Precondiciones

- [x] Sprint 0 completo: proyecto, DB, Prisma, seed y healthcheck.
- [x] Sprint 1 completo: auth, permisos, sucursal y feature guards.
- [x] Sprint 2 completo: caja operativa y gate financiero base.
- [x] Confirmar productos demo base en seed.
- [x] Confirmar precios demo por sucursal en seed.
- [x] Confirmar stock demo inicial por sucursal en seed.

### Tareas

- [x] Implementar `ProductService`.
- [x] Implementar `PriceService`.
- [x] Implementar `InventoryLedgerService`.
- [x] Implementar `ProductionService`.
- [x] Implementar `WasteService`.
- [x] Crear/listar productos.
- [x] Editar producto.
- [x] Configurar paquete 800g.
- [x] Configurar precios por sucursal.
- [x] Consultar inventario por sucursal.
- [x] Crear ajuste manual con motivo.
- [x] Crear ledger `manual_adjustment_in`.
- [x] Crear ledger `manual_adjustment_out`.
- [x] Bloquear ajuste de cajero.
- [x] Registrar produccion.
- [x] Cerrar produccion.
- [x] Crear ledger `production_in` al cerrar produccion.
- [x] Bloquear edicion de produccion cerrada.
- [x] Registrar merma.
- [x] Crear ledger `waste_out`.
- [x] Auditar cambios de precio.
- [x] Auditar ajustes de inventario.
- [x] Auditar produccion.
- [x] Auditar merma.

### Endpoints Sprint 3

- [x] `GET /products`
- [x] `POST /products`
- [x] `PATCH /products/{id}`
- [x] `GET /prices/branch/{branchId}`
- [x] `POST /prices/branch`
- [x] `GET /inventory/branch/{branchId}`
- [x] `POST /inventory/adjustments`
- [x] `POST /production/batches`
- [x] `PATCH /production/batches/{id}/close`
- [x] `POST /waste-records`

### Guards Sprint 3

- [x] Productos filtran por `organization_id`.
- [x] Precios validan `branch_id` dentro del tenant.
- [x] Inventario valida `branch_id` dentro del tenant.
- [x] Ajustes requieren permiso `inventory.manage`.
- [x] Consulta de inventario requiere permiso `inventory.view`.
- [x] Produccion requiere permiso `production.manage`.
- [x] Merma requiere permiso `production.manage` o `inventory.manage`.
- [x] Inventario requiere feature `inventory_basic`.
- [x] Produccion requiere feature `production_control`.
- [x] Productos/precios no mezclan datos entre organizaciones.

### QA Sprint 3

- [x] QA-INV-001: produccion diaria de tortilla aumenta stock y crea `production_in`.
- [x] QA-INV-002: produccion diaria de masa aumenta stock.
- [x] QA-INV-003: produccion con producto retail devuelve `INVALID_PRODUCTION_PRODUCT`.
- [x] QA-INV-008: ajuste manual con motivo crea `inventory_movement`.
- [x] QA-INV-009: ajuste manual sin motivo devuelve `REASON_REQUIRED`.
- [x] QA-INV-010: cajero ajusta inventario devuelve `PERMISSION_REQUIRED`.
- [x] QA-INV-011: registrar merma crea `waste_out`.
- [x] QA-INV-012: editar produccion cerrada devuelve `CANNOT_EDIT_CLOSED_BATCH`.

### Done Sprint 3

- [x] Produccion incrementa stock.
- [x] Stock se modifica solo mediante ledger.
- [x] Ajuste manual exige motivo.
- [x] Cajero no ajusta inventario.
- [x] Paquete tiene producto base y peso configurado.
- [x] Stock queda consultable por sucursal.
- [x] Precios por sucursal quedan configurables.
- [x] OpenAPI actualizado con detalle Sprint 3.
- [x] Seed idempotente incluye datos base para smoke.
- [x] `npm run build` pasa.
- [x] `npm run lint` pasa.
- [x] `npm test` pasa.
- [x] `npm run db:seed` pasa dos veces.
- [x] Smoke HTTP Sprint 3 pasa.
- [x] Tests QA-INV pasan.

## Sprint 4 - POS Sales Core

### Tareas

- [x] Implementar `SaleService`.
- [x] Crear venta draft.
- [x] Agregar item por kilo.
- [x] Agregar item por monto.
- [x] Agregar item por paquete.
- [x] Agregar item retail.
- [x] Completar venta con efectivo.
- [x] Completar venta con tarjeta y referencia.
- [x] Bloquear tarjeta sin referencia.
- [x] Completar pago mixto efectivo/tarjeta.
- [x] Validar suma exacta de pagos.
- [x] Descontar inventario en transaccion.
- [x] Permitir stock negativo tortilla/masa con auditoria.
- [x] Bloquear stock negativo retail.
- [x] Cancelar venta draft.
- [x] Cancelar venta cobrada con permiso superior.

### Done Sprint 4

- [x] No se vende sin caja abierta.
- [x] Tarjeta sin referencia se bloquea.
- [x] Pagos cuadran contra total.
- [x] Paquete 800g descuenta 0.800 kg del producto base.
- [x] Tortilla/masa pueden quedar en stock negativo con auditoria.
- [x] Retail sin stock se bloquea.
- [x] Tests QA-SALE pasan.

## Sprint 5 - Clientes, Credito y Devoluciones

### Tareas

- [x] Implementar `CustomerService`.
- [x] Crear cliente.
- [x] Editar cliente.
- [x] Configurar credito.
- [x] Crear precio especial.
- [x] Resolver precio especial antes que precio de sucursal.
- [x] Completar venta con credito.
- [x] Bloquear credito sin cliente.
- [x] Bloquear credito en cliente no habilitado.
- [x] Autorizar credito sobre limite con PIN.
- [x] Crear movimiento de saldo.
- [x] Consultar balance.
- [x] Registrar devolucion parcial.
- [x] Validar cantidad maxima de devolucion.

### Done Sprint 5

- [x] Credito exige cliente.
- [x] Cliente debe tener credito habilitado.
- [x] Credito sobre limite requiere autorizacion.
- [x] Precio especial tiene prioridad.
- [x] Devolucion parcial valida cantidad maxima.
- [x] Tests QA-CRED pasan.
- [x] Tests QA-CUST pasan.
