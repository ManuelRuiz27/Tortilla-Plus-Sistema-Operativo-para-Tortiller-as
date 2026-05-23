# Checklists Sprints 6 a 8 — Backend Tortilla Plus

## Sprint 6 — Rutas de Reparto

### Tareas

- [x] Implementar `DeliveryOrderService`.
- [x] Implementar `DeliverySettlementService`.
- [x] Crear repartidor.
- [x] Crear ruta.
- [x] Asignar clientes a ruta.
- [x] Crear pedido de reparto.
- [x] Preparar pedido.
- [x] Cargar pedido.
- [x] Descontar inventario al cargar.
- [x] Marcar pedido en ruta.
- [x] Registrar entrega.
- [x] Registrar cobro de ruta.
- [x] Confirmar que cobro no entra a caja.
- [x] Registrar devolución `pending_review`.
- [x] Revisar devolución vendible.
- [x] Revisar devolución como merma.
- [x] Crear liquidación.
- [x] Depositar efectivo a caja.

### Done Sprint 6

- [x] Cargar ruta descuenta inventario.
- [x] Cobro de ruta no entra a caja automáticamente.
- [x] Devolución queda en revisión.
- [x] Liquidación calcula diferencia.
- [x] Depósito a caja crea `route_cash_in`.
- [x] Tests QA-DEL pasan.
- [x] Tests QA-DRET pasan.

## Sprint 7 — Facturación, Conciliación y Reportes

### Tareas

- [ ] Implementar `BillingService`.
- [ ] Implementar `ReconciliationService`.
- [ ] Implementar `ReportService`.
- [ ] Crear PAC adapter mock.
- [ ] Crear factura individual.
- [ ] Bloquear factura de venta draft.
- [ ] Bloquear doble factura individual.
- [ ] Timbrar mock exitoso.
- [ ] Manejar timbrado fallido.
- [ ] Crear factura global diaria por sucursal.
- [ ] Bloquear doble global diaria.
- [ ] Crear webhook PAC idempotente.
- [ ] Crear conciliación.
- [ ] Revisar conciliación.
- [ ] Crear reportes operativos base.

### Done Sprint 7

- [ ] Facturación requiere feature `billing_cfdi`.
- [ ] Factura individual requiere venta completed.
- [ ] No se duplica factura individual.
- [ ] Global diaria es única por sucursal y fecha.
- [ ] Webhook PAC es idempotente.
- [ ] Reportes filtran por tenant y sucursal.
- [ ] Tests QA-BILL pasan.
- [ ] Tests QA-REC pasan.
- [ ] Tests QA-REP pasan.

## Sprint 8 — Hardening y Release Candidate

### Tareas

- [ ] Ejecutar smoke tests completos.
- [ ] Ejecutar tests multi-tenant.
- [ ] Ejecutar tests transaccionales.
- [ ] Revisar logs estructurados.
- [ ] Revisar errores estándar.
- [ ] Revisar validaciones de payload.
- [ ] Revisar rate limits.
- [ ] Revisar idempotencia de webhooks.
- [ ] Revisar migración desde cero.
- [ ] Revisar seed desde cero.
- [ ] Convertir contrato API a OpenAPI YAML formal.
- [ ] Preparar release candidate.

### Done Sprint 8

- [ ] Todos los smoke tests pasan.
- [ ] No hay fuga multi-tenant.
- [ ] Webhooks son idempotentes.
- [ ] Operaciones críticas generan auditoría.
- [ ] Migración desde cero funciona.
- [ ] Seed mínimo funciona.
- [ ] Backend listo para consumo de POS/PWA.
