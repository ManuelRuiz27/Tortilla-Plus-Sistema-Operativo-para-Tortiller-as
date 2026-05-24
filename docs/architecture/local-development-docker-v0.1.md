# Tortilla Plus — Local Development Docker V0.1

## 1. Propósito

Este documento define el entorno local de desarrollo con Docker para **Tortilla Plus — V1 Operativa Comercial**.

Su función es permitir que el proyecto pueda levantarse de forma consistente en una PC de desarrollo sin depender de instalaciones manuales complejas.

Debe cubrir:

```txt
docker-compose local
PostgreSQL
Redis
MinIO/Object Storage local
API
workers
scheduler
frontends
variables .env
migraciones
seed inicial
comandos de desarrollo
validación de OpenAPI
```

Ubicación recomendada:

```txt
docs/architecture/local-development-docker-v0.1.md
```

---

## 2. Principio general

El entorno local debe ser reproducible.

Regla:

```txt
clonar repo
copiar .env.example
levantar docker
correr migraciones
correr seed
desarrollar
```

No debe requerir configuración manual extensa para iniciar.

---

## 3. Servicios locales esperados

Servicios mínimos:

```txt
postgres
redis
minio
api
billing-worker
reconciliation-worker
exports-worker
scheduler
pos-pwa
manager-pwa
public-billing-pwa
```

Servicios opcionales:

```txt
mailhog
adminer
redis-commander
```

---

## 4. Estructura de archivos recomendada

```txt
infra/docker/
├─ docker-compose.local.yml
├─ Dockerfile.api
├─ Dockerfile.worker
├─ Dockerfile.frontend
├─ postgres/
│  └─ init.sql
├─ minio/
│  └─ create-buckets.sh
└─ README.md
```

En raíz:

```txt
.env.example
.env.local
package.json
pnpm-workspace.yaml
turbo.json
```

---

## 5. Docker Compose local

Archivo recomendado:

```txt
infra/docker/docker-compose.local.yml
```

Servicios:

```txt
postgres
redis
minio
api
billing-worker
reconciliation-worker
exports-worker
scheduler
```

Los frontends pueden correr dentro o fuera de Docker.

Recomendación para desarrollo rápido:

```txt
backend infra en Docker
frontends con pnpm dev en host
```

Motivo:

```txt
hot reload más rápido
menos problemas de file watching
```

---

## 6. PostgreSQL local

Servicio:

```txt
postgres
```

Imagen recomendada:

```txt
postgres:16
```

Variables:

```txt
POSTGRES_USER=tortilla
POSTGRES_PASSWORD=tortilla
POSTGRES_DB=tortilla_plus
```

Puerto local:

```txt
5432
```

Connection string:

```txt
postgresql://tortilla:tortilla@localhost:5432/tortilla_plus
```

---

## 7. Redis local

Servicio:

```txt
redis
```

Imagen recomendada:

```txt
redis:7
```

Puerto local:

```txt
6379
```

URL:

```txt
redis://localhost:6379
```

Uso:

```txt
BullMQ
retries
locks
rate limit local
scheduler lock
```

---

## 8. MinIO local

Servicio:

```txt
minio
```

Propósito:

```txt
simular object storage
guardar XML local
guardar exports local
guardar imports conciliación local
```

Puerto API:

```txt
9000
```

Puerto consola:

```txt
9001
```

Credenciales locales:

```txt
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
```

Buckets locales:

```txt
tortilla-plus-xml
tortilla-plus-exports
tortilla-plus-reconciliation-imports
```

---

## 9. API local

Servicio:

```txt
api
```

App:

```txt
apps/api
```

Puerto:

```txt
3000
```

URL local:

```txt
http://localhost:3000
```

Comando conceptual:

```txt
pnpm --filter api dev
```

---

## 10. Workers locales

Los workers deben correr como procesos separados.

Servicios:

```txt
billing-worker
reconciliation-worker
exports-worker
```

Comandos conceptuales:

```txt
pnpm --filter api worker:billing
pnpm --filter api worker:reconciliation
pnpm --filter api worker:exports
```

---

## 11. Scheduler local

Servicio:

```txt
scheduler
```

Comando conceptual:

```txt
pnpm --filter api scheduler:dev
```

En local puede estar apagado por default si interfiere con pruebas.

Recomendación:

```txt
activar scheduler solo cuando se prueben globales, expiración QR o limpieza de exports
```

---

## 12. Frontends locales

## 12.1 POS PWA

App:

```txt
apps/pos-pwa
```

Puerto sugerido:

```txt
5173
```

Comando:

```txt
pnpm --filter pos-pwa dev
```

URL:

```txt
http://localhost:5173
```

---

## 12.2 Manager PWA

App:

```txt
apps/manager-pwa
```

Puerto sugerido:

```txt
5174
```

Comando:

```txt
pnpm --filter manager-pwa dev
```

URL:

```txt
http://localhost:5174
```

---

## 12.3 Public Billing PWA

App:

```txt
apps/public-billing-pwa
```

Puerto sugerido:

```txt
5175
```

Comando:

```txt
pnpm --filter public-billing-pwa dev
```

URL:

```txt
http://localhost:5175
```

---

## 13. Variables de entorno raíz

Archivo:

```txt
.env.local
```

Basado en:

```txt
.env.example
```

Variables mínimas:

```txt
NODE_ENV=development
TZ=America/Monterrey

DATABASE_URL=postgresql://tortilla:tortilla@localhost:5432/tortilla_plus
REDIS_URL=redis://localhost:6379

JWT_SECRET=local_dev_secret_change_me
JWT_EXPIRES_IN=8h
STAFF_JWT_EXPIRES_IN=24h

FACTURAPI_ENV=sandbox
FACTURAPI_API_KEY=local_facturapi_sandbox_key

STORAGE_DRIVER=s3
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY=minio
STORAGE_SECRET_KEY=minio123
STORAGE_BUCKET_XML=tortilla-plus-xml
STORAGE_BUCKET_EXPORTS=tortilla-plus-exports
STORAGE_BUCKET_RECONCILIATION_IMPORTS=tortilla-plus-reconciliation-imports
STORAGE_FORCE_PATH_STYLE=true

PUBLIC_BILLING_BASE_URL=http://localhost:5175
API_BASE_URL=http://localhost:3000
```

---

## 14. Variables frontend

## 14.1 POS

```txt
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_ENV=local
VITE_PUBLIC_BILLING_URL=http://localhost:5175
```

---

## 14.2 Manager

```txt
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_ENV=local
```

---

## 14.3 Public Billing

```txt
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_ENV=local
```

---

## 15. Archivo `.env.example`

Debe incluir todas las variables sin secretos reales.

No commitear:

```txt
.env.local
.env
.env.production
certificados
llaves privadas
API keys reales
```

Sí commitear:

```txt
.env.example
```

---

## 16. Comandos base del monorepo

## 16.1 Instalar dependencias

```bash
pnpm install
```

---

## 16.2 Levantar infraestructura local

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d postgres redis minio
```

---

## 16.3 Levantar API

```bash
pnpm --filter api dev
```

---

## 16.4 Levantar workers

```bash
pnpm --filter api worker:billing
pnpm --filter api worker:reconciliation
pnpm --filter api worker:exports
```

---

## 16.5 Levantar frontends

```bash
pnpm --filter pos-pwa dev
pnpm --filter manager-pwa dev
pnpm --filter public-billing-pwa dev
```

---

## 16.6 Levantar todo con Turbo

```bash
pnpm dev
```

Este comando puede levantar todas las apps si está configurado en `turbo.json`.

---

# 17. Prisma / base de datos

## 17.1 Migraciones

Comando conceptual:

```bash
pnpm --filter api prisma:migrate
```

o:

```bash
pnpm --filter api prisma migrate dev
```

---

## 17.2 Generar cliente Prisma

```bash
pnpm --filter api prisma:generate
```

---

## 17.3 Seed local

```bash
pnpm --filter api seed:dev
```

---

## 17.4 Reset DB local

```bash
pnpm --filter api db:reset
```

Debe:

```txt
borrar datos locales
correr migraciones
correr seed
```

No debe apuntar a producción.

---

# 18. Seed inicial recomendado

El seed local debe crear:

```txt
1 tenant demo
2 sucursales
3 usuarios
roles cashier/supervisor/manager
productos tortilla/masa/paquete/salsa
clientes demo
rutas demo
precios por cliente
caja demo
config fiscal sandbox incompleta/completa
ventas demo
tickets QR activos
tickets QR vencidos
facturas demo
casos manual review
imports conciliación demo
exports demo
```

---

## 19. Usuarios de prueba

## 19.1 Cajero

```txt
email: cajero@demo.local
password: password
role: cashier
```

---

## 19.2 Supervisor

```txt
email: supervisor@demo.local
password: password
role: supervisor
```

---

## 19.3 Gerente

```txt
email: gerente@demo.local
password: password
role: manager
```

---

## 20. Datos demo críticos

Para QA del módulo billing:

```txt
venta efectivo sin factura
venta efectivo con QR
venta tarjeta con referencia
venta tarjeta sin referencia
venta mixta con tarjeta
ticket QR activo
ticket QR vencido
ticket ya facturado
manual review case
global diaria preparada
global rezagados preparada
pending_reference
archivo conciliación demo
export job ready
```

---

# 21. OpenAPI local

## 21.1 Validar OpenAPI

Comando sugerido:

```bash
pnpm contracts:validate
```

Debe validar:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

---

## 21.2 Generar cliente TypeScript

Comando sugerido:

```bash
pnpm contracts:generate
```

Debe generar en:

```txt
packages/api-contracts/generated/
```

---

## 21.3 Regla

Si cambia:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

entonces correr:

```bash
pnpm contracts:validate
pnpm contracts:generate
```

---

# 22. Docker Compose base conceptual

Ejemplo de servicios esperados:

```yaml
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: tortilla
      POSTGRES_PASSWORD: tortilla
      POSTGRES_DB: tortilla_plus
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

Este bloque es guía. El archivo real debe ajustarse al repo.

---

# 23. MinIO buckets

Crear buckets al iniciar:

```txt
tortilla-plus-xml
tortilla-plus-exports
tortilla-plus-reconciliation-imports
```

Script sugerido:

```txt
infra/docker/minio/create-buckets.sh
```

---

# 24. Healthchecks locales

## 24.1 API

Endpoint:

```txt
GET http://localhost:3000/health
```

Debe responder:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "storage": "ok"
}
```

---

## 24.2 PostgreSQL

```bash
docker compose -f infra/docker/docker-compose.local.yml exec postgres pg_isready
```

---

## 24.3 Redis

```bash
docker compose -f infra/docker/docker-compose.local.yml exec redis redis-cli ping
```

---

## 24.4 MinIO

Consola:

```txt
http://localhost:9001
```

---

# 25. Logs locales

Comandos:

```bash
docker compose -f infra/docker/docker-compose.local.yml logs -f postgres
docker compose -f infra/docker/docker-compose.local.yml logs -f redis
docker compose -f infra/docker/docker-compose.local.yml logs -f minio
```

Para API/workers si corren en host:

```bash
pnpm --filter api dev
pnpm --filter api worker:billing
```

---

# 26. Testing local

Comandos recomendados:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm contracts:validate
pnpm build
```

Por app:

```bash
pnpm --filter api test
pnpm --filter pos-pwa test
pnpm --filter manager-pwa test
pnpm --filter public-billing-pwa test
```

---

# 27. QA local manual

Flujos mínimos:

```txt
login cajero
venta efectivo sin factura
venta efectivo con QR
venta tarjeta con QR
portal público abre QR
portal genera solicitud factura sandbox/mock
gerente ve dashboard fiscal
gerente confirma global diaria sandbox/mock
supervisor resuelve pending_reference
gerente genera exportación
```

---

# 28. Mocks locales

Cuando Facturapi sandbox no esté disponible, usar adapter mock.

Variable:

```txt
FACTURAPI_ENV=mock
```

Comportamientos mock:

```txt
timbrado exitoso
provider timeout
provider rejected data
manual review required
cancelación exitosa
cancelación fallida
```

---

## 29. Storage local y XML

En local, XML puede ser fake/mock.

Regla:

```txt
probar flujo de almacenamiento sin usar XML fiscal real
```

Guardar en MinIO:

```txt
tortilla-plus-xml
```

PDF puede generarse bajo demanda con plantilla dummy.

---

# 30. Rate limit local

En local puede configurarse laxo.

Pero debe poder probarse:

```txt
PUBLIC_BILLING_RATE_LIMIT_ENABLED=true
PUBLIC_BILLING_RATE_LIMIT_MAX=5
```

---

# 31. Scheduler local

Para evitar que el scheduler modifique datos inesperadamente:

```txt
SCHEDULER_ENABLED=false
```

Activar cuando se pruebe:

```txt
SCHEDULER_ENABLED=true
```

Jobs programados:

```txt
prepare daily global
expire receipts
prepare pending global
cleanup exports
```

---

# 32. Problemas comunes

## 32.1 Puerto 5432 ocupado

Solución:

```txt
cambiar puerto local a 5433
actualizar DATABASE_URL
```

---

## 32.2 Redis ocupado

Solución:

```txt
cambiar puerto local a 6380
actualizar REDIS_URL
```

---

## 32.3 MinIO no crea buckets

Solución:

```txt
ejecutar script create-buckets.sh manualmente
verificar credenciales
```

---

## 32.4 Frontend no conecta API

Revisar:

```txt
VITE_API_BASE_URL
CORS
API encendida
puerto 3000 disponible
```

---

## 32.5 OpenAPI genera tipos rotos

Revisar:

```txt
YAML válido
schemas sin oneOf innecesario
operationId único
nombres duplicados
```

---

# 33. Seguridad local

Aunque sea local:

```txt
no usar secretos reales
no usar Facturapi productivo
no usar DB productiva
no usar XML real de clientes si no es necesario
```

---

# 34. Limpieza local

Detener servicios:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
```

Borrar volúmenes:

```bash
docker compose -f infra/docker/docker-compose.local.yml down -v
```

Cuidado:

```txt
down -v borra base local y storage local
```

---

# 35. Checklist de arranque local

```txt
[ ] pnpm install ejecutado.
[ ] .env.local creado desde .env.example.
[ ] Docker Desktop/Engine activo.
[ ] postgres levantado.
[ ] redis levantado.
[ ] minio levantado.
[ ] buckets creados.
[ ] migraciones ejecutadas.
[ ] seed ejecutado.
[ ] API responde /health.
[ ] POS abre.
[ ] Manager abre.
[ ] Public Billing abre.
[ ] contracts:validate pasa.
[ ] contracts:generate pasa.
```

---

# 36. Checklist para Codex

Antes de pedirle implementar:

```txt
[ ] Repo tiene pnpm-workspace.yaml.
[ ] turbo.json existe.
[ ] docs están en carpetas correctas.
[ ] OpenAPI existe.
[ ] .env.example existe.
[ ] docker-compose.local.yml existe o será creado.
[ ] packages/shared existe.
[ ] packages/api-contracts existe.
[ ] apps base existen o serán creadas.
```

---

# 37. No implementar en entorno local V1

No incluir inicialmente:

```txt
Kubernetes local
Traefik obligatorio
certificados SSL locales obligatorios
open banking real
Facturapi productivo
colas externas pagadas
observabilidad compleja local
```

---

# 38. Relación con otros documentos

Arquitectura general:

```txt
docs/architecture/monorepo-architecture-v0.1.md
```

Deploy:

```txt
docs/architecture/deployment-architecture-v0.1.md
```

Context graph:

```txt
docs/architecture/implementation-context-graph-v0.1.md
```

Contratos:

```txt
docs/contracts/
```

Backend:

```txt
docs/backend/billing/
```

---

## 39. Definition of Done

Este documento queda completo si define:

```txt
[ ] servicios locales
[ ] docker-compose base
[ ] variables .env
[ ] comandos pnpm
[ ] migraciones
[ ] seed
[ ] usuarios demo
[ ] datos demo críticos
[ ] OpenAPI local
[ ] MinIO/storage
[ ] healthchecks
[ ] testing local
[ ] mocks
[ ] troubleshooting
[ ] checklist de arranque
```

---

## 40. Siguiente documento

Después de este documento, generar:

```txt
docs/architecture/architecture-decision-records-index-v0.1.md
```
