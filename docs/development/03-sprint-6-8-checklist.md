# Checklists Sprints 6 a 8 — Backend Tortilla Plus

## Sprint 6 — Rutas de Reparto

### Tareas

- [ ] Implementar `DeliveryOrderService`.
- [ ] Implementar `DeliverySettlementService`.
- [ ] Crear repartidor.
- [ ] Crear ruta.
- [ ] Asignar clientes a ruta.
- [ ] Crear pedido de reparto.
- [ ] Preparar pedido.
- [ ] Cargar pedido.
- [ ] Descontar inventario al cargar.
- [ ] Marcar pedido en ruta.
- [ ] Registrar entrega.
- [ ] Registrar cobro de ruta.
- [ ] Confirmar que cobro no entra a caja.
- [ ] Registrar devolución `pending_review`.
- [ ] Revisar devolución vendible.
- [ ] Revisar devolución como merma.
- [ ] Crear liquidación.
- [ ] Depositar efectivo a caja.

### Done Sprint 6

- [ ] Cargar ruta descuenta inventario.
- [ ] Cobro de ruta no entra a caja automáticamente.
- [ ] Devolución queda en revisión.
- [ ] Liquidación calcula diferencia.
- [ ] Depósito a caja crea `route_cash_in`.
- [ ] Tests QA-DEL pasan.
- [ ] Tests QA-DRET pasan.

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
