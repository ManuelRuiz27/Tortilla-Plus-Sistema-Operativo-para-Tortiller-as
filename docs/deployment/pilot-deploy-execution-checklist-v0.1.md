# Tortilla Plus - Checklist de Ejecucion Deploy Piloto v0.1

## Predeploy Local

- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run db:validate`
- [ ] `cd apps/api && npm run test`
- [ ] `cd apps/api && npm run test:integration`
- [ ] Confirmar que `apps/web/.env.render.example` usa `VITE_USE_MOCKS=false`.
- [ ] Confirmar que no hay secretos reales versionados.

## Variables API Render

Obligatorias:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="32+ chars"
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
PLATFORM_BOOTSTRAP_ENABLED=true
PLATFORM_OWNER_EMAIL="admin@tortillaplus.mx"
PLATFORM_OWNER_NAME="Director Plataforma"
PLATFORM_OWNER_PASSWORD="strong temporary password"
PLATFORM_OWNER_ROTATE_PASSWORD=false
PAYMENT_SECRET_ENCRYPTION_KEY="32+ chars"
CORS_ORIGINS="https://APP_DOMAIN"
```

Piloto inicial:

```env
BILLING_PROVIDER=mock
PHYSICAL_INTEGRATIONS_MODE=mock
FACTURAPI_ENV=sandbox
```

## Variables Front Render

```env
VITE_API_BASE_URL="https://API_DOMAIN/api/v1"
VITE_APP_NAME="Tortilla Plus"
VITE_APP_ENV="production-pilot"
VITE_USE_MOCKS=false
```

## Render API

- [ ] Build command: `npm install && npm run db:generate -w @tortilla-plus/api && npm run build -w @tortilla-plus/api`
- [ ] Start command: `npm run start -w @tortilla-plus/api`
- [ ] Health check path: `/health`
- [ ] Ejecutar migraciones: `npm run db:migrate:deploy -w @tortilla-plus/api`
- [ ] Ejecutar bootstrap productivo: `npm run db:bootstrap:production -w @tortilla-plus/api`
- [ ] No ejecutar `npm run db:seed` en Render.

## Render Frontend

- [ ] Build command: `npm install && npm run build -w @tortilla-plus/web`
- [ ] Publish directory: `apps/web/dist`
- [ ] Confirmar que el frontend consume `VITE_API_BASE_URL`.

## Smoke Postdeploy

- [ ] `GET https://API_DOMAIN/health`
- [ ] `GET https://API_DOMAIN/health/db`
- [ ] Login con `PLATFORM_OWNER_EMAIL` redirige a `/platform`.
- [ ] `platform_owner` no entra a `/app/manager` ni `/app/pos`.
- [ ] Desde `/platform`, crear organizacion piloto con `organization_owner` inicial.
- [ ] Login del `organization_owner` permite administrar usuarios/sucursales/POS internos.
- [ ] `organization_owner` crea gerente, supervisor y cajero con password/PIN temporales.
- [ ] Login de gerente entra a `/app/manager`.
- [ ] Login de supervisor entra a `/app/supervisor`.
- [ ] Login de cajero entra a `/app/pos`.
- [ ] Cajero abre caja, registra venta y solicita retiro.
- [ ] Supervisor autoriza/rechaza retiro.
- [ ] Cierre de caja bloquea retiros pendientes.
- [ ] POS sin licencia bloquea venta real.
- [ ] Organizacion suspendida bloquea venta real.

## Go / No-Go

Go si:

- [ ] Todas las validaciones automaticas pasan.
- [ ] Smoke postdeploy completo pasa con `VITE_USE_MOCKS=false`.
- [ ] CORS esta restringido al dominio del frontend.
- [ ] Secrets fuertes configurados.
- [ ] Hay plan de backup/restore para Neon antes de clientes reales.

No-Go si:

- [ ] Cualquier pantalla visible requiere mocks.
- [ ] Login por rol redirige mal.
- [ ] Ventas no bloquean POS sin licencia u organizacion suspendida.
- [ ] `platform_owner` puede operar flujos de sucursal.
- [ ] Usuarios de organizacion acceden a `/platform`.
