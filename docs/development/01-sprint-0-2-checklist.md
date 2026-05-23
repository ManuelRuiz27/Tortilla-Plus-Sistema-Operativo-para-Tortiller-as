# Checklists Sprints 0 a 2 — Backend Tortilla Plus

## Checklist general por sprint

- [x] Alcance documentado.
- [x] Endpoints con validación de request.
- [x] Endpoints protegidos por JWT cuando aplique.
- [x] Permisos validados.
- [x] Tenant validado mediante `organization_id`.
- [x] Sucursal validada mediante `branch_id` cuando aplique.
- [x] Operaciones críticas con transacción.
- [x] Errores con formato estándar.
- [x] Auditoría en acciones críticas.
- [x] Tests unitarios mínimos.
- [x] Tests de integración happy path.
- [x] Tests de integración error path.
- [x] OpenAPI actualizado si cambió contrato.

## Sprint 0 — Backend Foundation

- [x] Crear proyecto Node.js/TypeScript.
- [x] Configurar lint y format.
- [x] Configurar Docker Compose con PostgreSQL.
- [x] Crear `apps/api/.env.example`.
- [x] Instalar Prisma.
- [x] Revisar `docs/development/05-documentation-alignment.md`.
- [x] Normalizar schema desde `docs/database/03-prisma-schema.prisma`.
- [x] Copiar schema normalizado a `apps/api/prisma/schema.prisma`.
- [x] Ejecutar `prisma validate`.
- [x] Corregir schema hasta validar.
- [x] Crear migración inicial.
- [x] Comparar migracion inicial contra `docs/database/04-ddl-postgresql.sql`.
- [x] Crear seed minimo funcional e idempotente.
- [x] Crear `GET /health`.
- [x] Crear scripts `dev`, `test`, `db:migrate`, `db:seed`.
- [x] Documentar arranque local.

### Done Sprint 0

- [x] PostgreSQL levanta con Docker.
- [x] Prisma valida.
- [x] Migración corre desde cero.
- [x] Seed minimo corre y puede repetirse sin duplicar datos.
- [x] API levanta local.
- [x] Healthcheck responde OK.

## Sprint 1 — Auth, RBAC y SaaS Guard

- [x] Implementar `AuthService`.
- [x] Implementar `PermissionService`.
- [x] Implementar `SubscriptionGuardService`.
- [x] Crear login.
- [x] Crear refresh token.
- [x] Crear logout.
- [x] Crear validación de PIN.
- [x] Crear middleware JWT.
- [x] Crear guard de permisos.
- [x] Crear guard de sucursal.
- [x] Crear guard de features.
- [x] Validar plan free.
- [x] Validar plan paid.
- [x] Validar estado `suspended_limited`.
- [x] Implementar `/auth/me`.
- [x] Implementar `/subscriptions/current`.
- [x] Implementar `/subscriptions/features`.

### Done Sprint 1

- [x] Usuario inactivo no entra.
- [x] Usuario sin sucursal no opera en sucursal ajena.
- [x] Plan free limita features premium.
- [x] Estado `suspended_limited` permite operación básica.
- [x] Tests QA-AUTH pasan.
- [x] Tests QA-SUB pasan.
- [x] Tests QA-PERM pasan.

## Sprint 2 — Caja Operativa

- [x] Implementar `CashSessionService`.
- [x] Implementar `CashMovementService`.
- [x] Abrir caja.
- [x] Impedir doble caja abierta por sucursal.
- [x] Calcular saldo sugerido.
- [x] Registrar discrepancia de apertura.
- [x] Solicitar retiro.
- [x] Autorizar retiro con PIN.
- [x] Rechazar retiro.
- [x] Cancelar movimiento.
- [x] Registrar ingreso.
- [x] Consultar resumen de caja.
- [x] Cerrar caja.
- [x] Generar snapshot de cierre.

### Done Sprint 2

- [x] Solo existe una caja abierta por sucursal.
- [x] Cajero no autoriza retiros.
- [x] Supervisor y gerente autorizan retiros.
- [x] Caja no cierra si hay retiros pendientes.
- [x] Cierre calcula faltante/sobrante.
- [x] Tests QA-CASH pasan.
