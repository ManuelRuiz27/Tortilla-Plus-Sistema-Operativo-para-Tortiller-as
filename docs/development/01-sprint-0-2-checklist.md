# Checklists Sprints 0 a 2 — Backend Tortilla Plus

## Checklist general por sprint

- [ ] Alcance documentado.
- [ ] Endpoints con validación de request.
- [ ] Endpoints protegidos por JWT cuando aplique.
- [ ] Permisos validados.
- [ ] Tenant validado mediante `organization_id`.
- [ ] Sucursal validada mediante `branch_id` cuando aplique.
- [ ] Operaciones críticas con transacción.
- [ ] Errores con formato estándar.
- [ ] Auditoría en acciones críticas.
- [ ] Tests unitarios mínimos.
- [ ] Tests de integración happy path.
- [ ] Tests de integración error path.
- [ ] OpenAPI actualizado si cambió contrato.

## Sprint 0 — Backend Foundation

- [ ] Crear proyecto Node.js/TypeScript.
- [ ] Configurar lint y format.
- [ ] Configurar Docker Compose con PostgreSQL.
- [ ] Crear `.env.example`.
- [ ] Instalar Prisma.
- [ ] Copiar schema desde `docs/database/03-prisma-schema.prisma`.
- [ ] Ejecutar `prisma validate`.
- [ ] Corregir schema hasta validar.
- [ ] Crear migración inicial.
- [ ] Crear seed mínimo funcional.
- [ ] Crear `GET /health`.
- [ ] Crear scripts `dev`, `test`, `db:migrate`, `db:seed`.
- [ ] Documentar arranque local.

### Done Sprint 0

- [ ] PostgreSQL levanta con Docker.
- [ ] Prisma valida.
- [ ] Migración corre desde cero.
- [ ] Seed mínimo corre.
- [ ] API levanta local.
- [ ] Healthcheck responde OK.

## Sprint 1 — Auth, RBAC y SaaS Guard

- [ ] Implementar `AuthService`.
- [ ] Implementar `PermissionService`.
- [ ] Implementar `SubscriptionGuardService`.
- [ ] Crear login.
- [ ] Crear refresh token.
- [ ] Crear logout.
- [ ] Crear validación de PIN.
- [ ] Crear middleware JWT.
- [ ] Crear guard de permisos.
- [ ] Crear guard de sucursal.
- [ ] Crear guard de features.
- [ ] Validar plan free.
- [ ] Validar plan paid.
- [ ] Validar estado `suspended_limited`.
- [ ] Implementar `/auth/me`.
- [ ] Implementar `/subscriptions/current`.
- [ ] Implementar `/subscriptions/features`.

### Done Sprint 1

- [ ] Usuario inactivo no entra.
- [ ] Usuario sin sucursal no opera en sucursal ajena.
- [ ] Plan free limita features premium.
- [ ] Estado `suspended_limited` permite operación básica.
- [ ] Tests QA-AUTH pasan.
- [ ] Tests QA-SUB pasan.
- [ ] Tests QA-PERM pasan.

## Sprint 2 — Caja Operativa

- [ ] Implementar `CashSessionService`.
- [ ] Implementar `CashMovementService`.
- [ ] Abrir caja.
- [ ] Impedir doble caja abierta por sucursal.
- [ ] Calcular saldo sugerido.
- [ ] Registrar discrepancia de apertura.
- [ ] Solicitar retiro.
- [ ] Autorizar retiro con PIN.
- [ ] Rechazar retiro.
- [ ] Cancelar movimiento.
- [ ] Registrar ingreso.
- [ ] Consultar resumen de caja.
- [ ] Cerrar caja.
- [ ] Generar snapshot de cierre.

### Done Sprint 2

- [ ] Solo existe una caja abierta por sucursal.
- [ ] Cajero no autoriza retiros.
- [ ] Supervisor y gerente autorizan retiros.
- [ ] Caja no cierra si hay retiros pendientes.
- [ ] Cierre calcula faltante/sobrante.
- [ ] Tests QA-CASH pasan.
