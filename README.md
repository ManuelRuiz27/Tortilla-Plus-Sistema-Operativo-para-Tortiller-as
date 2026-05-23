# Tortilla Plus

Monorepo de Tortilla Plus. La raiz queda como orquestador de workspaces y el backend actual vive en `apps/api`.

## Estructura

```txt
apps/
  api/        Backend Node.js/TypeScript y Prisma
  web/        Frontend futuro
packages/    Paquetes compartidos futuros
docs/        Documentacion tecnica y de producto
```

## Workspaces

Este repo usa npm workspaces:

- `apps/*` para aplicaciones deployables.
- `packages/*` para librerias compartidas.

## Alcance backend actual

El backend de `apps/api` cubre la V1 Operativa Comercial:

- SaaS multi-tenant.
- Planes `free` y `paid`.
- Suscripcion con Mercado Pago para cobrar Tortilla Plus.
- POS backend.
- Caja, retiros y cortes.
- Inventario y produccion diaria.
- Clientes recurrentes y credito/fiado.
- Rutas de reparto.
- Conciliacion manual de terminal bancaria.
- Facturacion CFDI.
- Auditoria.
- QA funcional backend.

El frontend queda pendiente para agregarse como workspace en `apps/web`.

## Arranque local

1. Instalar dependencias desde la raiz:

```bash
npm install
```

2. Crear variables de entorno del backend:

```bash
cp apps/api/.env.example apps/api/.env
```

En Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

3. Levantar PostgreSQL:

```bash
docker compose up -d postgres
```

4. Preparar Prisma y correr el backend:

```bash
npm run db:validate
npm run db:migrate
npm run build
npm run db:seed
npm run dev
```

La API queda disponible en `http://localhost:3000`.

## Scripts principales

| Script | Uso |
|---|---|
| `npm run dev` | Levanta `apps/api` en modo desarrollo. |
| `npm run build` | Compila todos los workspaces con script `build`. |
| `npm run test` | Ejecuta pruebas de los workspaces con script `test`. |
| `npm run lint` | Ejecuta verificacion estatica de los workspaces. |
| `npm run db:validate` | Valida Prisma del backend. |
| `npm run db:migrate` | Ejecuta migraciones Prisma del backend. |
| `npm run db:seed` | Ejecuta seed del backend. |

Para ejecutar directamente un workspace:

```bash
npm run dev -w @tortilla-plus/api
```

## Documentos clave

1. `docs/development/05-documentation-alignment.md`
2. `docs/development/00-roadmap-sprints.md`
3. `docs/development/01-sprint-0-2-checklist.md`
4. `docs/development/02-sprint-3-5-checklist.md`
5. `docs/development/04-engineering-rules.md`
6. `docs/backend/01-services.md`
7. `docs/database/03-prisma-schema.prisma`
8. `docs/development/06-local-backend-setup.md`

## Fuentes canonicas para Sprint 0

- Prisma sera la fuente principal para migraciones del backend.
- `docs/database/03-prisma-schema.prisma` es un draft tecnico V0.1; Sprint 0 debe normalizarlo antes de moverlo a `apps/api/prisma/schema.prisma`.
- `docs/database/04-ddl-postgresql.sql` es referencia de comparacion, no migracion principal.
- `docs/database/05-seed.sql` es indice de seed; Sprint 0 debe crear un seed minimo ejecutable dentro del proyecto.
- Archivos sin extension en `/docs/database` son drafts no canonicos.

## Estado

- Backend en `apps/api`.
- Frontend pendiente para agregar como otro workspace en `apps/`.
- Paquetes compartidos pendientes en `packages/`.
- Pre-Sprint 0: completado.
- Sprint 0 - Backend Foundation: completado.
- Sprint 1 - Auth, RBAC y SaaS Guard: completado.
- Sprint 2 - Caja Operativa: completado.
- Siguiente objetivo: Sprint 3 - Productos, Inventario y Produccion.

## Advertencia tecnica

Los archivos SQL de `/docs/database` son base de handoff. Antes de ejecutarlos en produccion deben pasar por revision, migraciones formales y pruebas de integracion.
