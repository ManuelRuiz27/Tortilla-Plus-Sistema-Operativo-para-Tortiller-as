# Tortilla Plus — Deployment Architecture V0.1

## 1. Propósito

Este documento define la arquitectura de despliegue recomendada para **Tortilla Plus — V1 Operativa Comercial**.

Su función es establecer:

```txt
qué servicios se despliegan
qué dominios usa cada app
qué componentes viven en backend
qué componentes viven en frontend
qué requiere base de datos
qué requiere Redis/colas
qué requiere storage
qué puede correr en un VPS
qué puede correr en servicios gestionados
```

Ubicación recomendada:

```txt
docs/architecture/deployment-architecture-v0.1.md
```

---

## 2. Principio general

La V1 debe desplegarse de forma simple, mantenible y escalable sin sobrediseñar.

Regla:

```txt
monolito modular para API
frontends separados
workers separados por proceso
PostgreSQL como base principal
Redis para colas/retries/locks
storage para XML y exports
Nginx como reverse proxy si se usa VPS
```

No iniciar con Kubernetes ni microservicios separados.

---

## 3. Servicios desplegables V1

Servicios mínimos:

```txt
api
billing-worker
reconciliation-worker
exports-worker
scheduler
pos-pwa
manager-pwa
public-billing-pwa
postgres
redis
object-storage
nginx/reverse-proxy
```

---

## 4. Diagrama lógico

```txt
                 ┌─────────────────────┐
                 │      Cliente POS     │
                 │     pos-pwa          │
                 └──────────┬──────────┘
                            │
                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│   manager-pwa       │  │ public-billing-pwa   │
│   gerente/superv.   │  │ cliente final QR     │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           └──────────┬─────────────┘
                      ▼
             ┌─────────────────┐
             │   Nginx / LB    │
             └────────┬────────┘
                      ▼
             ┌─────────────────┐
             │    API HTTP     │
             │   apps/api      │
             └─────┬─────┬─────┘
                   │     │
          ┌────────┘     └─────────┐
          ▼                        ▼
 ┌─────────────────┐       ┌─────────────────┐
 │   PostgreSQL    │       │      Redis      │
 └─────────────────┘       └───────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
      ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
      │billing-worker│    │recon-worker    │    │exports-worker│
      └──────┬───────┘    └────────────────┘    └──────┬───────┘
             │                                           │
             ▼                                           ▼
      ┌──────────────┐                           ┌──────────────┐
      │ Facturapi    │                           │Object Storage│
      └──────────────┘                           └──────────────┘
```

---

## 5. Dominios recomendados

```txt
api.tortillaplus.mx
pos.tortillaplus.mx
manager.tortillaplus.mx
factura.tortillaplus.mx
```

Uso:

```txt
api.tortillaplus.mx        → apps/api
pos.tortillaplus.mx        → apps/pos-pwa
manager.tortillaplus.mx    → apps/manager-pwa
factura.tortillaplus.mx    → apps/public-billing-pwa
```

---

## 6. Ambientes

Ambientes recomendados:

```txt
local
staging
production
```

---

## 7. Local

Uso:

```txt
desarrollo
pruebas rápidas
Codex
QA básico
```

Componentes:

```txt
API local
frontends Vite
PostgreSQL Docker
Redis Docker
storage local o MinIO
workers locales
scheduler local opcional
```

---

## 8. Staging

Uso:

```txt
validación antes de producción
QA fiscal sandbox
pruebas de integración
validación UI
```

Debe usar:

```txt
base de datos separada
Redis separado
Facturapi sandbox
storage separado
dominios staging
```

Dominios sugeridos:

```txt
staging-api.tortillaplus.mx
staging-pos.tortillaplus.mx
staging-manager.tortillaplus.mx
staging-factura.tortillaplus.mx
```

---

## 9. Production

Uso:

```txt
operación real
ventas reales
facturación real
conciliación real
```

Debe usar:

```txt
backups activos
logs
monitoreo
variables seguras
provider fiscal productivo
storage persistente
```

---

# 10. API deployment

## 10.1 Servicio

```txt
apps/api
```

Responsabilidad:

```txt
HTTP API
auth
sales
billing
reconciliation
exports
settings
permissions
```

---

## 10.2 Runtime

Recomendado:

```txt
Node.js LTS
TypeScript compilado
Fastify o NestJS
Prisma
```

---

## 10.3 Proceso

Comando conceptual:

```txt
pnpm --filter api start
```

---

## 10.4 Escalamiento V1

Inicialmente:

```txt
1 instancia API
```

Puede escalar a:

```txt
2+ instancias API
```

cuando:

```txt
hay varias sucursales operando simultáneamente
hay alto tráfico del portal público
hay lentitud en POS por carga de requests
```

---

## 10.5 Regla crítica

La API no debe ejecutar procesos largos dentro del request principal.

Debe mandar a cola:

```txt
timbrado
reintentos
globales
cancelaciones
conciliación
exports
validación fiscal pesada
```

---

# 11. Workers deployment

## 11.1 Separación recomendada

Aunque el código viva en `apps/api`, los workers deben correr como procesos separados.

Procesos:

```txt
billing-worker
reconciliation-worker
exports-worker
```

---

## 11.2 Billing worker

Responsable de:

```txt
timbrado individual
reintentos
manual review
global diaria
global rezagados
cancelaciones CFDI
validación Facturapi
```

Comando conceptual:

```txt
pnpm --filter api worker:billing
```

---

## 11.3 Reconciliation worker

Responsable de:

```txt
procesar CSV/XLSX
normalizar movimientos
generar matches
crear incidencias
```

Comando conceptual:

```txt
pnpm --filter api worker:reconciliation
```

---

## 11.4 Exports worker

Responsable de:

```txt
generar CSV
generar XLSX
generar ZIP XML
marcar archivos listos
manejar expiración
```

Comando conceptual:

```txt
pnpm --filter api worker:exports
```

---

## 11.5 Escalamiento de workers

Escalar primero:

```txt
billing-worker
```

si:

```txt
timbrado tarda
hay muchos retries
hay mucha autofactura
```

Escalar:

```txt
exports-worker
```

si:

```txt
exportaciones grandes bloquean cola
```

Escalar:

```txt
reconciliation-worker
```

si:

```txt
imports bancarios tardan mucho
```

---

# 12. Scheduler deployment

## 12.1 Servicio

Scheduler separado.

Responsable de:

```txt
preparar global diaria
expirar receipts QR
preparar global rezagados
limpiar exports expirados
programar retries si aplica
```

---

## 12.2 Comando conceptual

```txt
pnpm --filter api scheduler:start
```

---

## 12.3 Regla de instancia única

En V1, scheduler debe correr en una sola instancia activa.

Si hay varias instancias:

```txt
usar lock Redis
```

para evitar duplicados.

---

# 13. Frontend deployment

## 13.1 POS PWA

App:

```txt
apps/pos-pwa
```

Dominio:

```txt
pos.tortillaplus.mx
```

Despliegue posible:

```txt
Vercel
Netlify
Cloudflare Pages
Nginx static
```

Requisitos:

```txt
PWA
cache controlado
actualizaciones seguras
conexión a API
```

---

## 13.2 Manager PWA

App:

```txt
apps/manager-pwa
```

Dominio:

```txt
manager.tortillaplus.mx
```

Despliegue posible:

```txt
Vercel
Netlify
Cloudflare Pages
Nginx static
```

---

## 13.3 Public Billing PWA

App:

```txt
apps/public-billing-pwa
```

Dominio:

```txt
factura.tortillaplus.mx
```

Debe ser:

```txt
mobile-first
rápida
sin login
compatible con QR
```

---

## 13.4 Regla frontend

Los frontends no deben tener secretos.

Variables públicas permitidas:

```txt
VITE_API_BASE_URL
VITE_APP_ENV
VITE_PUBLIC_BILLING_URL
```

No permitir:

```txt
API keys privadas
tokens Facturapi
credenciales DB
secretos JWT
```

---

# 14. Base de datos

## 14.1 Motor

Recomendado:

```txt
PostgreSQL
```

ORM:

```txt
Prisma
```

---

## 14.2 Opciones deployment

V1 puede usar:

```txt
PostgreSQL gestionado
PostgreSQL en VPS
Neon/Supabase/Render/TiDB si se decide adaptar
```

Recomendación operativa:

```txt
DB gestionada si el presupuesto lo permite
```

Motivo:

```txt
backups
mantenimiento
recuperación
menor carga operativa
```

---

## 14.3 Datos críticos

```txt
ventas
pagos
facturas
XML metadata
receipts
globales
manual review
conciliación
exports
auditoría
usuarios
roles
sucursales
```

---

## 14.4 Backups

Mínimo producción:

```txt
backup diario
retención 7-30 días
prueba de restauración mensual
```

---

# 15. Redis

## 15.1 Uso

Redis se usa para:

```txt
BullMQ
colas
retries
locks
rate limit
scheduler locks
deduplicación básica
```

---

## 15.2 Colas

```txt
billing
reconciliation
exports
scheduler
```

---

## 15.3 Deployment

Puede correr:

```txt
Redis gestionado
Redis en VPS
```

Para V1, Redis en VPS es viable si se monitorea.

---

# 16. Object Storage

## 16.1 Uso

Storage requerido para:

```txt
XML fiscales
exports generados
archivos importados CSV/XLSX
logs/artefactos no sensibles si aplica
```

---

## 16.2 Opciones

```txt
S3
Cloudflare R2
MinIO
storage del proveedor cloud
```

---

## 16.3 Reglas

```txt
XML persistente
PDF bajo demanda
exports expiran
imports bancarios pueden tener retención limitada
evidencia cancelación solo URL externa
```

---

## 16.4 Buckets sugeridos

```txt
tortilla-plus-xml
tortilla-plus-exports
tortilla-plus-reconciliation-imports
```

---

# 17. Nginx / Reverse Proxy

## 17.1 Uso

Si se usa VPS, Nginx debe enrutar:

```txt
api.tortillaplus.mx        → API Node
pos.tortillaplus.mx        → static POS
manager.tortillaplus.mx    → static Manager
factura.tortillaplus.mx    → static Public Billing
```

---

## 17.2 SSL

Usar:

```txt
Let's Encrypt
Cloudflare SSL
certificados gestionados del hosting
```

---

## 17.3 Headers recomendados

```txt
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Content-Security-Policy básica
Strict-Transport-Security en producción
```

---

# 18. Variables de entorno

## 18.1 API

Variables mínimas:

```txt
NODE_ENV
PORT
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_EXPIRES_IN
FACTURAPI_API_KEY
FACTURAPI_ENV
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET_XML
STORAGE_BUCKET_EXPORTS
PUBLIC_BILLING_BASE_URL
TZ
```

---

## 18.2 Frontends

Variables mínimas:

```txt
VITE_API_BASE_URL
VITE_APP_ENV
VITE_PUBLIC_BILLING_URL
```

---

## 18.3 Seguridad

No commitear:

```txt
.env
API keys
certificados
passwords
private keys
```

Mantener:

```txt
.env.example
```

sin valores reales.

---

# 19. Logging

## 19.1 Logs mínimos

Registrar:

```txt
requests API
errores backend
jobs ejecutados
retries
DLQ
provider errors sanitizados
exports
cancelaciones
auditoría fiscal
```

---

## 19.2 No loggear

```txt
API keys
CSD private key
passwords
tokens QR crudos si no es necesario
datos completos de tarjeta
payload completo Facturapi
```

---

# 20. Observabilidad

Métricas mínimas:

```txt
tiempo respuesta API
errores 5xx
jobs pendientes
jobs fallidos
retries
DLQ
tiempo de timbrado
tiempo de exportación
errores provider
```

---

## 20.1 Alertas mínimas

```txt
API caída
DB inaccesible
Redis inaccesible
billing-worker detenido
cola billing acumulada
provider fiscal no disponible
errores 5xx altos
storage inaccesible
```

---

# 21. Seguridad

## 21.1 API interna

Requiere:

```txt
JWT
RBAC backend
rate limit
validación DTO
sanitización de errores
```

---

## 21.2 Portal público

Requiere:

```txt
token opaco
rate limit
no login
no datos sensibles
validación backend
```

---

## 21.3 Facturación

Proteger:

```txt
CSD
credenciales Facturapi
XML
metadata fiscal
cancelaciones
exports
```

---

# 22. Rate limits

Aplicar rate limit en:

```txt
portal público autofactura
polling invoice-status
login
cancelaciones
exports
subida conciliación
```

---

# 23. Estrategia VPS simple

Opción económica inicial:

```txt
1 VPS
PostgreSQL gestionado externo o local
Redis local
API + workers + scheduler en procesos separados
frontends estáticos por Nginx
storage externo S3/R2
```

Ventaja:

```txt
menor costo
control operativo
despliegue simple
```

Riesgo:

```txt
más administración del servidor
```

---

## 24. Estrategia gestionada

Opción más cómoda:

```txt
API en Render/Fly/Railway
frontends en Vercel/Netlify/Cloudflare Pages
PostgreSQL gestionado
Redis gestionado
storage S3/R2
```

Ventaja:

```txt
menos administración
deploy más simple
```

Riesgo:

```txt
costo puede crecer
dependencia de proveedores
```

---

# 25. Recomendación V1

Para V1 comercial temprana:

```txt
frontends en Vercel/Cloudflare Pages
API + workers en VPS o Render
PostgreSQL gestionado si presupuesto permite
Redis en VPS o gestionado
storage en Cloudflare R2/S3
Nginx si se usa VPS
```

No usar Kubernetes.

No separar microservicios todavía.

---

# 26. Escalamiento futuro

Escalar en este orden:

```txt
1. Separar workers en procesos dedicados.
2. Aumentar recursos API.
3. Usar Redis gestionado.
4. Usar DB gestionada con mejores recursos.
5. Separar billing-worker en instancia propia.
6. Separar reconciliation/export workers.
7. CDN para frontends.
8. Microservicios solo si hay presión real.
```

---

# 27. Backup y recuperación

## 27.1 Base de datos

```txt
backup diario
retención mínima 7 días
ideal 30 días
prueba de restore mensual
```

---

## 27.2 Storage XML

```txt
versionado o retención protegida
no borrar XML fiscal sin política formal
```

---

## 27.3 Exports

```txt
expiran
pueden regenerarse
no requieren retención larga
```

---

# 28. CI/CD mínimo

Pipeline recomendado:

```txt
install
lint
typecheck
test
validate openapi
build
docker build
deploy
```

---

## 28.1 Validaciones obligatorias

```txt
OpenAPI válido
no secrets en repo
tests críticos
build frontends
build API
migraciones revisadas
```

---

# 29. Artefactos de deploy

Carpetas esperadas:

```txt
infra/docker/
infra/nginx/
infra/deploy/
```

Archivos esperados:

```txt
Dockerfile.api
Dockerfile.worker
docker-compose.local.yml
nginx.conf
deploy-api.sh
deploy-frontends.sh
backup-db.sh
```

---

# 30. Fuera de alcance V1

No implementar:

```txt
Kubernetes
service mesh
microservicios separados
multi-region
open banking automático
event sourcing completo
data warehouse
autoscaling complejo
infraestructura multi-tenant avanzada por cluster
```

---

# 31. Checklist producción mínima

```txt
[ ] API con HTTPS.
[ ] Frontends con HTTPS.
[ ] JWT configurado.
[ ] DB con backups.
[ ] Redis operativo.
[ ] Workers activos.
[ ] Scheduler activo con lock.
[ ] Storage configurado.
[ ] Facturapi productivo configurado.
[ ] Logs activos.
[ ] Rate limit activo.
[ ] .env fuera del repo.
[ ] OpenAPI validado.
[ ] Healthcheck API.
[ ] Healthcheck workers o monitoreo de proceso.
```

---

# 32. Healthchecks

## 32.1 API

Endpoint sugerido:

```txt
GET /health
```

Debe validar:

```txt
API alive
DB reachable
Redis reachable
```

---

## 32.2 Workers

Los workers deben reportar:

```txt
proceso activo
colas conectadas
último job procesado
jobs fallidos
```

Puede ser por logs o endpoint interno.

---

# 33. Relación con otros documentos

Monorepo:

```txt
docs/architecture/monorepo-architecture-v0.1.md
```

Context graph:

```txt
docs/architecture/implementation-context-graph-v0.1.md
```

Apps/packages:

```txt
docs/architecture/apps-and-packages-map-v0.1.md
```

Backend billing:

```txt
docs/backend/billing/
```

Contracts:

```txt
docs/contracts/
```

---

## 34. Definition of Done

Este documento queda completo si define:

```txt
[ ] servicios desplegables
[ ] dominios
[ ] ambientes
[ ] API deployment
[ ] workers
[ ] scheduler
[ ] frontends
[ ] DB
[ ] Redis
[ ] storage
[ ] Nginx
[ ] variables env
[ ] logging
[ ] observabilidad
[ ] seguridad
[ ] CI/CD
[ ] estrategia recomendada V1
[ ] fuera de alcance
```

---

## 35. Siguiente documento

Después de este documento, generar:

```txt
docs/architecture/local-development-docker-v0.1.md
```
