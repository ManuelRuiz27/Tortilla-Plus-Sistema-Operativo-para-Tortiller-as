# Alineacion Documental Pre-Sprint 0

## Objetivo

Dejar la documentacion lista para iniciar Sprint 0 sin ambiguedad sobre fuentes canonicas, alcance tecnico y criterios de avance.

Esta fase no implementa backend. Solo ordena el handoff para que Sprint 0 pueda crear el proyecto, validar Prisma, generar migracion inicial, seed minimo y healthcheck.

## Fuentes canonicas

| Area | Fuente canonica | Estado | Uso en Sprint 0 |
|---|---|---|---|
| Roadmap | `docs/development/00-roadmap-sprints.md` | Canonico | Define orden, gates y entregables. |
| Reglas backend | `docs/development/04-engineering-rules.md` | Canonico | Define invariantes, errores, auditoria y transacciones. |
| Servicios | `docs/backend/01-services.md` | Canonico | Define limites de responsabilidad por servicio. |
| API | `docs/backend/02-openapi-contract.md` | Contrato resumido V0.1 | Se formaliza por sprint, no completo desde el dia 1. |
| Flujos criticos | `docs/backend/03-critical-flows.md` | Canonico | Define comportamiento transaccional esperado. |
| QA | `docs/backend/04-backend-qa-core.md` y `docs/backend/05-backend-qa-modules.md` | Canonico | Define criterios de aceptacion por modulo. |
| Modelo de datos | `docs/database/01-data-model.md` y `docs/database/02-erd-rules.md` | Canonico conceptual | Fuente para completar Prisma. |
| Prisma | `docs/database/03-prisma-schema.prisma` | Draft tecnico V0.1 | Debe normalizarse antes de copiar a `apps/api/prisma/schema.prisma`. |
| DDL | `docs/database/04-ddl-postgresql.sql` | Referencia de handoff | Se usa para comparar contra migracion Prisma, no como migracion principal. |
| Seed | `docs/database/05-seed.sql` | Indice de seed | Sprint 0 debe crear seed minimo ejecutable en el proyecto. |

## Archivos no canonicos o duplicados

- `docs/database/04-ddl-postgresql` es una copia/draft sin extension. No debe usarse como fuente principal.
- `docs/database/05-seed` es un draft extendido sin extension. No debe ejecutarse automaticamente en Sprint 0.
- Si se necesita contenido de esos drafts, debe migrarse manualmente al artefacto canonico correspondiente y revisarse antes.

## Decisiones para iniciar Sprint 0

1. Prisma sera la fuente principal de migraciones del backend.
2. PostgreSQL DDL de docs sera referencia de comparacion, no la fuente principal de migraciones.
3. El schema Prisma V0.1 no se asume valido hasta que `prisma validate` pase en Sprint 0.
4. El seed de Sprint 0 debe ser minimo, idempotente y suficiente para probar login futuro, permisos base, una organizacion demo, una sucursal y catalogos operativos basicos.
5. OpenAPI se formalizara incrementalmente por sprint. Sprint 0 solo requiere documentar `GET /health` y el formato de error base.
6. QA manda como criterio de aceptacion. Si QA usa un codigo de error, ese codigo debe existir en reglas de ingenieria antes de implementar el endpoint.

## Checklist de salida de esta fase

- [x] README apunta a documentos reales y aclara estado V0.1.
- [x] Handoff no contiene referencias rotas.
- [x] Roadmap incluye esta fase antes de Sprint 0.
- [x] Sprint 0 reconoce que debe normalizar Prisma antes de migrar.
- [x] Reglas de ingenieria incluyen los errores usados por QA core.
- [x] OpenAPI declara su estado como contrato resumido y define plantilla por endpoint.
- [x] Duplicados de DDL/seed quedan marcados como no canonicos.
