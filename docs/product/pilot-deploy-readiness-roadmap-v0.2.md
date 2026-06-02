# Tortilla Plus - Roadmap de Cierre Readiness Piloto v0.2

## Estado

Roadmap de implementacion activo para cerrar faltantes de `docs/product/pilot-deploy-readiness-roles-v0.1.md`.

## Prioridad P0 - Cierre de Bloqueadores

- [x] RBAC sin contaminacion de permisos `platform.*` en roles de organizacion.
- [x] `platform_admin` eliminado de seed/documentacion activa de seed.
- [x] `PlatformGuard` frontend con contexto plataforma estricto.
- [x] Retiros pendientes funcionan sin mocks.
- [x] Produccion lista/crea/cierra lotes sin mocks.
- [x] Conciliacion visible solo por feature/permisos y con backend real.
- [x] Supervisor separado de Manager.
- [x] Suite `test:integration` completa verde en base local limpia.

## Prioridad P1 - Piloto Serio

- [x] Owner minimo administra usuarios, sucursales y POS internos sin licenciar POS.
- [x] Manager navega por permisos/features.
- [x] Cajero no cancela ordenes de terminal.
- [x] Supervisor tiene panel propio de autorizaciones.
- [x] Supervisor muestra historial operativo basico de retiros autorizados/rechazados.
- [x] Platform Owner muestra confirmaciones de impacto antes de suspender/cancelar organizaciones.
- [x] Platform Owner muestra confirmaciones de impacto antes de desactivar/quitar licencia POS.
- [x] Pagos SaaS valida monto positivo y muestra nota/referencia.
- [x] Auditoria plataforma filtra por organizacion, usuario, accion y fecha.
- [x] Dashboard plataforma enlaza alertas a vistas filtrables.

## Prioridad P2 - QA Manual Piloto

- [ ] Ejecutar casos PLAT-01 a PLAT-14.
- [ ] Ejecutar casos OWN-01 a OWN-10.
- [ ] Ejecutar casos MAN-01 a MAN-11.
- [ ] Ejecutar casos SUP-01 a SUP-08.
- [ ] Ejecutar casos CASH-01 a CASH-20.

## Decisiones Cerradas

- Supervisor entra al piloto con panel propio de autorizaciones.
- Repartidor no entra como `UserRole`.
- Impersonacion real queda fuera del piloto.
- Conciliacion no bloquea piloto si queda oculta por feature/permisos.
- Cancelacion de terminal Mercado Pago requiere manager o supervisor.
