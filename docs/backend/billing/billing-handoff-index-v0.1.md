# Tortilla Plus — Billing Handoff Index V0.1

## 1. Propósito

Este documento agrupa y ordena todos los documentos técnicos del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Sirve como punto de entrada para:

```txt
backend developers
tech lead
QA backend
frontend manager/PWA
product owner
soporte técnico futuro
```

Este índice evita que el equipo implemente el módulo fiscal leyendo documentos en orden incorrecto o mezclando decisiones congeladas con ideas futuras.

---

## 2. Ubicación recomendada

```txt
/docs/backend/billing/billing-handoff-index-v0.1.md
```

Carpeta completa esperada:

```txt
/docs/backend/billing/
├─ billing-handoff-index-v0.1.md
├─ billing-domain-technical-spec-v0.1.md
├─ billing-erd-addendum-v0.1.md
├─ billing-openapi-addendum-v0.1.md
├─ billing-jobs-queues-scheduler-v0.1.md
├─ billing-backend-implementation-guide-v0.1.md
└─ billing-qa-test-plan-v0.1.md
```

---

## 3. Estado del paquete

```txt
Estado: listo para desarrollo backend
Versión: V0.1
Producto: Tortilla Plus — V1 Operativa Comercial
Módulo: Billing / CFDI / Autofactura / Globales / Conciliación
Provider fiscal inicial: Facturapi
```

---

## 4. Decisiones congeladas

### 4.1 Facturación

```txt
Todo flujo fiscal será mediante QR/autofactura.
El POS nunca timbra directamente.
```

### 4.2 Efectivo

```txt
Efectivo sin factura:
→ eligible_for_daily_global

Efectivo con factura:
→ pending_customer_invoice + QR
```

### 4.3 Tarjeta

```txt
Toda venta con tarjeta genera QR facturable automáticamente.
```

### 4.4 Mixto

```txt
Si incluye tarjeta:
→ pending_customer_invoice + QR

Si no incluye tarjeta:
→ depende de intención fiscal capturada
```

### 4.5 Vigencia QR

```txt
QR válido hasta fin de mes natural.
```

### 4.6 Autofactura

```txt
Cliente captura datos fiscales en portal público.
Sistema intenta timbrar inmediatamente.
Si provider falla temporalmente, entra a cola/retry.
```

### 4.7 Retry

```txt
5 intentos exponenciales:
1 min
5 min
15 min
1 h
6 h

Después:
requires_manual_review
```

### 4.8 Global diaria

```txt
Gerente confirma diariamente.
No se timbra automáticamente.
```

### 4.9 Global rezagados

```txt
Sistema prepara lote automáticamente.
Gerente confirma timbrado.
```

### 4.10 QR vencido

```txt
Bloquea autofactura automática.
Muestra mensaje para contactar al negocio.
```

### 4.11 Reimpresión QR

```txt
Cajero:
→ solo tickets recientes / mismo turno / misma caja

Gerente:
→ histórico completo
```

### 4.12 Cancelación CFDI

```txt
Solo gerente.
Motivo SAT obligatorio.
Motivo interno obligatorio.
Evidence URL opcional.
Tortilla Plus no almacena archivos de evidencia en V1.
```

### 4.13 XML/PDF

```txt
XML + metadata persistentes.
PDF bajo demanda.
```

### 4.14 Multi-RFC

```txt
V1:
1 organización = 1 RFC

Arquitectura preparada para multi-RFC futuro.
```

### 4.15 Devoluciones

```txt
Si la venta ya fue timbrada:
NO hay devoluciones V1.
NO notas crédito SAT V1.
```

### 4.16 Conciliación bancaria

```txt
V1 semi-manual:
BBVA
MercadoPago
Clip
CSV/Excel
matching por score
confirmación manual gerente
```

---

## 5. Orden de lectura obligatorio

### 1. Billing Domain Technical Specification

```txt
billing-domain-technical-spec-v0.1.md
```

Leer primero.

Define:

```txt
reglas fiscales
lifecycle
estados
actores
restricciones
globales
cancelación
autofactura
conciliación
```

Si hay conflicto con otro documento, este documento manda en reglas de negocio.

---

### 2. Billing ERD Addendum

```txt
billing-erd-addendum-v0.1.md
```

Leer segundo.

Define:

```txt
tablas
campos
relaciones
índices
constraints
cambios a sales
cambios a sale_payments
```

Si hay conflicto técnico entre ERD y OpenAPI, revisar primero la regla del Domain Spec y después ajustar ERD/OpenAPI.

---

### 3. Billing OpenAPI Addendum

```txt
billing-openapi-addendum-v0.1.md
```

Leer tercero.

Define:

```txt
endpoints públicos
endpoints manager
payloads
respuestas
errores
schemas
rate limits de API
```

---

### 4. Billing Jobs / Queues / Scheduler

```txt
billing-jobs-queues-scheduler-v0.1.md
```

Leer cuarto.

Define:

```txt
colas
workers
jobs
scheduler
retry policy
DLQ
locks
idempotencia
observabilidad
```

---

### 5. Billing Backend Implementation Guide

```txt
billing-backend-implementation-guide-v0.1.md
```

Leer quinto.

Define:

```txt
estructura de carpetas
servicios
adapter Facturapi
orden de implementación
integración con Sales
workers
scheduler
storage
testing técnico
```

---

### 6. Billing QA Test Plan

```txt
billing-qa-test-plan-v0.1.md
```

Leer sexto.

Define:

```txt
unit tests
integration tests
E2E backend
jobs QA
security QA
concurrency QA
smoke tests
exit criteria
```

---

## 6. Documento dueño por tema

| Tema | Documento dueño |
|---|---|
| Reglas fiscales | billing-domain-technical-spec |
| Estados fiscales | billing-domain-technical-spec |
| Tablas/campos | billing-erd-addendum |
| Constraints/índices | billing-erd-addendum |
| Endpoints/payloads | billing-openapi-addendum |
| Errores API | billing-openapi-addendum |
| Jobs/workers | billing-jobs-queues-scheduler |
| Retry policy | billing-jobs-queues-scheduler |
| Scheduler | billing-jobs-queues-scheduler |
| Estructura backend | billing-backend-implementation-guide |
| Adapter Facturapi | billing-backend-implementation-guide |
| QA | billing-qa-test-plan |
| Concurrencia | billing-jobs-queues-scheduler + billing-qa-test-plan |
| Conciliación | billing-domain + billing-erd + billing-openapi |

---

## 7. Implementación por fases

### Fase 0 — Preparación

```txt
[ ] Crear carpeta /docs/backend/billing
[ ] Subir documentos del paquete
[ ] Validar que el equipo lea este índice
[ ] Congelar nombres de enums
[ ] Crear rama feature/billing-domain-v1
```

---

### Fase 1 — Base de datos y enums

Documentos principales:

```txt
billing-erd-addendum-v0.1.md
billing-backend-implementation-guide-v0.1.md
```

Checklist:

```txt
[ ] Crear migraciones billing core
[ ] Agregar billing_entities
[ ] Agregar billing_receipts
[ ] Agregar billing_invoice_requests
[ ] Agregar billing_invoices
[ ] Agregar billing_invoice_items
[ ] Agregar billing_invoice_documents
[ ] Agregar billing_provider_accounts
[ ] Agregar billing_certificates
[ ] Agregar campos fiscales a sales
[ ] Agregar campos conciliación a sale_payments
[ ] Crear enums TypeScript oficiales
```

---

### Fase 2 — Clasificación fiscal de venta

Documentos principales:

```txt
billing-domain-technical-spec-v0.1.md
billing-backend-implementation-guide-v0.1.md
```

Checklist:

```txt
[ ] Implementar FiscalClassifier
[ ] Implementar ReceiptTokenService
[ ] Implementar BillingSaleHook
[ ] Integrar hook al cierre de venta
[ ] Venta efectivo sin factura queda eligible_for_daily_global
[ ] Venta efectivo con factura genera QR
[ ] Venta tarjeta genera QR automático
[ ] Venta mixta con tarjeta genera QR automático
```

---

### Fase 3 — Portal público de autofactura

Documentos principales:

```txt
billing-openapi-addendum-v0.1.md
billing-backend-implementation-guide-v0.1.md
```

Checklist:

```txt
[ ] GET /public/billing/receipts/{token}
[ ] POST /public/billing/receipts/{token}/invoice
[ ] GET /public/billing/receipts/{token}/invoice-status
[ ] Rate limit por token/IP
[ ] Validación de QR activo
[ ] Bloqueo QR vencido
[ ] Corrección de datos fiscales con máximo intentos
```

---

### Fase 4 — Provider adapter Facturapi

Documentos principales:

```txt
billing-backend-implementation-guide-v0.1.md
billing-jobs-queues-scheduler-v0.1.md
```

Checklist:

```txt
[ ] Crear BillingProvider interface
[ ] Crear FacturapiClient
[ ] Crear FacturapiProvider
[ ] Crear FacturapiMapper
[ ] Crear ProviderErrorMapper
[ ] Crear BillingProviderLogs
[ ] Sanitizar logs
[ ] Configurar sandbox
```

---

### Fase 5 — Timbrado individual

Documentos principales:

```txt
billing-jobs-queues-scheduler-v0.1.md
billing-openapi-addendum-v0.1.md
```

Checklist:

```txt
[ ] Intento inmediato desde POST invoice
[ ] Fallback a cola si provider timeout
[ ] Worker generate-individual-invoice
[ ] Worker retry-individual-invoice
[ ] Retry 1m/5m/15m/1h/6h
[ ] requires_manual_review tras 5 fallos
[ ] XML storage persistente
[ ] PDF bajo demanda
[ ] Audit logs
```

---

### Fase 6 — Global diaria

Documentos principales:

```txt
billing-domain-technical-spec-v0.1.md
billing-openapi-addendum-v0.1.md
billing-jobs-queues-scheduler-v0.1.md
```

Checklist:

```txt
[ ] Preview global diaria
[ ] Prepare global diaria
[ ] Confirm global diaria
[ ] Worker stamp-global-batch
[ ] Excluir QR pendientes
[ ] Excluir facturas individuales
[ ] Revalidar ventas antes de timbrar
[ ] Marcar ventas included_in_global
```

---

### Fase 7 — Global rezagados

Checklist:

```txt
[ ] Expirar receipts fin de mes
[ ] Marcar sales expired_to_pending_global
[ ] Preview rezagados
[ ] Prepare rezagados
[ ] Confirm rezagados
[ ] Timbrar global pending_period
```

---

### Fase 8 — Cancelación CFDI

Checklist:

```txt
[ ] POST cancel invoice
[ ] Validar rol gerente
[ ] Validar satCancelReason
[ ] Validar internalReason
[ ] Guardar evidenceUrl opcional
[ ] Worker cancel-invoice
[ ] Actualizar invoice cancelled
[ ] Audit logs
```

---

### Fase 9 — Conciliación bancaria

Checklist:

```txt
[ ] Upload import
[ ] Parser BBVA
[ ] Parser MercadoPago
[ ] Parser Clip
[ ] Normalización movimientos
[ ] Matching score
[ ] Confirm match
[ ] Reject match
```

---

### Fase 10 — QA y hardening

Checklist:

```txt
[ ] Unit tests core
[ ] Integration tests
[ ] E2E tarjeta → autofactura
[ ] E2E efectivo → global diaria
[ ] E2E QR vencido → global rezagados
[ ] Idempotencia
[ ] Concurrencia
[ ] Rate limits
[ ] Provider logs sanitizados
[ ] Smoke test staging
```

---

## 8. Riesgos principales

### 8.1 Doble destino fiscal

Riesgo:

```txt
una venta termina individual y global
```

Mitigación:

```txt
locks por sale
transacciones
revalidación antes de timbrar
constraints lógicos
tests de concurrencia
```

---

### 8.2 Acoplamiento con Facturapi

Riesgo:

```txt
dominio depende de SDK Facturapi
```

Mitigación:

```txt
BillingProvider adapter obligatorio
provider mapper
provider error mapper
provider logs normalizados
```

---

### 8.3 Global diaria olvidada

Riesgo:

```txt
gerente no confirma global diaria
```

Mitigación:

```txt
dashboard fiscal
alertas
reportes de pendientes
notificaciones futuras
```

---

### 8.4 QR vencido con cliente molesto

Riesgo:

```txt
cliente intenta facturar después de cierre
```

Mitigación:

```txt
mensaje claro
contactar negocio
no permitir autofactura tardía automática
```

---

### 8.5 Timeout provider pero CFDI creado

Riesgo:

```txt
provider no responde pero timbró
```

Mitigación:

```txt
idempotency key
provider-status-sync
manual review
```

---

## 9. No implementar todavía

Para evitar expansión de alcance, no implementar en V1:

```txt
timbrado directo en POS
notas de crédito SAT
devoluciones fiscales
almacenamiento permanente PDF
Open Banking automático
PDF bancario
multi-RFC por sucursal operativo
WhatsApp automático para facturas
email automático XML/PDF
firma digital de solicitud de cancelación
```

---

## 10. Definition of Ready para desarrollo

El módulo está listo para desarrollo cuando:

```txt
[ ] Documentos subidos a /docs/backend/billing
[ ] Equipo leyó handoff index
[ ] Enums aceptados
[ ] Fases de implementación aceptadas
[ ] Provider Facturapi sandbox disponible
[ ] Redis disponible
[ ] Estrategia storage XML definida
[ ] Rama feature creada
[ ] QA test plan aceptado
```

---

## 11. Definition of Done del paquete billing

```txt
[ ] POS clasifica ventas fiscalmente
[ ] QR se genera según reglas
[ ] Portal público funciona
[ ] Timbrado individual funciona en sandbox
[ ] Retry/fallback funciona
[ ] XML se guarda
[ ] PDF se genera bajo demanda
[ ] Global diaria funciona con confirmación gerente
[ ] Global rezagados funciona con confirmación gerente
[ ] Cancelación solo gerente funciona
[ ] Evidence URL opcional funciona
[ ] Reimpresión QR limitada/completa funciona
[ ] Conciliación básica funciona
[ ] Provider logs sanitizados
[ ] Audit logs generados
[ ] QA mínimo aprobado
```

---

## 12. Prompt recomendado para equipo de desarrollo / Codex

```txt
Lee todos los documentos en /docs/backend/billing siguiendo el orden de billing-handoff-index-v0.1.md.

Implementa el módulo Billing V1 de Tortilla Plus sin cambiar reglas de negocio.

Restricciones:
- El POS nunca debe timbrar directamente.
- Todo provider fiscal debe pasar por BillingProvider.
- Facturapi es provider inicial, pero no debe contaminar el dominio.
- Una venta solo puede terminar en CFDI individual o CFDI global, nunca ambos.
- Toda venta con tarjeta genera QR de autofactura.
- El QR vence al fin de mes natural.
- La global diaria requiere confirmación del gerente.
- La global de rezagados se prepara automáticamente pero requiere confirmación del gerente.
- XML persistente, PDF bajo demanda.
- Cancelación CFDI solo gerente, con motivo SAT, motivo interno y evidenceUrl opcional.

Primera fase:
1. Migraciones billing core.
2. Enums.
3. FiscalClassifier.
4. ReceiptTokenService.
5. BillingSaleHook integrado al cierre de venta.
6. Endpoint público GET receipt.

Antes de codificar, genera un plan técnico por archivos, servicios, migraciones y pruebas.
```

---

## 13. Siguiente paso

Con este índice, el paquete fiscal queda listo para subir al repositorio.

Siguiente tarea recomendada:

```txt
crear rama feature/billing-domain-v1
subir documentos a /docs/backend/billing
pedir al equipo plan técnico de implementación por fases
```
