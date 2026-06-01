# Tortilla Plus — Preparación de Deploy Piloto Render + Neon v0.1

Documento operativo para preparar el despliegue de **Tortilla Plus — V1 Operativa Comercial** en fase piloto controlado.

## 1. Objetivo

Preparar un entorno desplegable para probar Tortilla Plus con **3 a 10 clientes piloto**, usando servicios PaaS y evitando infraestructura administrada manualmente.

El objetivo de este despliegue no es producción final; es validar operación real con bajo costo, control de riesgos y una ruta clara hacia producción.

## 2. Stack decidido

| Componente | Servicio | Estado |
|---|---|---|
| API backend | Render Web Service | Decidido |
| Frontend web/PWA | Render Static Site | Decidido |
| Base de datos | Neon PostgreSQL | Decidido |
| ORM | Prisma | Existente |
| Auth | Backend propio | Decidido |
| Storage documental/backups | Cloudflare R2 | Pendiente de configurar |
| Monitoreo básico | Render logs + UptimeRobot/Better Stack | Pendiente |
| Dominio | Dominio propio recomendado | Pendiente |

## 3. Alcance del piloto

Incluye:

- Deploy de API.
- Deploy de frontend.
- Conexión a Neon PostgreSQL.
- Migraciones con Prisma.
- Seed mínimo operativo.
- Configuración de variables de entorno.
- Healthcheck.
- CORS controlado.
- Backups externos.
- Checklist de smoke tests.
- Checklist de salida a piloto.

No incluye todavía:

- Producción comercial definitiva.
- Facturación fiscal real en producción.
- Integración productiva con Mercado Pago/Clip.
- Integración con báscula.
- Modo offline completo.
- Alta disponibilidad.
- Kubernetes.
- Microservicios.

## 4. Decisiones cerradas

### 4.1 Base de datos

Se usará **Neon PostgreSQL**.

Motivo:

- El backend actual usa Prisma con `provider = "postgresql"`.
- Las migraciones y DDL actuales están pensados para PostgreSQL.
- Neon permite continuar sin migrar modelo, tipos ni ORM.
- TiDB no se usará en esta fase porque es MySQL-compatible y requeriría migración estructural.

### 4.2 Autenticación

Se mantiene **Auth propio del backend**.

Motivo:

- El backend ya maneja usuarios, sesiones, refresh tokens, JWT, `organizationId`, roles, permisos, auditoría y PIN operativo.
- Supabase Auth agregaría una segunda fuente de verdad.
- En POS, la identidad no es solo login; también incluye permisos operativos, sucursal, organización y autorizaciones sensibles.

### 4.3 Render

Se usará Render para API y frontend.

Motivo:

- Menos fricción que VPS.
- Adecuado para piloto controlado.
- Permite despliegue desde GitHub.
- Costos bajos y predecibles para fase inicial.

## 5. Entornos requeridos

Mínimo:

| Entorno | Uso |
|---|---|
| local | Desarrollo |
| staging | Pruebas antes de producción piloto |
| production | Clientes piloto |

Para no elevar complejidad, se puede iniciar con:

```txt
local
production-pilot
```

Pero antes de clientes reales debe existir al menos una forma segura de probar migraciones fuera de producción.

## 6. Variables de entorno API

Crear archivo de referencia:

```txt
apps/api/.env.render.example
```

Contenido sugerido:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"

JWT_SECRET="REPLACE_WITH_STRONG_SECRET"
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30

BILLING_PROVIDER=mock
FACTURAPI_API_KEY=
FACTURAPI_ENV=sandbox
FACTURAPI_API_BASE_URL=https://www.facturapi.io/v2
FACTURAPI_PUBLIC_ZIP_CODE=64000
FACTURAPI_WEBHOOK_SECRET=

PHYSICAL_INTEGRATIONS_MODE=mock

MERCADOPAGO_CLIENT_ID=
MERCADOPAGO_CLIENT_SECRET=
MERCADOPAGO_REDIRECT_URI=
MERCADOPAGO_PLATFORM_ID=
MERCADOPAGO_INTEGRATOR_ID=

PAYMENT_SECRET_ENCRYPTION_KEY="REPLACE_WITH_32_PLUS_RANDOM_CHARS"

CORS_ORIGINS="https://APP_DOMAIN"
```

Reglas:

- No subir secretos reales al repo.
- `JWT_SECRET` debe ser largo y aleatorio.
- `PAYMENT_SECRET_ENCRYPTION_KEY` debe ser largo, aleatorio y estable.
- `DATABASE_URL` se usará para runtime.
- `DIRECT_URL` se usará para migraciones.

## 7. Ajuste requerido en Prisma

Actualizar datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Motivo:

- Neon puede usar pooler para runtime.
- Prisma Migrate debe usar conexión directa.

## 8. Scripts requeridos para producción

En `apps/api/package.json`, mantener scripts actuales y agregar:

```json
{
  "scripts": {
    "db:migrate:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/src/index.js"
  }
}
```

No usar en producción:

```bash
prisma migrate dev
```

Uso correcto:

```bash
npm run db:migrate:deploy
```

## 9. Render API

Tipo de servicio:

```txt
Web Service
```

Build command sugerido:

```bash
npm install && npm run db:generate && npm run build
```

Start command:

```bash
npm run start
```

Health Check Path:

```txt
/health
```

Variables obligatorias:

```txt
NODE_ENV
PORT
HOST
DATABASE_URL
DIRECT_URL
JWT_SECRET
ACCESS_TOKEN_TTL_SECONDS
REFRESH_TOKEN_TTL_DAYS
PAYMENT_SECRET_ENCRYPTION_KEY
CORS_ORIGINS
```

Variables en modo mock para piloto inicial:

```txt
BILLING_PROVIDER=mock
PHYSICAL_INTEGRATIONS_MODE=mock
FACTURAPI_ENV=sandbox
```

## 10. Render Frontend

Tipo de servicio:

```txt
Static Site
```

Build command típico:

```bash
npm install && npm run build
```

Publish directory típico:

```txt
dist
```

Variable requerida:

```env
VITE_API_URL="https://API_DOMAIN"
```

Regla:

- El frontend debe consumir solo la API configurada por variable.
- No debe quedar hardcodeada una URL local.

## 11. Neon PostgreSQL

Crear proyecto Neon:

```txt
tortilla-plus-pilot
```

Crear base:

```txt
tortilla_plus
```

Configurar:

```txt
DATABASE_URL = pooled/runtime connection
DIRECT_URL   = direct connection
```

Reglas:

- No ejecutar `db push` en producción piloto.
- Usar solo migraciones versionadas.
- No editar tablas manualmente salvo emergencia documentada.
- Activar métricas básicas y revisar conexiones durante pruebas.

## 12. Migraciones

Orden correcto:

```bash
npm install
npm run db:generate
npm run build
npm run db:migrate:deploy
```

Para el primer deploy piloto:

```txt
1. Crear DB vacía en Neon.
2. Cargar variables en Render API.
3. Ejecutar migraciones.
4. Ejecutar seed mínimo.
5. Probar login.
6. Probar flujos críticos.
```

## 13. Seed mínimo operativo

El seed de producción piloto debe crear solo datos indispensables.

Debe incluir:

- Roles base.
- Permisos base.
- Plan piloto.
- Features base.
- Organización piloto.
- Sucursal piloto.
- Usuario owner.
- Usuario cajero.
- Productos base:
  - tortilla kg;
  - masa kg;
  - paquete tortilla 800g;
  - productos retail demo opcionales.
- Precios base por sucursal.
- Motivos de caja:
  - retiro;
  - ingreso;
  - ajuste.

No debe incluir:

- Clientes demo en producción real.
- Ventas demo.
- Cajas abiertas demo.
- Inventario falso salvo que sea entorno staging.

## 14. Healthchecks requeridos

Crear endpoints:

```txt
GET /health
GET /health/db
```

Respuesta mínima `/health`:

```json
{
  "status": "ok",
  "service": "tortilla-plus-api",
  "version": "0.1.0"
}
```

Respuesta mínima `/health/db`:

```json
{
  "status": "ok",
  "db": "ok"
}
```

Regla:

- `/health` no debe exponer secretos.
- `/health/db` puede estar protegido o usarse solo para diagnóstico interno si se prefiere.

## 15. CORS

Configurar variable:

```env
CORS_ORIGINS="https://APP_DOMAIN,https://STAGING_APP_DOMAIN"
```

Reglas:

- No usar `*` en producción.
- No permitir localhost en producción piloto.
- Separar CORS de staging y producción si existen ambos entornos.

## 16. Storage y backups

Servicio recomendado:

```txt
Cloudflare R2
```

Buckets sugeridos:

```txt
tortilla-plus-backups
tortilla-plus-documents
tortilla-plus-reports
```

Reglas:

- Render no debe usarse como storage persistente de negocio.
- XML, reportes y respaldos deben vivir fuera del filesystem de Render.
- En V1, para facturación, almacenar XML y metadata; PDF puede generarse bajo demanda.

## 17. Backups externos

Mínimo para piloto:

```txt
Backup lógico diario
Formato .sql.gz
Destino Cloudflare R2
Retención 15 a 30 días
Prueba de restauración semanal durante piloto
```

Tareas técnicas:

```txt
[ ] Crear script de backup Neon -> R2
[ ] Crear cron job
[ ] Guardar logs de backup
[ ] Alertar si falla backup
[ ] Documentar restore
[ ] Probar restore en DB limpia
```

Estructura sugerida en R2:

```txt
backups/
  tortilla-plus/
    production-pilot/
      2026-06-01.sql.gz
      2026-06-02.sql.gz
```

## 18. Seguridad mínima

Checklist obligatorio:

```txt
[ ] JWT_SECRET fuerte configurado
[ ] PAYMENT_SECRET_ENCRYPTION_KEY fuerte configurado
[ ] CORS cerrado
[ ] NODE_ENV=production
[ ] Errores sin stacktrace al cliente
[ ] Logs sin tokens ni passwords
[ ] Rate limit en login
[ ] Rate limit en endpoints críticos POS
[ ] Usuario owner inicial creado de forma segura
[ ] PIN configurado para acciones sensibles
[ ] HTTPS activo
[ ] Secrets fuera del repo
```

Acciones sensibles que requieren especial cuidado:

- cierre de caja;
- retiros;
- cancelaciones;
- devoluciones;
- venta a crédito;
- autorización por supervisor/gerente;
- integración de terminales;
- facturación/cancelación CFDI.

## 19. Riesgos bloqueantes antes de clientes reales

### 19.1 Doble caja abierta

Riesgo:

- Dos solicitudes simultáneas pueden abrir dos cajas para una misma sucursal si solo se valida por aplicación.

Acción requerida:

```sql
CREATE UNIQUE INDEX uq_one_open_cash_session_per_branch
ON cash_sessions(branch_id)
WHERE status = 'open';
```

Prioridad:

```txt
Alta
```

Estado:

```txt
Pendiente
```

### 19.2 Inventario concurrente

Riesgo:

- Dos ventas simultáneas pueden calcular stock sobre el mismo valor previo y pisarse.

Opciones:

```txt
A) Update atómico con decrement
B) SELECT ... FOR UPDATE controlado
C) Transacción serializable + retry
```

Recomendación:

```txt
Update atómico con decrement + auditoría
```

Prioridad:

```txt
Alta antes de operación real con varias cajas por sucursal
```

Estado:

```txt
Pendiente
```

## 20. Smoke tests después del deploy

Ejecutar en producción piloto antes de entregar a usuario final.

### 20.1 Auth

```txt
[ ] Login owner
[ ] Login cajero
[ ] Refresh token
[ ] Logout
[ ] Usuario inactivo bloqueado
[ ] PIN válido
[ ] PIN inválido
```

### 20.2 Caja

```txt
[ ] Abrir caja
[ ] Evitar segunda caja abierta
[ ] Registrar ingreso
[ ] Solicitar retiro
[ ] Autorizar retiro
[ ] Bloquear cierre con retiros pendientes
[ ] Cerrar caja
```

### 20.3 POS

```txt
[ ] Venta tortilla por kg
[ ] Venta tortilla por monto
[ ] Venta paquete 800g
[ ] Venta masa por kg
[ ] Venta producto retail
[ ] Venta efectivo
[ ] Venta transferencia
[ ] Venta mixta
[ ] Venta crédito con cliente habilitado
[ ] Bloquear crédito sin cliente
[ ] Cancelar venta borrador
[ ] Devolución de venta completada
```

### 20.4 Clientes y precios

```txt
[ ] Crear cliente
[ ] Asignar precio especial
[ ] Vender desde POS a cliente con precio especial
[ ] Validar límite de crédito
[ ] Registrar abono
[ ] Ver saldo
```

### 20.5 Inventario

```txt
[ ] Alta de producción
[ ] Venta descuenta inventario
[ ] Tortilla/masa permite negativo con auditoría
[ ] Retail bloquea negativo
[ ] Devolución regresa inventario si aplica
[ ] Merma registrada
```

### 20.6 Reparto

```txt
[ ] Crear ruta
[ ] Asignar cliente
[ ] Crear pedido de reparto
[ ] Cargar pedido
[ ] Descontar inventario al cargar
[ ] Liquidar ruta
[ ] Registrar pago parcial
[ ] Registrar devolución
```

### 20.7 Frontend

```txt
[ ] Front consume API de producción
[ ] No quedan URLs localhost
[ ] Login redirige correctamente
[ ] Cajero ve solo su flujo
[ ] Owner/gerente ve módulos autorizados
[ ] Errores visibles son comprensibles para usuario final
```

## 21. Rollback

Rollback de API:

```txt
1. Identificar último deploy estable en Render.
2. Revertir deploy desde Render o Git.
3. Confirmar /health.
4. Ejecutar smoke test mínimo.
```

Rollback de frontend:

```txt
1. Revertir deploy estático.
2. Confirmar carga de frontend.
3. Confirmar conexión con API.
```

Rollback de DB:

```txt
No hacer rollback manual destructivo sin respaldo.
```

Reglas:

- Toda migración debe ser reversible o tener plan de mitigación.
- Antes de migraciones críticas, generar backup manual.
- Si una migración falla, no improvisar cambios directos en producción sin documentar.

## 22. Monitoreo básico

Mínimo:

```txt
[ ] Render logs revisados
[ ] Neon dashboard revisado
[ ] Uptime monitor a /health
[ ] Alerta por caída de API
[ ] Alerta por fallo de backup
```

Opcional recomendado:

```txt
[ ] Sentry backend
[ ] Sentry frontend
[ ] Better Stack logs
```

## 23. Dominios sugeridos

Para piloto profesional:

```txt
app.tortillaplus.mx
api.tortillaplus.mx
```

Opcional:

```txt
staging.tortillaplus.mx
api-staging.tortillaplus.mx
```

Regla:

- No entregar URLs de Render a clientes si se está cobrando o presentando como producto formal.

## 24. Checklist previo a clientes piloto

```txt
[ ] Neon creado
[ ] Render API creado
[ ] Render Front creado
[ ] Variables API configuradas
[ ] Variables Front configuradas
[ ] Prisma usa DIRECT_URL
[ ] Migraciones ejecutadas con migrate deploy
[ ] Seed mínimo ejecutado
[ ] Healthcheck activo
[ ] CORS cerrado
[ ] Login probado
[ ] Caja probada
[ ] Venta probada
[ ] Inventario probado
[ ] Cliente/precio especial probado
[ ] Crédito probado
[ ] Reparto probado si entra en piloto
[ ] Backup diario configurado
[ ] Restore probado
[ ] Restricción de una caja abierta agregada
[ ] Riesgo de inventario concurrente mitigado o documentado
[ ] Dominio configurado
[ ] Monitoreo activo
[ ] Usuario owner entregado de forma segura
```

## 25. Definition of Done del deploy piloto

El deploy piloto se considera listo cuando:

```txt
[ ] API está disponible públicamente por HTTPS
[ ] Frontend está disponible públicamente por HTTPS
[ ] Frontend consume API correcta
[ ] Neon recibe migraciones correctamente
[ ] Seed mínimo permite operar una sucursal piloto
[ ] Auth propio funciona
[ ] Caja abre/cierra correctamente
[ ] Venta POS completa funciona
[ ] Inventario se actualiza correctamente
[ ] Backups externos corren diariamente
[ ] Restore fue probado al menos una vez
[ ] Healthcheck está monitoreado
[ ] No hay secretos en repo
[ ] No hay URLs localhost en frontend productivo
[ ] Se documentaron riesgos abiertos
```

## 26. Pendientes por aterrizar

Antes de ejecutar deploy se deben definir estos valores:

```txt
[ ] Nombre exacto del servicio API en Render
[ ] Nombre exacto del servicio Front en Render
[ ] Dominio o subdominio final
[ ] Proyecto Neon
[ ] Región Neon
[ ] Región Render
[ ] Bucket R2
[ ] Política de retención de backups
[ ] Usuario owner inicial
[ ] Método seguro para entregar credenciales iniciales
[ ] Cliente/sucursal piloto inicial
```

## 27. Decisión final

Para Fase 1 se adopta:

```txt
Render API + Render Static Site + Neon PostgreSQL + Auth propio + R2 para backups
```

No se adopta:

```txt
TiDB
Supabase Auth
Kubernetes
Microservicios
DB por cliente
Storage en Render
```

Motivo:

El objetivo del piloto es validar operación, no optimizar infraestructura prematuramente.
