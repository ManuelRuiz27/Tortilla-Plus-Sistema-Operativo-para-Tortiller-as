# Prisma Schema V0.1

Estado: pendiente de generación completa en V0.2.

## Stack objetivo

- PostgreSQL
- Prisma ORM
- Node.js / TypeScript

## Fuente del schema

El schema debe generarse desde:

- `docs/database/01-data-model.md`
- `docs/database/02-erd-rules.md`

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
