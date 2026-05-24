# Tortilla Plus — Architecture Decision Records Index V0.1

## 1. Propósito

Este documento define el índice de ADRs técnicos para **Tortilla Plus — V1 Operativa Comercial**.

Su función es registrar decisiones de arquitectura que afectan:

```txt
monorepo
apps
packages
contratos
backend
frontend
workers
colas
storage
despliegue
seguridad
operación local
```

Ubicación recomendada:

```txt
docs/architecture/architecture-decision-records-index-v0.1.md
```

---

## 2. Qué es un ADR

ADR significa:

```txt
Architecture Decision Record
```

Un ADR registra una decisión técnica relevante, su contexto, alternativas, decisión final y consecuencias.

No sustituye:

```txt
documentos product
OpenAPI
ERD
especificaciones frontend
especificaciones backend
```

Sirve para explicar por qué la arquitectura se diseñó de cierta forma.

---

## 3. Regla de uso

Crear o actualizar un ADR cuando una decisión afecte:

```txt
estructura del repo
stack principal
despliegue
persistencia
colas
contratos
seguridad
separación de apps
integraciones externas
modelo de escalamiento
```

No crear ADR para cambios menores de UI o nombres de variables.

---

## 4. Estado de ADR

Estados permitidos:

```txt
proposed
accepted
superseded
deprecated
rejected
```

Uso:

```txt
proposed    = en discusión
accepted    = decisión vigente
superseded  = reemplazada por otro ADR
deprecated  = aún existe pero se recomienda migrar
rejected    = alternativa descartada
```

---

## 5. Formato recomendado para cada ADR

Cada ADR individual debe usar esta estructura:

```md
# ADR-XXX — Título

## Estado

accepted

## Fecha

YYYY-MM-DD

## Contexto

Descripción del problema.

## Decisión

Qué se decidió.

## Alternativas consideradas

- Alternativa A
- Alternativa B
- Alternativa C

## Consecuencias

### Positivas

- ...

### Negativas / riesgos

- ...

## Documentos relacionados

- ...
```

---

# 6. ADRs iniciales V1

## ADR-001 — Monorepo como estructura base

Estado:

```txt
accepted
```

Decisión:

```txt
Tortilla Plus usará monorepo.
```

Motivo:

```txt
permite coordinar POS, Manager, portal público, API, packages y documentación
reduce fricción de contratos compartidos
facilita generación de cliente OpenAPI
```

Documentos relacionados:

```txt
docs/architecture/monorepo-architecture-v0.1.md
docs/architecture/apps-and-packages-map-v0.1.md
```

---

## ADR-002 — Apps separadas para POS, Manager y Portal Público

Estado:

```txt
accepted
```

Decisión:

```txt
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

Motivo:

```txt
cada app tiene prioridades UX distintas
POS requiere rapidez
Manager requiere control
Portal público requiere mobile-first sin login
```

Alternativa descartada:

```txt
una sola app con rutas para todo
```

Riesgo:

```txt
más apps implican más coordinación
```

Mitigación:

```txt
packages compartidos
OpenAPI
tokens UI
docs por app
```

---

## ADR-003 — API como monolito modular en V1

Estado:

```txt
accepted
```

Decisión:

```txt
apps/api será un monolito modular.
```

Motivo:

```txt
menor complejidad inicial
más rápido de implementar
suficiente para V1
facilita transacciones entre módulos
```

Alternativa descartada:

```txt
microservicios desde el inicio
```

Riesgo:

```txt
puede crecer demasiado si no se separan módulos internamente
```

Mitigación:

```txt
módulos claros
workers separados
contratos internos
eventos
```

---

## ADR-004 — Workers como procesos separados

Estado:

```txt
accepted
```

Decisión:

```txt
los workers correrán como procesos separados aunque vivan en apps/api
```

Workers V1:

```txt
billing-worker
reconciliation-worker
exports-worker
```

Motivo:

```txt
evitar bloquear requests HTTP
permitir escalar procesos pesados
separar timbrado, conciliación y exportaciones
```

---

## ADR-005 — Redis + BullMQ para colas

Estado:

```txt
accepted
```

Decisión:

```txt
usar Redis y BullMQ para jobs, retries y locks
```

Uso:

```txt
billing queue
reconciliation queue
exports queue
scheduler locks
rate limits
```

Motivo:

```txt
timbrado, retries, exports y conciliación no deben correr en request síncrono
```

---

## ADR-006 — PostgreSQL como base principal

Estado:

```txt
accepted
```

Decisión:

```txt
PostgreSQL será la base principal recomendada.
```

Motivo:

```txt
relacional
transaccional
soporta auditoría
compatible con Prisma
suficiente para ventas, facturación y conciliación
```

Alternativas:

```txt
MySQL
TiDB
SQLite
MongoDB
```

Nota:

```txt
Si se usa TiDB por decisión operativa, debe revisarse compatibilidad con Prisma y migraciones.
```

---

## ADR-007 — Prisma como ORM

Estado:

```txt
accepted
```

Decisión:

```txt
usar Prisma para acceso a datos y migraciones
```

Motivo:

```txt
tipado TypeScript
migraciones controladas
productividad
compatibilidad con monorepo
```

Riesgo:

```txt
consultas complejas de reportes pueden requerir SQL raw
```

Mitigación:

```txt
permitir SQL raw controlado en reportes/exports si es necesario
```

---

## ADR-008 — OpenAPI como contrato fuente

Estado:

```txt
accepted
```

Decisión:

```txt
docs/contracts/billing-openapi-v0.1.yaml será contrato fuente para integración
```

Motivo:

```txt
evita divergencia frontend/backend
permite cliente tipado
facilita QA
documenta endpoints y DTOs
```

Regla:

```txt
si cambia API, cambia OpenAPI y se regenera api-contracts
```

---

## ADR-009 — `packages/api-contracts` para cliente generado

Estado:

```txt
accepted
```

Decisión:

```txt
crear packages/api-contracts para OpenAPI, tipos y cliente generado
```

Consumidores:

```txt
apps/api
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
```

Motivo:

```txt
evitar DTOs duplicados
mantener integración tipada
```

---

## ADR-010 — Dinero como string decimal

Estado:

```txt
accepted
```

Decisión:

```txt
todos los montos viajan como string decimal
```

Ejemplo:

```json
{
  "total": "86.00",
  "currency": "MXN"
}
```

Motivo:

```txt
evitar errores de coma flotante
mantener precisión fiscal
```

---

## ADR-011 — Fechas ISO 8601 con zona horaria

Estado:

```txt
accepted
```

Decisión:

```txt
fechas con hora usarán ISO 8601 con offset
```

Ejemplo:

```txt
2026-05-24T10:35:00-06:00
```

Zona operativa:

```txt
America/Monterrey
```

Motivo:

```txt
ventas, QR, timbrado y globales dependen de fechas precisas
```

---

## ADR-012 — Facturapi como provider fiscal inicial

Estado:

```txt
accepted
```

Decisión:

```txt
usar Facturapi como motor fiscal inicial
```

Motivo:

```txt
acelera integración CFDI
reduce complejidad PAC
facilita modelo SaaS
```

Riesgo:

```txt
dependencia de proveedor externo
```

Mitigación:

```txt
usar provider adapter
no acoplar dominio directamente a SDK
```

---

## ADR-013 — Un RFC emisor por negocio en V1

Estado:

```txt
accepted
```

Decisión:

```txt
V1 opera un RFC emisor por negocio
arquitectura preparada para multi-RFC futuro
```

Motivo:

```txt
multi-RFC operativo agrega complejidad innecesaria al MVP
```

---

## ADR-014 — XML persistente y PDF bajo demanda

Estado:

```txt
accepted
```

Decisión:

```txt
guardar XML + metadata
generar PDF bajo demanda
```

Motivo:

```txt
XML es documento fiscal crítico
PDF puede regenerarse
reduce storage innecesario
```

---

## ADR-015 — Object Storage para XML, imports y exports

Estado:

```txt
accepted
```

Decisión:

```txt
usar storage tipo S3/R2/MinIO para artefactos
```

Artefactos:

```txt
XML fiscales
exports
imports de conciliación
```

No almacenar:

```txt
evidencia de cancelación como archivo en V1
```

---

## ADR-016 — Portal público sin login

Estado:

```txt
accepted
```

Decisión:

```txt
portal de autofactura no requiere login
```

Mecanismo:

```txt
token QR opaco
rate limit
validación backend
```

Motivo:

```txt
reducir fricción para cliente final
```

---

## ADR-017 — POS sin acciones fiscales críticas

Estado:

```txt
accepted
```

Decisión:

```txt
POS no cancela CFDI
POS no confirma globales
POS no resuelve manual review
POS no configura facturación
```

Motivo:

```txt
preservar velocidad de caja
reducir errores fiscales
```

---

## ADR-018 — Manager concentra operación fiscal crítica

Estado:

```txt
accepted
```

Decisión:

```txt
Manager Billing concentra globales, cancelaciones, manual review, configuración fiscal y exportaciones
```

Motivo:

```txt
estas acciones requieren revisión, permisos y auditoría
```

---

## ADR-019 — Roles fijos V1

Estado:

```txt
accepted
```

Decisión:

```txt
cashier
supervisor
manager
```

No incluir:

```txt
contador
director
dueño
soporte SaaS
roles personalizados
```

Motivo:

```txt
reducir complejidad de permisos en V1
```

---

## ADR-020 — Conciliación V1 por CSV/XLSX

Estado:

```txt
accepted
```

Decisión:

```txt
conciliación V1 usa carga manual CSV/XLSX
```

Providers iniciales:

```txt
BBVA
MercadoPago
Clip
```

Arquitectura futura:

```txt
preparada para APIs
```

Motivo:

```txt
open banking/API bancaria agrega complejidad prematura
```

---

## ADR-021 — Matching de conciliación por score

Estado:

```txt
accepted
```

Decisión:

```txt
usar score/confianza para sugerir matches banco ↔ POS
```

Factores:

```txt
monto
referencia
proximidad horaria
terminal/proveedor
sucursal
```

Motivo:

```txt
matching exacto sería frágil
todo manual sería lento
```

---

## ADR-022 — Exportaciones asincrónicas

Estado:

```txt
accepted
```

Decisión:

```txt
exports se generan por job asíncrono
```

Motivo:

```txt
no bloquear UI ni API
archivos pueden tardar
permite polling y estados
```

---

## ADR-023 — Scheduler con lock Redis

Estado:

```txt
accepted
```

Decisión:

```txt
scheduler debe correr con lock Redis cuando haya riesgo de múltiples instancias
```

Motivo:

```txt
evitar preparar globales duplicadas
evitar expirar receipts dos veces
evitar limpiar exports en competencia
```

---

## ADR-024 — Frontends estáticos desplegables

Estado:

```txt
accepted
```

Decisión:

```txt
POS, Manager y Portal Público se despliegan como frontends estáticos/PWA
```

Opciones:

```txt
Vercel
Netlify
Cloudflare Pages
Nginx static
```

Motivo:

```txt
deploy simple
costo bajo
separación clara del backend
```

---

## ADR-025 — Nginx como reverse proxy si se usa VPS

Estado:

```txt
accepted
```

Decisión:

```txt
si se despliega en VPS, usar Nginx para enrutar dominios
```

Dominios:

```txt
api.tortillaplus.mx
pos.tortillaplus.mx
manager.tortillaplus.mx
factura.tortillaplus.mx
```

---

## ADR-026 — Docker para desarrollo local

Estado:

```txt
accepted
```

Decisión:

```txt
usar Docker Compose local para Postgres, Redis y MinIO
```

Recomendación:

```txt
infra en Docker
frontends en host con pnpm dev
```

Motivo:

```txt
mejor hot reload
menos fricción
```

---

## ADR-027 — MinIO para storage local

Estado:

```txt
accepted
```

Decisión:

```txt
usar MinIO local para simular object storage
```

Buckets:

```txt
tortilla-plus-xml
tortilla-plus-exports
tortilla-plus-reconciliation-imports
```

---

## ADR-028 — Mocks fiscales locales

Estado:

```txt
accepted
```

Decisión:

```txt
permitir FACTURAPI_ENV=mock
```

Motivo:

```txt
probar flujos sin depender de provider externo
forzar casos de error
probar manual review
```

---

## ADR-029 — API no debe exponer secretos en frontend

Estado:

```txt
accepted
```

Decisión:

```txt
solo variables VITE públicas en frontends
secretos solo backend
```

No permitido en frontend:

```txt
FACTURAPI_API_KEY
JWT_SECRET
DATABASE_URL
STORAGE_SECRET_KEY
CSD private key
```

---

## ADR-030 — Errores sanitizados

Estado:

```txt
accepted
```

Decisión:

```txt
backend debe mapear errores internos/provider a catálogo operativo
```

Documento fuente:

```txt
docs/contracts/billing-error-catalog-v0.1.md
```

Motivo:

```txt
seguridad
mejor UX
soporte más claro
```

---

# 7. ADRs propuestos para futuro

## ADR-031 — Multi-RFC operativo

Estado:

```txt
proposed
```

Tema:

```txt
permitir múltiples RFC emisores por negocio/sucursal
```

No entra en V1.

---

## ADR-032 — Open Banking / APIs bancarias

Estado:

```txt
proposed
```

Tema:

```txt
sustituir o complementar CSV/XLSX con APIs de BBVA, MercadoPago o Clip
```

No entra en V1.

---

## ADR-033 — Separación de microservicios

Estado:

```txt
proposed
```

Tema:

```txt
separar billing/reconciliation/exports en servicios independientes
```

No entra en V1.

Criterio futuro:

```txt
volumen real
cuellos de botella
múltiples negocios activos
```

---

## ADR-034 — Infraestructura Kubernetes

Estado:

```txt
rejected para V1
```

Motivo:

```txt
sobrediseño
mayor costo operativo
no necesario para MVP
```

---

## ADR-035 — Roles personalizados

Estado:

```txt
rejected para V1
```

Motivo:

```txt
aumenta complejidad
rompe simplicidad del MVP
```

---

## ADR-036 — Portal cliente con login

Estado:

```txt
rejected para V1
```

Motivo:

```txt
la autofactura debe ser rápida y sin cuenta
```

---

# 8. Relación con documentos existentes

## 8.1 Arquitectura

```txt
docs/architecture/monorepo-architecture-v0.1.md
docs/architecture/implementation-context-graph-v0.1.md
docs/architecture/apps-and-packages-map-v0.1.md
docs/architecture/deployment-architecture-v0.1.md
docs/architecture/local-development-docker-v0.1.md
```

---

## 8.2 Producto

```txt
docs/product/billing/billing-business-rules-v0.1.md
docs/product/billing/billing-user-flows-v0.1.md
docs/product/billing/billing-decision-log-v0.1.md
```

---

## 8.3 Contratos

```txt
docs/contracts/billing-openapi-v0.1.yaml
docs/contracts/billing-api-conventions-v0.1.md
docs/contracts/billing-dto-catalog-v0.1.md
docs/contracts/billing-error-catalog-v0.1.md
docs/contracts/billing-events-contract-v0.1.md
```

---

## 8.4 Frontend

```txt
docs/frontend/billing/
```

---

## 8.5 Backend

```txt
docs/backend/billing/
```

---

# 9. Reglas de mantenimiento

## 9.1 Si cambia una decisión aceptada

Debe hacerse una de estas opciones:

```txt
actualizar ADR existente si es ajuste menor
crear nuevo ADR si reemplaza decisión
marcar ADR anterior como superseded
actualizar documentos relacionados
```

---

## 9.2 Si se agrega un nuevo ADR

Debe:

```txt
usar número consecutivo
tener estado
tener fecha
incluir contexto
incluir decisión
incluir consecuencias
referenciar documentos relacionados
```

---

## 9.3 Si se rechaza una alternativa

No borrar contexto.

Registrar:

```txt
por qué se descartó
qué riesgo evitó
cuándo podría reconsiderarse
```

---

# 10. Checklist ADR para Codex

Antes de cambiar arquitectura, Codex debe revisar:

```txt
[ ] ¿Existe ADR relacionado?
[ ] ¿La decisión cambia una regla aceptada?
[ ] ¿Debe actualizarse OpenAPI?
[ ] ¿Debe actualizarse docs/product?
[ ] ¿Debe actualizarse docs/frontend/backend?
[ ] ¿Debe marcarse un ADR como superseded?
[ ] ¿Se está agregando complejidad fuera de V1?
```

---

# 11. ADRs que NO se deben crear todavía

No crear ADRs para:

```txt
Kubernetes productivo
microservicios obligatorios
multi-RFC operativo
open banking real
roles personalizados
portal cliente con cuenta
contabilidad electrónica
data warehouse
event sourcing completo
```

Salvo que se decida moverlos a una fase posterior formal.

---

# 12. Definition of Done

Este índice queda completo si define:

```txt
[ ] qué es un ADR
[ ] estados permitidos
[ ] formato de ADR
[ ] ADRs aceptados V1
[ ] ADRs futuros/propuestos
[ ] ADRs rechazados para V1
[ ] relación con documentos
[ ] reglas de mantenimiento
[ ] checklist para Codex
```

---

## 13. Cierre del bloque architecture

Con este documento, el bloque:

```txt
docs/architecture/
```

queda completo para V0.1 con:

```txt
monorepo-architecture-v0.1.md
implementation-context-graph-v0.1.md
apps-and-packages-map-v0.1.md
deployment-architecture-v0.1.md
local-development-docker-v0.1.md
architecture-decision-records-index-v0.1.md
```
