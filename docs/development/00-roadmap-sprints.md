# Tortilla Plus — Plan de Desarrollo Backend por Sprints

## Propósito

Este plan convierte el SDD/Handoff en una ruta ejecutable para el equipo backend. La prioridad es conservar la esencia ya definida: caja, venta, inventario, producción y auditoría primero; módulos comerciales avanzados después.

## Regla principal

No construir features encima de un modelo no validado. Primero se valida schema, migraciones, transacciones y tests smoke.

## Roadmap general

| Sprint | Nombre | Resultado esperado |
|---|---|---|
| Pre-Sprint 0 | Alineacion documental | Fuentes canonicas claras, duplicados marcados y Sprint 0 desbloqueado. |
| Sprint 0 | Backend Foundation | Proyecto inicializado, DB local, Prisma validado, migración inicial y healthcheck. |
| Sprint 1 | Auth, RBAC y SaaS Guard | Login, sesiones, permisos, plan/features y límites básicos. |
| Sprint 2 | Caja Operativa | Apertura, movimientos, retiros, autorización y cierre de caja. |
| Sprint 3 | Productos, Inventario y Producción | Catálogo, precios, stock, ledger, producción y merma. |
| Sprint 4 | POS Sales Core | Venta por kilo, monto, paquete, retail, pagos y cancelaciones. |
| Sprint 5 | Clientes, Crédito y Devoluciones | Clientes recurrentes, precios especiales, fiado y devoluciones. |
| Sprint 6 | Rutas de Reparto | Pedidos, carga, entrega, cobro, devolución y liquidación. |
| Sprint 7 | Facturación, Conciliación y Reportes | CFDI, global diaria, terminal manual y reportes operativos. |
| Sprint 8 | Hardening y Release Candidate | Seguridad, QA integral, performance, documentación y release candidate. |

## Pre-Sprint 0 — Alineacion documental

### Objetivo

Alinear fuentes canonicas y eliminar ambiguedades antes de crear codigo backend.

### Alcance

- Revisar `docs/development/05-documentation-alignment.md`.
- Confirmar que Prisma sera la fuente principal de migraciones.
- Confirmar que DDL PostgreSQL es referencia de comparacion.
- Confirmar que seed V0.1 es guia documental y que Sprint 0 crea seed minimo ejecutable.
- Marcar archivos de database sin extension como drafts no canonicos.
- Actualizar referencias rotas o ambiguas en README y handoff.

### Definition of Done

- Equipo sabe que documento manda por area.
- Sprint 0 inicia sin depender de archivos duplicados.
- Cualquier diferencia entre Prisma, DDL y seed queda registrada como riesgo de Sprint 0.

## Sprint 0 — Backend Foundation

### Objetivo

Crear la base técnica para que el equipo pueda desarrollar sin improvisar estructura.

### Alcance

- Inicializar backend Node.js/TypeScript.
- Configurar PostgreSQL local con Docker Compose.
- Instalar Prisma.
- Normalizar `docs/database/03-prisma-schema.prisma` hasta que sea ejecutable.
- Mover el schema normalizado a `apps/api/prisma/schema.prisma`.
- Ejecutar `prisma validate`.
- Corregir errores del schema.
- Crear migración inicial.
- Comparar migracion Prisma contra `docs/database/04-ddl-postgresql.sql` como referencia de handoff.
- Crear seed minimo funcional e idempotente.
- Agregar endpoint `GET /health`.

### Entregables

- `package.json` de raiz para workspaces.
- `apps/api/package.json`.
- `apps/api/tsconfig.json`.
- `docker-compose.yml`.
- `apps/api/.env.example`.
- `apps/api/prisma/schema.prisma`.
- Primera migración.
- Seed mínimo.
- Healthcheck.
- README técnico de arranque local.

### Definition of Done

- `npm install` corre sin errores.
- PostgreSQL levanta con Docker.
- Schema Prisma fue normalizado desde el draft documental.
- `prisma validate` pasa.
- `prisma migrate dev` corre desde cero.
- Seed minimo es ejecutable e idempotente.
- `npm run dev` levanta API.
- `GET /health` responde OK.

## Sprint 1 — Auth, RBAC y SaaS Guard

### Objetivo

Proteger el backend por usuario, permisos, sucursal y plan.

### Alcance

- AuthService.
- PermissionService.
- SubscriptionGuardService.
- Login.
- Refresh token.
- Logout.
- Validación PIN.
- Middleware JWT.
- Guard de permisos.
- Guard de sucursal.
- Guard de features.

### Endpoints mínimos

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/validate-pin`
- `GET /auth/me`
- `GET /subscriptions/current`
- `GET /subscriptions/features`

### Definition of Done

- Usuario inactivo no entra.
- Usuario sin branch no opera en branch ajena.
- Plan free bloquea features premium.
- `suspended_limited` permite POS básico y bloquea premium.
- Tests QA-AUTH y QA-SUB smoke pasan.

## Sprint 2 — Caja Operativa

### Objetivo

Implementar la caja como núcleo financiero del POS.

### Alcance

- CashSessionService.
- CashMovementService.
- Abrir caja.
- Saldo sugerido por cierre anterior.
- Discrepancia de apertura.
- Solicitar retiro.
- Autorizar retiro con supervisor/gerente.
- Rechazar retiro.
- Cancelar movimiento.
- Cerrar caja.

### Endpoints mínimos

- `POST /cash-sessions/open`
- `GET /cash-sessions/open?branchId=`
- `GET /cash-sessions/{id}/summary`
- `POST /cash-sessions/{id}/close`
- `POST /cash-movements/withdrawals`
- `POST /cash-movements/income`
- `POST /cash-movements/{id}/authorize`
- `POST /cash-movements/{id}/reject`
- `POST /cash-movements/{id}/cancel`

### Definition of Done

- No hay dos cajas abiertas por sucursal.
- Cajero no autoriza retiro.
- Supervisor y gerente sí autorizan.
- No se cierra caja con retiro pendiente.
- Cierre genera snapshot.
- Tests QA-CASH pasan.

## Sprint 3 — Productos, Inventario y Producción

### Objetivo

Controlar mercancía antes de abrir el POS completo.

### Alcance

- ProductService.
- PriceService.
- InventoryLedgerService.
- ProductionService.
- WasteService.
- Productos base.
- Paquete configurable.
- Precios por sucursal.
- Inventario por sucursal.
- Producción diaria.
- Merma.

### Endpoints mínimos

- `GET /products`
- `POST /products`
- `PATCH /products/{id}`
- `GET /prices/branch/{branchId}`
- `POST /prices/branch`
- `GET /inventory/branch/{branchId}`
- `POST /inventory/adjustments`
- `POST /production/batches`
- `PATCH /production/batches/{id}/close`
- `POST /waste-records`

### Definition of Done

- Producción incrementa stock.
- Venta futura de paquete podrá descontar producto base.
- Stock se modifica solo con ledger.
- Ajuste manual requiere motivo.
- Cajero no ajusta inventario.
- Tests QA-INV pasan.

## Sprint 4 — POS Sales Core

### Objetivo

Permitir venta real controlando caja, pagos e inventario.

### Alcance

- SaleService.
- Venta draft.
- Venta por kilo.
- Venta por monto.
- Venta por paquete 800g.
- Venta retail.
- Pago efectivo.
- Pago tarjeta con referencia.
- Pago mixto efectivo/tarjeta.
- Cancelación de draft.
- Cancelación de venta cobrada con permiso superior.

### Endpoints mínimos

- `POST /sales`
- `POST /sales/{id}/items`
- `POST /sales/{id}/complete`
- `POST /sales/{id}/cancel-draft`
- `POST /sales/{id}/cancel-paid`
- `GET /sales/{id}`
- `GET /sales`

### Definition of Done

- No se vende sin caja abierta.
- Tarjeta sin referencia se bloquea.
- Pagos deben cuadrar contra total.
- Paquete 800g descuenta 0.800 kg del producto base.
- Tortilla/masa pueden quedar en stock negativo con auditoría.
- Retail sin stock se bloquea.
- Tests QA-SALE pasan.

## Sprint 5 — Clientes, Crédito y Devoluciones

### Objetivo

Implementar operación comercial recurrente sin perder control de saldo.

### Alcance

- CustomerService.
- Clientes recurrentes.
- Precio especial por cliente.
- Crédito/fiado.
- Pago mixto con crédito.
- Crédito sobre límite con autorización.
- Devolución parcial.

### Endpoints mínimos

- `GET /customers`
- `POST /customers`
- `PATCH /customers/{id}`
- `POST /customers/{id}/credit`
- `POST /customers/{id}/prices`
- `GET /customers/{id}/balance`
- `POST /sales/{id}/returns`

### Definition of Done

- Crédito exige cliente.
- Cliente debe tener crédito habilitado.
- Crédito sobre límite requiere autorización.
- Precio especial tiene prioridad sobre precio de sucursal.
- Devolución parcial valida cantidad máxima.
- Tests QA-CRED y QA-CUST pasan.

## Sprint 6 — Rutas de Reparto

### Objetivo

Controlar producto que sale de sucursal, cobros fuera de caja y liquidación.

### Alcance

- DeliveryOrderService.
- DeliverySettlementService.
- Repartidores.
- Rutas.
- Pedido de reparto.
- Preparación.
- Carga.
- Entrega.
- Cobro en ruta.
- Devolución de ruta.
- Liquidación.
- Depósito a caja.

### Endpoints mínimos

- `GET /delivery-drivers`
- `POST /delivery-drivers`
- `GET /delivery-routes`
- `POST /delivery-routes`
- `POST /delivery-orders`
- `POST /delivery-orders/{id}/prepare`
- `POST /delivery-orders/{id}/load`
- `POST /delivery-orders/{id}/in-route`
- `POST /delivery-orders/{id}/deliver`
- `POST /delivery-orders/{id}/payments`
- `POST /delivery-orders/{id}/returns`
- `POST /delivery-returns/{id}/review`
- `POST /delivery-settlements`
- `POST /delivery-settlements/{id}/close`
- `POST /delivery-settlements/{id}/deposit-to-cash`

### Definition of Done

- Cargar ruta descuenta inventario.
- Cobro de ruta no entra a caja automáticamente.
- Devolución queda en revisión.
- Liquidación calcula diferencia.
- Depósito a caja crea `route_cash_in`.
- Tests QA-DEL y QA-DRET pasan.

## Sprint 7 — Facturación, Conciliación y Reportes

### Objetivo

Cerrar operación comercial con CFDI, conciliación manual y visibilidad operativa.

### Alcance

- BillingService.
- PAC adapter mock.
- Factura individual.
- Factura global diaria por sucursal.
- Cancelación fiscal.
- ReconciliationService.
- ReportService.

### Endpoints mínimos

- `POST /billing/invoices/individual`
- `POST /billing/invoices/global-daily`
- `POST /billing/invoices/{id}/stamp`
- `POST /billing/invoices/{id}/cancel`
- `GET /billing/invoices/{id}/documents`
- `POST /webhooks/pac`
- `POST /reconciliation/batches`
- `POST /reconciliation/batches/{id}/items`
- `POST /reconciliation/batches/{id}/review`
- `GET /reports/sales-by-day`
- `GET /reports/sales-by-branch`
- `GET /reports/sales-by-product`
- `GET /reports/sales-by-customer`
- `GET /reports/cash-withdrawals-by-reason`
- `GET /reports/cash-differences`

### Definition of Done

- Facturación requiere feature `billing_cfdi`.
- Factura individual requiere venta completed.
- No se duplica factura individual.
- Global diaria es única por sucursal y fecha.
- Webhook PAC es idempotente.
- Reportes filtran por tenant y sucursal.
- Tests QA-BILL, QA-REC y QA-REP pasan.

## Sprint 8 — Hardening y Release Candidate

### Objetivo

Convertir el backend en release candidate estable para integrarse con frontend.

### Alcance

- QA smoke completo.
- QA transaccional.
- QA multi-tenant.
- OpenAPI formal YAML.
- Logs estructurados.
- Manejo de errores estándar.
- Rate limits básicos.
- Validación de payloads.
- Scripts de migración y seed.
- Documentación de despliegue.

### Definition of Done

- Todos los smoke tests pasan.
- No hay fuga multi-tenant.
- Webhooks idempotentes.
- Operaciones críticas generan auditoría.
- Migración desde cero funciona.
- Seed mínimo funciona.
- Backend listo para consumo de PWA/POS.

## Gates de avance

### Gate A — Antes de Sprint 1

- Prisma validado.
- DB local corriendo.
- Migración inicial creada.
- Healthcheck OK.

### Gate B — Antes de Sprint 4

- Caja operativa terminada.
- Inventario ledger funcionando.
- Producción funcionando.

### Gate C — Antes de Sprint 6

- Venta completa funcional.
- Pagos auditados.
- Stock descontado correctamente.
- Crédito funcional.

### Gate D — Antes de Sprint 8

- Rutas funcionales.
- Facturación mock funcional.
- Reportes base funcionales.

## Riesgos a vigilar

- Diferencias entre Prisma y DDL.
- Seed incompleto o no idempotente.
- Servicios escritos como CRUD sin transacciones.
- Mezcla accidental de tenants.
- Movimientos financieros editables.
- Ventas sin caja abierta.
- Inventario actualizado sin ledger.
