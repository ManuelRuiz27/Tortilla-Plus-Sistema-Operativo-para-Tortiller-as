# Tortilla Plus — Backend

Repositorio backend de **Tortilla Plus — V1 Operativa Comercial**.

Este repo contiene exclusivamente documentación técnica y base de implementación backend para el sistema operativo de tortillerías.

## Alcance backend

- SaaS multi-tenant.
- Planes `free` y `paid`.
- Suscripción con Mercado Pago para cobrar Tortilla Plus.
- POS backend.
- Caja, retiros y cortes.
- Inventario y producción diaria.
- Clientes recurrentes y crédito/fiado.
- Rutas de reparto.
- Conciliación manual de terminal bancaria.
- Facturación CFDI.
- Auditoría.
- QA funcional backend.

## No incluido en este repo

- Frontend PWA Gerente.
- Frontend POS PWA.
- POS Windows.
- Diseño UI/UX.

## Estructura documental

```txt
/docs
├─ 00-sdd-handoff.md
├─ backend/
│  ├─ 01-services.md
│  ├─ 02-openapi-contract.md
│  ├─ 03-critical-flows.md
│  ├─ 04-backend-qa-core.md
│  └─ 05-backend-qa-modules.md
├─ database/
│  ├─ 01-data-model.md
│  ├─ 02-erd-rules.md
│  ├─ 03-prisma-schema.prisma
│  ├─ 04-ddl-postgresql.sql
│  └─ 05-seed.sql
└─ development/
   ├─ 00-roadmap-sprints.md
   ├─ 01-sprint-0-2-checklist.md
   ├─ 02-sprint-3-5-checklist.md
   ├─ 03-sprint-6-8-checklist.md
   └─ 04-engineering-rules.md
```

## Documentos clave para iniciar desarrollo

1. `docs/development/00-roadmap-sprints.md`
2. `docs/development/01-sprint-0-2-checklist.md`
3. `docs/development/04-engineering-rules.md`
4. `docs/backend/01-services.md`
5. `docs/database/03-prisma-schema.prisma`

## Estado

Versión documental inicial: `V0.1`.

Objetivo siguiente: ejecutar **Sprint 0 — Backend Foundation**.

## Advertencia técnica

Los archivos SQL de `/docs/database` son base de handoff. Antes de ejecutarlos en producción deben pasar por revisión, migraciones formales y pruebas de integración.
