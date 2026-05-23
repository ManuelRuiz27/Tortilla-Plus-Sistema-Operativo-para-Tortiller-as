# Prisma Schema V0.1

Estado: draft tecnico V0.1. No debe asumirse ejecutable hasta que Sprint 0 lo normalice y `prisma validate` pase.

El archivo `docs/database/03-prisma-schema.prisma` es la base de trabajo para Sprint 0, pero contiene relaciones y dominios pendientes. La fuente conceptual sigue siendo el modelo de datos y las reglas ERD.

## Stack objetivo

- PostgreSQL
- Prisma ORM
- Node.js / TypeScript

## Fuente del schema

El schema debe generarse desde:

- `docs/database/01-data-model.md`
- `docs/database/02-erd-rules.md`
- `docs/development/05-documentation-alignment.md`

## Uso en Sprint 0

1. Copiar el draft a una rama de trabajo o a `apps/api/prisma/schema.prisma`.
2. Completar o recortar modelos hasta que Prisma valide.
3. Mantener los dominios de Sprint 0 a Sprint 2 como prioridad: SaaS, usuarios, POS, productos base, inventario, caja y ventas.
4. Comparar la migracion generada contra `docs/database/04-ddl-postgresql.sql`.
5. Registrar cualquier diferencia como deuda tecnica antes de avanzar a Sprint 1.

## Restricciones que Prisma no debe resolver solo

Estas reglas deben reforzarse con migraciones SQL manuales:

- Una sola caja abierta por sucursal.
- Montos positivos.
- Cantidades positivas.
- Webhooks idempotentes.
- No mezclar organizaciones entre entidades relacionadas.
- Límites por plan.
- Validaciones financieras transaccionales.

## Pendiente V0.2

1. Enums completos.
2. Modelos SaaS.
3. Usuarios, roles y permisos.
4. POS devices.
5. Productos, precios e inventario.
6. Producción diaria.
7. Caja, ventas y pagos.
8. Clientes y crédito.
9. Rutas y liquidaciones.
10. Conciliación.
11. Facturación CFDI.
12. Auditoría y reportes.
